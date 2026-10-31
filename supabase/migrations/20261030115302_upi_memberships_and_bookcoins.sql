-- Manual UPI verification, server-priced requests and atomic, idempotent credits.
insert into public.configuration(key,value) values('upi_mobile','"9820737429"'::jsonb) on conflict(key) do nothing;
create table public.payment_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 kind text not null check(kind in ('membership','coin_pack')), plan_id text references public.membership_plans(id), plan_name text,
 billing_interval text check(billing_interval in ('monthly','annual')), amount integer not null check(amount>0), coins integer not null check(coins>=0),
 payer_name text not null check(length(trim(payer_name)) between 1 and 80), transaction_reference text not null unique check(transaction_reference ~ '^[A-Z0-9]{6,64}$'),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 admin_notes text not null default '' check(length(admin_notes)<=500), created_at timestamptz not null default now(),
 reviewed_at timestamptz, reviewed_by uuid references public.profiles(id),
 check((kind='membership' and plan_id is not null and billing_interval is not null) or (kind='coin_pack' and plan_id is null and billing_interval is null))
);
create index payment_requests_user_idx on public.payment_requests(user_id,created_at desc);
create index payment_requests_reviewer_idx on public.payment_requests(reviewed_by);
create index payment_requests_plan_idx on public.payment_requests(plan_id);
create unique index payment_requests_one_pending_idx on public.payment_requests(user_id,kind) where status='pending';
alter table public.payment_requests enable row level security;
revoke all on public.payment_requests from public,anon,authenticated;
grant select on public.payment_requests to authenticated;
create policy own_payment_requests on public.payment_requests for select to authenticated using(user_id=(select auth.uid()) and (select private.account_active()));
alter table public.memberships add column payment_request_id uuid unique references public.payment_requests(id);

-- This helper is backend-only. Browser callers cannot credit wallets, even as an admin.
create function private.credit_bookcoins(p_user uuid,p_amount integer,p_type text,p_ref_type text,p_ref uuid,p_notes text) returns void
language plpgsql security definer set search_path='' as $$
declare before_balance integer;
begin
 if p_amount<=0 then return; end if;
 insert into public.bookcoin_wallets(user_id,balance) values(p_user,0) on conflict(user_id) do nothing;
 select balance into before_balance from public.bookcoin_wallets where user_id=p_user for update;
 if exists(select 1 from public.bookcoin_transactions where user_id=p_user and transaction_type=p_type and reference_type=p_ref_type and reference_id=p_ref) then return; end if;
 update public.bookcoin_wallets set balance=balance+p_amount where user_id=p_user;
 insert into public.bookcoin_transactions(user_id,amount,transaction_type,reference_type,reference_id,balance_before,balance_after,created_by,notes)
 values(p_user,p_amount,p_type,p_ref_type,p_ref,before_balance,before_balance+p_amount,auth.uid(),p_notes);
end $$;
revoke all on function private.credit_bookcoins(uuid,integer,text,text,uuid,text) from public,anon,authenticated;

create function private.reward_book_listing(p_copy uuid) returns void language plpgsql security definer set search_path='' as $$
declare member uuid; reward integer; cap integer; earned integer;
begin
 select owner_id into member from public.book_copies where id=p_copy;
 -- Only real active accounts qualify; development-only public profiles never earn credits.
 if not exists(select 1 from public.parent_accounts where user_id=member and not suspended and removed_at is null) then return; end if;
 perform 1 from public.bookcoin_wallets where user_id=member for update;
 if exists(select 1 from public.bookcoin_transactions where user_id=member and transaction_type='listing_reward' and reference_type='book_copy' and reference_id=p_copy) then return; end if;
 select greatest(0,(value->>'listing')::integer),greatest(0,(value->>'listing_annual_cap')::integer) into reward,cap from public.configuration where key='economy';
 select coalesce(sum(amount),0)::integer into earned from public.bookcoin_transactions where user_id=member and transaction_type='listing_reward' and created_at>now()-interval '365 days';
 reward:=least(coalesce(reward,0),greatest(0,coalesce(cap,0)-earned));
 perform private.credit_bookcoins(member,reward,'listing_reward','book_copy',p_copy,'Book upload reward');
end $$;
revoke all on function private.reward_book_listing(uuid) from public,anon,authenticated;
create function private.on_book_listing() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.reward_book_listing(new.id); return new; end $$;
revoke all on function private.on_book_listing() from public,anon,authenticated;
create trigger credit_book_upload after insert on public.book_copies for each row execute function private.on_book_listing();
-- Repair existing missing upload rewards once, without rewriting the immutable ledger.
do $$ declare copy_id uuid; begin
 for copy_id in select id from public.book_copies order by created_at,id loop perform private.reward_book_listing(copy_id); end loop;
end $$;

