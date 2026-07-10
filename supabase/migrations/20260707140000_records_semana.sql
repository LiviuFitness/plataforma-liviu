-- ============================================================
-- PLATAFORMA LIVIU — Migración 25: récords de la semana para el
-- entrenador (estilo Harbiz: "felicita proactivamente").
-- Vista con los récords batidos en los últimos 7 días: mejor kg
-- reciente de un ejercicio que supera la mejor marca que el
-- cliente tenía antes de esos 7 días.
-- ============================================================

create or replace view public.v_records_semana
with (security_invoker = true) as
with realizadas as (
  select s.cliente_id, re.ejercicio_id, sr.kg, s.fecha_inicio
  from public.series_realizadas sr
  join public.sesiones s on s.id = sr.sesion_id
  join public.rutina_ejercicios re on re.id = sr.rutina_ejercicio_id
  where sr.completada
    and sr.tipo <> 'calentamiento'
    and sr.kg is not null
),
recientes as (
  select cliente_id, ejercicio_id, max(kg) as kg_nuevo
  from realizadas
  where fecha_inicio > now() - interval '7 days'
  group by cliente_id, ejercicio_id
),
previos as (
  select cliente_id, ejercicio_id, max(kg) as kg_previo
  from realizadas
  where fecha_inicio <= now() - interval '7 days'
  group by cliente_id, ejercicio_id
)
select
  r.cliente_id,
  p.nombre,
  e.nombre as ejercicio,
  r.kg_nuevo,
  pv.kg_previo
from recientes r
join previos pv
  on pv.cliente_id = r.cliente_id and pv.ejercicio_id = r.ejercicio_id
join public.profiles p on p.id = r.cliente_id
join public.ejercicios e on e.id = r.ejercicio_id
where r.kg_nuevo > pv.kg_previo
  and p.estado = 'activo';
