-- Resúmenes calculados (nunca se almacenan totales duplicados)

create view public.v_daily_summary
with (security_invoker = on) as
select
  company_id,
  fecha,
  count(*)::int as movimientos,
  sum(carga)::int as carga_total
from public.weighings
group by company_id, fecha;

create view public.v_monthly_summary_detailed
with (security_invoker = on) as
select
  company_id,
  extract(year from fecha)::int as year,
  extract(month from fecha)::int as month,
  count(*)::int as movimientos,
  sum(carga)::int as carga_total
from public.weighings
group by company_id, extract(year from fecha), extract(month from fecha);

-- Combina el detalle diario (si existe) con el total histórico cargado a mano.
-- is_detailed indica si el mes tiene pesajes registrados en la app o es solo un total de backfill.
create view public.v_monthly_summary
with (security_invoker = on) as
select
  coalesce(d.company_id, h.company_id) as company_id,
  coalesce(d.year, h.year) as year,
  coalesce(d.month, h.month) as month,
  coalesce(d.movimientos, h.total_movements) as movimientos,
  coalesce(d.carga_total, h.total_carga) as carga_total,
  (d.company_id is not null) as is_detailed
from public.v_monthly_summary_detailed d
full outer join public.historical_monthly_totals h
  on h.company_id = d.company_id
  and h.year = d.year
  and h.month = d.month;
