-- ============================================================
-- Multi-origin shipping (stage 1): ship each manufacturer's items from that
-- manufacturer's own location. Adds a readable ship-from location on
-- manufacturers, a per-manufacturer shipment row per order, and exposes
-- manufacturer_id in the catalog so the shop can group by seller.
-- ============================================================

-- Ship-from location on manufacturers (readable by buyers via mfr_read, so the
-- rate lookup can use it; accounts.latitude is self-only and unusable here).
alter table manufacturers
  add column origin_latitude  double precision,
  add column origin_longitude double precision;

update manufacturers m
  set origin_latitude = a.latitude, origin_longitude = a.longitude
  from accounts a
  where a.id = m.account_id;

-- One shipment per (order, manufacturer).
create table order_shipments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders (id) on delete cascade,
  manufacturer_id    uuid not null references manufacturers (account_id) on delete restrict,
  courier            text not null,
  service            text not null,
  fee                bigint not null default 0 check (fee >= 0),
  tracking_number    text,
  shipping_order_ref text,
  status             text,
  created_at         timestamptz not null default now(),
  unique (order_id, manufacturer_id)
);

alter table order_shipments enable row level security;
create policy order_shipments_read on order_shipments for select
  using (is_admin() or manufacturer_id = auth.uid() or owns_order(order_id));
create policy order_shipments_warung_insert on order_shipments for insert
  with check (owns_order(order_id));
create policy order_shipments_admin on order_shipments for all
  using (is_admin()) with check (is_admin());

-- Expose manufacturer_id in the catalog view (appended to keep column order).
create or replace view catalog as
select
  v.id            as variant_id,
  v.variant_name,
  v.net_price,
  p.id            as product_id,
  p.name          as product_name,
  p.brand,
  p.category,
  round(v.net_price * (1 + m.fee_rate))::bigint as sell_price,
  v.weight,
  p.manufacturer_id
from product_variants v
join products      p on p.id = v.product_id
join manufacturers m on m.account_id = p.manufacturer_id
where v.is_active and p.is_active;

-- Signup also records the manufacturer's origin from the chosen location.
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
    insert into manufacturers (account_id, company_name, origin_latitude, origin_longitude)
      values (new.id, v_business, v_lat, v_lng);
  elsif v_role = 'distributor' then
    insert into distributors (account_id, company_name) values (new.id, v_business);
  end if;

  return new;
end;
$$;
