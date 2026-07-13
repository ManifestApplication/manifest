update public.accounts
set role = 'admin'
where id = (select id from auth.users where email = 'manifestapp.cs@gmail.com');

delete from public.manufacturers
where account_id = (select id from auth.users where email = 'manifestapp.cs@gmail.com');