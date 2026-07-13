-- Address editing for the location pin editors.
--
-- Warung address already lives on accounts.address. Manufacturers had no textual
-- ship-from address (only origin coords), so add one. It feeds the Biteship
-- booking origin, the return destination, and the printed label.
alter table manufacturers add column if not exists origin_address text;

-- Seed it from the manufacturer's account address so existing rows aren't blank.
update manufacturers m
   set origin_address = a.address
  from accounts a
 where a.id = m.account_id
   and m.origin_address is null;

-- New manufacturer signups: carry the signup address into the ship-from address.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role_text text := new.raw_user_meta_data ->> 'role';
  v_role      account_role;
  v_name      text := coalesce(new.raw_user_meta_data ->> 'full_name', new.email);
  v_business  text := coalesce(new.raw_user_meta_data ->> 'business_name', v_name);
  v_address   text := new.raw_user_meta_data ->> 'address';
  v_phone     text := new.raw_user_meta_data ->> 'phone';
  v_lat       double precision := nullif(new.raw_user_meta_data ->> 'latitude', '')::double precision;
  v_lng       double precision := nullif(new.raw_user_meta_data ->> 'longitude', '')::double precision;
begin
  if v_role_text is null
     or v_role_text not in ('warung', 'manufacturer', 'distributor') then
    return new;
  end if;

  v_role := v_role_text::account_role;

  insert into accounts (id, role, full_name, phone, address, latitude, longitude)
    values (new.id, v_role, v_name, v_phone, v_address, v_lat, v_lng);

  if v_role = 'warung' then
    insert into warungs (account_id, shop_name, address) values (new.id, v_business, v_address);
  elsif v_role = 'manufacturer' then
    insert into manufacturers (account_id, company_name, origin_latitude, origin_longitude, origin_address)
      values (new.id, v_business, v_lat, v_lng, v_address);
  elsif v_role = 'distributor' then
    insert into distributors (account_id, company_name) values (new.id, v_business);
  end if;

  return new;
end;
$$;

-- Extend the self-service location RPC to also set the address. Drop the old
-- 2-arg version so callers converge on one signature.
drop function if exists set_my_location(double precision, double precision);

create or replace function set_my_location(
  p_lat     double precision,
  p_lng     double precision,
  p_address text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update accounts
     set latitude  = p_lat,
         longitude = p_lng,
         address   = coalesce(p_address, address)
   where id = auth.uid();
end;
$$;

revoke all on function set_my_location(double precision, double precision, text) from public;
grant execute on function set_my_location(double precision, double precision, text) to authenticated;
