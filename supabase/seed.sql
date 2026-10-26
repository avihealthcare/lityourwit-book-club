-- Fictional development data ONLY. No emails, home addresses, phone numbers or child DOBs.
insert into public.profiles(id,display_name,chapter_id,trust_level)
select ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'Demo Family '||i,'11111111-1111-4111-8111-111111111111',case when i%3=0 then 'Trusted Reader' else 'New Reader' end
from generate_series(1,50) i on conflict do nothing;
insert into public.books(id,title,author,isbn,age_band,genre,description,color,motif,submitted_by,published)
select ('10000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
case i when 1 then 'The Wild Robot' when 2 then 'Matilda' when 3 then 'The Secret Garden' when 4 then 'The Little Prince' when 5 then 'The Jungle Book' when 6 then 'Treasure Island' else 'Little Discovery '||i end,
case i when 1 then 'Peter Brown' when 2 then 'Roald Dahl' when 3 then 'Frances Hodgson Burnett' when 4 then 'Antoine de Saint-Exupéry' when 5 then 'Rudyard Kipling' when 6 then 'Robert Louis Stevenson' else 'LitYourWit Discovery Series' end,
'',(array['5–7','8–10','11–14'])[1+i%3],(array['Adventure','Fantasy','Mystery','Humour','Science','Classics','General Knowledge'])[1+i%7],
'An original placeholder catalogue entry for the founding chapter. Original typographic cover artwork; no copyrighted cover stored.',
(array['#244d52','#a74b57','#63815a','#283e64','#c47d34','#477c83'])[1+i%6],
(array['robot','stars','flower','moon','sun','planet'])[1+i%6],
('00000000-0000-4000-8000-'||lpad((1+i%50)::text,12,'0'))::uuid,true
from generate_series(1,210) i on conflict do nothing;
insert into public.book_copies(id,book_id,owner_id,chapter_id,condition,availability,protected_value,shared)
select ('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,('10000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
('00000000-0000-4000-8000-'||lpad((1+i%50)::text,12,'0'))::uuid,'11111111-1111-4111-8111-111111111111',
case when i%3=0 then 'Like New' else 'Good' end,case when i%13=0 then 'On Loan' else 'Available' end,150+(i%5)*50,2+i%19
from generate_series(1,210) i on conflict do nothing;
-- Demo wallets and balancing opening ledger entries for fictional public profiles.
insert into public.bookcoin_wallets(user_id,balance) select id,75 from public.profiles where id::text like '00000000-0000-4000-8000-%' on conflict do nothing;
insert into public.bookcoin_transactions(user_id,amount,transaction_type,reference_type,reference_id,balance_before,balance_after,notes)
select id,75,'demo_opening','demo',id,0,75,'Fictional demo balance; not a paid membership reward' from public.profiles where id::text like '00000000-0000-4000-8000-%' on conflict do nothing;
