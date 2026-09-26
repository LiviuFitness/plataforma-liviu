-- ============================================================
-- Notas propias del cliente por ejercicio ("respaldo en el 4",
-- "agarre neutro"): una por cliente y ejercicio, le sale cada vez
-- que hace ese ejercicio. El entrenador también las ve (y las ve en
-- la sesión presencial).
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================
create table if not exists public.notas_ejercicio (
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  ejercicio_id uuid not null references public.ejercicios (id) on delete cascade,
  texto text not null check (length(trim(texto)) > 0 and length(texto) <= 200),
  actualizada_en timestamptz not null default now(),
  primary key (cliente_id, ejercicio_id)
);
alter table public.notas_ejercicio enable row level security;
drop policy if exists "entrenador todo" on public.notas_ejercicio;
create policy "entrenador todo" on public.notas_ejercicio for all
  using (es_entrenador()) with check (es_entrenador());
drop policy if exists "cliente gestiona las suyas" on public.notas_ejercicio;
create policy "cliente gestiona las suyas" on public.notas_ejercicio for all
  using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());
