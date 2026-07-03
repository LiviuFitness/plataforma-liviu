-- ============================================================
-- PLATAFORMA LIVIU — Migración 2: Row Level Security, vistas
-- y funciones. Un cliente JAMÁS puede leer datos de otro (§3).
-- ============================================================

-- ------------------------------------------------------------
-- Función auxiliar: ¿el usuario actual es el entrenador?
-- (security definer para evitar recursión en las políticas de profiles)
-- ------------------------------------------------------------
create or replace function public.es_entrenador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'entrenador'
  );
$$;

-- ------------------------------------------------------------
-- Activar RLS en TODAS las tablas
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.invitaciones enable row level security;
alter table public.ajustes enable row level security;
alter table public.ejercicios enable row level security;
alter table public.rutinas enable row level security;
alter table public.rutina_dias enable row level security;
alter table public.rutina_ejercicios enable row level security;
alter table public.series_prescritas enable row level security;
alter table public.sesiones enable row level security;
alter table public.series_realizadas enable row level security;
alter table public.dietas enable row level security;
alter table public.dieta_comidas enable row level security;
alter table public.medidas enable row level security;

-- ------------------------------------------------------------
-- Políticas: el entrenador puede todo
-- ------------------------------------------------------------
create policy "entrenador todo" on public.profiles for all
  using (es_entrenador()) with check (es_entrenador());
create policy "entrenador todo" on public.invitaciones for all
  using (es_entrenador()) with check (es_entrenador());
create policy "entrenador todo" on public.ajustes for all
  using (es_entrenador()) with check (es_entrenador());
create policy "entrenador todo" on public.ejercicios for all
  using (es_entrenador()) with check (es_entrenador());
create policy "entrenador todo" on public.rutinas for all
  using (es_entrenador()) with check (es_entrenador());
create policy "entrenador todo" on public.rutina_dias for all
  using (es_entrenador()) with check (es_entrenador());
create policy "entrenador todo" on public.rutina_ejercicios for all
  using (es_entrenador()) with check (es_entrenador());
create policy "entrenador todo" on public.series_prescritas for all
  using (es_entrenador()) with check (es_entrenador());
create policy "entrenador todo" on public.sesiones for all
  using (es_entrenador()) with check (es_entrenador());
create policy "entrenador todo" on public.series_realizadas for all
  using (es_entrenador()) with check (es_entrenador());
create policy "entrenador todo" on public.dietas for all
  using (es_entrenador()) with check (es_entrenador());
create policy "entrenador todo" on public.dieta_comidas for all
  using (es_entrenador()) with check (es_entrenador());
create policy "entrenador todo" on public.medidas for all
  using (es_entrenador()) with check (es_entrenador());

-- ------------------------------------------------------------
-- Políticas del cliente: SOLO sus propios datos
-- (la app del cliente llega en Fase 2; las políticas quedan listas)
-- ------------------------------------------------------------

-- Su perfil (sin poder tocar rol ni notas del entrenador: solo lectura)
create policy "cliente lee su perfil" on public.profiles for select
  using (id = auth.uid());

-- Biblioteca de ejercicios: lectura para cualquier usuario autenticado
create policy "clientes leen ejercicios" on public.ejercicios for select
  using (auth.uid() is not null);

-- Su rutina
create policy "cliente lee su rutina" on public.rutinas for select
  using (cliente_id = auth.uid());
create policy "cliente lee sus dias" on public.rutina_dias for select
  using (exists (
    select 1 from public.rutinas r
    where r.id = rutina_id and r.cliente_id = auth.uid()
  ));
create policy "cliente lee sus ejercicios de rutina" on public.rutina_ejercicios for select
  using (exists (
    select 1 from public.rutina_dias d
    join public.rutinas r on r.id = d.rutina_id
    where d.id = dia_id and r.cliente_id = auth.uid()
  ));
create policy "cliente lee sus series prescritas" on public.series_prescritas for select
  using (exists (
    select 1 from public.rutina_ejercicios re
    join public.rutina_dias d on d.id = re.dia_id
    join public.rutinas r on r.id = d.rutina_id
    where re.id = rutina_ejercicio_id and r.cliente_id = auth.uid()
  ));

-- Sus sesiones: leer y registrar
create policy "cliente gestiona sus sesiones" on public.sesiones for all
  using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());
create policy "cliente gestiona sus series realizadas" on public.series_realizadas for all
  using (exists (
    select 1 from public.sesiones s
    where s.id = sesion_id and s.cliente_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sesiones s
    where s.id = sesion_id and s.cliente_id = auth.uid()
  ));

-- Su dieta
create policy "cliente lee su dieta" on public.dietas for select
  using (cliente_id = auth.uid());
create policy "cliente lee sus comidas" on public.dieta_comidas for select
  using (exists (
    select 1 from public.dietas dd
    where dd.id = dieta_id and dd.cliente_id = auth.uid()
  ));

-- Sus medidas: leer y registrar peso propio (Fase 2)
create policy "cliente lee sus medidas" on public.medidas for select
  using (cliente_id = auth.uid());
create policy "cliente registra sus medidas" on public.medidas for insert
  with check (cliente_id = auth.uid());

-- ------------------------------------------------------------
-- Vista de alertas (§5): calculadas en consulta, sin tabla.
-- security_invoker => respeta el RLS del usuario que consulta.
-- ------------------------------------------------------------
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
  'Sin entrenar ' || floor(extract(epoch from now() - u.ultima) / 86400)::int || ' días' as mensaje
from public.profiles p
join ultima_sesion u on u.cliente_id = p.id
cross join public.ajustes a
where p.rol = 'cliente'
  and p.estado = 'activo'
  and u.ultima < now() - make_interval(days => a.dias_sin_entrenar)

