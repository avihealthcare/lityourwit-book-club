-- Copy-specific photographs are private and follow the book's chapter visibility.
create function private.valid_book_photo_paths(paths text[], owner uuid) returns boolean
language sql immutable security invoker set search_path='' as $$
 select paths is not null and cardinality(paths)<=6 and
 not exists(select 1 from unnest(paths) p where p is null or p !~ ('^'||owner::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'))
 and cardinality(paths)=(select count(distinct p) from unnest(paths) p)
$$;
revoke all on function private.valid_book_photo_paths(text[],uuid) from public,anon;
grant execute on function private.valid_book_photo_paths(text[],uuid) to authenticated;
alter table public.book_copies add column photo_paths text[] not null default '{}';
alter table public.book_copies add constraint book_copy_photos_owned check(private.valid_book_photo_paths(photo_paths,owner_id));
create index book_copies_photos_idx on public.book_copies using gin(photo_paths);
grant update(photo_paths) on public.book_copies to authenticated;
create policy own_book_photo_update on public.book_copies for update to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create or replace view public.catalogue with(security_invoker=true) as
 select c.id,b.title,b.author,b.isbn,b.age_band,b.genre,b.language,b.description,b.color,b.motif,b.cover_url,c.owner_id,c.chapter_id,c.condition,c.availability,c.protected_value,c.shared,c.created_at,c.photo_paths
 from public.book_copies c join public.books b on b.id=c.book_id;

create or replace function public.submit_book(p_book jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare book_id uuid; copy_id uuid; chapter uuid; photos text[];
begin
 if auth.uid() is null then raise exception 'Parent sign-in required'; end if;
 select chapter_id into chapter from public.profiles where id=auth.uid();
 if chapter is null then raise exception 'A primary chapter is required'; end if;
 select coalesce(array_agg(value order by ordinality),'{}'::text[]) into photos from jsonb_array_elements_text(coalesce(p_book->'photo_paths','[]'::jsonb)) with ordinality as items(value,ordinality);
 insert into public.books(title,author,isbn,age_band,genre,language,description,cover_url,submitted_by)
 values(trim(p_book->>'title'),trim(p_book->>'author'),coalesce(p_book->>'isbn',''),p_book->>'age_band',p_book->>'genre',p_book->>'language',coalesce(p_book->>'description',''),nullif(p_book->>'cover_url',''),auth.uid()) returning id into book_id;
 insert into public.book_copies(book_id,owner_id,chapter_id,condition,protected_value,photo_paths)
 values(book_id,auth.uid(),chapter,p_book->>'condition',(p_book->>'protected_value')::integer,photos) returning id into copy_id;
 return copy_id;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('book-photos','book-photos',false,2097152,array['image/jpeg']);
create policy book_photos_upload on storage.objects for insert to authenticated with check(
 bucket_id='book-photos' and (select private.account_active()) and private.valid_book_photo_paths(array[name],(select auth.uid()))
);
create policy book_photos_read on storage.objects for select to authenticated using(
 bucket_id='book-photos' and (select private.account_active()) and (
 private.valid_book_photo_paths(array[name],(select auth.uid())) or (select private.is_admin()) or exists(
 select 1 from public.book_copies c join public.books b on b.id=c.book_id
 where c.photo_paths @> array[storage.objects.name] and b.published and c.availability in ('Available','Reserved','On Loan')
 and c.chapter_id=(select chapter_id from public.profiles where id=(select auth.uid()))
 ))
);
-- Only unattached owner uploads can be removed; linked photos remain available.
create policy book_photos_cleanup on storage.objects for delete to authenticated using(
 bucket_id='book-photos' and (select private.account_active()) and private.valid_book_photo_paths(array[name],(select auth.uid()))
 and not exists(select 1 from public.book_copies where photo_paths @> array[storage.objects.name])
);
