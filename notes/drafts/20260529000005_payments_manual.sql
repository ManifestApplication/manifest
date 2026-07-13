-- 20260529000005_payments_manual.sql
-- Manual payment fields + payment_events (audit trail).
--
-- Payments are handled MANUALLY for now: the buyer pays the order total out-of-band
-- (e.g. bank transfer) and a platform admin confirms receipt, which flips the payment to
-- `confirmed` and fires the existing payment_split() trigger (defined in
-- 20260529000003_triggers.sql) to settle net -> manufacturer, fee -> halinest,
-- commission -> distributor.
--
-- A Midtrans (Snap) gateway is DEFERRED to the next development phase. It will slot in
-- ahead of the manual confirmation step (a charge fn + a signed notification webhook that
-- flips `payments.status` to `confirmed`); because the settlement split already keys off
-- `confirmed`, adding the gateway is additive and does not change this migration's intent.
--
-- Assumes the base schema from 20260529000001_schema.sql already defines:
--   • payment_status enum: 'pending' | 'confirmed' | 'settled' | 'failed' | 'refunded'
--   • payments(id, order_id -> orders, amount, status payment_status, created_at, updated_at)
--   • accounts(id) and the is_admin()/auth helpers used by RLS in 20260529000002_rls.sql
-- RLS policies for the tables/columns below live in the rls migration; this file is
-- structure + the idempotency guard only.

begin;

-- ---------------------------------------------------------------------------
-- 1. Payment method (manual now; gateway later, no schema change required)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('manual_transfer', 'midtrans_snap');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2. Manual-payment columns on `payments`
--    (DROP guards make this safe if an earlier Midtrans draft was applied.)
-- ---------------------------------------------------------------------------
alter table payments drop column if exists gateway_order_id;
alter table payments drop column if exists snap_token;
alter table payments drop column if exists snap_redirect_url;

alter table payments
  add column if not exists method            payment_method not null default 'manual_transfer',
  add column if not exists payment_reference text,         -- buyer-entered transfer ref / note
  add column if not exists proof_url         text,         -- optional transfer proof in Storage
  add column if not exists confirmed_by      uuid references accounts (id) on delete set null,
  add column if not exists confirmed_at      timestamptz,
  add column if not exists confirmation_note text;         -- operator note on confirm/reject

-- A payment is confirmed iff both confirmed_by and confirmed_at are set.
alter table payments drop constraint if exists payments_confirmation_consistent;
alter table payments
  add constraint payments_confirmation_consistent
  check (
    (status = 'confirmed' and confirmed_by is not null and confirmed_at is not null)
    or (status <> 'confirmed')
  );

-- ---------------------------------------------------------------------------
-- 3. payment_events — append-only audit trail of every status change
-- ---------------------------------------------------------------------------
create table if not exists payment_events (
  id          uuid primary key default gen_random_uuid (),
  payment_id  uuid not null references payments (id) on delete cascade,
  from_status payment_status,                              -- null on the initial 'pending'
  to_status   payment_status not null,
  actor_id    uuid references accounts (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists payment_events_payment_id_idx
  on payment_events (payment_id, created_at);

-- Idempotency: at most ONE 'confirmed' event per payment, so a double-confirm cannot
-- produce a second settlement split. (The split trigger keys off the payments row
-- transition; this is the belt-and-braces guard at the audit layer.)
create unique index if not exists payment_events_one_confirm_per_payment
  on payment_events (payment_id)
  where to_status = 'confirmed';

commit;
