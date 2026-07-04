-- ============================================================
-- REPARACIÓN: acentos corruptos + migración 4 (datos físicos)
-- Seguro de ejecutar varias veces.
-- ============================================================

-- ============================================================
-- PLATAFORMA LIVIU — Migración 4: datos físicos del cliente
-- Necesarios para el auto-cálculo de macros (Mifflin-St Jeor).
-- ============================================================

alter table public.profiles
  add column if not exists fecha_nacimiento date,
  add column if not exists altura_cm numeric(5, 1),
  add column if not exists sexo text check (sexo in ('hombre', 'mujer')),
  add column if not exists factor_actividad numeric(3, 2) not null default 1.55;

comment on column public.profiles.factor_actividad is
  'Multiplicador de actividad: 1.2 sedentario · 1.375 ligero · 1.55 moderado · 1.725 alto · 1.9 muy alto';

-- ----- Función de alta (mensajes con acentos correctos) -----
create or replace function public.gestionar_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_primero boolean;
  v_token uuid;
  v_inv public.invitaciones%rowtype;
  v_consentimiento timestamptz;
begin
  select count(*) = 0 into v_primero from public.profiles;

  v_consentimiento := nullif(new.raw_user_meta_data ->> 'consentimiento', '')::timestamptz;

  if v_primero then
    -- Primer usuario = el entrenador (alta manual, ver README)
    insert into public.profiles (id, rol, nombre, email)
    values (
      new.id,
      'entrenador',
      coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
      new.email
    );
    return new;
  end if;

  -- Resto de usuarios: solo por invitación
  v_token := nullif(new.raw_user_meta_data ->> 'invitacion', '')::uuid;
  if v_token is null then
    raise exception 'El alta solo es posible con una invitación del entrenador.';
  end if;

  select * into v_inv
  from public.invitaciones
  where token = v_token and not usada and expira > now();

  if not found then
    raise exception 'La invitación no es válida o ha caducado. Pide una nueva a tu entrenador.';
  end if;

  update public.invitaciones set usada = true where id = v_inv.id;

  insert into public.profiles (id, rol, nombre, email, objetivo, plan, consentimiento_salud)
  values (
    new.id,
    'cliente',
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), v_inv.nombre),
    new.email,
    v_inv.objetivo,
    v_inv.plan,
    v_consentimiento
  );

  return new;
end;
$$;

-- ----- Vistas y funciones con textos corregidos -----
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

-- ----- Volver a sembrar la biblioteca con acentos correctos -----
delete from public.ejercicios where creado_por is null;

insert into public.ejercicios (nombre, grupo_muscular, material) values
-- ------------------------- PECHO -------------------------
('Press banca', 'Pecho', 'Barra'),
('Press banca agarre cerrado', 'Pecho', 'Barra'),
('Press inclinado con barra', 'Pecho', 'Barra'),
('Press declinado con barra', 'Pecho', 'Barra'),
('Press banca con mancuernas', 'Pecho', 'Mancuernas'),
('Press inclinado con mancuernas', 'Pecho', 'Mancuernas'),
('Aperturas con mancuernas', 'Pecho', 'Mancuernas'),
('Aperturas inclinadas con mancuernas', 'Pecho', 'Mancuernas'),
('Aperturas en polea (cruce de poleas)', 'Pecho', 'Polea'),
('Cruce de poleas bajo', 'Pecho', 'Polea'),
('Press en máquina', 'Pecho', 'Máquina'),
('Contractora (peck deck)', 'Pecho', 'Máquina'),
('Fondos en paralelas', 'Pecho', 'Peso corporal'),
('Flexiones', 'Pecho', 'Peso corporal'),
('Flexiones con lastre', 'Pecho', 'Lastre'),
('Flexiones declinadas', 'Pecho', 'Peso corporal'),
('Press de suelo con mancuernas', 'Pecho', 'Mancuernas'),
('Pullover con mancuerna', 'Pecho', 'Mancuerna'),

