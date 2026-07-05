-- ============================================================
-- PLATAFORMA LIVIU — Migración 11: eliminar cliente (irreversible)
--  · RPC segura: solo el entrenador puede llamarla, nunca sobre
--    sí mismo, y borra la cuenta de auth.users — que en cascada
--    se lleva por delante profiles, rutinas, dietas, medidas,
--    sesiones... todo lo que cuelga de ese cliente.
-- ============================================================

create or replace function public.eliminar_cliente(p_cliente_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not es_entrenador() then
    raise exception 'Solo el entrenador puede eliminar clientes.';
  end if;

  if exists (
    select 1 from public.profiles where id = p_cliente_id and rol = 'entrenador'
  ) then
    raise exception 'No se puede eliminar la cuenta del entrenador.';
  end if;

  -- auth.users tiene ON DELETE CASCADE hacia profiles, y desde ahí
  -- cascada hacia rutinas/dietas/medidas/sesiones/invitaciones, etc.
  delete from auth.users where id = p_cliente_id;
end;
$$;

grant execute on function public.eliminar_cliente(uuid) to authenticated;