create function private.has_active_membership(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where user_id=p_user and status='active' and starts_at<=now() and ends_at>now())
$$;
revoke all on function private.has_active_membership(uuid) from public,anon,authenticated;

create function private.member_finance() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.account_active() then raise exception 'An active member account is required' using errcode='42501'; end if;
 return jsonb_build_object(
 'active',private.has_active_membership(auth.uid()),
 'balance',(select balance from public.bookcoin_wallets where user_id=auth.uid()),
 'ledger',coalesce((select jsonb_agg(t order by t.created_at desc) from (select * from public.bookcoin_transactions where user_id=auth.uid() order by created_at desc limit 100)t),'[]'::jsonb),
 'membership',(select to_jsonb(m) from (select m.*,p.name as plan_name from public.memberships m join public.membership_plans p on p.id=m.plan_id where m.user_id=auth.uid() order by m.ends_at desc limit 1)m),
 'requests',coalesce((select jsonb_agg(r order by r.created_at desc) from (select * from public.payment_requests where user_id=auth.uid() order by created_at desc limit 100)r),'[]'::jsonb),
 'packs',(select value from public.configuration where key='coin_packs'),
 'upi_mobile',(select value from public.configuration where key='upi_mobile')
 );
end $$;
create function public.member_finance() returns jsonb language sql security invoker set search_path='' as $$select private.member_finance()$$;

