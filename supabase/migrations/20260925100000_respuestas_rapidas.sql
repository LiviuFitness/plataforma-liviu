-- ------------------------------------------------------------
-- Respuestas rápidas del chat: frases que el entrenador manda a
-- menudo ("¡Buen entreno! 💪", "Súbeme foto del desayuno"…). Salen
-- encima del cuadro de escribir en el chat de cada cliente y se
-- editan desde Ajustes. Solo las ve y las toca el entrenador.
-- ------------------------------------------------------------

create table if not exists public.respuestas_rapidas (
  id uuid primary key default gen_random_uuid(),
  texto text not null check (length(trim(texto)) > 0),
  orden integer not null default 0,
  creada_en timestamptz not null default now()
);

alter table public.respuestas_rapidas enable row level security;

drop policy if exists "entrenador todo" on public.respuestas_rapidas;
create policy "entrenador todo" on public.respuestas_rapidas for all
  using (es_entrenador()) with check (es_entrenador());

-- Las cuatro de partida, solo si la tabla está vacía (se puede volver a
-- ejecutar sin duplicarlas).
insert into public.respuestas_rapidas (texto, orden)
select t, o
from (values
  ('¡Buen entreno! 💪', 0),
  ('Súbeme foto del desayuno', 1),
  ('Mañana revisamos', 2),
  ('Pésate mañana en ayunas', 3)
) as v(t, o)
where not exists (select 1 from public.respuestas_rapidas);
