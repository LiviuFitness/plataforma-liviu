-- ============================================================
-- Tercera tanda de mejoras:
--   1. Cobros: lo que paga cada cliente en cada renovación.
--   2. Notas privadas del entrenador sobre un cliente, con
--      recordatorio opcional.
--   3. Alternativas aprobadas de cada ejercicio ("máquina ocupada").
--   4. Sesión exprés y ejercicio sustituido en una serie.
--   5. Récords de la semana: sin contar las series hechas con un
--      ejercicio sustituto (no son marcas del ejercicio pautado).
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================

-- 1 · Cobros ---------------------------------------------------
create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  importe numeric(8, 2) not null check (importe > 0),
  fecha date not null default current_date,
  creado_en timestamptz not null default now()
);
create index if not exists idx_pagos_cliente on public.pagos (cliente_id, fecha desc);
alter table public.pagos enable row level security;
drop policy if exists "entrenador todo" on public.pagos;
create policy "entrenador todo" on public.pagos for all
  using (es_entrenador()) with check (es_entrenador());

-- 2 · Notas con recordatorio ----------------------------------
create table if not exists public.notas_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  texto text not null check (length(trim(texto)) > 0),
  recordar_en date,
  hecha boolean not null default false,
  creada_en timestamptz not null default now()
);
create index if not exists idx_notas_cliente on public.notas_cliente (cliente_id, creada_en desc);
alter table public.notas_cliente enable row level security;
drop policy if exists "entrenador todo" on public.notas_cliente;
create policy "entrenador todo" on public.notas_cliente for all
  using (es_entrenador()) with check (es_entrenador());

-- 3 · Alternativas de ejercicio -------------------------------
create table if not exists public.ejercicio_alternativas (
  ejercicio_id uuid not null references public.ejercicios (id) on delete cascade,
  alternativa_id uuid not null references public.ejercicios (id) on delete cascade,
  orden integer not null default 0,
  primary key (ejercicio_id, alternativa_id),
  check (ejercicio_id <> alternativa_id)
);
alter table public.ejercicio_alternativas enable row level security;
drop policy if exists "entrenador todo" on public.ejercicio_alternativas;
create policy "entrenador todo" on public.ejercicio_alternativas for all
  using (es_entrenador()) with check (es_entrenador());
drop policy if exists "clientes leen alternativas" on public.ejercicio_alternativas;
create policy "clientes leen alternativas" on public.ejercicio_alternativas for select
  using (auth.uid() is not null);

-- 4 · Exprés y sustitutos -------------------------------------
alter table public.sesiones add column if not exists expres boolean not null default false;
alter table public.series_realizadas
  add column if not exists ejercicio_sustituto_id uuid references public.ejercicios (id) on delete set null;

-- 5 · Récords de la semana sin sustitutos ---------------------
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
    and sr.ejercicio_sustituto_id is null
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
