-- ============================================================
-- PLATAFORMA LIVIU — Migración 32: historial de revisiones (ajustes
-- de kcal). Cada vez que el entrenador aplica el ajuste sugerido en
-- la pestaña Progreso (TabProgreso "Aplicar"), queda un registro que
-- el cliente ve por su cuenta en Mi Progreso — así Liviu no tiene que
-- avisarle a mano. Mismo patrón de "visto" que chat_visto_en/marcar_chat_visto.
-- ============================================================

alter table public.profiles add column if not exists revisiones_visto_en timestamptz;

create table public.revisiones_kcal (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  dieta_id uuid references public.dietas (id) on delete set null,
  kcal_anterior integer not null,
  kcal_nuevo integer not null,
  delta integer not null,
  motivo text,
  creado_en timestamptz not null default now()
);

create index idx_revisiones_kcal_cliente on public.revisiones_kcal (cliente_id, creado_en desc);

alter table public.revisiones_kcal enable row level security;

create policy "entrenador todo" on public.revisiones_kcal for all
  using (es_entrenador()) with check (es_entrenador());

create policy "cliente lee sus revisiones" on public.revisiones_kcal for select
  using (cliente_id = auth.uid());

create or replace function public.marcar_revisiones_vistas()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set revisiones_visto_en = now() where id = auth.uid();
end;
$$;
