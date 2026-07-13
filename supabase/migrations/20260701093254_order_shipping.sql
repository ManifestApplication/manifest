-- ============================================================
-- Chosen shipping option on an order (from the Biteship rate aggregator).
-- Informational for now: recorded at checkout, not yet added to the
-- payment total or settlement split (that's a follow-up).
-- ============================================================

alter table orders
  add column shipping_courier text,       -- e.g. "jne"
  add column shipping_service text,       -- e.g. "REG"
  add column shipping_fee     bigint not null default 0
    check (shipping_fee >= 0);
