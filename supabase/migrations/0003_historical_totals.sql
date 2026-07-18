-- Backfill de totales mensuales para meses anteriores a la app (sin detalle diario)

create table public.historical_monthly_totals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  year integer not null check (year >= 2000),
  month integer not null check (month between 1 and 12),
  total_movements integer not null check (total_movements >= 0),
  total_carga integer not null check (total_carga >= 0),
  notes text,
  entered_by uuid references public.operators (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, year, month)
);

create trigger set_historical_monthly_totals_updated_at
  before update on public.historical_monthly_totals
  for each row execute function public.set_updated_at();
