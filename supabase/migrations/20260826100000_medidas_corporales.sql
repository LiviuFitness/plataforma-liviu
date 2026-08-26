-- ============================================================
-- PLATAFORMA LIVIU — Migración 32: medidas corporales completas
--
-- La tabla `medidas` ya reservaba peso/cintura/pecho/brazo/pierna
-- desde la Migración 1, pero solo el peso llegó a tener interfaz.
-- Aquí se completan los perímetros que faltan y se añade una única
-- vía de guardado que garantiza UNA fila por cliente y día.
--
-- Por qué la RPC: hasta ahora el peso se insertaba directo, así que
-- pesarse dos veces el mismo día creaba dos filas y la media semanal
-- de `lib/revision.ts` contaba ese día por duplicado. Con perímetros
-- el problema se agrava (cada medida sería su propia fila y ninguna
-- tendría la foto completa del día).
-- ============================================================

alter table public.medidas
  add column if not exists cuello numeric(5, 2),
  add column if not exists hombros numeric(5, 2),
  add column if not exists cadera numeric(5, 2),
  add column if not exists gemelo numeric(5, 2);

-- Guarda o actualiza la fila del día indicado. Los parámetros que
-- llegan NULL no se tocan (no borran lo ya guardado), de forma que
-- se puede registrar el peso por la mañana y el pecho por la tarde
-- sin perder ninguno de los dos.
--
-- SECURITY INVOKER (el valor por defecto): las políticas RLS de
-- `medidas` deciden quién puede escribir sobre quién, así que la
-- misma función sirve al cliente (sobre sí mismo) y al entrenador
-- (sobre cualquiera de sus clientes) sin abrir ningún agujero.
create or replace function public.guardar_medidas(
  p_cliente_id uuid default null,
  p_fecha date default null,
  p_peso numeric default null,
  p_cuello numeric default null,
  p_hombros numeric default null,
  p_pecho numeric default null,
  p_brazo numeric default null,
  p_cintura numeric default null,
  p_cadera numeric default null,
  p_pierna numeric default null,
  p_gemelo numeric default null
) returns uuid
language plpgsql
as $$
declare
  v_cliente uuid := coalesce(p_cliente_id, auth.uid());
  v_fecha date := coalesce(p_fecha, current_date);
  v_id uuid;
begin
  if v_cliente is null then
    raise exception 'Sin cliente al que asignar la medida';
  end if;

  -- Puede haber filas duplicadas de días anteriores (creadas por el
  -- insert directo que se usaba antes); nos quedamos con la primera
  -- de forma estable en vez de fallar.
  select id into v_id
    from public.medidas
   where cliente_id = v_cliente and fecha = v_fecha
   order by id
   limit 1;

  if v_id is null then
    insert into public.medidas (
      cliente_id, fecha, peso, cuello, hombros, pecho,
      brazo, cintura, cadera, pierna, gemelo
    )
    values (
      v_cliente, v_fecha, p_peso, p_cuello, p_hombros, p_pecho,
      p_brazo, p_cintura, p_cadera, p_pierna, p_gemelo
    )
    returning id into v_id;
  else
    update public.medidas set
      peso    = coalesce(p_peso, peso),
      cuello  = coalesce(p_cuello, cuello),
      hombros = coalesce(p_hombros, hombros),
      pecho   = coalesce(p_pecho, pecho),
      brazo   = coalesce(p_brazo, brazo),
      cintura = coalesce(p_cintura, cintura),
      cadera  = coalesce(p_cadera, cadera),
      pierna  = coalesce(p_pierna, pierna),
      gemelo  = coalesce(p_gemelo, gemelo)
    where id = v_id;
  end if;

  return v_id;
end;
$$;