union all

-- 2) Cliente nuevo sin valoración inicial (sin ninguna medida registrada)
select p.id, p.nombre, 'sin_valoracion', 'Pendiente de valoración inicial'
from public.profiles p
where p.rol = 'cliente'
  and p.estado = 'activo'
  and not exists (select 1 from public.medidas m where m.cliente_id = p.id)

union all

-- 3) Peso estancado ≥3 semanas con objetivo de pérdida de grasa
select p.id, p.nombre, 'peso_estancado', 'Peso estancado 3 semanas'
from public.profiles p
where p.rol = 'cliente'
  and p.estado = 'activo'
  and p.objetivo ilike '%pérdida%'
  and (select count(*) from public.medidas m
       where m.cliente_id = p.id and m.peso is not null
         and m.fecha > current_date - 21) >= 3
  and coalesce((select max(m.peso) - min(m.peso) from public.medidas m
       where m.cliente_id = p.id and m.peso is not null
         and m.fecha > current_date - 21), 99) < 0.5;

-- ------------------------------------------------------------
-- Vista de adherencia: sesiones de los últimos 28 días frente a
-- lo prescrito (días de la rutina activa × 4 semanas).
-- En Fase 1 no hay sesiones: mostrará 0 hasta que llegue la app
-- del cliente (Fase 2).
-- ------------------------------------------------------------
create or replace view public.v_adherencia
with (security_invoker = true) as
select
  p.id as cliente_id,
  coalesce(
    least(100, round(
      100.0 * (
        select count(*) from public.sesiones s
        where s.cliente_id = p.id
          and s.fecha_inicio > now() - interval '28 days'
      ) / nullif(dias.n * 4, 0)
    )),
    0
  )::int as adherencia
from public.profiles p
cross join lateral (
  select count(*) as n
  from public.rutina_dias rd
  join public.rutinas r on r.id = rd.rutina_id
  where r.cliente_id = p.id and r.activa
) dias
where p.rol = 'cliente';

-- ------------------------------------------------------------
-- RPC pública: validar una invitación desde la página de alta
-- (accesible sin sesión; solo revela datos con un token válido)
-- ------------------------------------------------------------
create or replace function public.validar_invitacion(p_token uuid)
returns table (valida boolean, email text, nombre text)
language sql
stable
security definer
set search_path = public
as $$
  select
    (i.id is not null) as valida,
    coalesce(i.email, '') as email,
    coalesce(i.nombre, '') as nombre
  from (select 1) unidad
  left join public.invitaciones i
    on i.token = p_token and not i.usada and i.expira > now();
$$;

grant execute on function public.validar_invitacion(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- RPC: asignar plantilla de rutina a un cliente (COPIA, no vincula)
-- ------------------------------------------------------------
create or replace function public.asignar_plantilla_rutina(p_plantilla uuid, p_cliente uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rutina uuid;
  v_dia record;
  v_nuevo_dia uuid;
  v_ej record;
  v_nuevo_ej uuid;
begin
  if not es_entrenador() then
    raise exception 'Solo el entrenador puede asignar plantillas.';
  end if;

  -- La nueva rutina pasa a ser la activa del cliente
  update public.rutinas set activa = false where cliente_id = p_cliente;

  insert into public.rutinas (cliente_id, nombre, es_plantilla, activa, notas)
  select p_cliente, nombre, false, true, notas
  from public.rutinas
  where id = p_plantilla and es_plantilla
  returning id into v_rutina;

  if v_rutina is null then
    raise exception 'Plantilla de rutina no encontrada.';
  end if;

  for v_dia in
    select * from public.rutina_dias where rutina_id = p_plantilla order by orden
  loop
    insert into public.rutina_dias (rutina_id, orden, nombre)
    values (v_rutina, v_dia.orden, v_dia.nombre)
    returning id into v_nuevo_dia;

    for v_ej in
      select * from public.rutina_ejercicios where dia_id = v_dia.id order by orden
    loop
      insert into public.rutina_ejercicios (dia_id, ejercicio_id, orden, descanso_seg, notas)
      values (v_nuevo_dia, v_ej.ejercicio_id, v_ej.orden, v_ej.descanso_seg, v_ej.notas)
      returning id into v_nuevo_ej;

      insert into public.series_prescritas (rutina_ejercicio_id, orden, tipo, kg, reps, rir)
      select v_nuevo_ej, orden, tipo, kg, reps, rir
      from public.series_prescritas
      where rutina_ejercicio_id = v_ej.id;
    end loop;
  end loop;

  return v_rutina;
end;
$$;

-- ------------------------------------------------------------
-- RPC: asignar plantilla de dieta a un cliente (COPIA, no vincula)
-- ------------------------------------------------------------
create or replace function public.asignar_plantilla_dieta(p_plantilla uuid, p_cliente uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dieta uuid;
begin
  if not es_entrenador() then
    raise exception 'Solo el entrenador puede asignar plantillas.';
  end if;

  update public.dietas set activa = false where cliente_id = p_cliente;

  insert into public.dietas (cliente_id, nombre, es_plantilla, kcal_obj, prot_obj, carb_obj, gras_obj, activa)
  select p_cliente, nombre, false, kcal_obj, prot_obj, carb_obj, gras_obj, true
  from public.dietas
  where id = p_plantilla and es_plantilla
  returning id into v_dieta;

  if v_dieta is null then
    raise exception 'Plantilla de dieta no encontrada.';
  end if;

  insert into public.dieta_comidas (dieta_id, orden, nombre, descripcion_libre)
  select v_dieta, orden, nombre, descripcion_libre
  from public.dieta_comidas
  where dieta_id = p_plantilla;

  return v_dieta;
end;
$$;
