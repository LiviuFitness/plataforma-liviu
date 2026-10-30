-- «Liviu ha visto tu entreno» (30 oct 2026)
--
-- El entrenador marca cada entreno como visto, con una reacción
-- (fuego/fuerza/aplauso) y, si quiere, una nota de voz. La nota vive en
-- el bucket privado "chat" (carpeta del cliente, como las fotos y vídeos
-- del chat) y además se manda como mensaje del chat.
-- Se puede ejecutar más de una vez sin romper nada.

alter table public.sesiones add column if not exists vista_en timestamptz;
alter table public.sesiones add column if not exists reaccion_entrenador text;
alter table public.sesiones add column if not exists nota_voz text;

alter table public.sesiones drop constraint if exists sesiones_reaccion_entrenador_check;
alter table public.sesiones add constraint sesiones_reaccion_entrenador_check
  check (reaccion_entrenador is null or reaccion_entrenador in ('fuego', 'fuerza', 'aplauso'));

-- Los entrenos de antes de hoy no se quedan "por ver": la lista empieza
-- con los nuevos.
update public.sesiones set vista_en = now()
where vista_en is null and fecha_inicio < now() - interval '3 days';
