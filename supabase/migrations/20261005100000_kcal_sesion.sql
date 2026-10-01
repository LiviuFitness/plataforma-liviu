-- ============================================================
-- Calorías del entreno: una estimación (duración × peso del cliente) o,
-- si lleva reloj (Apple Watch…), lo que marca, apuntado a mano al
-- terminar. kcal_reloj dice cuál de las dos es.
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================
alter table public.sesiones add column if not exists kcal integer;
alter table public.sesiones add column if not exists kcal_reloj boolean not null default false;
