-- ============================================================
-- Address + GPS location captured at signup, stored on accounts
-- (uniform across all party types).
-- ============================================================

alter table accounts
  add column address   text,
  add column latitude  double precision,
  add column longitude double precision;

alter table accounts
  add constraint accounts_latitude_range
    check (latitude is null or latitude between -90 and 90),
  add constraint accounts_longitude_range
    check (longitude is null or longitude between -180 and 180);

-- Extend the signup handler to also capture address + GPS from the metadata
-- the client passes to supabase.auth.signUp({ options: { data: { ... } } }).
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
  v_address   text := new.raw_user_meta_data ->> 'address';
  v_lat       double precision := nullif(new.raw_user_meta_data ->> 'latitude', '')::double precision;
  v_lng       double precision := nullif(new.raw_user_meta_data ->> 'longitude', '')::double precision;
begin
  if v_role_text is null
     or v_role_text not in ('warung', 'manufacturer', 'distributor') then
    return new;
  end if;

  v_role := v_role_text::account_role;

  insert into accounts (id, role, full_name, address, latitude, longitude)
    values (new.id, v_role, v_name, v_address, v_lat, v_lng);

  if v_role = 'warung' then
    insert into warungs (account_id, shop_name, address) values (new.id, v_business, v_address);
  elsif v_role = 'manufacturer' then
    insert into manufacturers (account_id, company_name) values (new.id, v_business);
  elsif v_role = 'distributor' then
    insert into distributors (account_id, company_name) values (new.id, v_business);
  end if;

  return new;
end;
$$;
