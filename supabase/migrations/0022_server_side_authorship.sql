-- La autoría la fija el servidor, no el cliente: un operador no puede crear
-- pesajes ni totales históricos a nombre de otro.
-- Si no hay usuario (service role, SQL directo) se respeta el valor enviado.

-- weighings.operator_id: quien lo creó; no cambia al editar (eso queda en
-- weighings_audit.changed_by, ver 0016).
create or replace function public.set_weighing_operator()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.operator_id := coalesce(auth.uid(), new.operator_id);
  else
    new.operator_id := old.operator_id;
  end if;
  return new;
end;
$$;

create trigger weighings_set_operator
  before insert or update on public.weighings
  for each row execute function public.set_weighing_operator();

-- historical_monthly_totals.entered_by: quien cargó o actualizó el total.
create or replace function public.set_historical_entered_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.entered_by := coalesce(auth.uid(), new.entered_by);
  return new;
end;
$$;

create trigger historical_totals_set_entered_by
  before insert or update on public.historical_monthly_totals
  for each row execute function public.set_historical_entered_by();
