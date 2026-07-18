-- Transportistas (empresa de transporte real, distinta de la Empresa/company
-- que ya usa la app como contexto general) y Conductores que trabajan para ellas.

create table public.transportistas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  rut text not null,
  created_at timestamptz not null default now()
);

create table public.conductors (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rut text not null,
  transportista_id uuid not null references public.transportistas (id),
  created_at timestamptz not null default now(),
  unique (transportista_id, rut)
);

alter table public.transportistas enable row level security;
alter table public.conductors enable row level security;

-- Mismo criterio abierto que trucks: cualquier operador activo puede leer/escribir,
-- es un registro de uso diario en terreno, no algo que dependa de un admin.
create policy transportistas_select on public.transportistas
  for select using (public.current_operator_is_active());
create policy transportistas_insert on public.transportistas
  for insert with check (public.current_operator_is_active());
create policy transportistas_update on public.transportistas
  for update using (public.current_operator_is_active());
create policy transportistas_delete on public.transportistas
  for delete using (public.current_operator_is_active());

create policy conductors_select on public.conductors
  for select using (public.current_operator_is_active());
create policy conductors_insert on public.conductors
  for insert with check (public.current_operator_is_active());
create policy conductors_update on public.conductors
  for update using (public.current_operator_is_active());
create policy conductors_delete on public.conductors
  for delete using (public.current_operator_is_active());

-- weighings: Transportista elegido en el pesaje, Producto transportado,
-- y un N° de ticket correlativo (para reemplazar el ticket del software anterior).
-- Todo nullable/automático para no romper las filas ya cargadas.
alter table public.weighings
  add column transportista_id uuid references public.transportistas (id),
  add column producto text,
  add column ticket_number bigint generated always as identity;
