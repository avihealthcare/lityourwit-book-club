import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
const db = new PGlite();
const parentA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  parentB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function asParent(id: string, sql: string) {
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`,
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}
beforeAll(async () => {
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  await db.exec(
    `insert into auth.users(id,raw_user_meta_data) values('${parentA}','{"display_name":"Parent A","role":"admin"}'),('${parentB}','{"display_name":"Parent B"}'); insert into public.child_profiles(parent_id,nickname,age_band) values('${parentA}','Reader A','5–7'),('${parentB}','Reader B','8–10');`,
  );
}, 30000);
afterAll(async () => {
  await db.close();
});
describe("core database migration and isolation", () => {
  it("loads 50 fictional families and 210 books", async () => {
    expect(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.books",
        )
      ).rows[0].count,
    ).toBe(210);
    expect(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.profiles where display_name like 'Demo Family %'",
        )
      ).rows[0].count,
    ).toBe(50);
  });
  it("exposes only the current parent’s private records", async () => {
    const result = await asParent(
      parentA,
      "select nickname from public.child_profiles",
    );
    expect(result.rows).toEqual([{ nickname: "Reader A" }]);
    const wallets = await asParent(
      parentA,
      "select user_id from public.bookcoin_wallets",
    );
    expect(wallets.rows).toEqual([{ user_id: parentA }]);
  });
  it("does not grant admin from user-editable signup metadata", async () => {
    const result = await db.query(
      `select role from private.user_roles where user_id='${parentA}'`,
    );
    expect(result.rows).toEqual([{ role: "parent" }]);
    await expect(
      asParent(parentA, "select * from private.user_roles"),
    ).rejects.toThrow(/permission denied/);
  });
  it("denies client wallet and ledger mutations", async () => {
    await expect(
      asParent(
        parentA,
        `update public.bookcoin_wallets set balance=1000 where user_id='${parentA}'`,
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asParent(
        parentA,
        `insert into public.bookcoin_transactions(user_id,amount,transaction_type,reference_type,reference_id,balance_before,balance_after) values('${parentA}',5,'purchase','mock','${parentA}',0,5)`,
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("cannot rewrite ledger entries even as the database owner", async () => {
    await expect(
      db.exec("update public.bookcoin_transactions set notes='rewritten'"),
    ).rejects.toThrow(/append-only/);
  });
  it("cannot self-activate membership, trust, or listing approval", async () => {
    await expect(
      asParent(
        parentA,
        "update public.profiles set trust_level='Super Sharer' where id=auth.uid()",
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asParent(parentA, "update public.memberships set status='active'"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asParent(
        parentA,
        "update public.book_copies set availability='Available'",
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("atomically submits an owned pending listing, privately", async () => {
    const payload = JSON.stringify({
      title: "Test Story",
      author: "Test Author",
      isbn: "",
      age_band: "8–10",
      genre: "Fantasy",
      language: "English",
      condition: "Good",
      protected_value: 200,
    });
    await asParent(parentA, `select public.submit_book('${payload}'::jsonb)`);
    const mine = await asParent(
      parentA,
      "select title,availability,owner_id from public.catalogue where title='Test Story'",
    );
    expect(mine.rows).toEqual([
      { title: "Test Story", availability: "Pending", owner_id: parentA },
    ]);
    expect(
      (
        await asParent(
          parentB,
          "select * from public.catalogue where title='Test Story'",
        )
      ).rows,
    ).toEqual([]);
  });
  it("rolls back book metadata when the copy fails validation", async () => {
    const payload = JSON.stringify({
      title: "Must Roll Back",
      author: "Test Author",
      age_band: "8–10",
      genre: "Fantasy",
      language: "English",
      condition: "Good",
      protected_value: -1,
    });
    await expect(
      asParent(parentA, `select public.submit_book('${payload}'::jsonb)`),
    ).rejects.toThrow();
    expect(
      (
        await db.query(
          "select id from public.books where title='Must Roll Back'",
        )
      ).rows,
    ).toEqual([]);
  });
  it("does not allow a caller to forge another owner’s copy", async () => {
    await expect(
      asParent(
        parentA,
        `insert into public.book_copies(book_id,owner_id,chapter_id,condition,protected_value) select id,'${parentB}','11111111-1111-4111-8111-111111111111','Good',200 from public.books where submitted_by='${parentA}' limit 1`,
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("keeps all exposed tables behind RLS", async () => {
    const result = await db.query<{ relname: string }>(
      "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
    );
    expect(result.rows).toEqual([]);
  });
});

describe("administrator controls", () => {
  const admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  beforeAll(async () => {
    await db.exec(
      `insert into auth.users(id,email) values('${admin}','admin@example.test'); update private.user_roles set role='admin' where user_id='${admin}';`,
    );
  });
  it("denies normal members the admin snapshot and mutations", async () => {
    expect(
      (await asParent(parentA, "select public.is_admin() as allowed")).rows,
    ).toEqual([{ allowed: false }]);
    await expect(
      asParent(parentA, "select public.admin_snapshot()"),
    ).rejects.toThrow(/Administrator access required/);
    await expect(
      asParent(
        parentA,
        `select public.admin_manage('chapter_save','{"name":"Unauthorized","area":"A","city":"B"}')`,
      ),
    ).rejects.toThrow(/Administrator access required/);
  });
  it("allows an admin to create and manage chapters and records an audit event", async () => {
    await asParent(
      admin,
      `select public.admin_manage('chapter_save','{"name":"New Chapter","area":"Andheri","city":"Mumbai"}')`,
    );
    const result = await asParent(
      admin,
      "select public.admin_snapshot() as data",
    );
    const data = (result.rows[0] as { data: unknown }).data as {
      chapters: { name: string }[];
      activity: { action: string }[];
    };
    expect(data.chapters.some((c) => c.name === "New Chapter")).toBe(true);
    expect(data.activity.some((a) => a.action === "chapter_save")).toBe(true);
    await expect(
      asParent(parentA, "select * from private.admin_activity"),
    ).rejects.toThrow(/permission denied/);
  });
  it("cannot remove the current administrator", async () => {
    await expect(
      asParent(
        admin,
        `select public.admin_manage('member_remove','{"id":"${admin}"}')`,
      ),
    ).rejects.toThrow(/own administrator/);
  });
  it("removes and restores a member while preserving records, blocking existing tokens", async () => {
    await asParent(
      admin,
      `select public.admin_manage('member_remove','{"id":"${parentB}"}')`,
    );
    expect(
      (await asParent(parentB, "select * from public.catalogue")).rows,
    ).toEqual([]);
    const payload = JSON.stringify({
      title: "Suspended Book",
      author: "A",
      age_band: "8–10",
      genre: "Fantasy",
      language: "English",
      condition: "Good",
      protected_value: 100,
    });
    await expect(
      asParent(parentB, `select public.submit_book('${payload}')`),
    ).rejects.toThrow();
    expect(
      (
        await db.query(
          `select count(*)::int as n from public.profiles where id='${parentB}'`,
        )
      ).rows,
    ).toEqual([{ n: 1 }]);
    await asParent(
      admin,
      `select public.admin_manage('member_restore','{"id":"${parentB}"}')`,
    );
    expect(
      (
        await asParent(
          parentB,
          "select id from public.profiles where id=auth.uid()",
        )
      ).rows,
    ).toEqual([{ id: parentB }]);
  });
  it("only publishes a pending copy after administrator approval", async () => {
    const copy = (
      await db.query<{ id: string }>(
        "select id from public.catalogue where title='Test Story' limit 1",
      )
    ).rows[0].id;
    await asParent(
      admin,
      `select public.admin_manage('book_moderate','{"id":"${copy}","availability":"Available"}')`,
    );
    expect(
      (
        await asParent(
          parentB,
          "select title from public.catalogue where title='Test Story'",
        )
      ).rows,
    ).toEqual([{ title: "Test Story" }]);
    await asParent(
      admin,
      `select public.admin_manage('book_moderate','{"id":"${copy}","availability":"Temporarily Unavailable"}')`,
    );
    expect(
      (
        await asParent(
          parentB,
          "select title from public.catalogue where title='Test Story'",
        )
      ).rows,
    ).toEqual([]);
  });
  it("rejects invalid settings without changing configuration", async () => {
    await expect(
      asParent(
        admin,
        `select public.admin_manage('configuration_save','{"key":"economy","value":{"borrow":-1}}')`,
      ),
    ).rejects.toThrow();
    await expect(
      asParent(
        admin,
        `select public.admin_manage('configuration_save','{"key":"unknown","value":{}}')`,
      ),
    ).rejects.toThrow();
  });
  it("saves a member chapter and approval and persists plan and business settings", async () => {
    const chapter = (
      await db.query<{ id: string }>(
        "select id from public.chapters where name='New Chapter'",
      )
    ).rows[0].id;
    await asParent(
      admin,
      `select public.admin_manage('member_save','{"id":"${parentB}","display_name":"Updated Family","chapter_id":"${chapter}","status":"approved","suspended":false}')`,
    );
    expect(
      (
        await asParent(
          parentB,
          "select display_name,chapter_id from public.profiles where id=auth.uid()",
        )
      ).rows,
    ).toEqual([{ display_name: "Updated Family", chapter_id: chapter }]);
    const plan = (
      await db.query<{ data: Record<string, unknown> }>(
        "select to_jsonb(p) as data from public.membership_plans p where id='reader'",
      )
    ).rows[0].data;
    await asParent(
      admin,
      `select public.admin_manage('plan_save','${JSON.stringify({ ...plan, annual_price: 600 })}')`,
    );
    expect(
      (
        await db.query(
          "select annual_price from public.membership_plans where id='reader'",
        )
      ).rows,
    ).toEqual([{ annual_price: 600 }]);
    const economy = (
      await db.query<{ value: Record<string, number> }>(
        "select value from public.configuration where key='economy'",
      )
    ).rows[0].value;
    await asParent(
      admin,
      `select public.admin_manage('configuration_save','${JSON.stringify({ key: "economy", value: { ...economy, borrow: 6 } })}')`,
    );
    expect(
      (
        await db.query<{ value: Record<string, number> }>(
          "select value from public.configuration where key='economy'",
        )
      ).rows[0].value.borrow,
    ).toBe(6);
  });
  it("checks current database status for administrator privileges", async () => {
    await db.exec(
      `update public.parent_accounts set suspended=true where user_id='${admin}'`,
    );
    expect(
      (await asParent(admin, "select public.is_admin() as allowed")).rows,
    ).toEqual([{ allowed: false }]);
    await expect(
      asParent(admin, "select public.admin_snapshot()"),
    ).rejects.toThrow(/Administrator access required/);
    await db.exec(
      `update public.parent_accounts set suspended=false where user_id='${admin}'`,
    );
  });
  it("does not give even an administrator direct wallet write privileges", async () => {
    await expect(
      asParent(admin, "update public.bookcoin_wallets set balance=9999"),
    ).rejects.toThrow(/permission denied/);
  });
});
