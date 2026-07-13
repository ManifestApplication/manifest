-- ============================================================
-- Identity & onboarding
-- Who can use HALINEST, and which community they belong to.
-- ============================================================

-- The four kinds of account. An enum means Postgres itself rejects any value
-- outside this list — you can never accidentally store role = 'manufaturer'.
create type account_role as enum ('admin', 'manufacturer', 'warung', 'distributor');

-- A community = one tenant group (the chart's "extendable to many communities").
create table communities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- One row per user. Its id IS the Supabase Auth user id (auth.users.id),
-- so "an account" and "a login" are the same entity.
create table accounts (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         account_role not null,
  full_name    text not null,
  phone        text,
  community_id uuid references communities (id) on delete set null,
  created_at   timestamptz not null default now()
);


-- ============================================================
-- Party detail tables (the "is-a" rows)
-- account_id is BOTH primary key AND foreign key to accounts:
--   FK → the detail row must match a real account
--   PK → at most one detail row per account (a true 1:1)
-- ============================================================

-- Warung = community retailer (the buyer).
create table warungs (
  account_id  uuid primary key references accounts (id) on delete cascade,
  shop_name   text not null,
  address     text,
  created_at  timestamptz not null default now()
);

-- Manufacturer = seller. Carries its own fee_rate (the +3% HALINEST adds on top
-- of the net price), overridable per manufacturer; defaults to 3%.
create table manufacturers (
  account_id         uuid primary key references accounts (id) on delete cascade,
  company_name       text not null,
  fee_rate           numeric(5,4) not null default 0.03 check (fee_rate >= 0 and fee_rate < 1),
  contract_signed_at timestamptz,
  created_at         timestamptz not null default now()
);

-- Distributor = logistics. May be HALINEST-internal or a 3rd party,
-- and earns a shipping commission_rate.
create type distributor_type as enum ('internal', 'third_party');

create table distributors (
  account_id      uuid primary key references accounts (id) on delete cascade,
  company_name    text not null,
  type            distributor_type not null default 'third_party',
  commission_rate numeric(5,4) not null default 0.05 check (commission_rate >= 0 and commission_rate < 1),
  created_at      timestamptz not null default now()
);


-- ============================================================
-- Catalog & pricing
-- ============================================================

-- A product belongs to one manufacturer (the seller).
create table products (
  id              uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references manufacturers (account_id) on delete cascade,
  category        text not null,
  brand           text not null,
  name            text not null,
  is_active       boolean not null default true,   -- soft on/off without deleting
  created_at      timestamptz not null default now()
);

-- A variant is the actual buyable unit. Price lives HERE.
create table product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references products (id) on delete cascade,
  variant_name     text not null,                          -- "Box of 40", "Single"
  net_price        bigint not null check (net_price >= 0), -- IDR, whole rupiah
  guaranteed_stock integer not null default 0 check (guaranteed_stock >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- Selling price is DERIVED, never stored: net_price grossed up by the
-- manufacturer's fee_rate, rounded to whole rupiah. A view recomputes it
-- on every read, so it can never go stale.
create view variant_prices as
select
  v.id            as variant_id,
  v.product_id,
  p.manufacturer_id,
  v.net_price,
  m.fee_rate,
  round(v.net_price * (1 + m.fee_rate))::bigint as sell_price
from product_variants v
join products      p on p.id = v.product_id
join manufacturers m on m.account_id = p.manufacturer_id;

-- Tiered discount: "buy >= min_qty of this variant, take discount_pct off."
create table quantity_discounts (
  id           uuid primary key default gen_random_uuid(),
  variant_id   uuid not null references product_variants (id) on delete cascade,
  min_qty      integer not null check (min_qty > 0),
  discount_pct numeric(5,4) not null check (discount_pct >= 0 and discount_pct < 1),
  created_at   timestamptz not null default now(),
  unique (variant_id, min_qty)   -- one rule per (variant, threshold)
);


-- ============================================================
-- Orders & money math
-- ============================================================

create type order_status as enum
  ('cart', 'placed', 'paid', 'shipped', 'delivered', 'closed', 'cancelled');

create table orders (
  id          uuid primary key default gen_random_uuid(),
  warung_id   uuid not null references warungs (account_id) on delete restrict,
  status      order_status not null default 'placed',
  subtotal    bigint not null default 0,   -- Σ line_subtotal  (trigger fills)
  fee_amount  bigint not null default 0,   -- HALINEST fee      (trigger fills)
  total       bigint not null default 0,   -- subtotal + fee    (trigger fills)
  created_at  timestamptz not null default now()
);

create table order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders (id) on delete cascade,
  variant_id     uuid not null references product_variants (id) on delete restrict,
  qty            integer not null check (qty > 0),
  unit_net_price bigint  not null check (unit_net_price >= 0),  -- client input (snapshot)
  discount_pct   numeric(5,4) not null default 0 check (discount_pct >= 0 and discount_pct < 1),
  fee_rate       numeric(5,4) not null default 0,   -- trigger fills (from manufacturer)
  line_subtotal  bigint not null default 0,         -- trigger fills
  line_fee       bigint not null default 0          -- trigger fills
);

-- Runs on each order_items row as it's written. It MODIFIES the row (NEW),
-- so it must be a BEFORE trigger — that's the only phase where changing NEW
-- actually affects what gets stored.
create or replace function order_items_fill()
returns trigger language plpgsql as $$
declare
  v_fee_rate numeric(5,4);
begin
  -- find the manufacturer's fee_rate for this variant
  select m.fee_rate into v_fee_rate
  from product_variants v
  join products      p on p.id = v.product_id
  join manufacturers m on m.account_id = p.manufacturer_id
  where v.id = NEW.variant_id;

  NEW.fee_rate      := coalesce(v_fee_rate, 0);
  NEW.line_subtotal := round(NEW.qty * NEW.unit_net_price * (1 - NEW.discount_pct))::bigint;
  NEW.line_fee      := round(NEW.line_subtotal * NEW.fee_rate)::bigint;
  return NEW;   -- the (now-filled) row is what gets saved
end;
$$;

create trigger order_items_fill
before insert or update on order_items
for each row execute function order_items_fill();

-- Runs AFTER a line is inserted/updated/deleted, then re-sums all of that
-- order's lines into the parent orders row. It UPDATES OTHER rows (not NEW),
-- so AFTER is correct here — the line is already saved and summable.
create or replace function orders_recompute()
returns trigger language plpgsql as $$
declare
  v_order_id uuid := coalesce(NEW.order_id, OLD.order_id);
begin
  update orders o
  set subtotal   = coalesce(s.sub, 0),
      fee_amount = coalesce(s.fee, 0),
      total      = coalesce(s.sub, 0) + coalesce(s.fee, 0)
  from (
    select sum(line_subtotal) as sub, sum(line_fee) as fee
    from order_items where order_id = v_order_id
  ) s
  where o.id = v_order_id;
  return null;   -- AFTER triggers ignore the return value
end;
$$;

create trigger orders_recompute
after insert or update or delete on order_items
for each row execute function orders_recompute();


-- ============================================================
-- Payments (manual) & settlement split
-- ============================================================

create type payment_status as enum ('pending','confirmed','settled','failed','refunded');
create type payment_method as enum ('manual_transfer','midtrans_snap');  -- snap reserved for later

create table payments (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null unique references orders (id) on delete cascade,
  amount            bigint not null check (amount >= 0),
  status            payment_status not null default 'pending',
  method            payment_method not null default 'manual_transfer',
  payment_reference text,          -- buyer's transfer ref
  proof_url         text,          -- optional uploaded proof
  confirmed_by      uuid references accounts (id) on delete set null,  -- which operator
  confirmed_at      timestamptz,
  confirmation_note text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Who gets paid out of a confirmed payment, and how much.
create type settlement_payee as enum ('manufacturer','halinest','distributor');

create table settlements (
  id               uuid primary key default gen_random_uuid(),
  payment_id       uuid not null references payments (id) on delete cascade,
  payee_type       settlement_payee not null,
  payee_account_id uuid references accounts (id),  -- null for halinest (the platform itself)
  amount           bigint not null check (amount >= 0),
  created_at       timestamptz not null default now()
);

-- Append-only log of every payment status change.
create table payment_events (
  id          uuid primary key default gen_random_uuid(),
  payment_id  uuid not null references payments (id) on delete cascade,
  from_status payment_status,        -- null on creation
  to_status   payment_status not null,
  actor_id    uuid references accounts (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

-- Idempotency guard: at most ONE 'confirmed' event per payment, so a confirm
-- can never be recorded — or settled — twice.
create unique index payment_events_one_confirm_per_payment
  on payment_events (payment_id) where to_status = 'confirmed';

-- Log the initial event when a payment is created.
create or replace function payment_log_create()
returns trigger language plpgsql as $$
begin
  insert into payment_events (payment_id, from_status, to_status, note)
  values (NEW.id, null, NEW.status, 'payment created');
  return null;
end; $$;

create trigger payment_log_create
after insert on payments
for each row execute function payment_log_create();


-- THE SPLIT. Fires only on the transition INTO 'confirmed'.
create or replace function payment_split()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'confirmed' and OLD.status is distinct from 'confirmed' then

    -- net → each manufacturer (their share of this order's lines)
    insert into settlements (payment_id, payee_type, payee_account_id, amount)
    select NEW.id, 'manufacturer', p.manufacturer_id, sum(oi.line_subtotal)
    from order_items oi
    join product_variants v on v.id = oi.variant_id
    join products p on p.id = v.product_id
    where oi.order_id = NEW.order_id
    group by p.manufacturer_id;

    -- fee → HALINEST
    insert into settlements (payment_id, payee_type, payee_account_id, amount)
    select NEW.id, 'halinest', null, sum(oi.line_fee)
    from order_items oi
    where oi.order_id = NEW.order_id
    having sum(oi.line_fee) > 0;

    -- audit + advance the order
    insert into payment_events (payment_id, from_status, to_status, actor_id, note)
    values (NEW.id, OLD.status, NEW.status, NEW.confirmed_by, NEW.confirmation_note);

    update orders set status = 'paid' where id = NEW.order_id;
  end if;
  return null;
end; $$;

create trigger payment_split
after update on payments
for each row execute function payment_split();
