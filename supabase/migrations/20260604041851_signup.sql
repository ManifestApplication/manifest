-- ============================================================
-- Self-service signup: when a new auth user is created, build their
-- accounts row + party detail row from the signup metadata.
-- ============================================================
-- The client calls supabase.auth.signUp({ email, password, options: { data: {
--   role, full_name, business_name } } }); that `data` lands in
-- auth.users.raw_user_meta_data, which this trigger reads.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_text text := new.raw_user_meta_data ->> 'role';
  v_role      account_role;
  v_name      text := coalesce(new.raw_user_meta_data ->> 'full_name', new.email);
  v_business  text := coalesce(new.raw_user_meta_data ->> 'business_name', v_name);
begin
  -- SECURITY: only the three self-service roles. Anything else (incl. 'admin',
  -- or no role at all — e.g. the seeded users) is ignored, so signup can never
  -- mint a privileged account.
  if v_role_text is null
     or v_role_text not in ('warung', 'manufacturer', 'distributor') then
    return new;
  end if;

  v_role := v_role_text::account_role;

  insert into accounts (id, role, full_name) values (new.id, v_role, v_name);

  if v_role = 'warung' then
    insert into warungs (account_id, shop_name) values (new.id, v_business);
  elsif v_role = 'manufacturer' then
    insert into manufacturers (account_id, company_name) values (new.id, v_business);
  elsif v_role = 'distributor' then
    insert into distributors (account_id, company_name) values (new.id, v_business);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();
