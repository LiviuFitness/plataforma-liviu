-- Resetea SOLO los datos físicos (sexo, altura, fecha de nacimiento)
-- de TODOS los clientes, para volver a ver el onboarding en pruebas.
-- No toca rutina, dieta, medidas ni el resto de la ficha.
--
-- ⚠️ Úsalo solo con clientes de prueba. Cuando tengas clientes reales
-- con estos datos ya rellenados, este script se los borraría a todos.
update public.profiles
set fecha_nacimiento = null,
    altura_cm = null,
    sexo = null
where rol = 'cliente';
