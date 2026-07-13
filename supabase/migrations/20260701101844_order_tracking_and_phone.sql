-- ============================================================
-- Courier booking: tracking number on the order, admin can write it,
-- and signup captures a phone number (Biteship booking needs contact phones).
-- ============================================================

alter table orders
  add column tracking_number    text,   -- courier waybill / tracking id (resi)
  add column shipping_order_ref text;    -- Biteship order id

-- Admin needs to attach the tracking number after booking (orders had no admin
-- UPDATE policy — only SELECT).
create policy orders_admin_update on orders for update
  using (is_admin()) with check (is_admin());

-- Capture phone at signup so the courier has a destination contact number.
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
    insert into manufacturers (account_id, company_name) values (new.id, v_business);
  elsif v_role = 'distributor' then
    insert into distributors (account_id, company_name) values (new.id, v_business);
  end if;

  return new;
end;
$$;
