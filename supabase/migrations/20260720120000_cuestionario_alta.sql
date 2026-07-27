-- ============================================================
-- PLATAFORMA LIVIU — Migración 34: cuestionario de alta. Mismo
-- patrón que preguntas_revision/respuestas_revision (migración 33)
-- pero de una sola vez (sin columna `semana`) — el cliente lo
-- responde durante el onboarding, antes del tour de bienvenida.
-- Preguntas configurables por Liviu, no inventadas: sin cuestionario
-- de alta real que portar, se deja como catálogo editable con unas
-- pocas de arranque.
-- ============================================================

create table public.preguntas_alta (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  orden integer not null default 0,
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);

create table public.respuestas_alta (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  pregunta_id uuid not null references public.preguntas_alta (id) on delete cascade,
  respuesta text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (cliente_id, pregunta_id)
);

create index idx_respuestas_alta_cliente on public.respuestas_alta (cliente_id);

alter table public.preguntas_alta enable row level security;
alter table public.respuestas_alta enable row level security;

create policy "entrenador todo" on public.preguntas_alta for all
  using (es_entrenador()) with check (es_entrenador());
create policy "lectura autenticados" on public.preguntas_alta for select
  using (auth.uid() is not null);

create policy "entrenador lee todo" on public.respuestas_alta for select
  using (es_entrenador());
create policy "cliente lee sus respuestas" on public.respuestas_alta for select
  using (cliente_id = auth.uid());
create policy "cliente escribe sus respuestas" on public.respuestas_alta for insert
  with check (cliente_id = auth.uid());
create policy "cliente edita sus respuestas" on public.respuestas_alta for update
  using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());

-- Preguntas de partida (Liviu las edita/sustituye desde Ajustes → Cuestionario de alta).
insert into public.preguntas_alta (texto, orden) values
('¿Cuál es tu objetivo principal ahora mismo?', 0),
('¿Tienes alguna lesión o molestia que debamos tener en cuenta?', 1),
('¿Dónde vas a entrenar y qué material tienes disponible?', 2),
('¿Alguna restricción o preferencia alimentaria?', 3);
