-- Otorga is_admin al primer operador (creado manualmente para arrancar la app)
update public.operators
set is_admin = true
where email = 'dogo3991@gmail.com';
