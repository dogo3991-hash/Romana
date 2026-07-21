-- Permite que un mes con pesajes detallados (app) y un total historico (backfill)
-- se sumen en vez de que el detalle excluya al historico. Antes, si un mes tenia
-- aunque sea un pesaje detallado, el total historico cargado para ese mismo mes
-- se ignoraba por completo (coalesce elegia uno u otro, nunca los dos).
create or replace view public.v_monthly_summary
with (security_invoker = on) as
select
  coalesce(d.company_id, h.company_id) as company_id,
  coalesce(d.year, h.year) as year,
  coalesce(d.month, h.month) as month,
  coalesce(d.movimientos, 0) + coalesce(h.total_movements, 0) as movimientos,
  coalesce(d.carga_total, 0) + coalesce(h.total_carga, 0) as carga_total,
  (d.company_id is not null) as is_detailed,
  (h.company_id is not null) as is_historical
from public.v_monthly_summary_detailed d
full outer join public.historical_monthly_totals h
  on h.company_id = d.company_id
  and h.year = d.year
  and h.month = d.month;
