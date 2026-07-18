-- Row Level Security

-- Helpers (security definer: leen operators sin pasar de nuevo por RLS, evita recursión)
create or replace function public.current_operator_is_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select active from public.operators where id = auth.uid()), false);
$$;

create or replace function public.current_operator_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.operators where id = auth.uid() and active = true),
    false
  );
$$;

alter table public.companies enable row level security;
alter table public.operators enable row level security;
alter table public.weighings enable row level security;
alter table public.historical_monthly_totals enable row level security;

-- companies: cualquier operador activo puede ver; solo admin puede crear/editar
create policy companies_select on public.companies
  for select using (public.current_operator_is_active());

create policy companies_insert on public.companies
  for insert with check (public.current_operator_is_admin());

create policy companies_update on public.companies
  for update using (public.current_operator_is_admin());

-- operators: cualquier operador activo puede ver la lista (selector, admin screen);
-- solo admin puede editar (ej. activar/desactivar, otorgar is_admin).
-- El insert lo hace el trigger handle_new_user (security definer), no el cliente.
create policy operators_select on public.operators
  for select using (public.current_operator_is_active());

create policy operators_update on public.operators
  for update using (public.current_operator_is_admin());

-- weighings: cualquier operador activo puede leer/escribir libremente, sin restricción de tiempo
create policy weighings_select on public.weighings
  for select using (public.current_operator_is_active());

create policy weighings_insert on public.weighings
  for insert with check (public.current_operator_is_active());

create policy weighings_update on public.weighings
  for update using (public.current_operator_is_active());

create policy weighings_delete on public.weighings
  for delete using (public.current_operator_is_active());

-- historical_monthly_totals: mismo criterio que weighings
create policy historical_totals_select on public.historical_monthly_totals
  for select using (public.current_operator_is_active());

create policy historical_totals_insert on public.historical_monthly_totals
  for insert with check (public.current_operator_is_active());

create policy historical_totals_update on public.historical_monthly_totals
  for update using (public.current_operator_is_active());

create policy historical_totals_delete on public.historical_monthly_totals
  for delete using (public.current_operator_is_active());
