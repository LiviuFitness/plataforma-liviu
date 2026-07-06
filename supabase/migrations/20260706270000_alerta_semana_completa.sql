-- ============================================================
-- PLATAFORMA LIVIU — Migración 20: aviso de "semana completada,
-- lista para avanzar" en el sistema de alertas ya existente.
--  · Se dispara cuando el cliente ha registrado sesión en TODOS
--    los días de la semana activa de su rutina, y existe una
--    semana siguiente a la que avanzar.
--  · rutina_id / semana_destino solo vienen rellenos para este
--    tipo de alerta; el resto los deja en null.
-- ============================================================

create or replace view public.v_alertas
with (security_invoker = true) as
with ultima_sesion as (
  select cliente_id, max(fecha_inicio) as ultima
  from public.sesiones
  group by cliente_id
)
-- 1) Sin entrenar X días (umbral configurable en `ajustes`, por defecto 5)
select
  p.id as cliente_id,
  p.nombre,
  'sin_entrenar' as tipo,
  'Sin entrenar ' || floor(extract(epoch from now() - u.ultima) / 86400)::int || ' días' as mensaje,
  null::uuid as rutina_id,
  null::int as semana_destino
from public.profiles p
join ultima_sesion u on u.cliente_id = p.id
cross join public.ajustes a
where p.rol = 'cliente'
  and p.estado = 'activo'
  and u.ultima < now() - make_interval(days => a.dias_sin_entrenar)

union all

-- 2) Cliente nuevo sin valoración inicial (sin ninguna medida registrada)
select p.id, p.nombre, 'sin_valoracion', 'Pendiente de valoración inicial', null::uuid, null::int
from public.profiles p
where p.rol = 'cliente'
  and p.estado = 'activo'
  and not exists (select 1 from public.medidas m where m.cliente_id = p.id)

union all

-- 3) Peso estancado ≥3 semanas con objetivo de pérdida de grasa
select p.id, p.nombre, 'peso_estancado', 'Peso estancado 3 semanas', null::uuid, null::int
from public.profiles p
where p.rol = 'cliente'
  and p.estado = 'activo'
  and p.objetivo ilike '%pérdida%'
  and (select count(*) from public.medidas m
       where m.cliente_id = p.id and m.peso is not null
         and m.fecha > current_date - 21) >= 3
  and coalesce((select max(m.peso) - min(m.peso) from public.medidas m
       where m.cliente_id = p.id and m.peso is not null
         and m.fecha > current_date - 21), 99) < 0.5

union all

-- 4) Semana de rutina completada (sesión registrada en todos sus días)
--    y hay una semana siguiente a la que avanzar
select
  p.id,
  p.nombre,
  'semana_completa',
  'Completó la semana ' || r.semana_actual || ' — lista para avanzar',
  r.id,
  r.semana_actual + 1
from public.profiles p
join public.rutinas r on r.cliente_id = p.id and r.activa = true and r.es_plantilla = false
where p.rol = 'cliente'
  and p.estado = 'activo'
  and exists (
    select 1 from public.rutina_dias rd
    where rd.rutina_id = r.id and rd.semana = r.semana_actual
  )
  and exists (
    select 1 from public.rutina_dias rd
    where rd.rutina_id = r.id and rd.semana = r.semana_actual + 1
  )
  and not exists (
    select 1 from public.rutina_dias rd
    where rd.rutina_id = r.id and rd.semana = r.semana_actual
      and not exists (select 1 from public.sesiones s where s.dia_id = rd.id)
  );
