-- ============================================================
-- Logistics: shipments + the distributor commission settlement leg
-- (the third leg deferred from the payments migration).
-- ============================================================

create type shipment_status as enum
  ('planned', 'loaded', 'in_transit', 'delivered', 'reconciled', 'cancelled');

create table shipments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null unique references orders (id) on delete cascade,
  distributor_id uuid not null references distributors (account_id) on delete restrict,
  status         shipment_status not null default 'planned',
  commission     bigint not null default 0,   -- trigger fills: subtotal × commission_rate
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---- settlements gains a second source: a shipment (not just a payment) ----
-- A settlement is now driven by EITHER a payment (net/fee) OR a shipment
-- (commission) — exactly one of them.
alter table settlements add column shipment_id uuid references shipments (id) on delete cascade;
alter table settlements alter column payment_id drop not null;
alter table settlements
  add constraint settlements_one_source check (num_nonnulls(payment_id, shipment_id) = 1);

-- ---- triggers: fill commission, then settle it ----

-- BEFORE: compute the commission for this shipment from the distributor's rate
-- and the order's net subtotal. (DEFINER so it can read orders/distributors past RLS.)
create or replace function shipment_fill()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_rate     numeric(5,4);
  v_subtotal bigint;
begin
  select commission_rate into v_rate from distributors where account_id = NEW.distributor_id;
  select subtotal        into v_subtotal from orders where id = NEW.order_id;
  NEW.commission := round(coalesce(v_subtotal, 0) * coalesce(v_rate, 0))::bigint;
  return NEW;
end; $$;

create trigger shipment_fill
before insert on shipments
for each row execute function shipment_fill();

-- AFTER: record the distributor's commission as a settlement (shipment-sourced).
create or replace function shipment_settle()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into settlements (shipment_id, payee_type, payee_account_id, amount)
  values (NEW.id, 'distributor', NEW.distributor_id, NEW.commission);
  return null;
end; $$;

create trigger shipment_settle
after insert on shipments
for each row execute function shipment_settle();

-- ---- RLS ----
alter table shipments enable row level security;

-- Admin: full control (assigns shipments to orders).
create policy shipments_admin on shipments for all
  using (is_admin()) with check (is_admin());

-- Distributor: reads its own assigned shipments and advances their status.
create policy shipments_distributor_read on shipments for select
  using (distributor_id = auth.uid());
create policy shipments_distributor_update on shipments for update
  using (distributor_id = auth.uid()) with check (distributor_id = auth.uid());

-- The warung (its order) and the manufacturer (its products) can see the shipment.
create policy shipments_warung_read on shipments for select using (owns_order(order_id));
create policy shipments_mfr_read    on shipments for select using (mfr_in_order(order_id));
