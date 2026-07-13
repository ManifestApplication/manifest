-- If the buyer already paid an external (Biteship) courier fee on the order,
-- the internal distributor earns NO commission — the two logistics money flows
-- should not stack on the same order.

create or replace function shipment_fill()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rate     numeric(5,4);
  v_subtotal bigint;
  v_shipping bigint;
begin
  select commission_rate into v_rate from distributors where account_id = NEW.distributor_id;
  select subtotal, shipping_fee into v_subtotal, v_shipping from orders where id = NEW.order_id;

  if coalesce(v_shipping, 0) > 0 then
    -- External courier fee already charged → no internal commission.
    NEW.commission := 0;
  else
    NEW.commission := round(coalesce(v_subtotal, 0) * coalesce(v_rate, 0))::bigint;
  end if;
  return NEW;
end; $$;

create or replace function shipment_settle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only record a distributor commission settlement when there is one.
  if NEW.commission > 0 then
    insert into settlements (shipment_id, payee_type, payee_account_id, amount)
    values (NEW.id, 'distributor', NEW.distributor_id, NEW.commission);
  end if;
  return null;
end; $$;
