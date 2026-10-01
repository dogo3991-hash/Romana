-- Canal Realtime privado del peso en vivo ('scale-live-weight', ver
-- scaleBroadcast.ts). Sin estas políticas cualquiera con la clave pública podía
-- publicar pesos falsos en el formulario de pesaje.
-- Escuchar: cualquier operador activo. Publicar: operadores activos que no son
-- expectadores (la PC de la romana inicia sesión con uno de ellos).

create policy scale_live_weight_receive on realtime.messages
  for select to authenticated
  using (
    realtime.topic() = 'scale-live-weight'
    and public.current_operator_is_active()
  );

create policy scale_live_weight_send on realtime.messages
  for insert to authenticated
  with check (
    realtime.topic() = 'scale-live-weight'
    and public.current_operator_is_active()
    and not public.current_operator_is_viewer()
  );
