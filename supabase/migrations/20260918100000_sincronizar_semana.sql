-- ============================================================
-- Sincronizar una semana entera con otras.
--
-- copiar_dia_a_semanas arregla un día suelto. Esto arregla la semana:
-- copia TODOS sus días a las semanas elegidas y, además, BORRA de esas
-- semanas los días que sobran. Si la semana 1 tiene 4 días y la 2 tiene
-- 5, la 2 se queda en 4.
--
-- Es la única operación destructiva del editor de rutinas, así que la
-- pantalla tiene que enseñar antes qué días se van a borrar. Borrar un
-- día no borra el historial del cliente: sesiones.dia_id está declarado
-- "on delete set null", así que las sesiones ya registradas siguen ahí
-- con sus series, solo dejan de apuntar a ese día de la rutina.
-- ============================================================

create or replace function public.sincronizar_semana(
  p_rutina uuid,
  p_semana_origen int,
  p_semanas int[],
  p_incluir_cargas boolean default false
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia record;
  v_destino int;
  v_max_orden int;
  v_borrados int := 0;
begin
  if not es_entrenador() then
    raise exception 'Solo el entrenador puede sincronizar semanas.';
  end if;

  if not exists (select 1 from public.rutinas where id = p_rutina) then
    raise exception 'La rutina no existe.';
  end if;

  select coalesce(max(orden), -1) into v_max_orden
  from public.rutina_dias
  where rutina_id = p_rutina and semana = p_semana_origen;

  if v_max_orden < 0 then
    raise exception 'La semana de origen no tiene días.';
  end if;

  /* Primero los días que sobran: se quitan antes de copiar para que la
   * semana destino no quede un instante con días de más. */
  foreach v_destino in array p_semanas loop
    continue when v_destino = p_semana_origen;
    delete from public.rutina_dias
    where rutina_id = p_rutina
      and semana = v_destino
      and orden > v_max_orden;
    get diagnostics v_borrados = row_count;
  end loop;

  /* Y después cada día del origen, con la misma lógica de un día suelto
   * (conserva las cargas ya ajustadas salvo que se pida lo contrario). */
  for v_dia in
    select id from public.rutina_dias
    where rutina_id = p_rutina and semana = p_semana_origen
    order by orden
  loop
    perform public.copiar_dia_a_semanas(v_dia.id, p_semanas, p_incluir_cargas);
  end loop;

  return v_max_orden + 1;   -- días que tiene ahora cada semana destino
end;
$$;

revoke all on function public.sincronizar_semana(uuid, int, int[], boolean) from public;
grant execute on function public.sincronizar_semana(uuid, int, int[], boolean) to authenticated;
