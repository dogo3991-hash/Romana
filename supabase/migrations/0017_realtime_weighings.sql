-- Habilita Supabase Realtime (postgres_changes) sobre weighings para que
-- todos los PCs conectados se refresquen solos al crear/editar/borrar un
-- pesaje, sin esperar a que alguien recargue manualmente.
alter publication supabase_realtime add table public.weighings;
