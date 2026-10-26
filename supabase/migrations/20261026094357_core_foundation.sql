-- Core foundation only. No client-authorized wallet changes or paid entitlements.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.chapters (
 id uuid primary key default gen_random_uuid(), name text not null, area text not null, city text not null,
 pin_code text, description text not null default '', active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key, display_name text not null check (length(display_name) between 1 and 80),
 chapter_id uuid not null references public.chapters(id), trust_level text not null default 'New Reader',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.parent_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade, suspended boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.child_profiles (
 id uuid primary key default gen_random_uuid(), parent_id uuid not null references public.parent_accounts(user_id) on delete cascade,
 nickname text not null check(length(nickname) between 1 and 40), age_band text not null check(age_band in ('5–7','8–10','11–14')),
 reading_interests text[] not null default '{}', favourite_genres text[] not null default '{}', avatar_url text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.chapter_members (
 id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id),
 user_id uuid not null references public.profiles(id), status text not null default 'pending' check(status in ('pending','approved','declined')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(chapter_id,user_id)
);
create table public.membership_plans (
 id text primary key, name text not null, annual_price integer not null check(annual_price>=0), monthly_price integer not null check(monthly_price>=0),
 signup_coins integer not null check(signup_coins>=0), borrow_limit integer not null check(borrow_limit>0), borrow_days integer not null check(borrow_days>0),
 extension_days integer not null check(extension_days>0), child_limit integer not null check(child_limit>0), protection_limit integer not null check(protection_limit>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.memberships (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.parent_accounts(user_id),
 plan_id text not null references public.membership_plans(id), billing_interval text not null check(billing_interval in ('monthly','annual')),
 status text not null check(status in ('pending','active','expired','cancelled')), starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.books (
 id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 1 and 200),
 author text not null check(length(trim(author)) between 1 and 150), isbn text not null default '', age_band text not null check(age_band in ('5–7','8–10','11–14')),
 genre text not null check(genre in ('Adventure','Fantasy','Mystery','Humour','Science','Classics','General Knowledge')),
 language text not null default 'English', description text not null default '' check(length(description)<=2000),
 color text not null default '#51766b', motif text not null default 'stars', cover_url text check(cover_url is null or cover_url ~ '^https://'),
 published boolean not null default false, submitted_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.book_copies (
 id uuid primary key default gen_random_uuid(), book_id uuid not null references public.books(id), owner_id uuid not null references public.profiles(id),
 chapter_id uuid not null references public.chapters(id), condition text not null check(condition in ('Like New','Good','Well Read')),
 availability text not null default 'Pending' check(availability in ('Pending','Available','Reserved','On Loan','Temporarily Unavailable')),
 protected_value integer not null check(protected_value between 0 and 10000), shared integer not null default 0 check(shared>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.bookcoin_wallets (
 user_id uuid primary key references public.profiles(id), balance integer not null default 0 check(balance>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.bookcoin_transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), amount integer not null check(amount<>0),
 transaction_type text not null, reference_type text not null, reference_id uuid not null,
 balance_before integer not null check(balance_before>=0), balance_after integer not null check(balance_after>=0),
 created_at timestamptz not null default now(), created_by uuid references public.profiles(id), notes text not null default '',
 check(balance_after=balance_before+amount), unique(user_id,transaction_type,reference_type,reference_id)
);
create table public.configuration (
 key text primary key, value jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Identity is assigned only inside trusted backend provisioning, never user-editable metadata.
create table private.user_roles (user_id uuid primary key references auth.users(id) on delete cascade, role text not null check(role in ('parent','chapter_leader','admin')));

create index books_title_idx on public.books (lower(title));
create index books_isbn_idx on public.books(isbn);
create index books_search_idx on public.books using gin(to_tsvector('english',title||' '||author||' '||description));
create index book_copies_chapter_idx on public.book_copies(chapter_id,availability);
create index book_copies_owner_idx on public.book_copies(owner_id);
create index books_submitted_by_idx on public.books(submitted_by);
create index chapter_members_user_idx on public.chapter_members(user_id);
create index child_profiles_parent_idx on public.child_profiles(parent_id);
create index memberships_user_idx on public.memberships(user_id,status);
create index bookcoin_transactions_user_idx on public.bookcoin_transactions(user_id,created_at desc);

-- Every exposed table uses RLS, explicit grants and default-deny writes.
do $$ declare t text; begin
 foreach t in array array['chapters','profiles','parent_accounts','child_profiles','chapter_members','membership_plans','memberships','books','book_copies','bookcoin_wallets','bookcoin_transactions','configuration'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
alter table private.user_roles enable row level security;
grant usage on schema public to authenticated;
grant select on public.chapters, public.profiles, public.membership_plans, public.configuration to authenticated;
grant select on public.parent_accounts,public.child_profiles,public.chapter_members,public.memberships,public.bookcoin_wallets,public.bookcoin_transactions to authenticated;
grant select, insert on public.books,public.book_copies to authenticated;
grant update(display_name) on public.profiles to authenticated;
create policy chapters_read on public.chapters for select to authenticated using(active);
create policy profiles_safe_read on public.profiles for select to authenticated using(true);
create policy own_display_name on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy own_parent_account on public.parent_accounts for select to authenticated using(user_id=(select auth.uid()));
create policy own_children on public.child_profiles for select to authenticated using(parent_id=(select auth.uid()));
create policy own_chapter_membership on public.chapter_members for select to authenticated using(user_id=(select auth.uid()));
create policy own_memberships on public.memberships for select to authenticated using(user_id=(select auth.uid()));
create policy plans_read on public.membership_plans for select to authenticated using(true);
create policy safe_configuration_read on public.configuration for select to authenticated using(key in ('economy','overdue','milestones','trust','coin_packs'));
create policy own_wallet on public.bookcoin_wallets for select to authenticated using(user_id=(select auth.uid()));
create policy own_ledger on public.bookcoin_transactions for select to authenticated using(user_id=(select auth.uid()));
-- Local MVP scope: parents only see copies in their primary chapter or their own copies.
create policy copies_read on public.book_copies for select to authenticated using(owner_id=(select auth.uid()) or (availability<>'Pending' and chapter_id=(select chapter_id from public.profiles where id=(select auth.uid()))));
create policy books_read on public.books for select to authenticated using(submitted_by=(select auth.uid()) or published);
create policy books_submit on public.books for insert to authenticated with check(not published and submitted_by=(select auth.uid()) and exists(select 1 from public.parent_accounts where user_id=(select auth.uid()) and not suspended));
create policy copies_submit on public.book_copies for insert to authenticated with check(owner_id=(select auth.uid()) and availability='Pending' and shared=0 and chapter_id=(select chapter_id from public.profiles where id=(select auth.uid())) and exists(select 1 from public.books where id=book_id and submitted_by=(select auth.uid())) and exists(select 1 from public.parent_accounts where user_id=(select auth.uid()) and not suspended));

create view public.catalogue with(security_invoker=true) as
 select c.id,b.title,b.author,b.isbn,b.age_band,b.genre,b.language,b.description,b.color,b.motif,b.cover_url,c.owner_id,c.chapter_id,c.condition,c.availability,c.protected_value,c.shared,c.created_at
 from public.book_copies c join public.books b on b.id=c.book_id;
grant select on public.catalogue to authenticated;

-- Atomic listing submission obeys the caller's RLS. It cannot approve listings or reward coins.
create function public.submit_book(p_book jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare book_id uuid; copy_id uuid; chapter uuid;
begin
 if auth.uid() is null then raise exception 'Parent sign-in required'; end if;
 select chapter_id into chapter from public.profiles where id=auth.uid();
 if chapter is null then raise exception 'A primary chapter is required'; end if;
 insert into public.books(title,author,isbn,age_band,genre,language,description,cover_url,submitted_by)
 values(trim(p_book->>'title'),trim(p_book->>'author'),coalesce(p_book->>'isbn',''),p_book->>'age_band',p_book->>'genre',p_book->>'language',coalesce(p_book->>'description',''),nullif(p_book->>'cover_url',''),auth.uid()) returning id into book_id;
 insert into public.book_copies(book_id,owner_id,chapter_id,condition,protected_value)
 values(book_id,auth.uid(),chapter,p_book->>'condition',(p_book->>'protected_value')::integer) returning id into copy_id;
 return copy_id;
end $$;
revoke all on function public.submit_book(jsonb) from public,anon;
grant execute on function public.submit_book(jsonb) to authenticated;

create function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end $$;
create function private.prevent_ledger_mutation() returns trigger language plpgsql set search_path='' as $$begin raise exception 'BookCoin ledger is append-only';end $$;
create trigger ledger_immutable before update or delete on public.bookcoin_transactions for each row execute function private.prevent_ledger_mutation();
do $$ declare t text; begin
 foreach t in array array['chapters','profiles','parent_accounts','child_profiles','chapter_members','membership_plans','memberships','books','book_copies','bookcoin_wallets','configuration'] loop
 execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
 end loop;
end $$;

insert into public.chapters(id,name,area,city,description) values('11111111-1111-4111-8111-111111111111','Viha’s Chapter','Powai','Mumbai','Our founding neighbourhood of curious readers.');
insert into public.membership_plans(id,name,annual_price,monthly_price,signup_coins,borrow_limit,borrow_days,extension_days,child_limit,protection_limit) values
 ('reader','Reader',500,100,50,2,14,7,1,500),('reader-plus','Reader Plus',1000,150,75,5,21,14,3,1000);
insert into public.configuration(key,value) values
 ('economy','{"borrow":5,"listing":1,"listing_annual_cap":20,"review":1,"review_annual_cap":10,"referral":10,"return_bonus":1}'),
 ('overdue','{"reminder_days_before":2,"warning_days":3,"block_days":7,"escalation_days":14,"lost_eligible_days":30}'),
 ('milestones','{"free_reader_lends":20,"reader_plus_credit_lends":40,"reader_plus_credit_rupees":500}'),
 ('trust','{"levels":["New Reader","Reliable Reader","Trusted Reader","Super Sharer"]}'),
 ('coin_packs','[{"coins":25,"price":100},{"coins":75,"price":250},{"coins":200,"price":500}]');

-- Only an auth trigger can create initial private account state. User metadata is display-only.
create function private.provision_parent() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name,chapter_id) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'New Reader'),80),'11111111-1111-4111-8111-111111111111');
 insert into public.parent_accounts(user_id) values(new.id);
 insert into public.bookcoin_wallets(user_id) values(new.id);
 insert into public.chapter_members(chapter_id,user_id) values('11111111-1111-4111-8111-111111111111',new.id);
 insert into private.user_roles(user_id,role) values(new.id,'parent');
 return new;
end $$;
revoke all on function private.provision_parent() from public,anon,authenticated;
revoke all on function private.touch_updated_at() from public,anon,authenticated;
revoke all on function private.prevent_ledger_mutation() from public,anon,authenticated;
create trigger provision_parent after insert on auth.users for each row execute function private.provision_parent();
