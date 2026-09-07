-- Migración 37: evitar sesiones de entreno duplicadas.
--
-- Los dos botones del resumen final de la sesión guardan y navegan a la
-- vez, y volvían a estar pulsables mientras Next preparaba la pantalla
-- de destino: una segunda pulsación insertaba OTRA sesión entera con las
-- mismas series. Así se colaron 9 filas duplicadas (de 30 sesiones del
-- histórico), inflando racha, adherencia, volumen y ranking.
--
-- El arreglo de verdad está en SesionEnCurso.tsx (una sola promesa de
-- guardado por sesión); esto es la red de seguridad en la base de datos,
-- para que ningún cliente pueda volver a crear el mismo entreno dos
-- veces. Dos sesiones del mismo cliente no pueden empezar en el mismo
-- milisegundo: si coincide, es una repetición del mismo envío.
--
-- IMPORTANTE: antes de ejecutar esto hay que haber borrado los
-- duplicados que ya existen, o el índice fallará al crearse.

create unique index if not exists sesiones_sin_duplicados
  on public.sesiones (cliente_id, fecha_inicio);
