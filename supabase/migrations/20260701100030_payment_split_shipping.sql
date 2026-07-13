-- payment_split now also settles the shipping fee to the courier, so the split
-- balances to what the buyer actually pays: net + fee + shipping.
create or replace function payment_split()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

    -- shipping → courier (external), if the buyer chose a paid shipping option
    insert into settlements (payment_id, payee_type, payee_account_id, amount)
    select NEW.id, 'shipping', null, o.shipping_fee
    from orders o
    where o.id = NEW.order_id and o.shipping_fee > 0;

    -- audit + advance the order
    insert into payment_events (payment_id, from_status, to_status, actor_id, note)
    values (NEW.id, OLD.status, NEW.status, NEW.confirmed_by, NEW.confirmation_note);

    update orders set status = 'paid' where id = NEW.order_id;
  end if;
  return null;
end;
$$;
