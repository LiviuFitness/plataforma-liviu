-- ============================================================
-- PLATAFORMA LIVIU — Migración 13: foto de perfil
--  · Columna avatar_url en profiles.
--  · Bucket público "avatars": cada usuario solo puede escribir
--    dentro de su propia carpeta (su uid), lectura pública.
--  · RPC actualizar_mi_avatar: evita abrir un UPDATE genérico
--    sobre profiles (el cliente solo puede leer su fila, §3).
-- ============================================================

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatares lectura publica"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "avatares propios insertar"
on storage.objects for insert
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatares propios actualizar"
on storage.objects for update
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatares propios borrar"
on storage.objects for delete
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.actualizar_mi_avatar(p_avatar_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set avatar_url = p_avatar_url where id = auth.uid();
end;
$$;
