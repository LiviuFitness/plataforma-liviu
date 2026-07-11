-- ============================================================
-- PLATAFORMA LIVIU — Migración 30: logros (insignias) y comunidad.
-- El catálogo de logros vive en código (lib/logros.ts) — aquí solo se
-- guarda cuáles ha desbloqueado cada cliente. La "comunidad" es un
-- feed de logros + un ranking de constancia entre los clientes que
-- decidan aparecer (visible_en_comunidad, activable desde Perfil).
-- ============================================================

alter table public.profiles
  add column if not exists visible_en_comunidad boolean not null default true;

create table public.logros_desbloqueados (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  clave text not null,
  creado_en timestamptz not null default now(),
  unique (cliente_id, clave)
);

create index idx_logros_desbloqueados_cliente on public.logros_desbloqueados (cliente_id);

alter table public.logros_desbloqueados enable row level security;

create policy "entrenador todo" on public.logros_desbloqueados for all
  using (es_entrenador()) with check (es_entrenador());
create policy "cliente ve y desbloquea los suyos" on public.logros_desbloqueados for all
  using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());

-- ------------------------------------------------------------
-- Vistas de comunidad: a propósito NO son security_invoker. Un
-- cliente normal solo puede leer su propia fila de profiles (política
-- "cliente lee su perfil"), así que para que pueda ver el NOMBRE de
-- otros clientes que se han hecho visibles en la comunidad hace falta
-- que la vista corra con permisos de su dueño (el rol de las
-- migraciones) y sea ella misma la que decide, con su propio WHERE,
-- qué se enseña. Solo exponen nombre + logro/ranking: nunca email,
-- notas del entrenador ni ningún otro dato sensible del perfil.
-- ------------------------------------------------------------

create or replace view public.v_comunidad_logros as
select
  ld.id,
  p.nombre,
  ld.clave,
  ld.creado_en
from public.logros_desbloqueados ld
join public.profiles p on p.id = ld.cliente_id
where p.visible_en_comunidad = true and p.estado = 'activo'
order by ld.creado_en desc
limit 50;

create or replace view public.v_comunidad_ranking as
select
  p.id as cliente_id,
  p.nombre,
  coalesce(least(100, round(
    100.0 * (
      select count(*) from public.sesiones s
      where s.cliente_id = p.id
        and s.fecha_inicio > now() - interval '28 days'
    ) / nullif(dias.n * 4, 0)
  )), 0)::int as adherencia
from public.profiles p
cross join lateral (
  select count(*) as n
  from public.rutina_dias rd
  join public.rutinas r on r.id = rd.rutina_id
  where r.cliente_id = p.id and r.activa
) dias
where p.visible_en_comunidad = true and p.estado = 'activo'
order by adherencia desc
limit 20;
