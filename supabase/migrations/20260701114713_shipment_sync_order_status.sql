-- Sync an internal shipment's status onto its order (forward-only), so a
-- distributor advancing a shipment in /logistics also moves the order.
-- (External Biteship orders have no shipment row — their order status is
-- synced by the book/track routes instead, so the two paths don't overlap.)
create or replace function shipment_sync_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mapped   order_status;
  v_current  order_status;
  rank_new   int;
  rank_cur   int;
begin
  if NEW.status in ('delivered', 'reconciled') then
    v_mapped := 'delivered';
  elsif NEW.status in ('loaded', 'in_transit') then
    v_mapped := 'shipped';
  else
    return null; -- planned / cancelled → leave the order as-is
  end if;

  select status into v_current from orders where id = NEW.order_id;

  rank_new := case v_mapped
                when 'shipped' then 2 when 'delivered' then 3 else 0 end;
  rank_cur := case v_current
                when 'paid' then 1 when 'shipped' then 2
                when 'delivered' then 3 when 'closed' then 4 else 0 end;

  if rank_new > rank_cur then
    update orders set status = v_mapped where id = NEW.order_id;
  end if;
  return null;
end;
$$;

create trigger shipment_sync_order_status
after insert or update on shipments
for each row execute function shipment_sync_order_status();