-- ------------------------- ESPALDA -------------------------
('Dominadas', 'Espalda', 'Peso corporal'),
('Dominadas lastradas', 'Espalda', 'Lastre'),
('Dominadas supinas (chin-up)', 'Espalda', 'Peso corporal'),
('Dominadas asistidas en máquina', 'Espalda', 'Máquina'),
('Jalón al pecho', 'Espalda', 'Polea'),
('Jalón al pecho agarre cerrado', 'Espalda', 'Polea'),
('Jalón al pecho agarre supino', 'Espalda', 'Polea'),
('Remo con barra', 'Espalda', 'Barra'),
('Remo Pendlay', 'Espalda', 'Barra'),
('Remo con mancuerna a una mano', 'Espalda', 'Mancuerna'),
('Remo en punta (T-bar)', 'Espalda', 'Barra'),
('Remo en polea baja (Gironda)', 'Espalda', 'Polea'),
('Remo en máquina', 'Espalda', 'Máquina'),
('Remo en máquina agarre neutro', 'Espalda', 'Máquina'),
('Peso muerto', 'Espalda', 'Barra'),
('Rack pull (peso muerto parcial)', 'Espalda', 'Barra'),
('Pull-over en polea alta', 'Espalda', 'Polea'),
('Face pull', 'Espalda', 'Polea'),
('Encogimientos de trapecio con barra', 'Espalda', 'Barra'),
('Encogimientos de trapecio con mancuernas', 'Espalda', 'Mancuernas'),
('Hiperextensiones lumbares', 'Espalda', 'Banco'),
('Remo invertido en barra', 'Espalda', 'Peso corporal'),

-- ------------------------- HOMBRO -------------------------
('Press militar de pie', 'Hombro', 'Barra'),
('Press militar sentado', 'Hombro', 'Barra'),
('Press de hombro con mancuernas', 'Hombro', 'Mancuernas'),
('Press Arnold', 'Hombro', 'Mancuernas'),
('Press de hombro en máquina', 'Hombro', 'Máquina'),
('Push press', 'Hombro', 'Barra'),
('Elevaciones laterales', 'Hombro', 'Mancuernas'),
('Elevaciones laterales en polea', 'Hombro', 'Polea'),
('Elevaciones laterales en máquina', 'Hombro', 'Máquina'),
('Elevaciones frontales con mancuernas', 'Hombro', 'Mancuernas'),
('Elevaciones frontales con disco', 'Hombro', 'Disco'),
('Pájaros (deltoide posterior)', 'Hombro', 'Mancuernas'),
('Deltoide posterior en máquina', 'Hombro', 'Máquina'),
('Deltoide posterior en polea (cruces inversos)', 'Hombro', 'Polea'),
('Remo al mentón', 'Hombro', 'Barra'),
('Press tras nuca', 'Hombro', 'Barra'),

-- ------------------------- BÍCEPS -------------------------
('Curl de bíceps con barra', 'Bíceps', 'Barra'),
('Curl de bíceps con barra Z', 'Bíceps', 'Barra Z'),
('Curl de bíceps con mancuernas', 'Bíceps', 'Mancuernas'),
('Curl alterno con mancuernas', 'Bíceps', 'Mancuernas'),
('Curl martillo', 'Bíceps', 'Mancuernas'),
('Curl inclinado con mancuernas', 'Bíceps', 'Mancuernas'),
('Curl concentrado', 'Bíceps', 'Mancuerna'),
('Curl en banco Scott', 'Bíceps', 'Barra Z'),
('Curl en polea baja', 'Bíceps', 'Polea'),
('Curl en polea con cuerda', 'Bíceps', 'Polea'),
('Curl araña', 'Bíceps', 'Barra Z'),
('Curl de antebrazo (muñeca)', 'Bíceps', 'Barra'),

-- ------------------------- TRÍCEPS -------------------------
('Press francés con barra Z', 'Tríceps', 'Barra Z'),
('Press francés con mancuernas', 'Tríceps', 'Mancuernas'),
('Extensión de tríceps en polea alta', 'Tríceps', 'Polea'),
('Extensión de tríceps con cuerda', 'Tríceps', 'Polea'),
('Extensión de tríceps sobre la cabeza en polea', 'Tríceps', 'Polea'),
('Extensión de tríceps con mancuerna a una mano', 'Tríceps', 'Mancuerna'),
('Fondos entre bancos', 'Tríceps', 'Peso corporal'),
('Fondos en paralelas (tríceps)', 'Tríceps', 'Peso corporal'),
('Fondos lastrados', 'Tríceps', 'Lastre'),
('Patada de tríceps con mancuerna', 'Tríceps', 'Mancuerna'),
('Press banca agarre cerrado (tríceps)', 'Tríceps', 'Barra'),
('Extensión de tríceps en máquina', 'Tríceps', 'Máquina'),

