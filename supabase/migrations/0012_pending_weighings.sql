-- Permite registrar un camión "en espera" (llegó a cargar, se cargan sus datos)
-- sin peso bruto todavía; se completa después con el peso, momento en el que
-- carga (peso neto) queda definida.
alter table public.weighings
  alter column carga drop not null;

-- Los resúmenes (día/mes) solo cuentan pesajes ya completados, no los en espera:
-- count(carga) ignora los null (a diferencia de count(*)).
create or replace view public.v_daily_summary
with (security_invoker = on) as
select
  company_id,
  fecha,
  count(carga)::int as movimientos,
  coalesce(sum(carga), 0)::int as carga_total
from public.weighings
group by company_id, fecha;

create or replace view public.v_monthly_summary_detailed
with (security_invoker = on) as
select
  company_id,
  extract(year from fecha)::int as year,
  extract(month from fecha)::int as month,
  count(carga)::int as movimientos,
  coalesce(sum(carga), 0)::int as carga_total
from public.weighings
group by company_id, extract(year from fecha), extract(month from fecha);
