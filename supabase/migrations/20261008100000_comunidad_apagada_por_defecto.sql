-- ============================================================
--   Privacidad por defecto (art. 25 RGPD): un cliente nuevo NO sale
--   en la comunidad hasta que él lo elige (pantalla de consentimiento
--   o su perfil). No toca a los que ya existen.
--   Se puede ejecutar más de una vez sin romper nada.
-- ============================================================
alter table public.profiles alter column visible_en_comunidad set default false;
