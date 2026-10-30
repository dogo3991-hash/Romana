-- Errores de la app de escritorio, enviados por cada PC (ver
-- src/renderer/src/lib/errorReporter.ts) para revisarlos desde el panel de
-- Supabase sin tener que ir al PC. Copia de respaldo: el archivo local
-- %APPDATA%\<app>\logs\main.log, que guarda también lo que no llegó por falta
-- de internet.
--
-- Solo se puede insertar: ningún usuario de la app puede leer, editar ni borrar
-- (RLS sin políticas de select/update/delete). Se leen desde el panel.

create table public.error_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- auth.users y no operators: si el error es justamente que el perfil del
  -- operador no existe, la FK a operators rechazaría el registro.
  operator_id uuid references auth.users (id) on delete set null,
  source text not null check (source in ('main', 'renderer')),
  context text not null check (char_length(context) <= 200),
  message text not null check (char_length(message) <= 2000),
  stack text check (char_length(stack) <= 8000),
  app_version text check (char_length(app_version) <= 50),
  machine text check (char_length(machine) <= 100)
);

create index error_logs_operator_created_idx on public.error_logs (operator_id, created_at desc);
create index error_logs_created_idx on public.error_logs (created_at);

alter table public.error_logs enable row level security;

create policy error_logs_insert on public.error_logs
  for insert to authenticated with check (auth.uid() is not null);

-- Fecha y autor los fija el servidor. Además pone un tope por usuario: si un
-- error se repite en bucle (o alguien usa la clave pública para llenar la
-- tabla), los registros que pasen del tope se descartan en silencio.
-- security definer: tiene que contar filas que RLS no deja leer al usuario.
create or replace function public.error_logs_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.operator_id := auth.uid();
  new.created_at := now();

  if (
    select count(*) from public.error_logs
    where operator_id = new.operator_id and created_at > now() - interval '1 hour'
  ) >= 100 then
    return null;
  end if;

  -- Los errores viejos ya no sirven; se limpian de paso.
  delete from public.error_logs where created_at < now() - interval '90 days';

  return new;
end;
$$;

create trigger error_logs_before_insert
  before insert on public.error_logs
  for each row execute function public.error_logs_before_insert();
