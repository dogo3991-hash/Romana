-- Separa la hora en "entrada" (cuando se registra el camión, etapa 1) y
-- "salida" (cuando se completa el peso bruto, etapa 2), para reflejarlo en
-- el ticket de pesaje.
alter table public.weighings
  rename column hora to hora_entrada;

alter table public.weighings
  add column hora_salida time;
