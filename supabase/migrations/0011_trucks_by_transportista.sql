-- Los camiones pasan a estar asociados al Transportista (quien realmente los posee)
-- en vez de a la Empresa, para que el pesaje filtre patentes por transportista elegido.

alter table public.trucks
  add column transportista_id uuid references public.transportistas (id);

alter table public.trucks
  drop constraint trucks_company_id_patente_key;

alter table public.trucks
  add constraint trucks_transportista_id_patente_key unique (transportista_id, patente);

alter table public.trucks
  drop column company_id;
