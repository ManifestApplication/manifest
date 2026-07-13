-- Aggregate per-manufacturer shipment states onto the order (forward-only):
-- order → 'shipped' once every shipment is booked (has a tracking number),
-- order → 'delivered' once every shipment is delivered.
create or replace function order_shipment_sync_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
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
  where order_id = v_order;

  if v_total = 0 then return null; end if;

  if v_delivered = v_total then
    v_mapped := 'delivered';
  elsif v_booked = v_total then
    v_mapped := 'shipped';
  else
    return null; -- not every shipment booked yet
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

create trigger order_shipment_sync_order_status
after insert or update on order_shipments
for each row execute function order_shipment_sync_order_status();