-- ------------------------- PIERNA -------------------------
('Sentadilla', 'Pierna', 'Barra'),
('Sentadilla frontal', 'Pierna', 'Barra'),
('Sentadilla goblet', 'Pierna', 'Mancuerna'),
('Sentadilla búlgara', 'Pierna', 'Mancuernas'),
('Sentadilla en multipower', 'Pierna', 'Multipower'),
('Sentadilla hack', 'Pierna', 'Máquina'),
('Sentadilla sissy', 'Pierna', 'Peso corporal'),
('Prensa de piernas', 'Pierna', 'Máquina'),
('Prensa horizontal', 'Pierna', 'Máquina'),
('Zancadas con mancuernas', 'Pierna', 'Mancuernas'),
('Zancadas con barra', 'Pierna', 'Barra'),
('Zancadas caminando', 'Pierna', 'Mancuernas'),
('Subida al cajón (step-up)', 'Pierna', 'Mancuernas'),
('Extensión de cuádriceps', 'Pierna', 'Máquina'),
('Curl femoral tumbado', 'Pierna', 'Máquina'),
('Curl femoral sentado', 'Pierna', 'Máquina'),
('Curl femoral de pie', 'Pierna', 'Máquina'),
('Curl nórdico', 'Pierna', 'Peso corporal'),
('Peso muerto rumano', 'Pierna', 'Barra'),
('Peso muerto rumano con mancuernas', 'Pierna', 'Mancuernas'),
('Peso muerto piernas rígidas', 'Pierna', 'Barra'),
('Buenos días', 'Pierna', 'Barra'),
('Gemelo de pie en máquina', 'Pierna', 'Máquina'),
('Gemelo de pie con barra', 'Pierna', 'Barra'),
('Gemelo sentado', 'Pierna', 'Máquina'),
('Gemelo en prensa', 'Pierna', 'Máquina'),
('Aductores en máquina', 'Pierna', 'Máquina'),
('Abductores en máquina', 'Pierna', 'Máquina'),

-- ------------------------- GLÚTEO -------------------------
('Hip thrust con barra', 'Glúteo', 'Barra'),
('Hip thrust en máquina', 'Glúteo', 'Máquina'),
('Puente de glúteo', 'Glúteo', 'Peso corporal'),
('Puente de glúteo con disco', 'Glúteo', 'Disco'),
('Patada de glúteo en polea', 'Glúteo', 'Polea'),
('Patada de glúteo en máquina', 'Glúteo', 'Máquina'),
('Peso muerto sumo', 'Glúteo', 'Barra'),
('Abducción de cadera en polea', 'Glúteo', 'Polea'),
('Sentadilla sumo con mancuerna', 'Glúteo', 'Mancuerna'),
('Hiperextensión con foco en glúteo', 'Glúteo', 'Banco'),
('Frog pump', 'Glúteo', 'Peso corporal'),
('Monster walk con banda', 'Glúteo', 'Banda elástica'),

-- ------------------------- CORE -------------------------
('Plancha', 'Core', 'Peso corporal'),
('Plancha lateral', 'Core', 'Peso corporal'),
('Plancha con lastre', 'Core', 'Lastre'),
('Crunch abdominal', 'Core', 'Peso corporal'),
('Crunch en polea alta', 'Core', 'Polea'),
('Crunch en máquina', 'Core', 'Máquina'),
('Elevaciones de piernas colgado', 'Core', 'Peso corporal'),
('Elevaciones de rodillas colgado', 'Core', 'Peso corporal'),
('Elevaciones de piernas tumbado', 'Core', 'Peso corporal'),
('Rueda abdominal', 'Core', 'Rueda'),
('Dead bug', 'Core', 'Peso corporal'),
('Bird dog', 'Core', 'Peso corporal'),
('Pallof press', 'Core', 'Polea'),
('Rotación en polea (leñador)', 'Core', 'Polea'),
('Russian twist', 'Core', 'Disco'),
('Mountain climbers', 'Core', 'Peso corporal'),
('Hollow hold', 'Core', 'Peso corporal'),
('Abdominales en banco declinado', 'Core', 'Banco');
