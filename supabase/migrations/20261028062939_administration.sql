-- Narrow, audited administrator APIs. Roles stay in the unexposed private schema.
alter table public.parent_accounts add column removed_at timestamptz;
create table private.admin_activity (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users(id),
 action text not null, target text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table private.admin_activity enable row level security;
revoke all on private.admin_activity from public,anon,authenticated;
create index admin_activity_created_idx on private.admin_activity(created_at desc);
create index admin_activity_actor_idx on private.admin_activity(actor_id);

create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from private.user_roles r join public.parent_accounts a on a.user_id=r.user_id
  where r.user_id=auth.uid() and r.role='admin' and not a.suspended and a.removed_at is null
 )
$$;
create function public.is_admin() returns boolean language sql stable security invoker set search_path='' as $$select private.is_admin()$$;

create function private.admin_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 return jsonb_build_object(
 'chapters',coalesce((select jsonb_agg(x order by x.name) from public.chapters x),'[]'::jsonb),
 'members',coalesce((select jsonb_agg(x order by x.created_at desc) from (
  select p.*,u.email,a.suspended,a.removed_at,r.role,cm.status from public.profiles p
  join auth.users u on u.id=p.id join public.parent_accounts a on a.user_id=p.id
  left join private.user_roles r on r.user_id=p.id
  left join public.chapter_members cm on cm.user_id=p.id and cm.chapter_id=p.chapter_id
 )x),'[]'::jsonb),
 'books',coalesce((select jsonb_agg(x order by x.created_at desc) from (
  select c.id,c.book_id,b.title,b.author,b.published,c.owner_id,c.chapter_id,c.availability,c.created_at
  from public.book_copies c join public.books b on b.id=c.book_id
 )x),'[]'::jsonb),
 'plans',coalesce((select jsonb_agg(x order by x.annual_price) from public.membership_plans x),'[]'::jsonb),
 'configuration',coalesce((select jsonb_agg(x order by x.key) from public.configuration x),'[]'::jsonb),
 'activity',coalesce((select jsonb_agg(x order by x.created_at desc) from (select * from private.admin_activity order by created_at desc limit 100)x),'[]'::jsonb)
 );
end $$;
create function public.admin_snapshot() returns jsonb language sql security invoker set search_path='' as $$select private.admin_snapshot()$$;

