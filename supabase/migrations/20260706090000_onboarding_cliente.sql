-- ============================================================
-- PLATAFORMA LIVIU — Migración 9: onboarding del cliente
--  · Permite "otro" en sexo (más inclusivo, como Hevy)
--  · RPC segura para que el propio cliente complete sus datos
--    físicos (sexo, altura, fecha nacimiento, peso inicial) la
--    primera vez que entra — sin necesidad de una política RLS
--    de UPDATE amplia sobre profiles (el cliente solo puede leer
--    su fila; esta función solo toca esas 3 columnas + inserta
--    su propia medida).
-- ============================================================

alter table public.profiles drop constraint if exists profiles_sexo_check;
alter table public.profiles
  add constraint profiles_sexo_check check (sexo in ('hombre', 'mujer', 'otro'));

create or replace function public.completar_datos_fisicos(
  p_fecha_nacimiento date,
  p_altura_cm numeric,
  p_sexo text,
  p_peso_kg numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  update public.profiles
  set fecha_nacimiento = p_fecha_nacimiento,
      altura_cm = p_altura_cm,
      sexo = p_sexo
  where id = auth.uid();

  if p_peso_kg is not null then
    insert into public.medidas (cliente_id, peso)
    values (auth.uid(), p_peso_kg);
  end if;
end;
$$;

grant execute on function public.completar_datos_fisicos(date, numeric, text, numeric) to authenticated;
