-- ============================================================
-- PLATAFORMA LIVIU — Migración 35: gifs de ejercicios.
-- Sustituye el vídeo de YouTube por un gif propio cuando existe:
-- reutiliza la columna `video_url` (la app detecta si es un gif
-- o un enlace de YouTube por la extensión, ver lib/rutinas.ts::esGif)
-- para no duplicar el campo ni la lógica de "el ejercicio tiene
-- media o no". Bucket público "ejercicios-gifs", mismo patrón que
-- el bucket "avatars" de la migración 13 pero de escritura solo
-- para el entrenador (no es contenido por-usuario).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('ejercicios-gifs', 'ejercicios-gifs', true)
on conflict (id) do nothing;

create policy "gifs ejercicios lectura publica"
on storage.objects for select
using (bucket_id = 'ejercicios-gifs');

create policy "gifs ejercicios entrenador escribe"
on storage.objects for insert
with check (bucket_id = 'ejercicios-gifs' and es_entrenador());

create policy "gifs ejercicios entrenador actualiza"
on storage.objects for update
using (bucket_id = 'ejercicios-gifs' and es_entrenador());

create policy "gifs ejercicios entrenador borra"
on storage.objects for delete
using (bucket_id = 'ejercicios-gifs' and es_entrenador());
