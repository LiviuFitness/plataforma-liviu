-- ============================================================
-- PLATAFORMA LIVIU — Migración 16: aviso de "rutina/dieta
-- actualizada" dentro de la app (sin push, sin permisos).
--  · rutinas.actualizada_en / dietas.actualizada_en: se ponen al
--    día automáticamente (triggers) con cualquier cambio, incluso
--    en las tablas anidadas (días, ejercicios, series, comidas...).
--  · profiles.rutina_vista_en / dieta_vista_en: cuándo el cliente
--    vio por última vez el aviso. Se actualiza con una función
--    seguridad-definer (el cliente no puede tocar su perfil
--    directamente, solo leerlo — §3).
-- ============================================================

alter table public.rutinas add column if not exists actualizada_en timestamptz not null default now();
alter table public.dietas add column if not exists actualizada_en timestamptz not null default now();
alter table public.profiles add column if not exists rutina_vista_en timestamptz;
alter table public.profiles add column if not exists dieta_vista_en timestamptz;

-- ------------------------------------------------------------
-- Rutinas: se toca a sí misma, y en cascada desde días/ejercicios/series
-- ------------------------------------------------------------
create or replace function public.tocar_actualizada_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizada_en = now();
  return new;
end;
$$;

drop trigger if exists trg_rutinas_tocar on public.rutinas;
create trigger trg_rutinas_tocar
before update on public.rutinas
for each row execute function public.tocar_actualizada_en();

drop trigger if exists trg_dietas_tocar on public.dietas;
create trigger trg_dietas_tocar
before update on public.dietas
for each row execute function public.tocar_actualizada_en();

create or replace function public.tocar_rutina_desde_dia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rutinas set actualizada_en = now()
  where id = coalesce(new.rutina_id, old.rutina_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_rutina_dias_tocar on public.rutina_dias;
create trigger trg_rutina_dias_tocar
after insert or update or delete on public.rutina_dias
for each row execute function public.tocar_rutina_desde_dia();

create or replace function public.tocar_rutina_desde_ejercicio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rutina uuid;
begin
  select rutina_id into v_rutina from public.rutina_dias
  where id = coalesce(new.dia_id, old.dia_id);
  if v_rutina is not null then
    update public.rutinas set actualizada_en = now() where id = v_rutina;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_rutina_ejercicios_tocar on public.rutina_ejercicios;
create trigger trg_rutina_ejercicios_tocar
after insert or update or delete on public.rutina_ejercicios
for each row execute function public.tocar_rutina_desde_ejercicio();

create or replace function public.tocar_rutina_desde_serie()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rutina uuid;
begin
  select rd.rutina_id into v_rutina
  from public.rutina_ejercicios re
  join public.rutina_dias rd on rd.id = re.dia_id
  where re.id = coalesce(new.rutina_ejercicio_id, old.rutina_ejercicio_id);
  if v_rutina is not null then
    update public.rutinas set actualizada_en = now() where id = v_rutina;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_series_prescritas_tocar on public.series_prescritas;
create trigger trg_series_prescritas_tocar
after insert or update or delete on public.series_prescritas
for each row execute function public.tocar_rutina_desde_serie();

-- ------------------------------------------------------------
-- Dietas: en cascada desde comidas/alimentos de cada comida
-- ------------------------------------------------------------
create or replace function public.tocar_dieta_desde_comida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dietas set actualizada_en = now()
  where id = coalesce(new.dieta_id, old.dieta_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_dieta_comidas_tocar on public.dieta_comidas;
create trigger trg_dieta_comidas_tocar
after insert or update or delete on public.dieta_comidas
for each row execute function public.tocar_dieta_desde_comida();

create or replace function public.tocar_dieta_desde_alimento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dieta uuid;
begin
  select dieta_id into v_dieta from public.dieta_comidas
  where id = coalesce(new.comida_id, old.comida_id);
  if v_dieta is not null then
    update public.dietas set actualizada_en = now() where id = v_dieta;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_dieta_comida_alimentos_tocar on public.dieta_comida_alimentos;
create trigger trg_dieta_comida_alimentos_tocar
after insert or update or delete on public.dieta_comida_alimentos
for each row execute function public.tocar_dieta_desde_alimento();

-- ------------------------------------------------------------
-- El cliente marca el aviso como visto
-- ------------------------------------------------------------
create or replace function public.marcar_rutina_vista()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set rutina_vista_en = now() where id = auth.uid();
end;
$$;

create or replace function public.marcar_dieta_vista()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set dieta_vista_en = now() where id = auth.uid();
end;
$$;
