-- Per-variant shipping weight in grams (used for accurate courier rates + booking).
alter table product_variants
  add column weight integer not null default 1000 check (weight >= 0);

-- Expose weight in the shop catalog view. (New column appended at the end so
-- CREATE OR REPLACE VIEW keeps the existing column order.)
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
  v.weight
from product_variants v
join products      p on p.id = v.product_id
join manufacturers m on m.account_id = p.manufacturer_id
where v.is_active and p.is_active;
