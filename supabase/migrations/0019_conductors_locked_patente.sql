-- Candado conductor -> patente: cuando un conductor tiene una patente
-- bloqueada, el formulario de pesaje la selecciona sola y no deja elegir
-- otra hasta que se desbloquee. Se guarda como texto (no FK a trucks) para
-- seguir el mismo patrón que weighings.patente/conductor: el resto de la
-- app ya trata la patente como clave natural, no por id.
alter table public.conductors add column locked_patente text;
