-- Detalle diario de pesajes (tabla central, fuente de verdad)

create table public.weighings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  operator_id uuid not null references public.operators (id),
  fecha date not null,
  hora time not null,
  conductor text not null,
  patente text not null,
  n_guia text not null,
  carga integer not null check (carga > 0),
  traslado text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index weighings_company_fecha_idx on public.weighings (company_id, fecha);

create trigger set_weighings_updated_at
  before update on public.weighings
  for each row execute function public.set_updated_at();
