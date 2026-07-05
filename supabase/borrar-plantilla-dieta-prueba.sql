-- Borra la plantilla de dieta de prueba vacía ("Plantilla nueva", 2000 kcal)
delete from public.dietas
where es_plantilla = true
  and nombre = 'Plantilla nueva'
  and cliente_id is null
  and not exists (select 1 from public.dieta_comidas where dieta_id = dietas.id);
