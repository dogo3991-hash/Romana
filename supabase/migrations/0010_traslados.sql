-- Registro de lugares de traslado por Empresa (misma memoria/gestión que trucks).

create table public.traslados (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (company_id, nombre)
);

alter table public.traslados enable row level security;

create policy traslados_select on public.traslados
  for select using (public.current_operator_is_active());
create policy traslados_insert on public.traslados
  for insert with check (public.current_operator_is_active());
create policy traslados_update on public.traslados
  for update using (public.current_operator_is_active());
create policy traslados_delete on public.traslados
  for delete using (public.current_operator_is_active());
