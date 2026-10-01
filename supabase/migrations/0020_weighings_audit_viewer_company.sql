-- weighings_audit: el viewer solo puede leer el historial de pesajes de su
-- empresa. La policy de 0016 solo pedía current_operator_is_active(), así que
-- un viewer podía pedir weighings_audit sin filtro por weighing_id y recibir
-- old_data/new_data de pesajes de cualquier empresa. Ahora se aplica el mismo
-- criterio que weighings_select (0015), resolviendo la empresa a través del
-- pesaje auditado.
drop policy weighings_audit_select on public.weighings_audit;
create policy weighings_audit_select on public.weighings_audit
  for select using (
    public.current_operator_is_active()
    and (
      not public.current_operator_is_viewer()
      or exists (
        select 1
        from public.weighings w
        where w.id = weighings_audit.weighing_id
          and w.company_id = public.current_operator_company_id()
      )
    )
  );
