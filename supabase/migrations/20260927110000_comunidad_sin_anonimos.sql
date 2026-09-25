-- ============================================================
-- Las vistas de comunidad corren con permisos de su dueño (para
-- enseñar el nombre de otros clientes visibles) y se podían leer
-- también SIN iniciar sesión, solo con la clave pública de la app.
-- Solo deben verlas usuarios con sesión.
-- ============================================================
revoke select on public.v_comunidad_logros from anon;
revoke select on public.v_comunidad_ranking from anon;
revoke select on public.v_comunidad_reto from anon;
