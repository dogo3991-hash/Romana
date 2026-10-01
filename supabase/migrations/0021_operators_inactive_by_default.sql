-- Falla cerrado: un usuario creado en auth.users por cualquier vía que no sea
-- la Edge Function create-operator (auto-registro, invitación, alta manual en
-- el dashboard) queda inactivo hasta que un admin lo active. create-operator
-- activa explícitamente a los operadores que crea.
-- No toca filas existentes: revisar a mano public.operators si hubo altas
-- que no hizo un admin.

alter table public.operators alter column active set default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.operators (id, full_name, email, active)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.email, false);
  return new;
end;
$$;
