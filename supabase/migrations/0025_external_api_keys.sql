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
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.api_keys enable row level security;