create function private.request_upi_payment(p_kind text,p_plan text,p_interval text,p_coins integer,p_payer text,p_reference text,p_expected_amount integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare requested uuid; price integer; coins integer; plan_name text; ref text; member uuid:=auth.uid();
begin
 if not private.account_active() then raise exception 'An active member account is required' using errcode='42501'; end if;
 -- Serialize requests and approvals per member. Pending uniqueness and global UTR uniqueness prevent replay.
 perform 1 from public.bookcoin_wallets where user_id=member for update;
 if length(trim(coalesce(p_payer,''))) not between 1 and 80 then raise exception 'Enter the payer name'; end if;
 ref:=upper(regexp_replace(coalesce(p_reference,''),'[\s-]','','g'));
 if ref !~ '^[A-Z0-9]{6,64}$' then raise exception 'Enter a valid UPI transaction ID or UTR (6 to 64 letters or digits)'; end if;
 if exists(select 1 from public.payment_requests where user_id=member and kind=p_kind and status='pending') then raise exception 'A payment request is already awaiting review'; end if;
 if p_kind='membership' then
  if private.has_active_membership(member) then raise exception 'Your paid membership is already active'; end if;
  if p_interval not in ('monthly','annual') or p_interval is null then raise exception 'Choose monthly or yearly membership'; end if;
  select case when p_interval='annual' then annual_price else monthly_price end,signup_coins,name into price,coins,plan_name from public.membership_plans where id=p_plan;
  if not found then raise exception 'Membership plan not found'; end if;
 elsif p_kind='coin_pack' then
  if not private.has_active_membership(member) then raise exception 'BookCoin purchases require an approved active paid membership'; end if;
  select (pack->>'price')::integer,(pack->>'coins')::integer into price,coins from public.configuration c cross join lateral jsonb_array_elements(c.value) pack where c.key='coin_packs' and (pack->>'coins')::integer=p_coins;
  if not found then raise exception 'BookCoin pack not found'; end if;
 else raise exception 'Choose a membership or BookCoin pack'; end if;
 if p_expected_amount is distinct from price then raise exception 'The price has changed. Refresh the plan or coin pack before submitting; contact the admin if you already paid the previous amount'; end if;
 if price is null or price<=0 or coins is null or coins<0 then raise exception 'Payment configuration is unavailable'; end if;
 insert into public.payment_requests(user_id,kind,plan_id,plan_name,billing_interval,amount,coins,payer_name,transaction_reference)
 values(member,p_kind,case when p_kind='membership' then p_plan end,plan_name,case when p_kind='membership' then p_interval end,price,coins,trim(p_payer),ref) returning id into requested;
 return requested;
exception when unique_violation then raise exception 'This UPI transaction ID has already been submitted';
end $$;
create function public.request_upi_payment(p_kind text,p_plan text,p_interval text,p_coins integer,p_payer text,p_reference text,p_expected_amount integer) returns uuid
language sql security invoker set search_path='' as $$select private.request_upi_payment(p_kind,p_plan,p_interval,p_coins,p_payer,p_reference,p_expected_amount)$$;

create function private.admin_finance_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 return jsonb_build_object('payments',coalesce((select jsonb_agg(r order by r.created_at desc) from (select r.*,p.display_name from public.payment_requests r join public.profiles p on p.id=r.user_id order by r.created_at desc limit 1000)r),'[]'::jsonb),'memberships',coalesce((select jsonb_agg(m order by m.created_at desc) from public.memberships m),'[]'::jsonb));
end $$;
create function public.admin_finance_snapshot() returns jsonb language sql security invoker set search_path='' as $$select private.admin_finance_snapshot()$$;

create function private.review_upi_payment(p_id uuid,p_approve boolean,p_notes text) returns void
language plpgsql security definer set search_path='' as $$
declare payment public.payment_requests%rowtype; started timestamptz; finished timestamptz;
begin
 if not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if p_approve is null or length(coalesce(p_notes,''))>500 then raise exception 'Choose a decision and keep notes below 500 characters'; end if;
 select * into payment from public.payment_requests where id=p_id for update;
 if not found then raise exception 'Payment request not found'; end if;
 if payment.status='approved' and p_approve then return; end if;
 if payment.status<>'pending' then raise exception 'This payment request has already been reviewed'; end if;
 perform 1 from public.bookcoin_wallets where user_id=payment.user_id for update;
 if p_approve then
  if not exists(select 1 from public.parent_accounts where user_id=payment.user_id and not suspended and removed_at is null) then raise exception 'Restore this member account before approving payment'; end if;
  if payment.kind='membership' then
   if private.has_active_membership(payment.user_id) then raise exception 'The member already has an active paid membership'; end if;
   started:=now(); finished:=started+case when payment.billing_interval='annual' then interval '1 year' else interval '1 month' end;
   insert into public.memberships(user_id,plan_id,billing_interval,status,starts_at,ends_at,payment_request_id)
   values(payment.user_id,payment.plan_id,payment.billing_interval,'active',started,finished,payment.id);
   perform private.credit_bookcoins(payment.user_id,payment.coins,'membership_welcome','payment_request',payment.id,'Welcome BookCoins for approved '||payment.plan_name||' membership');
   update public.chapter_members cm set status='approved' from public.profiles p where p.id=payment.user_id and cm.user_id=p.id and cm.chapter_id=p.chapter_id;
  else
   if not private.has_active_membership(payment.user_id) then raise exception 'An approved active membership is required before coin purchase approval'; end if;
   perform private.credit_bookcoins(payment.user_id,payment.coins,'coin_purchase','payment_request',payment.id,'Admin-verified UPI BookCoin purchase');
  end if;
 end if;
 update public.payment_requests set status=case when p_approve then 'approved' else 'rejected' end,admin_notes=coalesce(p_notes,''),reviewed_at=now(),reviewed_by=auth.uid() where id=p_id;
 insert into private.admin_activity(actor_id,action,target,details) values(auth.uid(),case when p_approve then 'payment_approved' else 'payment_rejected' end,p_id::text,jsonb_build_object('member',payment.user_id,'kind',payment.kind,'amount',payment.amount,'coins',payment.coins));
end $$;
create function public.review_upi_payment(p_id uuid,p_approve boolean,p_notes text) returns void language sql security invoker set search_path='' as $$select private.review_upi_payment(p_id,p_approve,p_notes)$$;
revoke all on function private.member_finance(),public.member_finance(),private.request_upi_payment(text,text,text,integer,text,text,integer),public.request_upi_payment(text,text,text,integer,text,text,integer),private.admin_finance_snapshot(),public.admin_finance_snapshot(),private.review_upi_payment(uuid,boolean,text),public.review_upi_payment(uuid,boolean,text) from public,anon,authenticated;
grant execute on function private.member_finance(),public.member_finance(),private.request_upi_payment(text,text,text,integer,text,text,integer),public.request_upi_payment(text,text,text,integer,text,text,integer),private.admin_finance_snapshot(),public.admin_finance_snapshot(),private.review_upi_payment(uuid,boolean,text),public.review_upi_payment(uuid,boolean,text) to authenticated;

create or replace function public.submit_book(p_book jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare book_id uuid; copy_id uuid; chapter uuid; photos text[];
begin
 if auth.uid() is null then raise exception 'Member sign-in required'; end if;
 select chapter_id into chapter from public.profiles where id=auth.uid();
 if chapter is null then raise exception 'A primary chapter is required'; end if;
 select coalesce(array_agg(value order by ordinality),'{}'::text[]) into photos from jsonb_array_elements_text(coalesce(p_book->'photo_paths','[]'::jsonb)) with ordinality as items(value,ordinality);
 insert into public.books(title,author,isbn,age_band,genre,language,description,cover_url,submitted_by)
 values(trim(p_book->>'title'),trim(p_book->>'author'),coalesce(p_book->>'isbn',''),p_book->>'age_band',p_book->>'genre',p_book->>'language',coalesce(p_book->>'description',''),nullif(p_book->>'cover_url',''),auth.uid()) returning id into book_id;
 insert into public.book_copies(book_id,owner_id,chapter_id,condition,protected_value,photo_paths)
 values(book_id,auth.uid(),chapter,p_book->>'condition',(p_book->>'protected_value')::integer,photos) returning id into copy_id;
 return copy_id;
end $$;
