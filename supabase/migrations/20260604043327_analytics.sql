-- ============================================================
-- Analytics read model: one flattened row per PAID order line.
--
-- IMPORTANT: security_invoker = true makes this view run with the CALLER's
-- privileges, so the underlying RLS applies. A manufacturer querying it sees
-- only lines for their own products; an admin sees all. (Contrast the `catalog`
-- view, which is a plain/definer view because the catalog is public.)
-- ============================================================

create view sales_lines
with (security_invoker = true) as
select
  oi.id           as order_item_id,
  oi.order_id,
  p.manufacturer_id,
  p.brand,
  p.name          as product_name,
  v.variant_name,
  oi.qty,
  oi.line_subtotal,   -- net → manufacturer
  oi.line_fee,        -- fee → HALINEST
  o.created_at
from order_items oi
join product_variants v on v.id = oi.variant_id
join products p        on p.id = v.product_id
join orders o          on o.id = oi.order_id
where o.status = 'paid';

grant select on sales_lines to authenticated;
