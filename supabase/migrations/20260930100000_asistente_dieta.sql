-- ============================================================
-- Asistente LivFit: las conversaciones del cliente con el asistente
-- de dieta. Solo las escribe el servidor (con la clave de servicio,
-- después de preguntar a la IA), así nadie puede fabricar respuestas.
-- El cliente lee las suyas; el entrenador, todas.
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================
create table if not exists public.asistente_mensajes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  rol text not null check (rol in ('cliente', 'asistente')),
  texto text not null check (length(texto) <= 4000),
  /* Cambios propuestos: [{ "nombre": "Pechuga de pavo", "cantidad": "150 g" }] */
  alternativas jsonb,
  /* true si la respuesta le manda a hablar con el entrenador */
  derivado boolean not null default false,
  creado_en timestamptz not null default now()
);
create index if not exists asistente_mensajes_cliente_fecha
  on public.asistente_mensajes (cliente_id, creado_en desc);

alter table public.asistente_mensajes enable row level security;
drop policy if exists "entrenador lee" on public.asistente_mensajes;
create policy "entrenador lee" on public.asistente_mensajes for select
  using (es_entrenador());
drop policy if exists "cliente lee las suyas" on public.asistente_mensajes;
create policy "cliente lee las suyas" on public.asistente_mensajes for select
  using (cliente_id = auth.uid());
revoke all on public.asistente_mensajes from anon;
