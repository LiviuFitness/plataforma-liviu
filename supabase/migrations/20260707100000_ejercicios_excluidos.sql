-- ============================================================
-- PLATAFORMA LIVIU — Migración 23: ejercicios a evitar por cliente
-- (lesiones, material que no tiene, o simplemente no le gustan).
-- Espejo de alimentos_excluidos: el cliente gestiona los suyos
-- desde su perfil, y el entrenador ve el aviso al montar rutinas.
-- ============================================================

create table public.ejercicios_excluidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  ejercicio_id uuid not null references public.ejercicios (id) on delete cascade,
  -- por qué lo evita ("lesión de hombro", "no tengo polea en casa"…)
  motivo text,
  creado_en timestamptz not null default now(),
  unique (cliente_id, ejercicio_id)
);

create index idx_ejercicios_excluidos_cliente on public.ejercicios_excluidos (cliente_id);

alter table public.ejercicios_excluidos enable row level security;

create policy "entrenador todo" on public.ejercicios_excluidos for all
  using (es_entrenador()) with check (es_entrenador());

create policy "cliente gestiona sus ejercicios excluidos" on public.ejercicios_excluidos for all
  using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());
