-- ============================================================
-- Fee is an admin (HALINEST) decision, not the manufacturer's.
--
-- RLS is row-level, not column-level, so to forbid manufacturers from changing
-- one specific column (fee_rate) we use a BEFORE UPDATE guard: the fee can only
-- change when the caller is an admin. Manufacturers may still update their other
-- fields (e.g. company_name) — just not fee_rate.
-- ============================================================

create or replace function manufacturers_guard_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.fee_rate is distinct from OLD.fee_rate and not is_admin() then
    raise exception 'Only an admin can change the fee rate';
  end if;
  return NEW;
end;
$$;

create trigger manufacturers_guard_fee
before update on manufacturers
for each row execute function manufacturers_guard_fee();
