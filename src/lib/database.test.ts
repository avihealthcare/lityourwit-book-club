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
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,anon;
    grant select on storage.objects to authenticated,anon;
    grant insert,delete on storage.objects to authenticated;`);
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

describe("book photographs and storage isolation", () => {
  const photoA = `${parentA}/11111111-1111-4111-8111-111111111111.jpg`;
  const photoB = `${parentB}/22222222-2222-4222-8222-222222222222.jpg`;
  let copy: string;
  it("accepts owner uploads and rejects another owner's path", async () => {
    await asParent(
      parentA,
      `insert into storage.objects(bucket_id,name) values('book-photos','${photoA}')`,
    );
    await asParent(
      parentB,
      `insert into storage.objects(bucket_id,name) values('book-photos','${photoB}')`,
    );
    await expect(
      asParent(
        parentA,
        `insert into storage.objects(bucket_id,name) values('book-photos','${parentB}/33333333-3333-4333-8333-333333333333.jpg')`,
      ),
    ).rejects.toThrow(/row-level security/);
    expect(
      (await asParent(parentA, "select name from storage.objects")).rows,
    ).toEqual([{ name: photoA }]);
  });
  it("atomically saves listing photographs and keeps pending photos private", async () => {
    const payload = JSON.stringify({
      title: "Photo Story",
      author: "Photo Author",
      age_band: "8–10",
      genre: "Fantasy",
      language: "English",
      condition: "Good",
      protected_value: 200,
      photo_paths: [photoA],
    });
    const result = await asParent(
      parentA,
      `select public.submit_book('${payload}') as id`,
    );
    copy = (result.rows[0] as { id: string }).id;
    expect(
      (
        await asParent(
          parentA,
          `select photo_paths from public.catalogue where id='${copy}'`,
        )
      ).rows,
    ).toEqual([{ photo_paths: [photoA] }]);
    expect(
      (
        await asParent(
          parentB,
          `select name from storage.objects where name='${photoA}'`,
        )
      ).rows,
    ).toEqual([]);
  });
  it("only shares approved photos with the same chapter", async () => {
    // Parent B was assigned a different chapter by the administration tests.
    await db.exec(
      `update public.books set published=true where id=(select book_id from public.book_copies where id='${copy}');update public.book_copies set availability='Available' where id='${copy}';`,
    );
    expect(
      (
        await asParent(
          parentB,
          `select name from storage.objects where name='${photoA}'`,
        )
      ).rows,
    ).toEqual([]);
    await db.exec(
      `update public.profiles set chapter_id=(select chapter_id from public.profiles where id='${parentA}') where id='${parentB}'`,
    );
    expect(
      (
        await asParent(
          parentB,
          `select name from storage.objects where name='${photoA}'`,
        )
      ).rows,
    ).toEqual([{ name: photoA }]);
  });
  it("allows owner photo editing, enforces ownership and maximum count", async () => {
    await asParent(
      parentA,
      `update public.book_copies set photo_paths='{}' where id='${copy}'`,
    );
    expect(
      (
        await asParent(
          parentB,
          `update public.book_copies set photo_paths=array['${photoB}'] where id='${copy}' returning id`,
        )
      ).rows,
    ).toEqual([]);
    await expect(
      asParent(
        parentA,
        `update public.book_copies set photo_paths=array['${photoB}'] where id='${copy}'`,
      ),
    ).rejects.toThrow(/book_copy_photos_owned/);
    await expect(
      asParent(
        parentA,
        `update public.book_copies set photo_paths=array['${photoA}','${photoA}'] where id='${copy}'`,
      ),
    ).rejects.toThrow(/book_copy_photos_owned/);
    const paths = Array.from(
      { length: 7 },
      (_, i) =>
        `'${parentA}/00000000-0000-4000-8000-${String(i).padStart(12, "0")}.jpg'`,
    ).join(",");
    await expect(
      asParent(
        parentA,
        `update public.book_copies set photo_paths=array[${paths}] where id='${copy}'`,
      ),
    ).rejects.toThrow(/book_copy_photos_owned/);
    await expect(
      asParent(
        parentA,
        `update public.book_copies set availability='On Loan' where id='${copy}'`,
      ),
    ).rejects.toThrow(/permission denied/);
    await asParent(
      parentA,
      `update public.book_copies set photo_paths=array['${photoA}'] where id='${copy}'`,
    );
  });
  it("protects linked photos and permits cleanup only after unlinking", async () => {
    expect(
      (
        await asParent(
          parentA,
          `delete from storage.objects where name='${photoA}' returning name`,
        )
      ).rows,
    ).toEqual([]);
    await asParent(
      parentA,
      `update public.book_copies set photo_paths='{}' where id='${copy}'`,
    );
    expect(
      (
        await asParent(
          parentA,
          `delete from storage.objects where name='${photoA}' returning name`,
        )
      ).rows,
    ).toEqual([{ name: photoA }]);
  });
  it("keeps the bucket private and restricts prepared images", async () => {
    expect(
      (
        await db.query(
          "select public,file_size_limit,allowed_mime_types from storage.buckets where id='book-photos'",
        )
      ).rows,
    ).toEqual([
      {
        public: false,
        file_size_limit: 2097152,
        allowed_mime_types: ["image/jpeg"],
      },
    ]);
    await db.exec("set role anon");
    try {
      expect((await db.query("select name from storage.objects")).rows).toEqual(
        [],
      );
    } finally {
      await db.exec("reset role");
    }
  });
});

describe("UPI payments and automatic BookCoins", () => {
  const member = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  let membershipRequest: string, coinRequest: string;
  beforeAll(async () => {
    await db.exec(
      `insert into auth.users(id,email) values('${member}','reader@example.test')`,
    );
  });
  const submitRequest = (
    kind: string,
    reference: string,
    amount: number,
    plan = "reader",
    interval = "monthly",
    coins = 25,
  ) =>
    asParent(
      member,
      `select public.request_upi_payment('${kind}','${plan}','${interval}',${coins},'Reader','${reference}',${amount}) as id`,
    );
  it("credits uploads automatically with an append-only ledger and no duplicate rewards", async () => {
    const payload = JSON.stringify({
      title: "Reward Story",
      author: "An Author",
      age_band: "8–10",
      genre: "Fantasy",
      language: "English",
      condition: "Good",
      protected_value: 100,
    });
    const result = await asParent(
      member,
      `select public.submit_book('${payload}') as id`,
    );
    const copy = (result.rows[0] as { id: string }).id;
    expect(
      (await asParent(member, "select balance from public.bookcoin_wallets"))
        .rows,
    ).toEqual([{ balance: 1 }]);
    await db.exec(`select private.reward_book_listing('${copy}')`);
    expect(
      (await asParent(member, "select balance from public.bookcoin_wallets"))
        .rows,
    ).toEqual([{ balance: 1 }]);
    expect(
      (
        await asParent(
          member,
          "select transaction_type,amount from public.bookcoin_transactions",
        )
      ).rows,
    ).toEqual([{ transaction_type: "listing_reward", amount: 1 }]);
  });
  it("repairs historical uploads missing rewards without duplicate credits", async () => {
    const historical = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    await db.exec(
      `insert into auth.users(id,email) values('${historical}','historical@example.test')`,
    );
    const book = (
      await db.query<{ id: string }>(
        `insert into public.books(title,author,age_band,genre,submitted_by) values('Historical Story','An Author','8–10','Fantasy','${historical}') returning id`,
      )
    ).rows[0].id;
    await db.exec(
      "alter table public.book_copies disable trigger credit_book_upload",
    );
    let copies: { id: string }[] = [];
    try {
      copies = (
        await db.query<{ id: string }>(
          `insert into public.book_copies(book_id,owner_id,chapter_id,condition,protected_value) values('${book}','${historical}','11111111-1111-4111-8111-111111111111','Good',100),('${book}','${historical}','11111111-1111-4111-8111-111111111111','Good',100) returning id`,
        )
      ).rows;
    } finally {
      await db.exec(
        "alter table public.book_copies enable trigger credit_book_upload",
      );
    }
    expect(
      (
        await db.query(
          `select balance from public.bookcoin_wallets where user_id='${historical}'`,
        )
      ).rows,
    ).toEqual([{ balance: 0 }]);
    for (const copy of copies) {
      await db.exec(
        `select private.reward_book_listing('${copy.id}'); select private.reward_book_listing('${copy.id}')`,
      );
    }
    expect(
      (
        await db.query(
          `select balance from public.bookcoin_wallets where user_id='${historical}'`,
        )
      ).rows,
    ).toEqual([{ balance: 2 }]);
    expect(
      (
        await db.query(
          `select count(*)::int as n from public.bookcoin_transactions where user_id='${historical}'`,
        )
      ).rows,
    ).toEqual([{ n: 2 }]);
  });
  it("blocks coin purchases before paid membership approval and blocks direct payment writes", async () => {
    await expect(
      submitRequest("coin_pack", "EARLY123456", 100),
    ).rejects.toThrow(/approved active paid membership/);
    await expect(
      asParent(
        member,
        `insert into public.payment_requests(user_id,kind,amount,coins,payer_name,transaction_reference) values('${member}','coin_pack',100,25,'Reader','FORGED123456')`,
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asParent(
        member,
        `select public.review_upi_payment('${member}',true,'verified')`,
      ),
    ).rejects.toThrow(/Administrator access required/);
    await expect(
      asParent(
        member,
        `select private.credit_bookcoins('${member}',1000,'cheat','cheat','${member}','forged')`,
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("creates a pending membership with trusted prices and leaves the wallet unchanged", async () => {
    // Administration tests changed Reader annual price to 600; monthly remains 100.
    const result = await submitRequest("membership", "UPIMEMBER1234", 100);
    membershipRequest = (result.rows[0] as { id: string }).id;
    expect(
      (
        await asParent(
          member,
          `select amount,coins,status from public.payment_requests where id='${membershipRequest}'`,
        )
      ).rows,
    ).toEqual([{ amount: 100, coins: 50, status: "pending" }]);
    expect(
      (await asParent(member, "select balance from public.bookcoin_wallets"))
        .rows,
    ).toEqual([{ balance: 1 }]);
    await expect(
      submitRequest("membership", "DUPLICATE1234", 100),
    ).rejects.toThrow(/already awaiting review/);
    expect(
      (await asParent(parentA, "select * from public.payment_requests")).rows,
    ).toEqual([]);
  });
  it("atomically approves membership and credits welcome coins exactly once", async () => {
    await asParent(
      admin,
      `select public.review_upi_payment('${membershipRequest}',true,'UPI receipt verified')`,
    );
    await asParent(
      admin,
      `select public.review_upi_payment('${membershipRequest}',true,'repeat')`,
    );
    expect(
      (await asParent(member, "select balance from public.bookcoin_wallets"))
        .rows,
    ).toEqual([{ balance: 51 }]);
    expect(
      (
        await asParent(
          member,
          "select count(*)::int as n from public.bookcoin_transactions where transaction_type='membership_welcome'",
        )
      ).rows,
    ).toEqual([{ n: 1 }]);
    const status = await asParent(
      member,
      "select public.member_finance() as finance",
    );
    expect(
      (status.rows[0] as { finance: { active: boolean } }).finance.active,
    ).toBe(true);
    expect(
      (await asParent(member, "select status from public.memberships")).rows,
    ).toEqual([{ status: "active" }]);
    await expect(
      submitRequest("membership", "SECONDTERM123", 100),
    ).rejects.toThrow(/already active/);
  });
  it("credits a verified coin purchase once and rejects reused transaction references", async () => {
    const result = await submitRequest("coin_pack", "UPICOINS12345", 100);
    coinRequest = (result.rows[0] as { id: string }).id;
    expect(
      (await asParent(member, "select balance from public.bookcoin_wallets"))
        .rows,
    ).toEqual([{ balance: 51 }]);
    await asParent(
      admin,
      `select public.review_upi_payment('${coinRequest}',true,'UPI receipt verified')`,
    );
    await asParent(
      admin,
      `select public.review_upi_payment('${coinRequest}',true,'repeat')`,
    );
    expect(
      (await asParent(member, "select balance from public.bookcoin_wallets"))
        .rows,
    ).toEqual([{ balance: 76 }]);
    await expect(
      submitRequest("coin_pack", "upi-coins-12345", 100),
    ).rejects.toThrow(/already been submitted/);
  });
  it("rejects wrong prices, unsupported packs and invalid UTRs", async () => {
    await expect(
      submitRequest("coin_pack", "WRONGPRICE123", 1),
    ).rejects.toThrow(/price has changed/);
    await expect(
      submitRequest(
        "coin_pack",
        "FORGEDPACK123",
        100,
        "reader",
        "monthly",
        9999,
      ),
    ).rejects.toThrow(/pack not found/);
    await expect(submitRequest("coin_pack", "123", 100)).rejects.toThrow(
      /valid UPI transaction/,
    );
  });
  it("does not credit rejected payments and prevents post-approval reversal", async () => {
    const result = await submitRequest("coin_pack", "REJECTED12345", 100);
    const id = (result.rows[0] as { id: string }).id;
    await asParent(
      admin,
      `select public.review_upi_payment('${id}',false,'Payment not received')`,
    );
    expect(
      (await asParent(member, "select balance from public.bookcoin_wallets"))
        .rows,
    ).toEqual([{ balance: 76 }]);
    await expect(
      asParent(
        admin,
        `select public.review_upi_payment('${coinRequest}',false,'reverse')`,
      ),
    ).rejects.toThrow(/already been reviewed/);
  });
  it("enforces the configured annual upload reward cap", async () => {
    const payload = JSON.stringify({
      title: "Capped Story",
      author: "An Author",
      age_band: "8–10",
      genre: "Fantasy",
      language: "English",
      condition: "Good",
      protected_value: 100,
    });
    for (let i = 0; i < 22; i++)
      await asParent(member, `select public.submit_book('${payload}')`);
    expect(
      (
        await asParent(
          member,
          "select sum(amount)::int as earned from public.bookcoin_transactions where transaction_type='listing_reward'",
        )
      ).rows,
    ).toEqual([{ earned: 20 }]);
    expect(
      (await asParent(member, "select balance from public.bookcoin_wallets"))
        .rows,
    ).toEqual([{ balance: 95 }]);
  });
  it("blocks coin purchases when membership expires", async () => {
    await db.exec(
      `update public.memberships set starts_at=now()-interval '2 months',ends_at=now()-interval '1 month' where user_id='${member}'`,
    );
    await expect(
      submitRequest("coin_pack", "EXPIRED123456", 100),
    ).rejects.toThrow(/approved active paid membership/);
  });
});
