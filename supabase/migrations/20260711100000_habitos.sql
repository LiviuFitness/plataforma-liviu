-- ============================================================
-- PLATAFORMA LIVIU — Migración 27: gestor de hábitos diarios
-- (pasos, agua, sueño…) que el cliente marca cada día y el
-- entrenador ve como consistencia semanal en la ficha del cliente.
-- ============================================================

create table public.habitos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  nombre text not null,
  icono text not null default 'circle-check',
  orden int not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create index idx_habitos_cliente on public.habitos (cliente_id);

create table public.habitos_registros (
  id uuid primary key default gen_random_uuid(),
  habito_id uuid not null references public.habitos (id) on delete cascade,
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  fecha date not null,
  completado boolean not null default true,
  unique (habito_id, fecha)
);

create index idx_habitos_registros_cliente_fecha on public.habitos_registros (cliente_id, fecha);

alter table public.habitos enable row level security;
alter table public.habitos_registros enable row level security;

create policy "entrenador todo" on public.habitos for all
  using (es_entrenador()) with check (es_entrenador());
create policy "cliente gestiona sus habitos" on public.habitos for all
  using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());

create policy "entrenador todo" on public.habitos_registros for all
  using (es_entrenador()) with check (es_entrenador());
create policy "cliente gestiona sus registros de habitos" on public.habitos_registros for all
  using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());
