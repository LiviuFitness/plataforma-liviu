-- ============================================================
-- PLATAFORMA LIVIU — Migración 14: fotos de progreso
--  · Bucket privado "progreso": cada cliente ve/gestiona las
--    suyas; el entrenador puede ver las de cualquier cliente.
--    Las columnas foto_frontal_url/lateral/espalda ya existían
--    en "medidas" (reservadas desde la Migración 1) y guardan
--    la RUTA del objeto en el bucket, no una URL pública.
--  · El cliente ahora puede actualizar/borrar sus propias
--    medidas (antes solo podía leer e insertar): hace falta
--    para completar una fila recién creada con las fotos, y
--    para poder borrar un registro equivocado.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('progreso', 'progreso', false)
on conflict (id) do nothing;

create policy "fotos progreso lectura propia o entrenador"
on storage.objects for select
using (
  bucket_id = 'progreso'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.es_entrenador())
);

create policy "fotos progreso propias insertar"
on storage.objects for insert
with check (bucket_id = 'progreso' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos progreso propias actualizar"
on storage.objects for update
using (bucket_id = 'progreso' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos progreso propias borrar"
on storage.objects for delete
using (bucket_id = 'progreso' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "cliente actualiza sus medidas" on public.medidas for update
  using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());

create policy "cliente borra sus medidas" on public.medidas for delete
  using (cliente_id = auth.uid());
