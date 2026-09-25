-- ============================================================
-- Cuarta tanda:
--   1. Reto del mes en Comunidad.
--   2. Guías del entrenador para sus clientes.
--   3. Opción B de una comida.
--   4. Notificaciones: suscripciones del móvil y preferencias.
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================

-- 1 · Reto del mes ---------------------------------------------
-- Como las otras vistas de comunidad, NO es security_invoker: corre
-- con permisos de su dueño para enseñar el nombre de otros clientes
-- visibles, y solo expone nombre y progreso del mes. El objetivo de
-- cada uno es el suyo: los días de su semana de rutina × 4.
create or replace view public.v_comunidad_reto as
select
  p.id as cliente_id,
  p.nombre,
  (
    select count(distinct (s.fecha_inicio at time zone 'Europe/Madrid')::date)
    from public.sesiones s
    where s.cliente_id = p.id
      and s.fecha_inicio >= (date_trunc('month', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid')
  )::int as entrenos,
  greatest(4, dias.n * 4)::int as objetivo
from public.profiles p
cross join lateral (
  select count(*) as n
  from public.rutina_dias rd
  join public.rutinas r on r.id = rd.rutina_id
  where r.cliente_id = p.id and r.activa and rd.semana = r.semana_actual
) dias
where p.visible_en_comunidad = true and p.estado = 'activo' and p.rol = 'cliente';

-- 2 · Guías ----------------------------------------------------
create table if not exists public.guias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) > 0),
  contenido text not null default '',
  video_url text,
  orden integer not null default 0,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);
alter table public.guias enable row level security;
drop policy if exists "entrenador todo" on public.guias;
create policy "entrenador todo" on public.guias for all
  using (es_entrenador()) with check (es_entrenador());
drop policy if exists "clientes leen guias" on public.guias;
create policy "clientes leen guias" on public.guias for select
  using (auth.uid() is not null);

-- 3 · Opción B de una comida -----------------------------------
-- Cada alimento de una comida es de la opción A (0) o de la B (1). Los
-- totales del día cuentan solo la A: la B es la alternativa con los
-- mismos macros, se come una u otra. nombre_b le pone nombre ("Avena").
alter table public.dieta_comidas add column if not exists nombre_b text;
alter table public.dieta_comida_alimentos
  add column if not exists opcion smallint not null default 0 check (opcion in (0, 1));

