-- ============================================================
-- Borradores de la IA para el entrenador (el resumen de la revisión
-- semanal de cada cliente): se guardan para no pagar dos veces lo
-- mismo si vuelves a abrir la ronda. Solo el entrenador.
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================
create table if not exists public.ia_borradores (
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null,
  clave text not null,
  datos jsonb not null,
  creado_en timestamptz not null default now(),
  primary key (cliente_id, tipo, clave)
);
alter table public.ia_borradores enable row level security;
drop policy if exists "entrenador todo" on public.ia_borradores;
create policy "entrenador todo" on public.ia_borradores for all
  using (es_entrenador()) with check (es_entrenador());
revoke all on public.ia_borradores from anon;
