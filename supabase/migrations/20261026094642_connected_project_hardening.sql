-- Cover foreign-key lookups used by the live catalogue and account operations.
create index book_copies_book_idx on public.book_copies(book_id);
create index profiles_chapter_idx on public.profiles(chapter_id);
create index memberships_plan_idx on public.memberships(plan_id);
create index bookcoin_transactions_created_by_idx on public.bookcoin_transactions(created_by);
-- Explicit default deny; the unexposed roles table is backend-only.
create policy role_records_backend_only on private.user_roles for all to authenticated using(false) with check(false);
