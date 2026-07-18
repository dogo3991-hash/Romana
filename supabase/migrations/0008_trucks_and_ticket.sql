-- Registro de camiones por empresa: memoriza la Tara (peso vacío) por patente
-- para autocompletarla en pesajes futuros y armar el ticket bruto/tara/neto.

create table public.trucks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  patente text not null,
  tara integer not null check (tara > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, patente)
);

create trigger set_trucks_updated_at
  before update on public.trucks
  for each row execute function public.set_updated_at();

alter table public.trucks enable row level security;

create policy trucks_select on public.trucks
  for select using (public.current_operator_is_active());

create policy trucks_insert on public.trucks
  for insert with check (public.current_operator_is_active());

create policy trucks_update on public.trucks
  for update using (public.current_operator_is_active());

create policy trucks_delete on public.trucks
  for delete using (public.current_operator_is_active());

-- weighings: se agregan tara y peso_bruto. `carga` sigue siendo el peso neto
-- (peso_bruto - tara), así las vistas existentes (que suman `carga`) no cambian.
-- Nullable para no romper filas ya cargadas antes de este cambio.
alter table public.weighings
  add column tara integer check (tara > 0),
  add column peso_bruto integer check (peso_bruto > 0);

alter table public.weighings
  add constraint weighings_neto_coherente
  check (peso_bruto is null or tara is null or carga = peso_bruto - tara);
