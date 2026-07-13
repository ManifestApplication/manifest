-- Cancel + return support for per-manufacturer shipments.
--
-- Why the extra id column: Biteship's create-order response carries TWO ids —
--   courier.tracking_id  → used by GET /v1/trackings/:id   (we store this in shipping_order_ref)
--   id                   → the Biteship *order* id, used by POST /v1/orders/:id/cancel
-- We only kept the tracking_id before, so cancel had nothing to call. Store the
-- order id separately.
alter table order_shipments
  add column if not exists shipping_order_id       text,  -- Biteship order id (forward leg)
  add column if not exists return_shipping_order_id text, -- Biteship order id (reverse leg)
  add column if not exists return_tracking_number   text, -- resi of the return shipment
  add column if not exists return_status            text; -- courier status of the return

-- The status-sync trigger must ignore cancelled shipments, otherwise a single
-- cancelled leg would permanently block the order from ever reaching 'shipped'
-- or 'delivered' (its tracking_number is cleared on cancel, so it can never be
-- "booked" again unless re-booked). Counting only non-cancelled legs means the
-- order advances on the shipments that are actually live.
create or replace function order_shipment_sync_order_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_order     uuid := NEW.order_id;
  v_total     int;
  v_booked    int;
  v_delivered int;
  v_current   order_status;
  v_mapped    order_status;
  rank_new    int;
  rank_cur    int;
begin
  select count(*),
         count(tracking_number),
         count(*) filter (where status = 'delivered')
    into v_total, v_booked, v_delivered
  from order_shipments
  where order_id = v_order
    and coalesce(status, '') <> 'cancelled';   -- ignore cancelled legs

  if v_total = 0 then return null; end if;

  if v_delivered = v_total then
    v_mapped := 'delivered';
  elsif v_booked = v_total then
    v_mapped := 'shipped';
  else
    return null; -- not every live shipment booked yet
  end if;

  select status into v_current from orders where id = v_order;
  rank_new := case v_mapped when 'shipped' then 2 when 'delivered' then 3 else 0 end;
  rank_cur := case v_current
                when 'paid' then 1 when 'shipped' then 2
                when 'delivered' then 3 when 'closed' then 4 else 0 end;

  if rank_new > rank_cur then
    update orders set status = v_mapped where id = v_order;
  end if;
  return null;
end;
$$;
