-- ============================================================
-- PLATAFORMA LIVIU — Migración 29: chat entrenador-cliente.
-- Un hilo por cliente (no es un chat de grupo): el cliente escribe
-- a su entrenador y viceversa. Sin recibos de lectura por mensaje
-- (demasiado para lo que hace falta aquí) — el aviso de "sin leer"
-- del cliente compara la fecha del último mensaje del entrenador
-- contra profiles.chat_visto_en, igual que ya se hace con la rutina
-- y la dieta (marcar_rutina_vista / marcar_dieta_vista).
-- ============================================================

alter table public.profiles add column if not exists chat_visto_en timestamptz;

create table public.mensajes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  remitente text not null check (remitente in ('cliente', 'entrenador')),
  texto text not null,
  creado_en timestamptz not null default now()
);

create index idx_mensajes_cliente on public.mensajes (cliente_id, creado_en);

alter table public.mensajes enable row level security;

create policy "entrenador todo" on public.mensajes for all
  using (es_entrenador()) with check (es_entrenador());

-- El cliente lee todo su hilo, pero solo puede escribir mensajes
-- firmados como 'cliente' (no puede hacerse pasar por su entrenador).
create policy "cliente lee su hilo" on public.mensajes for select
  using (cliente_id = auth.uid());
create policy "cliente escribe en su hilo" on public.mensajes for insert
  with check (cliente_id = auth.uid() and remitente = 'cliente');

create or replace function public.marcar_chat_visto()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set chat_visto_en = now() where id = auth.uid();
end;
$$;
