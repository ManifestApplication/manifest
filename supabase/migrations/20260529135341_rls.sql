-- Who am I? These read `accounts`, but a policy ON accounts that calls a
-- function that reads accounts would recurse forever. SECURITY DEFINER makes
-- the function run as its owner (postgres), which BYPASSES RLS — breaking the
-- loop. This is the standard Supabase pattern.
create or replace function auth_role()
returns account_role language sql stable
security definer set search_path = public as $$
  select role from accounts where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean language sql stable
security definer set search_path = public as $$
  select coalesce(auth_role() = 'admin', false);
$$;

-- Cross-table ownership checks, as DEFINER so they bypass RLS and can't
-- cause policy recursion.
create or replace function owns_order(p_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from orders o where o.id = p_order_id and o.warung_id = auth.uid());
$$;

create or replace function mfr_in_order(p_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from order_items oi
    join product_variants v on v.id = oi.variant_id
    join products p on p.id = v.product_id
    where oi.order_id = p_order_id and p.manufacturer_id = auth.uid());
$$;


alter table communities        enable row level security;
alter table accounts           enable row level security;
alter table warungs            enable row level security;
alter table manufacturers      enable row level security;
alter table distributors       enable row level security;
alter table products           enable row level security;
alter table product_variants   enable row level security;
alter table quantity_discounts enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table payments           enable row level security;
alter table settlements        enable row level security;
alter table payment_events     enable row level security;

-- Identity ----------------------------------------------------------------
create policy accounts_self    on accounts    for select using (id = auth.uid() or is_admin());
create policy communities_read on communities for select using (auth.uid() is not null);
create policy communities_admin on communities for all using (is_admin()) with check (is_admin());
create policy warungs_self     on warungs     for select using (account_id = auth.uid() or is_admin());
create policy mfr_read         on manufacturers for select using (auth.uid() is not null);
create policy mfr_self_write   on manufacturers for all using (account_id = auth.uid() or is_admin())
                                                with check (account_id = auth.uid() or is_admin());
create policy dist_self        on distributors for select using (account_id = auth.uid() or is_admin());

-- Catalog: anyone logged in browses ACTIVE products; a manufacturer manages its own
create policy products_read on products
  for select using (is_active or manufacturer_id = auth.uid() or is_admin());
create policy products_write on products
  for all using (manufacturer_id = auth.uid()) with check (manufacturer_id = auth.uid());

create policy variants_read on product_variants for select using (
  exists (select 1 from products p where p.id = product_id
          and (p.is_active or p.manufacturer_id = auth.uid() or is_admin())));
create policy variants_write on product_variants for all using (
  exists (select 1 from products p where p.id = product_id and p.manufacturer_id = auth.uid()))
  with check (
  exists (select 1 from products p where p.id = product_id and p.manufacturer_id = auth.uid()));

create policy discounts_read on quantity_discounts for select using (auth.uid() is not null);
create policy discounts_write on quantity_discounts for all using (
  exists (select 1 from product_variants v join products p on p.id=v.product_id
          where v.id = variant_id and p.manufacturer_id = auth.uid()))
  with check (
  exists (select 1 from product_variants v join products p on p.id=v.product_id
          where v.id = variant_id and p.manufacturer_id = auth.uid()));

-- Orders: a warung fully owns its own; admin reads all; a manufacturer reads
-- orders that contain its products (so it can fulfil them)
create policy orders_warung on orders for all
  using (warung_id = auth.uid()) with check (warung_id = auth.uid());
create policy orders_admin on orders for select using (is_admin());
create policy orders_mfr on orders for select using (mfr_in_order(id));

create policy order_items_warung on order_items for all
  using (owns_order(order_id)) with check (owns_order(order_id));
create policy order_items_read on order_items for select using (
  is_admin() or exists (select 1 from product_variants v join products p on p.id=v.product_id
          where v.id = variant_id and p.manufacturer_id = auth.uid()));

-- Payments: a warung may CREATE and READ its order's payment, but has NO update
-- policy — so it can never flip status to 'confirmed'. Only admin can. THIS is
-- "only an operator may confirm a payment", enforced by the database.
create policy payments_read on payments for select
  using (is_admin() or owns_order(order_id));
create policy payments_warung_create on payments for insert
  with check (owns_order(order_id));
create policy payments_admin on payments for all using (is_admin()) with check (is_admin());

-- Settlements: each payee reads only its own; warungs see none. Admin reads all.
create policy settlements_read on settlements for select using (
  is_admin() or payee_account_id = auth.uid());

-- Payment events: readable to whoever can read the payment
create policy payment_events_read on payment_events for select using (
  is_admin() or exists (
    select 1 from payments pm where pm.id = payment_id and owns_order(pm.order_id)));

alter function order_items_fill()  security definer;
alter function orders_recompute()  security definer;
alter function payment_log_create() security definer;
alter function payment_split()     security definer;
