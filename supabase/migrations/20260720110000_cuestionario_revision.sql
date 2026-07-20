-- ============================================================
-- PLATAFORMA LIVIU — Migración 33: cuestionario de revisión semanal.
-- Preguntas configurables por Liviu (no hardcodeadas — no tengo las
-- preguntas reales de su Excel, así que en vez de inventarlas se
-- deja como catálogo editable, mismo patrón que alimentos/plantillas).
-- El cliente las responde una vez por semana (lunes de esa semana
-- como clave, igual que calcularRevisionSemanal en lib/revision.ts).
-- ============================================================

create table public.preguntas_revision (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  orden integer not null default 0,
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);

create table public.respuestas_revision (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  pregunta_id uuid not null references public.preguntas_revision (id) on delete cascade,
  semana date not null, -- lunes de la semana respondida
  respuesta text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (cliente_id, pregunta_id, semana)
);

create index idx_respuestas_revision_cliente on public.respuestas_revision (cliente_id, semana);

alter table public.preguntas_revision enable row level security;
alter table public.respuestas_revision enable row level security;

create policy "entrenador todo" on public.preguntas_revision for all
  using (es_entrenador()) with check (es_entrenador());
create policy "lectura autenticados" on public.preguntas_revision for select
  using (auth.uid() is not null);

create policy "entrenador lee todo" on public.respuestas_revision for select
  using (es_entrenador());
create policy "cliente lee sus respuestas" on public.respuestas_revision for select
  using (cliente_id = auth.uid());
create policy "cliente escribe sus respuestas" on public.respuestas_revision for insert
  with check (cliente_id = auth.uid());
create policy "cliente edita sus respuestas" on public.respuestas_revision for update
  using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());

-- Preguntas de partida (Liviu las edita/sustituye desde Ajustes → Cuestionario semanal).
insert into public.preguntas_revision (texto, orden) values
('¿Cómo ha ido tu semana de entrenamiento en general?', 0),
('¿Cómo ha sido tu adherencia a la dieta esta semana?', 1),
('¿Cómo han estado tus niveles de energía y sueño?', 2),
('¿Algo a destacar o algún problema que debamos ajustar?', 3);
