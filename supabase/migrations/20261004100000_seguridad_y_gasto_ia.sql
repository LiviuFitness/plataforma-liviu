-- ============================================================
-- 1. Seguridad: las funciones "security definer" (las que corren con
--    permisos especiales) se podían llamar sin iniciar sesión. Ninguna
--    hacía nada así, pero se cierran: solo usuarios con sesión.
--    Se dejan abiertas las tres que se usan sin sesión:
--      · validar_invitacion (página de alta con el enlace)
--      · registrar_lead (página de planes del QR)
--      · es_entrenador (la usan las reglas de seguridad de las tablas)
-- 2. Gasto de la IA: cada llamada apunta sus tokens y lo que cuesta,
--    para verlo en Estadísticas. Solo lo escribe el servidor y solo lo
--    lee el entrenador.
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as firma
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname not in ('validar_invitacion', 'registrar_lead', 'es_entrenador')
  loop
    execute format('revoke execute on function %s from public, anon', f.firma);
    execute format('grant execute on function %s to authenticated, service_role', f.firma);
  end loop;
end $$;

create table if not exists public.ia_uso (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  etiqueta text not null,
  modelo text not null,
  entrada integer not null default 0,
  cache_leida integer not null default 0,
  cache_escrita integer not null default 0,
  salida integer not null default 0,
  coste_usd numeric(10, 5) not null default 0
);
create index if not exists ia_uso_fecha on public.ia_uso (creado_en desc);
alter table public.ia_uso enable row level security;
drop policy if exists "entrenador lee" on public.ia_uso;
create policy "entrenador lee" on public.ia_uso for select using (es_entrenador());
revoke all on public.ia_uso from anon;
