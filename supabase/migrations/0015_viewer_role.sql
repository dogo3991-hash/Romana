-- Rol "Expectador": solo lectura, y restringido a una única empresa.
-- is_viewer y restricted_company_id son mutuamente excluyentes con is_admin
-- (un admin nunca está restringido a una empresa).

alter table public.operators
  add column is_viewer boolean not null default false,
  add column restricted_company_id uuid references public.companies (id);

alter table public.operators
  add constraint operators_role_exclusive check (not (is_admin and is_viewer));

create or replace function public.current_operator_is_viewer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_viewer from public.operators where id = auth.uid() and active = true),
    false
  );
$$;

create or replace function public.current_operator_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select restricted_company_id from public.operators where id = auth.uid();
$$;

-- companies: el viewer solo ve la empresa a la que quedó restringido.
drop policy companies_select on public.companies;
create policy companies_select on public.companies
  for select using (
    public.current_operator_is_active()
    and (
      not public.current_operator_is_viewer()
      or id = public.current_operator_company_id()
    )
  );

-- weighings: select filtrado por empresa para el viewer; sin escritura.
drop policy weighings_select on public.weighings;
create policy weighings_select on public.weighings
  for select using (
    public.current_operator_is_active()
    and (
      not public.current_operator_is_viewer()
      or company_id = public.current_operator_company_id()
    )
  );

drop policy weighings_insert on public.weighings;
create policy weighings_insert on public.weighings
  for insert with check (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy weighings_update on public.weighings;
create policy weighings_update on public.weighings
  for update using (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy weighings_delete on public.weighings;
create policy weighings_delete on public.weighings
  for delete using (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

-- historical_monthly_totals: mismo criterio que weighings.
drop policy historical_totals_select on public.historical_monthly_totals;
create policy historical_totals_select on public.historical_monthly_totals
  for select using (
    public.current_operator_is_active()
    and (
      not public.current_operator_is_viewer()
      or company_id = public.current_operator_company_id()
    )
  );

drop policy historical_totals_insert on public.historical_monthly_totals;
create policy historical_totals_insert on public.historical_monthly_totals
  for insert with check (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy historical_totals_update on public.historical_monthly_totals;
create policy historical_totals_update on public.historical_monthly_totals
  for update using (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy historical_totals_delete on public.historical_monthly_totals;
create policy historical_totals_delete on public.historical_monthly_totals
  for delete using (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

-- traslados: mismo criterio (tiene company_id, a diferencia de trucks).
drop policy traslados_select on public.traslados;
create policy traslados_select on public.traslados
  for select using (
    public.current_operator_is_active()
    and (
      not public.current_operator_is_viewer()
      or company_id = public.current_operator_company_id()
    )
  );

drop policy traslados_insert on public.traslados;
create policy traslados_insert on public.traslados
  for insert with check (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy traslados_update on public.traslados;
create policy traslados_update on public.traslados
  for update using (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy traslados_delete on public.traslados;
create policy traslados_delete on public.traslados
  for delete using (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

-- transportistas, conductors, trucks: registro global (sin company_id), el
-- viewer los sigue viendo por completo; solo se bloquea la escritura.
drop policy transportistas_insert on public.transportistas;
create policy transportistas_insert on public.transportistas
  for insert with check (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy transportistas_update on public.transportistas;
create policy transportistas_update on public.transportistas
  for update using (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy transportistas_delete on public.transportistas;
create policy transportistas_delete on public.transportistas
  for delete using (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy conductors_insert on public.conductors;
create policy conductors_insert on public.conductors
  for insert with check (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy conductors_update on public.conductors;
create policy conductors_update on public.conductors
  for update using (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy conductors_delete on public.conductors;
create policy conductors_delete on public.conductors
  for delete using (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy trucks_insert on public.trucks;
create policy trucks_insert on public.trucks
  for insert with check (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy trucks_update on public.trucks;
create policy trucks_update on public.trucks
  for update using (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );

drop policy trucks_delete on public.trucks;
create policy trucks_delete on public.trucks
  for delete using (
    public.current_operator_is_active() and not public.current_operator_is_viewer()
  );
