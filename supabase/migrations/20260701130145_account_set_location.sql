-- Let a signed-in user update ONLY their own delivery pin (latitude/longitude).
--
-- accounts has just a SELECT policy — rows are created by the handle_new_user
-- trigger (SECURITY DEFINER), so no UPDATE policy ever existed. Adding a blanket
-- "update your own row" policy would also let a user change their own `role`
-- (warung → admin) — a privilege-escalation hole. Instead expose a narrow
-- SECURITY DEFINER function that writes only the two coordinate columns.
create or replace function set_my_location(p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update accounts
     set latitude = p_lat,
         longitude = p_lng
   where id = auth.uid();
end;
$$;

revoke all on function set_my_location(double precision, double precision) from public;
grant execute on function set_my_location(double precision, double precision) to authenticated;
