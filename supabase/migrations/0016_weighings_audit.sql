-- Auditoría de ediciones de pesajes: quién cambió qué y cuándo.
--
-- updated_by y la fila en weighings_audit se completan solos en el trigger
-- (con auth.uid()), no dependen de que el cliente los mande -- así no se
-- repite el bug que motivó esto: operator_id nunca se actualiza al editar
-- (DailyEntryScreen.tsx solo lo manda en el insert), así que hoy no hay forma
-- de saber quién corrigió un pesaje despues de creado.

alter table public.weighings
  add column updated_by uuid references public.operators (id);

create table public.weighings_audit (
  id bigint generated always as identity primary key,
  weighing_id uuid not null references public.weighings (id) on delete cascade,
  changed_by uuid references public.operators (id),
  changed_at timestamptz not null default now(),
  old_data jsonb not null,
  new_data jsonb not null
);

create index weighings_audit_weighing_id_idx
  on public.weighings_audit (weighing_id, changed_at desc);

-- security definer: para poder insertar en weighings_audit sin darle a los
-- clientes un policy de insert directo sobre esa tabla.
create or replace function public.record_weighing_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_jsonb(old) - 'updated_at' - 'updated_by'
     is distinct from
     to_jsonb(new) - 'updated_at' - 'updated_by'
  then
    new.updated_by := auth.uid();
    insert into public.weighings_audit (weighing_id, changed_by, old_data, new_data)
    values (old.id, auth.uid(), to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger record_weighings_update
  before update on public.weighings
  for each row execute function public.record_weighing_update();

alter table public.weighings_audit enable row level security;

-- mismo criterio de lectura que weighings (el viewer también puede consultar
-- el historial; solo se filtra por empresa a nivel de qué weighing_id se pide
-- desde la app, igual que hoy filtra weighings_select).
create policy weighings_audit_select on public.weighings_audit
  for select using (public.current_operator_is_active());
