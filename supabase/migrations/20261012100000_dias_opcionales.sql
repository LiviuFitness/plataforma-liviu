-- ============================================================
--   Días opcionales (MMA, cardio, movilidad…): no cuentan en el
--   objetivo semanal ni en la rotación del "entreno de hoy".
--   El interruptor vale para todas las semanas de esa posición, así
--   que un día nuevo en la misma posición (copiar a otras semanas,
--   duplicar semana, rellenar las 12) hereda el "opcional".
--   Se puede ejecutar más de una vez sin romper nada.
-- ============================================================
alter table public.rutina_dias add column if not exists opcional boolean not null default false;

create or replace function public.dia_hereda_opcional() returns trigger
language plpgsql as $$
begin
  if not new.opcional then
    new.opcional := exists (
      select 1 from public.rutina_dias d
      where d.rutina_id = new.rutina_id and d.orden = new.orden and d.opcional
    );
  end if;
  return new;
end $$;

drop trigger if exists rutina_dias_hereda_opcional on public.rutina_dias;
create trigger rutina_dias_hereda_opcional
  before insert on public.rutina_dias
  for each row execute function public.dia_hereda_opcional();
