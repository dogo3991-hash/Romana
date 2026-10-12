-- Canal Realtime privado del turno del pesaje automático ('auto-weigh-lock', ver
-- autoWeighLock.ts). El PC que tiene el turno publica su presencia; los demás la ven
-- y no lo toman. Mismo criterio que 0023: ver, cualquier operador activo; tomar el
-- turno, operadores activos que no son expectadores.

create policy auto_weigh_lock_receive on realtime.messages
  for select to authenticated
  using (
    realtime.topic() = 'auto-weigh-lock'
    and public.current_operator_is_active()
  );

create policy auto_weigh_lock_send on realtime.messages
  for insert to authenticated
  with check (
    realtime.topic() = 'auto-weigh-lock'
    and public.current_operator_is_active()
    and not public.current_operator_is_viewer()
  );
