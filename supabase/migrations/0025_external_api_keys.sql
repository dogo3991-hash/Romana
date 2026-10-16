-- Claves de API de solo lectura para empresas externas (ej. el comprador de
-- mineral), usadas por la Edge Function weighings-feed. Cada clave queda amarrada
-- a una empresa y solo puede leer sus pesajes completados.
--
-- Se guarda solo el hash SHA-256 de la clave, nunca la clave en sí: si alguien
-- lee esta tabla no obtiene claves usables. RLS activado y sin políticas: ni la
-- app de escritorio ni la clave pública pueden leerla; solo la service_role
-- (la Edge Function) accede.

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_id uuid not null references public.companies (id),
  key_hash text not null unique,
  active boolean not null default true,
  -- Un sistema que consulta cada 5 minutos usa 12 por hora; 60 deja margen para
  -- reintentos y cargas iniciales, y acota el costo si el cliente se descontrola.
  rate_limit_per_hour integer not null default 60 check (rate_limit_per_hour > 0),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.api_keys enable row level security;

-- Consultas por clave y por hora, para el límite de rate_limit_per_hour.
create table public.api_key_usage (
  api_key_id uuid not null references public.api_keys (id) on delete cascade,
  hour_bucket timestamptz not null,
  request_count integer not null default 0,
  primary key (api_key_id, hour_bucket)
);

alter table public.api_key_usage enable row level security;

-- Cuenta una consulta de forma atómica (dos consultas simultáneas no pueden
-- leer el mismo contador) y devuelve el total de la hora en curso.
create or replace function public.api_key_hit(p_key_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.api_key_usage (api_key_id, hour_bucket, request_count)
  values (p_key_id, date_trunc('hour', now()), 1)
  on conflict (api_key_id, hour_bucket)
  do update set request_count = api_key_usage.request_count + 1
  returning request_count into v_count;

  update public.api_keys set last_used_at = now() where id = p_key_id;

  -- Los contadores viejos ya no sirven; se limpian de paso.
  delete from public.api_key_usage
  where api_key_id = p_key_id and hour_bucket < now() - interval '7 days';

  return v_count;
end;
$$;

revoke execute on function public.api_key_hit(uuid) from public, anon, authenticated;
grant execute on function public.api_key_hit(uuid) to service_role;