-- Las dos funciones que copian dietas, ahora copiando también la B
create or replace function public.asignar_plantilla_dieta(p_plantilla uuid, p_cliente uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dieta uuid;
  v_comida record;
  v_nueva_comida uuid;
begin
  if not es_entrenador() then
    raise exception 'Solo el entrenador puede asignar plantillas.';
  end if;

  update public.dietas set activa = false
  where cliente_id = p_cliente and tipo = 'entreno';

  insert into public.dietas (cliente_id, nombre, es_plantilla, kcal_obj, prot_obj, carb_obj, gras_obj, activa, tipo)
  select p_cliente, nombre, false, kcal_obj, prot_obj, carb_obj, gras_obj, true, 'entreno'
  from public.dietas
  where id = p_plantilla and es_plantilla
  returning id into v_dieta;

  if v_dieta is null then
    raise exception 'Plantilla de dieta no encontrada.';
  end if;

  for v_comida in
    select * from public.dieta_comidas where dieta_id = p_plantilla order by orden
  loop
    insert into public.dieta_comidas (dieta_id, orden, nombre, descripcion_libre, nombre_b)
    values (v_dieta, v_comida.orden, v_comida.nombre, v_comida.descripcion_libre, v_comida.nombre_b)
    returning id into v_nueva_comida;

    insert into public.dieta_comida_alimentos (comida_id, alimento_id, gramos, orden, opcion)
    select v_nueva_comida, alimento_id, gramos, orden, opcion
    from public.dieta_comida_alimentos
    where comida_id = v_comida.id;
  end loop;

  return v_dieta;
end;
$$;

create or replace function public.crear_dieta_descanso(p_cliente uuid, p_reduccion int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origen uuid;
  v_dieta uuid;
  v_comida record;
  v_nueva_comida uuid;
  v_carbs_total numeric;
  v_factor numeric;
begin
  if not es_entrenador() then
    raise exception 'Solo el entrenador puede crear dietas.';
  end if;
  if p_reduccion < 0 or p_reduccion > 200 then
    raise exception 'La reducción de hidratos debe estar entre 0 y 200 g.';
  end if;

  select id into v_origen from public.dietas
  where cliente_id = p_cliente and activa and tipo = 'entreno' and not es_plantilla
  order by creada_en desc limit 1;

  if v_origen is null then
    raise exception 'El cliente no tiene una dieta de entreno activa de la que copiar.';
  end if;

  update public.dietas set activa = false
  where cliente_id = p_cliente and tipo = 'descanso';

  insert into public.dietas (cliente_id, nombre, es_plantilla, kcal_obj, prot_obj, carb_obj, gras_obj, activa, tipo)
  select p_cliente, nombre, false,
         greatest(800, kcal_obj - 4 * p_reduccion),
         prot_obj,
         greatest(0, carb_obj - p_reduccion),
         gras_obj,
         true, 'descanso'
  from public.dietas where id = v_origen
  returning id into v_dieta;

  for v_comida in
    select * from public.dieta_comidas where dieta_id = v_origen order by orden
  loop
    insert into public.dieta_comidas (dieta_id, orden, nombre, descripcion_libre, nombre_b)
    values (v_dieta, v_comida.orden, v_comida.nombre, v_comida.descripcion_libre, v_comida.nombre_b)
    returning id into v_nueva_comida;

    insert into public.dieta_comida_alimentos (comida_id, alimento_id, gramos, orden, opcion)
    select v_nueva_comida, alimento_id, gramos, orden, opcion
    from public.dieta_comida_alimentos
    where comida_id = v_comida.id;
  end loop;

  -- Hidratos del día (solo la opción A, que es la que suma)
  select coalesce(sum(dca.gramos * a.carb_100 / 100), 0) into v_carbs_total
  from public.dieta_comida_alimentos dca
  join public.dieta_comidas dc on dc.id = dca.comida_id
  join public.alimentos a on a.id = dca.alimento_id
  where dc.dieta_id = v_dieta and a.categoria = 'carbohidrato' and dca.opcion = 0;

  -- Mismo recorte proporcional en las dos opciones
  if v_carbs_total > 0 then
    v_factor := greatest(0, (v_carbs_total - p_reduccion) / v_carbs_total);
    update public.dieta_comida_alimentos dca
    set gramos = greatest(0, round(dca.gramos * v_factor / 5) * 5)
    from public.dieta_comidas dc, public.alimentos a
    where dc.id = dca.comida_id
      and a.id = dca.alimento_id
      and dc.dieta_id = v_dieta
      and a.categoria = 'carbohidrato';
  end if;

  return v_dieta;
end;
$$;

-- 4 · Notificaciones -------------------------------------------
create table if not exists public.push_suscripciones (
  endpoint text primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  creada_en timestamptz not null default now()
);
create index if not exists idx_push_usuario on public.push_suscripciones (usuario_id);
alter table public.push_suscripciones enable row level security;
drop policy if exists "cada uno las suyas" on public.push_suscripciones;
create policy "cada uno las suyas" on public.push_suscripciones for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

alter table public.profiles
  add column if not exists avisos jsonb not null
  default '{"mensajes": true, "entreno": true, "peso": true, "cambios": true}'::jsonb;

-- El cliente no puede editar su fila de profiles directamente (solo
-- leerla): cada cambio que sí le toca va por una función que actualiza
-- únicamente esa columna de su propio perfil.
create or replace function public.guardar_avisos(p_avisos jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set avisos = p_avisos where id = auth.uid();
$$;

-- Arregla el interruptor "Aparecer en la comunidad" del Perfil, que
-- intentaba un UPDATE directo que la seguridad de la tabla bloqueaba
-- sin avisar (el cambio no se guardaba).
create or replace function public.cambiar_visible_comunidad(p_visible boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set visible_en_comunidad = p_visible where id = auth.uid();
$$;
