-- ============================================================
-- PLATAFORMA LIVIU — Migración 24: dieta de día de descanso
-- (como en el Excel de Liviu: los días sin entreno se comen
-- menos hidratos porque el gasto es menor).
--  · dietas.tipo: 'entreno' (por defecto) o 'descanso'. Un
--    cliente puede tener UNA dieta activa de cada tipo.
--  · crear_dieta_descanso(): copia la dieta de entreno activa
--    del cliente como dieta de descanso, recortando N gramos de
--    hidratos del objetivo (y sus kcal, 4 kcal/g) y reduciendo
--    proporcionalmente los gramos de los alimentos de categoría
--    'carbohidrato' de cada comida.
--  · asignar_plantilla_dieta ahora solo desactiva las dietas de
--    ENTRENO del cliente (no pisa su dieta de descanso).
-- ============================================================

alter table public.dietas
  add column if not exists tipo text not null default 'entreno'
  check (tipo in ('entreno', 'descanso'));

-- ------------------------------------------------------------
-- Asignar plantilla: solo sustituye la dieta de entreno
-- ------------------------------------------------------------
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
    insert into public.dieta_comidas (dieta_id, orden, nombre, descripcion_libre)
    values (v_dieta, v_comida.orden, v_comida.nombre, v_comida.descripcion_libre)
    returning id into v_nueva_comida;

    insert into public.dieta_comida_alimentos (comida_id, alimento_id, gramos, orden)
    select v_nueva_comida, alimento_id, gramos, orden
    from public.dieta_comida_alimentos
    where comida_id = v_comida.id;
  end loop;

  return v_dieta;
end;
$$;

-- ------------------------------------------------------------
-- Crear la dieta de descanso a partir de la de entreno
-- ------------------------------------------------------------
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
    insert into public.dieta_comidas (dieta_id, orden, nombre, descripcion_libre)
    values (v_dieta, v_comida.orden, v_comida.nombre, v_comida.descripcion_libre)
    returning id into v_nueva_comida;

    insert into public.dieta_comida_alimentos (comida_id, alimento_id, gramos, orden)
    select v_nueva_comida, alimento_id, gramos, orden
    from public.dieta_comida_alimentos
    where comida_id = v_comida.id;
  end loop;

  -- Hidratos que aportan los alimentos de categoría 'carbohidrato'
  select coalesce(sum(dca.gramos * a.carb_100 / 100), 0) into v_carbs_total
  from public.dieta_comida_alimentos dca
  join public.dieta_comidas dc on dc.id = dca.comida_id
  join public.alimentos a on a.id = dca.alimento_id
  where dc.dieta_id = v_dieta and a.categoria = 'carbohidrato';

  -- Reduce sus gramos proporcionalmente para quitar ~p_reduccion g
  -- de hidratos (redondeando a múltiplos de 5 g)
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
