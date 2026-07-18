-- Empresas de prueba para verificación manual (ver plan de verificación).
-- Se puede editar/ampliar libremente desde la pantalla de Administración una vez andando la app.
insert into public.companies (name) values
  ('Araya Hnos'),
  ('Transportes Bellavista')
on conflict (name) do nothing;
