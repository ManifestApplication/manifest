-- The shop's read model: every active variant with display fields and the
-- DB-computed selling price (net + the manufacturer's fee). One row per variant.
create view catalog as
select
  v.id            as variant_id,
  v.variant_name,
  v.net_price,
  p.id            as product_id,
  p.name          as product_name,
  p.brand,
  p.category,
  round(v.net_price * (1 + m.fee_rate))::bigint as sell_price
from product_variants v
join products      p on p.id = v.product_id
join manufacturers m on m.account_id = p.manufacturer_id
where v.is_active and p.is_active;

-- Let the API roles read it (RLS still protects the orders they place).
grant select on catalog to authenticated, anon;
