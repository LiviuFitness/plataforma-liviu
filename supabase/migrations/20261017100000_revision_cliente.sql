-- ============================================================
--   Fecha de la próxima revisión de cada cliente (agenda del
--   entrenador; el cliente no la ve) y cada cuántas semanas toca.
--   Se puede ejecutar más de una vez sin romper nada.
-- ============================================================
alter table public.profiles add column if not exists proxima_revision date;
alter table public.profiles add column if not exists revision_cada_semanas integer not null default 4;