create function private.admin_manage(p_action text,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare target_id uuid; chapter uuid; k text; v jsonb; book uuid;
begin
 if not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid form data'; end if;
 if p_action='chapter_save' then
  if length(trim(coalesce(p_data->>'name',''))) not between 1 and 100 or length(trim(coalesce(p_data->>'area',''))) not between 1 and 100 or length(trim(coalesce(p_data->>'city',''))) not between 1 and 100 or length(coalesce(p_data->>'description',''))>2000 then raise exception 'Chapter name, area and city are required (maximum 100 characters)'; end if;
  target_id:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
  insert into public.chapters(id,name,area,city,pin_code,description,active)
  values(target_id,trim(p_data->>'name'),trim(p_data->>'area'),trim(p_data->>'city'),left(p_data->>'pin_code',10),coalesce(p_data->>'description',''),coalesce((p_data->>'active')::boolean,true))
  on conflict(id) do update set name=excluded.name,area=excluded.area,city=excluded.city,pin_code=excluded.pin_code,description=excluded.description,active=excluded.active;
 elsif p_action in ('member_save','member_remove','member_restore') then
  target_id:=(p_data->>'id')::uuid;
  if target_id=auth.uid() then raise exception 'Your own administrator account cannot be changed here'; end if;
  if not exists(select 1 from public.parent_accounts where user_id=target_id) then raise exception 'Member not found'; end if;
  if exists(select 1 from private.user_roles where user_id=target_id and role='admin') then raise exception 'Administrator accounts require owner-managed changes'; end if;
  if p_action='member_remove' then
   update public.parent_accounts set removed_at=now(),suspended=true where user_id=target_id;
   update public.chapter_members set status='declined' where user_id=target_id;
   update public.book_copies set availability='Temporarily Unavailable' where owner_id=target_id and availability in ('Available','Pending');
  elsif p_action='member_restore' then
   update public.parent_accounts set removed_at=null,suspended=false where user_id=target_id;
   update public.chapter_members set status='pending' where user_id=target_id;
  else
   if exists(select 1 from public.parent_accounts where user_id=target_id and removed_at is not null) then raise exception 'Restore this member before editing'; end if;
   chapter:=(p_data->>'chapter_id')::uuid;
   if not exists(select 1 from public.chapters where id=chapter and active) then raise exception 'Choose an active chapter'; end if;
   if p_data->>'status' not in ('pending','approved','declined') or p_data->>'status' is null then raise exception 'Invalid membership status'; end if;
   if length(trim(coalesce(p_data->>'display_name',''))) not between 1 and 80 then raise exception 'A display name is required'; end if;
   update public.profiles set display_name=trim(p_data->>'display_name'),chapter_id=chapter where id=target_id;
   update public.parent_accounts set suspended=coalesce((p_data->>'suspended')::boolean,false) where user_id=target_id;
   update public.chapter_members set status='declined' where user_id=target_id and chapter_id<>chapter;
   insert into public.chapter_members(chapter_id,user_id,status) values(chapter,target_id,p_data->>'status')
   on conflict(chapter_id,user_id) do update set status=excluded.status;
  end if;
 elsif p_action='book_moderate' then
  target_id:=(p_data->>'id')::uuid;
  select book_id into book from public.book_copies where id=target_id for update;
  if book is null then raise exception 'Book not found'; end if;
  if exists(select 1 from public.book_copies where id=target_id and availability in ('On Loan','Reserved')) then raise exception 'Resolve the active exchange before moderating this copy'; end if;
  if p_data->>'availability' not in ('Available','Pending','Temporarily Unavailable') or p_data->>'availability' is null then raise exception 'Invalid book status'; end if;
  if p_data->>'availability'='Available' and exists(select 1 from public.book_copies c join public.parent_accounts a on a.user_id=c.owner_id where c.id=target_id and (a.suspended or a.removed_at is not null)) then raise exception 'Restore the owner before approving this book'; end if;
  update public.book_copies set availability=p_data->>'availability' where id=target_id;
  update public.books set published=exists(select 1 from public.book_copies where book_id=book and availability<>'Pending' and availability<>'Temporarily Unavailable') where id=book;
 elsif p_action='plan_save' then
  if length(trim(coalesce(p_data->>'name',''))) not between 1 and 80 then raise exception 'Plan name is required'; end if;
  update public.membership_plans set name=trim(p_data->>'name'),annual_price=(p_data->>'annual_price')::integer,monthly_price=(p_data->>'monthly_price')::integer,
   signup_coins=(p_data->>'signup_coins')::integer,borrow_limit=(p_data->>'borrow_limit')::integer,borrow_days=(p_data->>'borrow_days')::integer,
   extension_days=(p_data->>'extension_days')::integer,child_limit=(p_data->>'child_limit')::integer,protection_limit=(p_data->>'protection_limit')::integer where id=p_data->>'id';
  if not found then raise exception 'Plan not found'; end if;
 elsif p_action='member_invite' then
  if length(coalesce(p_data->>'email','')) not between 3 and 254 then raise exception 'Invalid email'; end if;
 elsif p_action='configuration_save' then
  k:=p_data->>'key'; v:=p_data->'value';
  if k not in ('economy','overdue','milestones') or k is null or v is null or jsonb_typeof(v)<>'object' then raise exception 'Unsupported business setting'; end if;
  if (select array_agg(key order by key) from jsonb_each(v)) is distinct from (select array_agg(f.key order by f.key) from public.configuration c cross join lateral jsonb_each(c.value) f where c.key=k) then raise exception 'Keep all existing setting fields'; end if;
  if exists(select 1 from jsonb_each(v) where jsonb_typeof(value)<>'number' or value::text !~ '^\d+$' or (value::text)::numeric>100000) then raise exception 'Settings must be whole numbers between 0 and 100000'; end if;
  update public.configuration set value=v where key=k;
 else raise exception 'Unsupported administrator action'; end if;
 insert into private.admin_activity(actor_id,action,target,details) values(auth.uid(),p_action,coalesce(target_id::text,p_data->>'id',p_data->>'key',''),p_data);
end $$;
create function public.admin_manage(p_action text,p_data jsonb) returns void language sql security invoker set search_path='' as $$select private.admin_manage(p_action,p_data)$$;

revoke all on function private.is_admin(),private.admin_snapshot(),private.admin_manage(text,jsonb),public.is_admin(),public.admin_snapshot(),public.admin_manage(text,jsonb) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_admin(),private.admin_snapshot(),private.admin_manage(text,jsonb),public.is_admin(),public.admin_snapshot(),public.admin_manage(text,jsonb) to authenticated;
-- Block removed/suspended members even while an old sign-in token remains valid.
create function private.account_active() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.parent_accounts where user_id=auth.uid() and not suspended and removed_at is null)
$$;
revoke all on function private.account_active() from public,anon,authenticated;
grant execute on function private.account_active() to authenticated;
do $$ declare t text; begin
 foreach t in array array['chapters','profiles','child_profiles','chapter_members','membership_plans','memberships','books','book_copies','bookcoin_wallets','bookcoin_transactions','configuration'] loop
 execute format('create policy active_account_required on public.%I as restrictive for all to authenticated using ((select private.account_active())) with check ((select private.account_active()))',t);
 end loop;
end $$;

-- A hidden copy stays hidden even if another copy of its title is published.
drop policy copies_read on public.book_copies;
create policy copies_read on public.book_copies for select to authenticated using(owner_id=(select auth.uid()) or (availability in ('Available','Reserved','On Loan') and chapter_id=(select chapter_id from public.profiles where id=(select auth.uid()))));
