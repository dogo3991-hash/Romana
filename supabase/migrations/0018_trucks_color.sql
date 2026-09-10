-- Distintivo visual: color (o bicolor) asignado a cada camión, usado como
-- fondo del selector de patente al registrar un pesaje. Null = sin color
-- asignado, se ve con el estilo por defecto de la app.
alter table public.trucks add column color text;
