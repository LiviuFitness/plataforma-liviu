-- ============================================================
--   1. Fotos en el chat: columna imagen (ruta en el bucket privado
--      "chat") y permisos del bucket. Carpeta = id del cliente del
--      hilo: el cliente solo ve y sube en la suya; el entrenador en
--      todas.
--   2. Comidas hechas: el cliente marca cada comida del día.
--   3. Aviso de cambios en el plan: cuándo se le avisó por última vez
--      (como mucho uno cada 30 minutos).
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================

-- 1 · Fotos en el chat -----------------------------------------
alter table public.mensajes add column if not exists imagen text;

insert into storage.buckets (id, name, public)
values ('chat', 'chat', false)
on conflict (id) do nothing;

drop policy if exists "fotos chat leer" on storage.objects;
create policy "fotos chat leer" on storage.objects for select
using (
  bucket_id = 'chat'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.es_entrenador())
);

drop policy if exists "fotos chat subir" on storage.objects;
create policy "fotos chat subir" on storage.objects for insert
with check (
  bucket_id = 'chat'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.es_entrenador())
);

-- 2 · Comidas hechas --------------------------------------------
create table if not exists public.comidas_hechas (
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  fecha date not null,
  comida text not null,
  creado_en timestamptz not null default now(),
  primary key (cliente_id, fecha, comida)
);
alter table public.comidas_hechas enable row level security;
drop policy if exists "entrenador todo" on public.comidas_hechas;
create policy "entrenador todo" on public.comidas_hechas for all
  using (es_entrenador()) with check (es_entrenador());
drop policy if exists "cliente gestiona las suyas" on public.comidas_hechas;
create policy "cliente gestiona las suyas" on public.comidas_hechas for all
  using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());

-- 3 · Aviso de cambios en el plan -------------------------------
alter table public.profiles add column if not exists aviso_cambios_en timestamptz;
