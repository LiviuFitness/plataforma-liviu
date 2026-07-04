-- Biblioteca de ejercicios importada del Excel de Liviu (EXERCISE DATA BASE)
-- Sustituye la biblioteca base genérica manteniendo los ejercicios ya usados en rutinas.

alter table public.ejercicios add column if not exists nombre_en text;

delete from public.ejercicios
where creado_por is null
  and id not in (select ejercicio_id from public.rutina_ejercicios);

insert into public.ejercicios (nombre, nombre_en, grupo_muscular, instrucciones, video_url) values
('Press de banca plano con barra libre', 'Barbell flat bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/i14IBMNQDQQ'),
('Press de banca plano con mancuernas', 'Dumbbell flat bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/JcNt92ufIzM'),
('Press de banca plano en Multipower', 'Barbell flat bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/9VIQ8VOWYjY'),
('Press de banca inclinado 15º con barra', 'Barbell 15º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 30º con barra', 'Barbell 30º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 45º con barra libre', 'Barbell 45º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 60º con barra', 'Barbell 60º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 70º con barra', 'Barbell 70º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 80º con barra', 'Barbell 80º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 15º en Multipower', 'Smith 15º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 30º en Multipower', 'Smith 30º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/Fg4pmnXzBG4'),
('Press de banca inclinado 45º en Multipower', 'Smith 45º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/Fg4pmnXzBG4'),
('Press de banca inclinado 60º en Multipower', 'Smith 60º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 70º en Multipower', 'Smith 70º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca plano en Multipower con banda de resistencia inversa', 'Smith reverse band flat press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 15º en Multipower con banda de resistencia inversa', 'Smith reverse band 15º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 30º en Multipower con banda de resistencia inversa', 'Smith reverse band 30º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 45º en Multipower con banda de resistencia inversa', 'Smith reverse band 45º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 60º en Multipower con banda de resistencia inversa', 'Smith reverse band 60º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 70º en Multipower con banda de resistencia inversa', 'Smith reverse band 70º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en juntar tus manos y acercar los bíceps
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que baja la barra y no llegues a tocar el torso
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 15º con mancuernas', 'Dumbbell 15º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en acercar los bíceps (brazos al torso)
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no atrases los codos abajo
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 30º con mancuernas', 'Dumbbell 30º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en acercar los bíceps (brazos al torso)
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no atrases los codos abajo
-Arriba extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/gfNrg3lI6kU'),
('Press de banca inclinado 45º con mancuernas', 'Dumbbell 45º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en acercar los bíceps (brazos al torso)
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no atrases los codos abajo
-Arriba extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/gfNrg3lI6kU'),
('Press de banca inclinado 60º con mancuernas', 'Dumbbell 60º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en acercar los bíceps (brazos al torso)
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no atrases los codos abajo
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca inclinado 70º con mancuernas', 'Dumbbell 70º incline bench press', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Piensa en acercar los bíceps (brazos al torso)
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no atrases los codos abajo
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Press plano sentado entre poleas', 'Bayesian flyes', 'Pectoral', '-Empuja con los antebrazos en línea con los cables
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps al torso, no las manos entre sí
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que llegues al final y no bajes los codos abajo
-Al final extiende por completo los codos, espira y comienza a bajar
-Lleva siempre los cables por fuera de los codos pero pegados a estos', 'https://www.youtube.com/shorts/Kxtr7iQq6Tg'),
('Press descendente sentado entre poleas', 'High to low bayesian fly', 'Pectoral', '-Empuja con los antebrazos en línea con los cables
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps al torso, no las manos entre sí
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que llegues al final y no bajes los codos abajo
-Al final extiende por completo los codos, espira y comienza a bajar
-Lleva siempre los cables por fuera de los codos pero pegados a estos', 'https://www.youtube.com/shorts/Kxtr7iQq6Tg'),
('Press descendente sentada entre poleas', 'High to low bayesian fly', 'Pectoral', '-Empuja con los antebrazos en línea con los cables
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps al torso, no las manos entre sí
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que llegues al final y no bajes los codos abajo
-Al final extiende por completo los codos, espira y comienza a bajar
-Lleva siempre los cables por fuera de los codos pero pegados a estos', 'https://www.youtube.com/shorts/Kxtr7iQq6Tg'),
('Press plano tumbado entre poleas bajas', 'Lying bayesian fly', 'Pectoral', '-Empuja con los antebrazos en línea con los cables
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps al torso, no las manos entre sí
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que llegues al final y no bajes los codos abajo
-Al final extiende por completo los codos, espira y comienza a bajar
-Lleva siempre los cables por fuera de los codos pero pegados a estos', null),
('Press descendente de pie entre poleas altas', 'High to low cable fly', 'Pectoral', '-Empuja con los antebrazos en línea con los cables
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps al torso, no las manos entre sí
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que llegues al final y no bajes los codos abajo
-Al final extiende por completo los codos, espira y comienza a bajar
-Lleva siempre los cables por fuera de los codos pero pegados a estos', 'https://www.youtube.com/shorts/ulTQjCPzC-Y'),
('Press inclinado 15º entre poleas bajas', '15º lying low cable bayesian flyes', 'Pectoral', '-Empuja con los antebrazos en línea con los cables
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps al torso, no las manos entre sí
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que llegues al final y no bajes los codos abajo
-Al final extiende por completo los codos, espira y comienza a bajar
-Lleva siempre los cables por fuera de los codos pero pegados a estos', null),
('Press inclinado 30º entre poleas bajas', '30º lying low cable bayesian flyes', 'Pectoral', '-Empuja con los antebrazos en línea con los cables
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps al torso, no las manos entre sí
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que llegues al final y no bajes los codos abajo
-Al final extiende por completo los codos, espira y comienza a bajar
-Lleva siempre los cables por fuera de los codos pero pegados a estos', 'https://www.youtube.com/shorts/Scv7JTYL18Y'),
('Press inclinado 45º entre poleas bajas', '45º lying low cable bayesian flyes', 'Pectoral', '-Empuja con los antebrazos en línea con los cables
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps al torso, no las manos entre sí
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que llegues al final y no bajes los codos abajo
-Al final extiende por completo los codos, espira y comienza a bajar
-Lleva siempre los cables por fuera de los codos pero pegados a estos', 'https://www.youtube.com/shorts/Scv7JTYL18Y'),
('Press inclinado 60º entre poleas bajas', '60º lying low cable bayesian flyes', 'Pectoral', '-Empuja con los antebrazos en línea con los cables
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps al torso, no las manos entre sí
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que llegues al final y no bajes los codos abajo
-Al final extiende por completo los codos, espira y comienza a bajar
-Lleva siempre los cables por fuera de los codos pero pegados a estos', null),
('Press inclinado 70º entre poleas bajas', '70º lying low cable bayesian flyes', 'Pectoral', '-Empuja con los antebrazos en línea con los cables
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps al torso, no las manos entre sí
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que llegues al final y no bajes los codos abajo
-Al final extiende por completo los codos, espira y comienza a bajar
-Lleva siempre los cables por fuera de los codos pero pegados a estos', null),
('Press plano en máquina de placas', 'Chest press machine', 'Pectoral', '-Empuja con los codos detrás de las manos
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps (brazos al torso), si la máquina converge, mejor
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no bajes los codos al final
-Al final extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/zI5ntOG869Q'),
('Press plano en máquina de placas con banda de resistencia', 'Chest press machine with band', 'Pectoral', '-Empuja con los codos detrás de las manos
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps (brazos al torso), si la máquina converge, mejor
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no bajes los codos al final
-Al final extiende por completo los codos, espira y comienza a bajar', null),
('Press inclinado en máquina de placas', 'Inclinated chest press machine', 'Pectoral', '-Empuja con los codos detrás de las manos
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps (brazos al torso), si la máquina converge, mejor
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no bajes los codos al final
-Al final extiende por completo los codos, espira y comienza a bajar', null),
('Press inclinado en máquina de placas con banda de resistencia', 'Inclinated chest press machine with band', 'Pectoral', '-Empuja con los codos detrás de las manos
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps (brazos al torso), si la máquina converge, mejor
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no bajes los codos al final
-Al final extiende por completo los codos, espira y comienza a bajar', null),
('Press plano en máquina de palancas de resitstencia variable (perfil ascendente)', 'Plate loaded chest press', 'Pectoral', '-Empuja con los codos detrás de las manos
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps (brazos al torso), si la máquina converge, mejor
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no bajes los codos al final
-Al final extiende por completo los codos, espira y comienza a bajar', null),
('Press plano en máquina de palancas de resitstencia variable (perfil descendente)', 'Plate loaded chest press', 'Pectoral', '-Empuja con los codos detrás de las manos
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps (brazos al torso), si la máquina converge, mejor
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no bajes los codos al final
-Al final extiende por completo los codos, espira y comienza a bajar', null),
('Press inclinado en máquina de palancas de resistencia variable (perfil ascendente)', 'Inclinated chest press mahcine', 'Pectoral', '-Empuja con los codos detrás de las manos
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps (brazos al torso), si la máquina converge, mejor
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no bajes los codos al final
-Al final extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/1t6RxrFWcLQ'),
('Press declinado en máquina de palancas de resistencia variable (perfil ascendente)', 'Decline chest press machine', 'Pectoral', '-Empuja con los codos detrás de las manos
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps (brazos al torso), si la máquina converge, mejor
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no bajes los codos al final
-Al final extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/1-ITt8pEWRA'),
('Press de banca inclinado en máquina de palancas', 'Plate loaded incline chest press', 'Pectoral', '-Empuja con los codos detrás de las manos
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps (brazos al torso), si la máquina converge, mejor
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no bajes los codos al final
-Al final extiende por completo los codos, espira y comienza a bajar', null),
('Press de banca plano en máquina de palancas', 'Plate loaded chest press', 'Pectoral', '-Empuja con los codos detrás de las manos
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps (brazos al torso), si la máquina converge, mejor
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no bajes los codos al final
-Al final extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/yn-N-bkqDtY'),
('Press muy inclinado en máquina de palancas', 'Plate loaded high incline chest press', 'Pectoral', '-Empuja con los codos detrás de las manos
-Aplica fuerza hacia delante con los pies antes de la fase concéntrica
-Piensa en acercar los bíceps (brazos al torso), si la máquina converge, mejor
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Lleva tus hombros entre los 30-60º de abducción vertical
-Decelera a medida que bajas y no bajes los codos al final
-Al final extiende por completo los codos, espira y comienza a bajar', null),
('Press around plano', 'Press around', 'Pectoral', '-Empuja con el cable pegado al codo pero por fuera de este
-Describe una trayectoria semi-circular por delante del torso
-Intenta agarrarte con la mano libre a un punto de apoyo
-No anteriorices el hombro al final del ROM', 'https://youtube.com/shorts/GVdMRiN-fJM?si=hkt2kAbXQPEkn3zM'),
('Press around descendente', 'High to low press around', 'Pectoral', '-Empuja con el cable pegado al codo pero por fuera de este
-Describe una trayectoria semi-circular por delante del torso
-Intenta agarrarte con la mano libre a un punto de apoyo
-No anteriorices el hombro al final del ROM', 'https://youtube.com/shorts/1MuC7W3x6ts?si=-0P312YfpSJhKcF4'),
('Press around ascendente', 'Low to high press around', 'Pectoral', '-Empuja con el cable pegado al codo pero por fuera de este
-Describe una trayectoria semi-circular por delante del torso
-Intenta agarrarte con la mano libre a un punto de apoyo
-No anteriorices el hombro al final del ROM', 'https://youtube.com/shorts/1MuC7W3x6ts?si=-0P312YfpSJhKcF4'),
('Extensiones de codos en el suelo ("flexiones")', 'Push ups', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Alinea la columna con las piernas y la cabeza
-Mantén una retracción escapular constante
-No dejes bajar la cadera
-Baja hasta rozar el suelo con el torso', null),
('Flexiones declinadas', 'Declinated puch ups', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Alinea la columna con las piernas y la cabeza
-Mantén una retracción escapular constante
-No dejes bajar la cadera
-Baja hasta rozar el suelo con el torso', null),
('Flexiones inclinadas', 'Inclinated push ups', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Alinea la columna con las piernas y la cabeza
-Mantén una retracción escapular constante
-No dejes bajar la cadera
-Baja hasta rozar el suelo con el torso', null),
('Flexiones con manerales', 'Push ups bar stands', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Alinea la columna con las piernas y la cabeza
-Mantén una retracción escapular constante
-No dejes bajar la cadera
-Baja hasta rozar el suelo con el torso
-No lleves las muñecas extendidas', null),
('Aducciones de hombros horizontales tumbado en máquina de discos', 'Plate loaded pec flye', 'Pectoral', '-No pienses en juntar las manos, sino los bíceps
-No flexiones los codos, mantén una semi-extensión bloqueada
-No separes la cadera del banco
-Mantén una retracción escapular y no ateriorices los hombros', 'https://www.youtube.com/shorts/x_p8W3EZmag'),
('Adducciones de hombro horizontales en máquina (pec-deck)', 'Pec deck flyes', 'Pectoral', '-No pienses en juntar las manos, sino los bíceps
-No flexiones los codos, mantén una semi-extensión bloqueada
-No separes la cadera del banco
-Mantén una retracción escapular y no ateriorices los hombros', 'https://www.youtube.com/shorts/t3EH_o2GUyc'),
('Aberturas en banco plano con mancuernas', 'Dumbbell chest flyes', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Lleva un agarre neutro para llevar más grados de abd de hombro y estirar más el pectoral
-Piensa en acercar los bíceps (brazos al torso)
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Decelera a medida que bajas y no atrases los codos abajo
-Arriba extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/_cRGbQxgwn8'),
('Aberturas en banco declinado con mancuernas', 'Decline dumbbell chest flyes', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Lleva un agarre neutro para llevar más grados de abd de hombro y estirar más el pectoral
-Piensa en acercar los bíceps (brazos al torso)
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Decelera a medida que bajas y no atrases los codos abajo
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Aberturas en banco inclinada 15º con mancuernas', '15º Inclinated dumbbell chest flyes', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Lleva un agarre neutro para llevar más grados de abd de hombro y estirar más el pectoral
-Piensa en acercar los bíceps (brazos al torso)
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Decelera a medida que bajas y no atrases los codos abajo
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Aberturas en banco inclinada 30º con mancuernas', '30º Inclinated dumbbell chest flyes', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Lleva un agarre neutro para llevar más grados de abd de hombro y estirar más el pectoral
-Piensa en acercar los bíceps (brazos al torso)
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Decelera a medida que bajas y no atrases los codos abajo
-Arriba extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/tNHkRZ1XxIE'),
('Aberturas en banco inclinada 45º con mancuernas', '45º Inclinated dumbbell chest flyes', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Lleva un agarre neutro para llevar más grados de abd de hombro y estirar más el pectoral
-Piensa en acercar los bíceps (brazos al torso)
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Decelera a medida que bajas y no atrases los codos abajo
-Arriba extiende por completo los codos, espira y comienza a bajar', 'https://www.youtube.com/shorts/tNHkRZ1XxIE'),
('Aberturas en banco inclinada 60º con mancuernas', '60º Inclinated dumbbell chest flyes', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Lleva un agarre neutro para llevar más grados de abd de hombro y estirar más el pectoral
-Piensa en acercar los bíceps (brazos al torso)
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Decelera a medida que bajas y no atrases los codos abajo
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Aberturas en banco inclinada 70º con mancuernas', '70º Inclinated dumbbell chest flyes', 'Pectoral', '-Empuja con los antebrazos perpendiculares al suelo
-Lleva un agarre neutro para llevar más grados de abd de hombro y estirar más el pectoral
-Piensa en acercar los bíceps (brazos al torso)
-No realices excesivo arco lumbar ni separes la cadera del banco
-Mantén una retracción escapular durante todo el ROM
-Decelera a medida que bajas y no atrases los codos abajo
-Arriba extiende por completo los codos, espira y comienza a bajar', null),
('Cruces en polea ascendentes', 'Ascending pulley crossovers', 'Pectoral', '-Lleva un agarre neutro para llevar más grados de abd de hombro y estirar más el pectoral
-Piensa en acercar los bíceps (brazos al torso)
-Mantén una retracción escapular durante todo el ROM
-Decelera a medida que bajas', 'https://www.youtube.com/shorts/nfsxNwDIYwY'),
('Cruces en polea descendentes', 'Descending pulley crossovers', 'Pectoral', '-Lleva un agarre neutro para llevar más grados de abd de hombro y estirar más el pectoral
-Piensa en acercar los bíceps (brazos al torso)
-Mantén una retracción escapular durante todo el ROM
-Decelera a medida que bajas', 'https://www.youtube.com/shorts/8zk5knK4HXg'),
('Cruces en polea (altura hombros)', 'Pulley Crossovers (Shoulder Height)', 'Pectoral', '-Lleva un agarre neutro para llevar más grados de abd de hombro y estirar más el pectoral
-Piensa en acercar los bíceps (brazos al torso)
-Mantén una retracción escapular durante todo el ROM
-Decelera a medida que bajas', 'https://www.youtube.com/shorts/BuCWCL6OEoU'),
('Dominadas con agarre prono y amplio', 'Prone pull ups', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Mantén las piernas quietas pero contraídas
-No anteriorices los hombros arriba
-Piensa en llevar la barbilla a la barra
-No descuelgues los hombros ni las escápulas abajo
-Acerca los brazos al torso por los lados del cuerpo', null),
('Dominadas con agarre neutro y biacromial', 'Neutral pull ups', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Mantén las piernas quietas pero contraídas
-No anteriorices los hombros arriba
-Piensa en llevar la barbilla a la barra
-No descuelgues los hombros ni las escápulas abajo
-Acerca los brazos al torso por delante del cuerpo, en dirección a la cadera', null),
('Dominadas con agarre supino', 'Supine pull ups', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Mantén las piernas quietas pero contraídas
-No anteriorices los hombros arriba
-Piensa en llevar la barbilla a la barra
-No descuelgues los hombros ni las escápulas abajo
-Acerca los brazos al torso por delante del cuerpo, en dirección a la cadera', null),
('Dominadas asistidas con agarre prono y amplio con banda de resistencia', 'Prone pull ups with band', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Mantén las piernas quietas pero contraídas
-No anteriorices los hombros arriba
-Piensa en llevar la barbilla a la barra
-No descuelgues los hombros ni las escápulas abajo
-Acerca los brazos al torso por los lados del cuerpo', null),
('Dominadas asistidas con agarre neutro biacromial con banda de resistencia', 'Neutral pull ups with band', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Mantén las piernas quietas pero contraídas
-No anteriorices los hombros arriba
-Piensa en llevar la barbilla a la barra
-No descuelgues los hombros ni las escápulas abajo
-Acerca los brazos al torso por delante del cuerpo, en dirección a la cadera', null),
('Dominadas asistidas con agarre supino con banda de resistencia', 'Supine pull ups with band', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Mantén las piernas quietas pero contraídas
-No anteriorices los hombros arriba
-Piensa en llevar la barbilla a la barra
-No descuelgues los hombros ni las escápulas abajo
-Acerca los brazos al torso por delante del cuerpo, en dirección a la cadera', null),
('Rack-chins con agarre prono y amplio', 'Rack chins', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Mantén las rodillas extendidas y la cadera flexionada
-No anteriorices los hombros arriba
-Piensa en llevar la barbilla a la barra
-No descuelgues los hombros ni las escápulas abajo
-Acerca los brazos al torso por los lados del cuerpo
-Colócate de tal manera que no alejes mucho la cadera de la barra ni apoyes los pies por encima de la cabeza', null),
('Dominadas asistidas en máquina con agarre prono', 'Prone pull ups machine', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Mantén las piernas quietas pero contraídas
-No anteriorices los hombros arriba
-Piensa en llevar la barbilla a la barra
-No descuelgues los hombros ni las escápulas abajo
-Acerca los brazos al torso por los lados del cuerpo', null),
('Dominadas en máquina con agarre supino', 'Neutral pull ups machine', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Mantén las piernas quietas pero contraídas
-No anteriorices los hombros arriba
-Piensa en llevar la barbilla a la barra
-No descuelgues los hombros ni las escápulas abajo
-Acerca los brazos al torso por delante del cuerpo, en dirección a la cadera', null),
('Dominadas en máquina con agarre neutro', 'Supine pull ups machine', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Mantén las piernas quietas pero contraídas
-No anteriorices los hombros arriba
-Piensa en llevar la barbilla a la barra
-No descuelgues los hombros ni las escápulas abajo
-Acerca los brazos al torso por delante del cuerpo, en dirección a la cadera', null),
('Jalón con agarre prono y amplio', 'Prone grip lat pulldown', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Colócate debajo de la polea y lleva el cable perpendicular al suelo
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros abajo
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas arriba
-Acerca los brazos al torso por los lados del cuerpo', 'https://www.youtube.com/shorts/qzQGEazdWPM'),
('Jalón con agarre neutro y amplio', 'Neutral broad grip lat pulldown', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Colócate debajo de la polea y lleva el cable perpendicular al suelo
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros abajo
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas arriba
-Acerca los brazos al torso por los lados del cuerpo', 'https://www.youtube.com/shorts/InXmIKVNwCU'),
('Jalón con agarre neutro y biacromial', 'Prone grip lat pulldown', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo y en línea con los agarres
-Colócate debajo de la polea y lleva el cable perpendicular al suelo
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros abajo
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas arriba
-Acerca los brazos al torso por delante del cuerpo con los codos en dirección a la cadera', 'https://www.youtube.com/shorts/4DHR-jYsbEE'),
('Jalón con agarre supino', 'Supine grip lat pulldown', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo y en línea con los agarres
-Colócate debajo de la polea y lleva el cable perpendicular al suelo
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros abajo
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas arriba
-Acerca los brazos al torso por delante del cuerpo con los codos en dirección a la cadera', 'https://www.youtube.com/shorts/LT_TSvcRD5c'),
('Jalón en máquina de palancas con agarre prono y amplio', 'Prone grip lat pulldown plate machine', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Colócate debajo de la polea y lleva el cable perpendicular al suelo
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros abajo
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas arriba
-Acerca los brazos al torso por los lados del cuerpo', null),
('Jalón en máquina de palancas con agarre neutro y amplio', 'Neutral broad grip lat pulldown plate machine', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Colócate debajo de la polea y lleva el cable perpendicular al suelo
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros abajo
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas arriba
-Acerca los brazos al torso por los lados del cuerpo', null),
('Jalón en máquina de palancas con agarre neutro y biacromial', 'Neutral grip lat pulldown plate machine', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo y en línea con las manos
-Colócate delante del todo del asiento
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros abajo
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas arriba
-Acerca los brazos al torso por delante del cuerpo con los codos en dirección a la cadera
-No pases de la línea del tronco con los codos', null),
('Jalón en máquina de placas con agarre prono y amplio', 'Prone grip lat pulldown plate machine', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Colócate debajo de la polea y lleva el cable perpendicular al suelo
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros abajo
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas arriba
-Acerca los brazos al torso por los lados del cuerpo', null),
('Jalón en máquina de placas con agarre neutro y amplio', 'Neutral broad grip lat pulldown plate machine', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo
-Lleva la intencionalidad como de querer romper la barra
-Colócate debajo de la polea y lleva el cable perpendicular al suelo
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros abajo
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas arriba
-Acerca los brazos al torso por los lados del cuerpo', null),
('Jalón en máquina de placas con agarre neutro y biacromial', 'Neutral grip lat pulldown plate machine', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo y en línea con las manos
-Colócate delante del todo del asiento
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros abajo
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas arriba
-Acerca los brazos al torso por delante del cuerpo con los codos en dirección a la cadera
-No pases de la línea del tronco con los codos', null),
('Jalón en máquina de palancas con agarre supino', 'Supine grip lat pulldown plate machine', 'Dorsales', '-Tracciona llevando los antebrazos perpendiculares al suelo y en línea con las manos
-Colócate delante del todo del asiento
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros abajo
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas arriba
-Acerca los brazos al torso por delante del cuerpo con los codos en dirección a la cadera
-No pases de la línea del tronco con los codos', null),
('Jalón unilateral en máquina de palancas', 'Single arm lat pulldown machine', 'Dorsales', '-Tracciona llevando el antebrazo perpendicular al suelo y en línea con la mano
-No anteriorices el hombro abajo
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula arriba
-Mantén una retroversión pélvica y una flexión de la columna
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-Agárrate con la mano libre
-No pases de la línea del tronco con los codos', 'https://youtube.com/shorts/UEXHCpb92Ms?si=MDHm4niBXfae-sOP'),
('Jalón unilateral desde polea alta', 'Single arm cable lat pulldown', 'Dorsales', '-Tracciona llevando el antebrazo perpendicular al suelo y en línea con la mano
-No anteriorices el hombro abajo
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula arriba
-Mantén una retroversión pélvica y una flexión de la columna
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-Agárrate con la mano libre
-No pases de la línea del tronco con los codos', 'https://www.youtube.com/shorts/rudpTb4A0X8'),
('Jalón unilateral en máquina de placas', 'Single arm lat pulldown machine', 'Dorsales', '-Tracciona llevando el antebrazo perpendicular al suelo y en línea con la mano
-No anteriorices el hombro abajo
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula arriba
-Mantén una retroversión pélvica y una flexión de la columna
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-Agárrate con la mano libre', null),
('Pull over desde polea alta con agarre neutro (énfasis acortamiento)', 'Cable pull over (shortening)', 'Dorsales', '-Mantén los codos bloqueados en una semi-extensión
-Dibuja un semi-círculo por delante del cuerpo hasta llevar el húmero a la altura del torso
-Mantén una retroversión pélvica y flexión activa de la columna
-Colócate alejado de la polea
-Inclínate hacia delante ligeramente
-Mantén el hombro y la escápula descendidos y no subas de los 120º de flexión de hombro', 'https://www.youtube.com/shorts/Lk0mpg7IjuM'),
('Pull over desde polea alta con agarre neutro (énfasis estiramiento)', 'Cable pull over (stretching)', 'Dorsales', '-Mantén los codos bloqueados en una semi-extensión
-Dibuja un semi-círculo por delante del cuerpo hasta llevar el húmero a la altura del torso
-Mantén una retroversión pélvica y flexión activa de la columna
-Colócate debajo de la polea
-Inclínate hacia delante ligeramente
-Mantén el hombro y la escápula descendidos y no subas de los 120º de flexión de hombro', null),
('Pull over unilateral desde polea alta (énfasis acortamiento)', 'Sigle arm cable pull over (shortening)', 'Dorsales', '-Utiliza muñequera y agarra un maneral externo
-Rota ligeramente el tronco alejando el hombro ejecutante
-Mantén el codo bloqueado en una semi-extensión
-Dibuja un semi-círculo por delante del cuerpo hasta llevar el húmero a la altura del torso
-Mantén una retroversión pélvica y flexión activa de la columna
-Colócate alejado de la polea
-Inclínate hacia delante con el pie del lado ejecutante adelantado
-Mantén el hombro y la escápula descendidos y no subas de los 120º de flexión de hombro', 'https://www.youtube.com/shorts/Iwk0dA2Y84E'),
('Pull over unilateral desde polea alta (énfasis estiramiento)', 'Sigle arm cable pull over (stretching)', 'Dorsales', '-Utiliza muñequera y agarra un maneral externo
-Rota ligeramente el tronco alejando el hombro ejecutante
-Mantén el codo bloqueado en una semi-extensión
-Dibuja un semi-círculo por delante del cuerpo hasta llevar el húmero a la altura del torso
-Mantén una retroversión pélvica y flexión activa de la columna
-Colócate debajo de la polea agarrado con la mano libre
-Inclínate hacia delante con el pie del lado ejecutante adelantado
-Mantén el hombro y la escápula descendidos y no subas de los 120º de flexión de hombro', 'https://www.youtube.com/shorts/Iwk0dA2Y84E'),
('Remo unilateral descendente en máquina de palancas', 'Single arm hammer row', 'Dorsales', '-Tracciona llevando el antebrazo en línea con la mano
-No anteriorices el hombro abajo
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula arriba
-Mantén una retroversión pélvica y una flexión de la columna
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-Agárrate con la mano libre
-No pases de la línea del tronco con los codos', null),
('Remo-jalón unilateral', 'Single arm lat pulldown', 'Dorsales', '-Tracciona llevando el antebrazo en línea con el cable
-No anteriorices el hombro abajo
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula arriba
-Mantén una retroversión pélvica y una flexión de la columna
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-Agárrate con la mano libre
-No pases de la línea del tronco con los codos', 'https://www.youtube.com/shorts/dZZ9c8WAWmc'),
('Jalón con agarre neutro y biacromial en el suelo', 'Floor seated neutral grip lat pulldown', 'Dorsales', '-Tracciona llevando los antebrazos en línea con los agarres
-Colócate debajo de la polea y lleva el cable perpendicular al suelo
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros abajo
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas arriba
-Acerca los brazos al torso por delante del cuerpo con los codos en dirección a la cadera
-No pases de la línea del tronco con los codos', null),
('Remo en máquina de placas con agarre neutro y biacromial', 'Neutral grip lat pulldown plate machine', 'Dorsales', '-Tracciona llevando los antebrazos en línea con las manos
-Colócate con el pecho apoyado contra el punto de restricción frontal
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas delante
-Acerca los brazos al torso por delante del cuerpo con los codos en dirección a la cadera
-No pases de la línea del tronco con los codos', null),
('Remo unilateral en máquina de palancas (Dorian) con agarre neutro', 'Neutral grip row machine', 'Dorsales', '-Tracciona llevando el antebrazo en línea con la mano
-Consúltame para saber cómo colocarte respecto a la carga y modificar el perfil de resistencia
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices el hombro atrás
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula delante
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-No pases de la línea del tronco con los codos', 'https://www.youtube.com/shorts/4wUytTlGggI'),
('Remo unilateral en máquina de palancas', 'Single arm plate loadeed row machine', 'Dorsales', '-Tracciona llevando el antebrazo en línea con la mano
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices el hombro atrás
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula delante
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-No pases de la línea del tronco con los codos', null),
('Remo en máquina de palancas (Dorian) con agarre neutro y biacromial', 'Plate loaded row machine', 'Dorsales', '-Tracciona llevando los antebrazos en línea con las manos
-Colócate con el pecho apoyado contra el punto de restricción frontal
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas delante
-Acerca los brazos al torso por delante del cuerpo con los codos en dirección a la cadera
-No pases de la línea del tronco con los codos', 'https://www.youtube.com/shorts/8VtiYUZ-fvs'),
('Remo gironda con agarre neutro y biacromial', 'Neutral grip landmine row', 'Dorsales', '-Tracciona llevando los antebrazos en línea con los cables
-Mantén los pies sobre un punto de restricción perpendicular a la línea de la resistencia
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas delante
-Acerca los brazos al torso por delante del cuerpo con los codos en dirección a la cadera
-No pases de la línea del tronco con los codos', 'https://www.youtube.com/watch?v=-2QGI_0X-kc&amp;pp=ygUrUmVtbyBnaXJvbmRhIGNvbiBhZ2FycmUgbmV1dHJvIHkgYmlhY3JvbWlhbA%3D%3D'),
('Remo T con agarre neutro y biacromial', 'Neutral grip cable row', 'Dorsales', '-Tracciona llevando los antebrazos en línea con los cables
-Mantén los pies sobre un punto de restricción perpendicular a la línea de la resistencia
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas delante
-Acerca los brazos al torso por delante del cuerpo con los codos en dirección a la cadera
-No pases de la línea del tronco con los codos', 'https://www.youtube.com/shorts/Zj7HEJc-MKM'),
('Remo landmine unilateral con agarre neutro', 'Single arm landmine row', 'Dorsales', '-Tracciona llevando el antebrazo en línea con la mano
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices el hombro atrás
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula delante
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-No pases de la línea del tronco con los codos', 'https://www.youtube.com/shorts/xnxxbOfFDsk'),
('Remo en punta con agarre neutro', 'Neutral grip landmine row', 'Dorsales', '-Tracciona llevando el antebrazo en línea con la mano
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices el hombro atrás
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula delante
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-No pases de la línea del tronco con los codos', null),
('Remo unilateral de pie con mancuerna', 'Single arm cumbbell row', 'Dorsales', '-Tracciona llevando el antebrazo en línea con la mano
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices el hombro arriba
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula abajo
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-No pases de la línea del tronco con los codos', 'https://www.youtube.com/shorts/8ms2Tb7xAoI'),
('Remo con mancuernas contra banco inclinado', 'Incline dumbbell row', 'Dorsales', '-Tracciona llevando el antebrazo en línea con la mano
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices el hombro atrás
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula abajo
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-No pases de la línea del tronco con los codos', 'https://www.youtube.com/watch?v=lq70I-7LtGw&amp;pp=ygUqUmVtbyBjb24gbWFuY3Vlcm5hcyBjb250cmEgYmFuY28gaW5jbGluYWRv'),
('Remo de pie con mancuernas contra banco inclinado', 'Helms row', 'Dorsales', '-Tracciona llevando el antebrazo en línea con la mano
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices el hombro atrás
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula abajo
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-No pases de la línea del tronco con los codos', null),
('Remo con barra Z de pie con el pecho apoyado y agarre supino biacromial', 'Z bar helms row', 'Dorsales', '-Tracciona llevando el antebrazo en línea con la mano
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices el hombro atrás
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula abajo
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-No pases de la línea del tronco con los codos', null),
('Remo unilateral desde polea a media altura', 'Single arm seated cable row', 'Dorsales', '-Tracciona llevando el antebrazo en línea con el cable
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices el hombro atrás
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula delante
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-No pases de la línea del tronco con los codos
-Apoya la mano libre contra el respaldo del banco', null),
('Remo unilateral horizontal en máquina de palancas', 'Single arm plate loaded iso-lat DY row', 'Dorsales', '-Tracciona llevando el antebrazo en línea de acción de la resistencia
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices el hombro atrás
-No vayas de delante a atrás con el tronco
-No descuelgues el hombro ni la escápula delante
-Acerca el brazo al torso por delante del cuerpo con el codos en dirección a la cadera
-No pases de la línea del tronco con los codos
-Apoya la mano libre contra el respaldo del banco', null),
('Remo unilateral en máquina de placas', 'Single arm row machine', 'Dorsales', '-Tracciona llevando el antebrazo en línea con la mano
-Colócate con el pecho apoyado contra el punto de restricción frontal
-Mantén una retroversión pélvica y una flexión de la columna
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-No descuelgues los hombros ni las escápulas delante
-Acerca los brazos al torso por delante del cuerpo con los codos en dirección a la cadera
-No pases de la línea del tronco con los codos', 'https://www.youtube.com/shorts/BfNyUa1io_M'),
('Pull over en máquina', 'Pull over machine', 'Dorsales', '-Mantén los codos bloqueados en una semi-extensión
-Mantén el hombro y la escápula descendidos y no subas de los 120º de flexión de hombro
-Aplica fuerza con las manos intentando no llevar los codos por fuera', null),
('Remo en máquina de placas agarre prono y amplio', 'Wide grip seated row machine', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', 'https://www.youtube.com/watch?v=2li5-axwjb0'),
('Remo en máquina de palancas (Dorian) con agarre prono y amplio', 'Wide grip seated row machine (plate loaded)', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', null),
('Remo en máquina de palancas para espalda alta', 'Plate loaded upper back row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', null),
('Remo en máquina de placas para espalda alta', 'Machine upper back row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', 'https://www.youtube.com/watch?v=2li5-axwjb0'),
('Remo con barra libre y agarre prono y amplio', 'Wide grip barbell row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco (no balanceos)
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', 'https://www.youtube.com/shorts/sr_U0jBE89A'),
('Remo en MP con agarre prono y amplio', 'Wide grip smith machine row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco (no balanceos)
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', 'https://www.youtube.com/shorts/ISnQSLtfbPk'),
('Remo en Multipower con agarre prono y amplio y pecho apoyado', 'Wide grip smith machine row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', 'https://www.youtube.com/shorts/ISnQSLtfbPk'),
('Remo T con agarre prono y amplio', 'Upperback wide grip T-row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)
-Apoya los pies a la altura de la cadera (usa steps si es necesario)', 'https://www.youtube.com/shorts/cwkQPH5Z6bo'),
('Seal row en máquina con barra libre', 'Seal row machine', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', null),
('Remo con barra libre de pie y pecho apoyado', 'Chest suported barbell row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', null),
('Remo con mancuernas contra banco inclinado 30º', 'Incline dumbbell row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', 'https://www.youtube.com/watch?v=QEji0-Oo9_8&amp;pp=ygUvUmVtbyBjb24gbWFuY3Vlcm5hcyBjb250cmEgYmFuY28gaW5jbGluYWRvIDMwwro%3D'),
('Remo de pie con mancuernas contra un banco inclinado 80º', '80º incline dumbbell row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', null),
('Remo landmine con agarre prono y amplio', 'Upperback landmine wide gripe row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', 'https://www.youtube.com/watch?v=s_FP39Uym5w&amp;pp=ygUnUmVtbyBsYW5kbWluZSBjb24gYWdhcnJlIHByb25vIHkgYW1wbGlv'),
('Remo bajo ascendente en máquina de palancas', 'Plate loaded low row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', 'https://www.youtube.com/shorts/RqR2VRMY5KE'),
('Encogimientos de hombros de pie en Multipower', 'Smith machine shrug', 'Trapecio', '-Eleva y baja los hombros lo máximo posible en cada movimiento
-Piensa en retener el peso arriba con los trapecios
-Mantén los codos extendidos en todo el ROM
-No te ayudes con la extensión de las rodillas', 'https://www.youtube.com/shorts/Dg64hxpTj-8'),
('Encogimientos de hombros de pie con barra libre', 'Barbell shrug', 'Trapecio', '-Eleva y baja los hombros lo máximo posible en cada movimiento
-Piensa en retener el peso arriba con los trapecios
-Mantén los codos extendidos en todo el ROM
-No te ayudes con la extensión de las rodillas', null),
('Encogimientos de hombros entre poleas', 'Cable shrug', 'Trapecio', '-Eleva y baja los hombros lo máximo posible en cada movimiento
-Piensa en retener el peso arriba con los trapecios
-Mantén los codos extendidos en todo el ROM
-No te ayudes con la extensión de las rodillas', null),
('Encogimientos de hombros unilateral en polea', 'Unilateral cable shrug', 'Trapecio', '-Eleva y baja los hombros lo máximo posible en cada movimiento
-Piensa en retener el peso arriba con los trapecios
-Mantén los codos extendidos en todo el ROM
-No te ayudes con la extensión de las rodillas
-Agárrate con la mano libre a algo que te sume estabilidad', null),
('Retracciones escapulares con mancuernas contra banco inclinado', 'Dumbbell keslo shrugs', 'Trapecio', '-Retrae las escápulas lo máximo posible en cada movimiento
-Piensa en retener el peso atrás con las escápulas
-Mantén los codos extendidos en todo el ROM
-No te ayudes con la extensión de la espalda baja
-No separes el pecho del banco', null),
('Remo descendente en máquina de palancas', 'Plate loaded high row upper back', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-No separes el pecho del apoyo frontal en ningún momento
-Utiliza el agarre y la profundidad del asiento que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', null),
('Jalón con agarre neutro y amplio para espalda alta', 'Neutral upperback lat pulldown', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Mantén la cadera en la misma posición en todo el ROM (no vayas de delante a atrás)
-Utiliza el agarre y la profundidad del asiento que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', null),
('Remo horizontal en máquina de palancas', 'Iso-lateral D.Y. row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-No separes el pecho del apoyo frontal en ningún momento
-Utiliza el agarre y la profundidad del asiento que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', null),
('Retracciones escapulares en remo T', 'T-row keslo shrusgs', 'Trapecio', '-Retrae las escápulas lo máximo posible en cada movimiento
-Piensa en retener el peso atrás con las escápulas
-Mantén los codos extendidos en todo el ROM
-No te ayudes con la extensión de la espalda baja
-No separes el pecho del banco', null),
('Remo ascendente unilateral en máquina de palancas', 'Single arm low row machine', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)
-Agárrate con la mano libre para más estabilidad', null),
('Remo bajo en máquina de palancas', 'Low row machine', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', null),
('Remo alto en máquina de palancas', 'High row machine', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', null),
('Remo desde polea a media altura contra banco con agarre amplio', 'Cable wide-grip seated row', 'Trapecio', '-Dale a tus escápulas la máxima movilidad (retracción y protracción)
-"Descuelga los hombros" al comienzo y "saca el pecho" al final
-Pasa de la línea del tronco con los codos
-Tracciona con los codos detrás de las manos
-No anteriorices los hombros atrás
-No vayas de delante a atrás con el tronco
-Utiliza el agarre que te permita llevar los hombros entre 30-60º de abducción (separados del tronco)', null),
('Face pull de pie en polea', 'Standed face pull', 'Trapecio', '-Retrae las escápulas lo máximo posible en cada movimiento
-Piensa en retener el peso atrás con las escápulas
-Termina con las muñecas, codos y hombros a la misma altura
-No te ayudes con la extensión de la espalda baja
-Tracciona en dirección a los ojos', null),
('Face pull desde polea alta en banco', 'Lying face pull', 'Trapecio', '-Retrae las escápulas lo máximo posible en cada movimiento
-Piensa en retener el peso atrás con las escápulas
-Termina con las muñecas, codos y hombros a la misma altura
-No te ayudes con la extensión de la espalda baja
-Tracciona en dirección a los ojos', null),
('Seal row apoyado en banco con mancuernas', 'Dumbbell seal row bench', 'Trapecio', '-Retrae las escápulas lo máximo posible en cada movimiento
-Piensa en retener el peso atrás con las escápulas
-Termina con las muñecas, codos y hombros a la misma altura
-No te ayudes con la extensión de la espalda baja
-Tracciona en dirección a los ojos', 'https://www.youtube.com/watch?v=3MzKh7bVoo0&amp;pp=ygUpU2VhbCByb3cgYXBveWFkbyBlbiBiYW5jbyBjb24gbWFuY3Vlcm5hcyA%3D'),
('Rack pull', 'Rack pull', 'Lumbares', '-Apoya el peso en cada repetición de manera muy delicada, como si hubiese cristal debajo
-Utiliza un agarre biacromial
-Lleva la espalda en una posición neutra y los codos completamente extendidos
-Lleva el cuello en línea con la espalda
-Controla mucho la fase excéntrica', null),
('Hiperextensiones de tronco en banco romano', 'Roman chair glute hyperextensions', 'Lumbares', '-Dale la máxima movilidad a la espalda baja y mínima a la cadera
-Lleva la espalda alta redondeada
-Apoya la máquina a la altura de la cadera
-Utiliza peso, en caso de que lo necesites, delante del cuerpo con los codos extendidos: polea, disco, mancuerna, kettle...', 'https://www.youtube.com/shorts/0c64gq_8LVw'),
('Hiperextensiones de tronco en GHD', 'Glute ham rises', 'Lumbares', '-Dale la máxima movilidad a la espalda baja y mínima a la cadera
-Lleva la espalda alta redondeada
-Apoya la máquina a la altura de la cadera', null),
('Hiperextensiones de tronco en máquina de placas', 'Hyperextensions machine', 'Lumbares', '-Dale la máxima movilidad a la espalda baja y mínima a la cadera
-Lleva la espalda alta redondeada
-Apoya la máquina a la altura de la cadera', null),
('Elevaciones laterales unilaterales desde polea en posición de estiramiento', 'Behind the back cable lateral raises', 'Deltoides Lateral', '-Codos extendidos por completo
-No te inclines ni te dejes caer
-Lo más cerca posible a la polea
-Agárrate con la mano libre para más estabilidad
-Usa muñequeras y agarra una anilla para mayor irradiación
-Lleva el cable por detrás del cuerpo
-Haz coincidir el cable perpendicular al brazo al comienzo del ROM colocando la polea a la altura de la cadera
-Piensa en llevar la mano lejos de ti, no hacia arriba
-Eleva el hombro lo menos posible arriba', 'https://www.youtube.com/shorts/3uljNfhx1EI'),
('Elevaciones laterales unilaterales desde polea baja', 'Single arm cable lateral raises', 'Deltoides Lateral', '-Codos extendidos por completo
-No te inclines ni te dejes caer
-Lo más cerca posible a la polea
-Agárrate con la mano libre para más estabilidad
-Usa muñequeras y agarra una anilla para mayor irradiación
-Lleva el cable por delante del cuerpo o entre las piernas
-Haz coincidir el cable perpendicular al brazo al final del ROM
-Piensa en llevar la mano lejos de ti, no hacia arriba
-Eleva el hombro lo menos posible arriba', 'https://www.youtube.com/shorts/3uljNfhx1EI'),
('Elevaciones laterales de pie entre poleas a media altura', 'Double cable lateral raises', 'Deltoides Lateral', '-Codos extendidos por completo
-No te inclines ni te dejes caer
-Lo más cerca posible a las poleas
-Usa muñequeras y agarra anillas para mayor irradiación
-Lleva los cables por detrás del cuerpo
-Haz coincidir los cable perpendiculares a los brazos al comienzo del ROM
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba', null),
('Elevaciones laterales de pie entre poleas bajas (cerca entre sí)', 'Double cable lateral raises', 'Deltoides Lateral', '-Codos extendidos por completo
-No te inclines ni te dejes caer
-Lo más cerca posible a las poleas
-Usa muñequeras y agarra anillas para mayor irradiación
-Lleva los cables por delante del cuerpo
-Haz coincidir los cable perpendiculares a los brazos al final del ROM
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
- Lleva el cable por delante del cuerpo', 'https://www.youtube.com/shorts/We-e5dWkXYM'),
('Elevaciones laterales de pie entre poleas bajas (lejanas entre sí)', 'Double cable lateral raises', 'Deltoides Lateral', '-Codos extendidos por completo
-No te inclines ni te dejes caer
-Lo más cerca posible a las poleas
-Usa muñequeras y agarra anillas para mayor irradiación
-Lleva los cables por delante del cuerpo
-Haz coincidir los cable perpendiculares a los brazos al final del ROM
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
- Lleva el cable por delante del cuerpo', 'https://www.youtube.com/shorts/We-e5dWkXYM'),
('Elevaciones laterales tumbado entre poleas en posición de estiramiento', 'Crucifix raises', 'Deltoides Lateral', '-Codos extendidos por completo
-Túmbate en un banco inclinado entre 30-45º
-Cuando extiendes los brazos, las manos deberían cruzar la línea entre poleas
-Usa muñequeras y agarra anillas para mayor irradiación
-Haz coincidir los cable perpendiculares a los brazos al comienzo del ROM
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Si las poleas son cercanas, realiza las elevas por delante del cuerpo, sino, por los lados en el plano escapular', 'https://www.youtube.com/shorts/6SILhZvkBks'),
('Elevaciones laterales tumbada entre poleas en posición de estiramiento', 'Crucifix raises', 'Deltoides Lateral', '-Codos extendidos por completo
-Túmbate en un banco inclinado entre 30-45º
-Cuando extiendes los brazos, las manos deberían cruzar la línea entre poleas
-Usa muñequeras y agarra anillas para mayor irradiación
-Haz coincidir los cable perpendiculares a los brazos al comienzo del ROM
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Si las poleas son cercanas, realiza las elevas por delante del cuerpo, sino, por los lados en el plano escapular', 'https://www.youtube.com/shorts/6SILhZvkBks'),
('Elevaciones laterales unilaterales tumbado en banco inclinado 45º con mancuerna', '45º dumbbell lateral raises', 'Deltoides Lateral', '-Codo extendido por completo
-Piensa en alejar las manos de ti lo máximo posible
-Abduce el hombro de delante a atrás', null),
('Elevaciones laterales unilaterales tumbada en banco inclinado 45º con mancuerna', '45º dumbbell lateral raises', 'Deltoides Lateral', '-Codo extendido por completo
-Piensa en alejar las manos de ti lo máximo posible
-Abduce el hombro de delante a atrás', null),
('Elevaciones laterales "Y" agarre prono', 'Prone incline lateral raises', 'Deltoides Lateral', null, 'https://www.youtube.com/watch?v=e8K9KPGcwr8&amp;pp=ygUcUHJvbmUgaW5jbGluZSBsYXRlcmFsIHJhaXNlcw%3D%3D'),
('Elevaciones laterales sentado con mancuernas', 'Seated dumbbell lateral raises', 'Deltoides Lateral', '-Codos extendidos por completo
-No vayas con el tronco de delante a atrás
-Fija la espalda baja con un punto de restricción trasero (por ej.: donde se hace jalón del revés)
-Aplica fuerza con las punteras de los pies hacia delante antes de subir
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Abduce los hombros por los lados del tronco, en el plano escapular', 'https://www.youtube.com/shorts/QHbFRXHq42c'),
('Elevaciones laterales sentada con mancuernas', 'Seated dumbbell lateral raises', 'Deltoides Lateral', '-Codos extendidos por completo
-No vayas con el tronco de delante a atrás
-Fija la espalda baja con un punto de restricción trasero (por ej.: donde se hace jalón del revés)
-Aplica fuerza con las punteras de los pies hacia delante antes de subir
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Abduce los hombros por los lados del tronco, en el plano escapular', 'https://www.youtube.com/shorts/QHbFRXHq42c'),
('Elevaciones laterales de pie con mancuernas', 'Standing dumbbell lateral raises', 'Deltoides Lateral', '-Codos extendidos por completo
-No vayas con el tronco de delante a atrás
-Aplica fuerza con las punteras de los pies hacia delante antes de subir
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Abduce los hombros por los lados del tronco, en el plano escapular', 'https://www.youtube.com/shorts/yZ1NYKtDrko'),
('Elevaciones laterales unilaterales desde media altura con goma', 'Medium band lateral raises', 'Deltoides Lateral', '-Codo extendido por completo
-No te inclines ni te dejes caer
-Lo más cerca posible a la goma
-Lleva la goma por detrás del cuerpo
-Haz coincidir la goma perpendicular al brazo al comienzo del ROM
-Piensa en llevar la mano lejos de ti, no hacia arriba
-Eleva el hombro lo menos posible arriba', null),
('Elevaciones laterales unilaterales con goma', 'Band lateral raises', 'Deltoides Lateral', '-Codo extendido por completo
-No te inclines ni te dejes caer
-Lo más cerca posible a la goma
-Lleva la goma por detrás del cuerpo
-Haz coincidir la goma perpendicular al brazo al final del ROM
-Piensa en llevar la mano lejos de ti, no hacia arriba
-Eleva el hombro lo menos posible arriba', null),
('Elevaciones laterales sentado en máquina de placas (CAM redonda)', 'Lateral raises machine (Round CAM)', 'Deltoides Lateral', '-Codos extendidos por completo y agarra dos anillas con las manos para mayor irradiación
-No vayas con el tronco de delante a atrás
-Fija la espalda baja contra el respaldo (hazlas del revés si es necesario)
-Aplica fuerza con las punteras de los pies hacia delante antes de subir
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Abduce los hombros por los lados del tronco, en el plano escapular
-Haz coincidir tus ejes anatómicos (hombros) con los ejes de la máquina', null),
('Elevaciones laterales sentada en máquina de placas (CAM redonda)', 'Lateral raises machine (Round CAM)', 'Deltoides Lateral', '-Codos extendidos por completo y agarra dos anillas con las manos para mayor irradiación
-No vayas con el tronco de delante a atrás
-Fija la espalda baja contra el respaldo (hazlas del revés si es necesario)
-Aplica fuerza con las punteras de los pies hacia delante antes de subir
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Abduce los hombros por los lados del tronco, en el plano escapular
-Haz coincidir tus ejes anatómicos (hombros) con los ejes de la máquina', null),
('Elevaciones laterales sentado en máquina de placas (CAM modificada)', 'Lateral raises machine (Modified CAM)', 'Deltoides Lateral', '-Codos extendidos por completo y agarra dos anillas con las manos para mayor irradiación
-No vayas con el tronco de delante a atrás
-Fija la espalda baja contra el respaldo (hazlas del revés si es necesario)
-Aplica fuerza con las punteras de los pies hacia delante antes de subir
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Abduce los hombros por los lados del tronco, en el plano escapular
-Haz coincidir tus ejes anatómicos (hombros) con los ejes de la máquina', null),
('Elevaciones laterales sentada en máquina de placas (CAM modificada)', 'Lateral raises machine (Modified CAM)', 'Deltoides Lateral', '-Codos extendidos por completo y agarra dos anillas con las manos para mayor irradiación
-No vayas con el tronco de delante a atrás
-Fija la espalda baja contra el respaldo (hazlas del revés si es necesario)
-Aplica fuerza con las punteras de los pies hacia delante antes de subir
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Abduce los hombros por los lados del tronco, en el plano escapular
-Haz coincidir tus ejes anatómicos (hombros) con los ejes de la máquina', null),
('Elevaciones laterales de pie en máquina de placas', null, 'Deltoides Lateral', '-Codos extendidos por completo
-No vayas con el tronco de delante a atrás
-Aplica fuerza con las punteras de los pies hacia delante antes de subir
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Abduce los hombros por los lados del tronco, en el plano escapular
-Haz coincidir tus ejes anatómicos (hombros) con los ejes de la máquina', 'https://www.youtube.com/shorts/i-hacjW13ts'),
('Elevaciones laterales de pie en máquina de palancas', 'Standing lateral raises machine', 'Deltoides Lateral', '-Codos extendidos por completo
-No vayas con el tronco de delante a atrás
-Aplica fuerza con las punteras de los pies hacia delante antes de subir
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Abduce los hombros por los lados del tronco, en el plano escapular
-Haz coincidir tus ejes anatómicos (hombros) con los ejes de la máquina', 'https://www.youtube.com/shorts/wZIq-l8SUq0'),
('Elevaciones laterales sentado en máquina de palancas', 'Seated lateral raises machine', 'Deltoides Lateral', '-Codos extendidos por completo y agarra dos anillas con las manos para mayor irradiación
-No vayas con el tronco de delante a atrás
-Fija la espalda baja contra el respaldo (hazlas del revés si es necesario)
-Aplica fuerza con las punteras de los pies hacia delante antes de subir
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Abduce los hombros por los lados del tronco, en el plano escapular
-Haz coincidir tus ejes anatómicos (hombros) con los ejes de la máquina', null),
('Elevaciones laterales unilaterales en máquina de palancas', 'Single arm lateral raises machine', 'Deltoides Lateral', '-Codos extendidos por completo y agarra dos anillas con las manos para mayor irradiación
-No vayas con el tronco de delante a atrás
-Fija la espalda baja contra el respaldo (hazlas del revés si es necesario)
-Aplica fuerza con las punteras de los pies hacia delante antes de subir
-Piensa en llevar las manos lejos de ti, no hacia arriba
-Eleva los hombros lo menos posible arriba
-Abduce los hombros por los lados del tronco, en el plano escapular
-Haz coincidir tus ejes anatómicos (hombros) con los ejes de la máquina', null),
('Six Ways', 'Six ways', 'Deltoides Lateral', '-Mantén los codos extendidos durante todo el ROM
-Aplica fuerza con las punteras de los pies contra el suelo cuando subas
-Fija la espalda baja contra el respaldo', 'https://www.youtube.com/shorts/wWse340JmEc'),
('Elevaciones frontales unilaterales desde polea a media altura con agarre neutro', 'Neutral grip single arm front medium cable raises', 'Deltoides Anterior', '-Mantén el codo extendido
-Colócate de espaldas y de lado a la polea
-Agárrate con la mano libre para más estabilidad
-Piensa en empujar con la mano lejos del cuerpo, no hacia arriba
-Eleva lo mínimo el hombro arriba
-No subas más de la altura de la vista
-No te inclines
-Utiliza muñequera y agarra una anilla para mayor irradiación', null),
('Elevaciones frontales unilaterales desde polea baja con agarre neutro', 'Neutral grip single arm front low cable raises', 'Deltoides Anterior', '-Mantén el codo extendido
-Colócate de espaldas y de lado a la polea
-Agárrate con la mano libre para más estabilidad
-Piensa en empujar con la mano lejos del cuerpo, no hacia arriba
-Eleva lo mínimo el hombro arriba
-No subas más de la altura de la vista
-No te inclines
-Utiliza muñequera y agarra una anilla para mayor irradiación', null),
('Elevaciones frontales de pie desde polea baja con agarre prono', 'Cable front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Colócate de espaldas
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-No te inclines ni te impulses con el resto del cuerpo
-Utiliza un agarre que no te limite el fallo muscular', null),
('Elevaciones frontales de pie desde polea baja con agarre neutro', 'Cable front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Colócate de espaldas
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-No te inclines ni te impulses con el resto del cuerpo
-Utiliza un agarre que no te limite el fallo muscular', null),
('Elevaciones frontales de pie con mancuernas y agarre neutro', 'Neutral grip dumbbell front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Apoya el pecho contra un banco ligeramente inclinado
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-No te inclines ni te impulses con el resto del cuerpo', null),
('Elevaciones frontales con mancuernas y agarre prono', 'Prone grip dumbbell front raies', 'Deltoides Anterior', '-Mantén los codos extendidos
-Apoya el pecho contra un banco ligeramente inclinado
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-No te inclines ni te impulses con el resto del cuerpo', null),
('Elevaciones frontales unilaterales con mancuerna y agarre neutro', 'Single arm prone grip dumbbell front raies', 'Deltoides Anterior', '-Mantén el codo extendido
-Agárrate con la mano libre
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo el hombro arriba
-No subas más de la altura de la vista
-No te inclines ni te impulses con el resto del cuerpo', null),
('Elevaciones frontales unilaterales con mancuerna y agarre prono', 'Single arm prone grip dumbbell front raies', 'Deltoides Anterior', '-Mantén el codo extendido
-Agárrate con la mano libre
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo el hombro arriba
-No subas más de la altura de la vista
-No te inclines ni te impulses con el resto del cuerpo', null),
('Elevaciones frontales con goma y agarre prono', 'Band front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-No te inclines ni te impulses con el resto del cuerpo
-Pisa la goma en el medio para repartir la resistencia de forma simétrica', null),
('Elevaciones frontales con goma y agarre neutro', 'Band front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-No te inclines ni te impulses con el resto del cuerpo
-Pisa la goma en el medio para repartir la resistencia de forma simétrica', null),
('Elevaciones frontales sentado con mancuernas y agarre neutro', 'Seating dumbbell front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Apoya la espalda baja para generar un punto de restricción
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-No te inclines ni te impulses con el resto del cuerpo', null),
('Elevaciones frontales sentada con mancuernas y agarre neutro', 'Seating dumbbell front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Apoya la espalda baja para generar un punto de restricción
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-No te inclines ni te impulses con el resto del cuerpo', null),
('Elevaciones frontales sentado con mancuernas y agarre prono', 'Seating dumbbell front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Apoya la espalda baja para generar un punto de restricción
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-No te inclines ni te impulses con el resto del cuerpo', null),
('Elevaciones frontales sentada con mancuernas y agarre prono', 'Seating dumbbell front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Apoya la espalda baja para generar un punto de restricción
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-No te inclines ni te impulses con el resto del cuerpo', null),
('Elevaciones frontales tumbado desde polea baja con agarre neutro', 'Lying cable front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Coloca los pies a la altura de la polea
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-Utiliza un agarre que no te limite el fallo muscular', null),
('Elevaciones frontales tumbada desde polea baja con agarre neutro', 'Lying cable front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Coloca los pies a la altura de la polea
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-Utiliza un agarre que no te limite el fallo muscular', null),
('Elevaciones frontales tumbado desde polea baja con agarre prono', 'Lying cable front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Coloca los pies a la altura de la polea
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-Utiliza un agarre que no te limite el fallo muscular', null),
('Elevaciones frontales tumbada desde polea baja con agarre prono', 'Lying cable front raises', 'Deltoides Anterior', '-Mantén los codos extendidos
-Coloca los pies a la altura de la polea
-Piensa en empujar con las manos lejos del cuerpo, no hacia arriba
-Eleva lo mínimo los hombros arriba
-No subas más de la altura de la vista
-Utiliza un agarre que no te limite el fallo muscular', null),
('Press miltar de pie con barra', 'Standing shoulder press', 'Deltoides Anterior', '-Mantén la espalda neutra
-Mantén las rodillas extendidas en todo el ROM
-Aprieta los glúteos arriba para más estabilidad
-Echa la cabeza hacia atrás para subir la barra, no adelantes la barra (debe seguir una línea recta)
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de la barra en todo momento', null),
('Press miltar de pie con mancuernas', 'Standing dumbbell shoulder press', 'Deltoides Anterior', '-Mantén la espalda recta.
-No realices excesivo arco lumbar.
-Realiza el ROM que te capacite tu movilidad 
-Coloca las manos de manera que queden alineados ccon los codos.', null),
('Press miltar sentado con barra', 'Seating shoulder press', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de la barra en todo momento
-No hagas excesivo arco lumbar
-Utiliza una ligera inclinación del respaldo del banco (80º aprox), no lo hagas vertical', 'https://www.youtube.com/shorts/r4h019sQfMA'),
('Press miltar sentada con barra', 'Seating shoulder press', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de la barra en todo momento
-No hagas excesivo arco lumbar
-Utiliza una ligera inclinación del respaldo del banco (80º aprox), no lo hagas vertical', 'https://www.youtube.com/shorts/r4h019sQfMA'),
('Press militar sentado con mancuernas', 'Seating dumbbell shoulder press', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de las mancuernas en todo momento
-No hagas excesivo arco lumbar
-Utiliza una ligera inclinación del respaldo del banco (80º aprox), no lo hagas vertical', 'https://www.youtube.com/shorts/PWtkHROaH3Y'),
('Press militar sentada con mancuernas', 'Seating dumbbell shoulder press', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de las mancuernas en todo momento
-No hagas excesivo arco lumbar
-Utiliza una ligera inclinación del respaldo del banco (80º aprox), no lo hagas vertical', 'https://www.youtube.com/shorts/PWtkHROaH3Y'),
('Press militar sentado en Multipower', 'Seating smith shoulder press', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de la barra en todo momento
-No hagas excesivo arco lumbar
-Baja la barra rozándote la nariz
-Utiliza una ligera inclinación del respaldo del banco (80º aprox), no lo hagas vertical', 'https://www.youtube.com/watch?v=uGtqiOfa0OA&amp;pp=ygUjUHJlc3MgbWlsaXRhciBzZW50YWRvIGVuIE11bHRpcG93ZXI%3D'),
('Press militar sentada en Multipower', 'Seating smith shoulder press', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de la barra en todo momento
-No hagas excesivo arco lumbar
-Baja la barra rozándote la nariz
-Utiliza una ligera inclinación del respaldo del banco (80º aprox), no lo hagas vertical', 'https://www.youtube.com/watch?v=uGtqiOfa0OA&amp;pp=ygUjUHJlc3MgbWlsaXRhciBzZW50YWRvIGVuIE11bHRpcG93ZXI%3D'),
('Press militar sentado en Multipower con banda de resistencia inversa', 'Seating band smith shoulder press', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de la barra en todo momento
-No hagas excesivo arco lumbar
-Baja la barra rozándote la nariz
-Utiliza una ligera inclinación del respaldo del banco (80º aprox), no lo hagas vertical', 'https://www.youtube.com/watch?v=uGtqiOfa0OA&amp;pp=ygUjUHJlc3MgbWlsaXRhciBzZW50YWRvIGVuIE11bHRpcG93ZXI%3D'),
('Press militar sentado en Multipower con banda de resistencia inversa', 'Seating band smith shoulder press', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de la barra en todo momento
-No hagas excesivo arco lumbar
-Baja la barra rozándote la nariz
-Utiliza una ligera inclinación del respaldo del banco (80º aprox), no lo hagas vertical', 'https://www.youtube.com/watch?v=uGtqiOfa0OA&amp;pp=ygUjUHJlc3MgbWlsaXRhciBzZW50YWRvIGVuIE11bHRpcG93ZXI%3D'),
('Press militar en máquina de palancas', 'Seating shoulder press machine', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de las manos en todo momento
-No hagas excesivo arco lumbar
-Utiliza el agarre que no te haga llevar los codos por fuera de las manos
-Empuja el suelo con los pies antes de subir en cada rep', 'https://www.youtube.com/shorts/gcrhmDlZWEc'),
('Press militar tumbado en máquina de placas', 'Lying shoulder press machine', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de las manos en todo momento
-No hagas excesivo arco lumbar
-Utiliza el agarre que no te haga llevar los codos por fuera de las manos
-Empuja el suelo con los pies antes de subir en cada rep', null),
('Press militar tumbada en máquina de placas', 'Lying shoulder press machine', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de las manos en todo momento
-No hagas excesivo arco lumbar
-Utiliza el agarre que no te haga llevar los codos por fuera de las manos
-Empuja el suelo con los pies antes de subir en cada rep', null),
('Press militar tumbado en máquina de palancas (resistencia variable)', 'Lying shoulder press machine (variable resistance)', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de las manos en todo momento
-No hagas excesivo arco lumbar
-Utiliza el agarre que no te haga llevar los codos por fuera de las manos
-Empuja el suelo con los pies antes de subir en cada rep', 'https://www.youtube.com/shorts/iCYFzCLlaTk'),
('Press militar tumbada en máquina de palancas (resistencia variable)', 'Lying shoulder press machine (variable resistance)', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de las manos en todo momento
-No hagas excesivo arco lumbar
-Utiliza el agarre que no te haga llevar los codos por fuera de las manos
-Empuja el suelo con los pies antes de subir en cada rep', 'https://www.youtube.com/shorts/iCYFzCLlaTk'),
('Press militar en máquina de placas', 'Shoulder press machine', 'Deltoides Anterior', '-Realiza retracción escapular para proteger los hombros
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de las manos en todo momento
-No hagas excesivo arco lumbar
-Utiliza el agarre que no te haga llevar los codos por fuera de las manos
-Empuja el suelo con los pies antes de subir en cada rep', 'https://www.youtube.com/shorts/j5hESuo3YTo'),
('Press vikingo en máquina', 'Viking press machine', 'Deltoides Anterior', '-Mantén la espalda neutra
-Mantén las rodillas extendidas en todo el ROM
-Aprieta los glúteos arriba para más estabilidad
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de las manos en todo momento', 'https://www.youtube.com/shorts/7-Ql0zdS5X0'),
('Press vikingo landmine', 'Landmine viking press', 'Deltoides Anterior', '-Mantén la espalda neutra
-Mantén las rodillas extendidas en todo el ROM
-Aprieta los glúteos arriba para más estabilidad
-Empuja con los antebrazos perpendiculares al suelo en todo momento
-Mantén los codos debajo de las manos en todo momento', null),
('Abducciones de hombro en máquina (pec deck)', 'Reverse peck deck', 'Deltoides Posterior', '-Utiliza un agarre neutro inverso (palmas de las manos hacia fuera) o prono
-Apoya las manos contra la palanca vertical y aplica fuerza contra ella
-Lleva las manos por debajo de los hombros (60º de abd de hombro)
-Mantén una protracción escapular, no juntes las escápulas en ningún momento
-No pases de los hombros con las manos', null),
('Abducciones de hombro en banco inclinado con mancuernas', 'Dumbbell lying rear delt fly', 'Deltoides Posterior', '-Evitar juntar las escapulas.
-No elevar los hombros', null),
('Abducciones de hombros entre poleas', 'Cross cable rear delt', 'Deltoides Posterior', '-Realízalo sentad@ si es posible
-No hagas retracción escapular al final del ROM (atrás)
-Piensa en alejar las manos del cuerpo
-Utiliza muñequeras y mete las manos
-Lleva una trayectoria ligeramente descendente entorno a los 60º de abd de hombro
-No pases de la línea del tronco con los brazos', null),
('Abducciones de hombro con goma', 'Band pull apart', 'Deltoides Posterior', '-Evitar juntar las escapulas.
-No elevar los hombros', null),
('Abducciones de hombro horizontales unilaterales desde polea a media altura', 'Single arm cable rear delt flyes', 'Deltoides Posterior', '-Utiliza muñequera y mete el brazo (hasta la mitad del antebrazo)
-Lleva una rotación externa de hombro (aplica fuerza con el exterior del antebrazo)
-Agarra un maneral externo para mayor irradiación
-Lleva una trayectoria descendente sacando el cable desde el lateral del cuerpo a la altura de la vista
-No pases de la línea del hombro con la mano (no retraigas la escápula al final)
-Mantén entorno a los 60º de abd de hombro', 'https://youtube.com/shorts/K5ty6QJnQLw?si=k3nEdLMGH1ci0R_P'),
('Flexiones de codos en banco Scott con barra Z', 'EZ bar preacher curl', 'Bíceps', '-Extiende los codos por completo abajo en cada rep
-No separes los codos del respaldo en ningún momento
-Apoya el brazo entero sobre el respaldo (sin incluir la axila)
-Lleva un agarre ligeramente más estrecho que el biacromial
-Átate en caso de limitar el agarre', 'https://youtube.com/shorts/YUhSi_sUGmM?si=3O8BjGcjuvPvSbNc'),
('Flexiones de codo unilaterales predicador desde polea a media altura (énfasis acortamiento)', 'Single arm preacher cable curl', 'Bíceps', '-Pega a la polea un banco plano y siéntate en el suelo
-Coloca la polea por encima del codo
-Apoya el brazo entero (la axila incluida)
-Aplica fuerza con el codo contra el banco
-Extiende por completo el codo al comienzo de cada rep
-Aprieta la cara interna del bíceps ejecutante con la mano libre para mayor estabilidad', 'https://www.youtube.com/shorts/vyP7ggY_baE'),
('Flexiones de codo unilaterales predicador desde polea a media altura (perfil en campana)', 'Single arm preacher cable curl', 'Bíceps', '-Pega a la polea un banco plano y siéntate en el suelo
-Coloca la polea a la altura del codo
-Apoya el brazo entero (la axila incluida)
-Aplica fuerza con el codo contra el banco
-Extiende por completo el codo al comienzo de cada rep
-Aprieta la cara interna del bíceps ejecutante con la mano libre para mayor estabilidad', null),
('Flexiones de codo unilaterales predicador en banco inclinado desde polea (énfasis acortamiento)', 'Single arm preacher cable curl', 'Bíceps', '-Pega un banco inclinado 45º a la polea
-Coloca la polea por encima del banco pero pegada a este
-Apoya el brazo entero (la axila incluida)
-Aplica fuerza con el codo contra el banco
-Extiende por completo el codo al comienzo de cada rep
-Aprieta la cara interna del bíceps ejecutante con la mano libre para mayor estabilidad', 'https://www.youtube.com/shorts/vyP7ggY_baE'),
('Flexiones de codos en máquina de placas (énfasis acortamiento)', 'Biceps curl machine', 'Bíceps', '-Extiende los codos por completo abajo en cada rep
-No separes los codos del respaldo en ningún momento
-Apoya el brazo entero sobre el respaldo (sin incluir la axila)
-Lleva un agarre ligeramente más estrecho que el biacromial
-Átate en caso de limitar el agarre', null),
('Flexiones de codos en máquina de placas (énfasis estiramiento)', 'Biceps curl machine', 'Bíceps', '-Extiende los codos por completo abajo en cada rep
-No separes los codos del respaldo en ningún momento
-Apoya el brazo entero sobre el respaldo (sin incluir la axila)
-Lleva un agarre ligeramente más estrecho que el biacromial
-Átate en caso de limitar el agarre', null),
('Flexiones de codos en máquina de palancas', 'Plate loaded biceps curl', 'Bíceps', '-Extiende los codos por completo abajo en cada rep
-No separes los codos del respaldo en ningún momento
-Apoya el brazo entero sobre el respaldo (sin incluir la axila)
-Lleva un agarre ligeramente más estrecho que el biacromial
-Átate en caso de limitar el agarre', null),
('Flexiones de codo unilaterales predicador en banco Scott con mancuerna', 'Unilateral dumbbell preacher curl', 'Bíceps', '-ROM completo
-No te balancees', 'https://www.youtube.com/shorts/_cKc24St7Wg'),
('Flexiones de codo unilaterales desde polea baja (perfil en campana)', null, 'Bíceps', null, 'https://www.youtube.com/shorts/nYllyy5Np5A'),
('Flexiones de codos en banco Scott en polea (énfasis estiramietno)', 'Cable preacher biceps curl (stretch emphasis)', 'Bíceps', '-ROM completo
-No te balancees', null),
('Flexiones de codos en banco Scott en polea (énfasis acortamiento)', 'Cable preacher biceps curl (stretching emphasis)', 'Bíceps', '-ROM completo
-No te balancees', null),
('Flexiones de codos predicador desde polea baja', 'Low cable preacher biceps curl', 'Bíceps', '-ROM completo
-No te balancees', null),
('Flexiones de codos con mancuernas tumbado en el banco scott del revés (de pie)', 'Lying dumbbell curl', 'Bíceps', '-Apoya los húmeros del todo
-No atrases los codos respecto al tronco (no hagas extensión de hombro)
-Extiende por completo los codos abajo en cada rep
-Utiliza straps en caso de que veas que el agarre te limita
-No llegues a colocar los antebrazos perpendiculares al suelo', 'https://www.youtube.com/shorts/DSsXg3ivWTc'),
('Flexiones de codos con mancuernas tumbada en el banco scott del revés (de pie)', 'Lying dumbbell curl', 'Bíceps', '-Apoya los húmeros del todo
-No atrases los codos respecto al tronco (no hagas extensión de hombro)
-Extiende por completo los codos abajo en cada rep
-Utiliza straps en caso de que veas que el agarre te limita
-No llegues a colocar los antebrazos perpendiculares al suelo', 'https://www.youtube.com/shorts/DSsXg3ivWTc'),
('Flexiones de codo predicador (en banco Scott) unilaterales desde polea baja (énfasis acortamiento)', 'Low cable preacher biceps curl', 'Bíceps', null, null),
('Flexiones de codo unilaterales predicador en banco inclinado con mancuerna', 'Inclined bench dumbbell preacher', 'Bíceps', '-ROM completo
-No te balancees', 'https://www.youtube.com/shorts/MFl2cGhfH08'),
('Curl de bíceps araña con mancuernas', 'Spider curl', 'Bíceps', '-ROM completo
-No te balancees', 'https://www.youtube.com/shorts/VQaj5YoFBcM'),
('Flexiones de codos de pie con mancuernas', 'Standing dumbbell biceps curl', 'Bíceps', '-ROM completo
-No te balancees', null),
('Flexiones de codos alternas de pie con mancuernas', 'Alternative dumbbell curl', 'Bíceps', '-ROM completo
-No te balancees', null),
('Flexiones de codo unilaterales de pie con mancuernas', 'Standing unilateral dumbbell curl', 'Bíceps', '-ROM completo
-No te balancees', null),
('Flexiones de codo unilaterales en máquina (hombro neutro)', 'Single arm biceps curl machine', 'Bíceps', '-Aplica fuerza con el codo contra el punto de restricción posterior al subir
-Extiende por completo los codos abajo en cada rep
-Utiliza straps en caso de que veas que el agarre te limita
-Regula la altura del asiento para hacer coincidir el codo con los ejes de la máquina', null),
('Flexiones de codos sentado con mancuernas', 'Seated biceps curl', 'Bíceps', '-Realízalo siempre que puedas sentado o tumbado en el banco scott del revés para apoyar los codos atrás
-No atrases los codos respecto al tronco (no hagas extensión de hombro)
-Extiende por completo los codos abajo en cada rep
-Utiliza straps en caso de que veas que el agarre te limita
-No llegues a colocar los antebrazos perpendiculares al suelo', null),
('Flexiones de codos sentada con mancuernas', 'Seated biceps curl', 'Bíceps', '-Realízalo siempre que puedas sentado o tumbado en el banco scott del revés para apoyar los codos atrás
-No atrases los codos respecto al tronco (no hagas extensión de hombro)
-Extiende por completo los codos abajo en cada rep
-Utiliza straps en caso de que veas que el agarre te limita
-No llegues a colocar los antebrazos perpendiculares al suelo', null),
('Flexiones de codos alternas en banco con mancuernas', 'Alternatiive seated curl', 'Bíceps', '-ROM completo
-No te balancees', null),
('Flexiones de codo unilaterales sentado con mancuerna', 'Unilateral dumbbell seated curl', 'Bíceps', '-ROM completo
-No te balancees', null),
('Flexiones de codos desde polea baja con agarre supino', 'Supine cable biceps curl', 'Bíceps', '-Extiende por completo los codos al final de cada repetición
-No te balancees', 'https://www.youtube.com/shorts/GbDABziJE2Y'),
('Flexiones de codo unilaterales desde polea baja con agarre supino', 'One arm supine cable biceps curl', 'Bíceps', '-ROM completo
-No te balancees', null),
('Curl bayesian de pie entre poleas', 'Bayesian curl', 'Bíceps', '-ROM completo
-No te balancees
- Mantén el hombro en extensión', 'https://www.youtube.com/shorts/lU-_i3ccQp0'),
('Curl bayesian sentado en banco entre poleas bajas', 'Seated bayesian curl', 'Bíceps', '-Extiende por completo los codos al comienzo de cada rep
-Lleva los húmeros (brazos) paralelos a los cables en todo momento
-Aléjate bastante de las poleas (1,5m aprox)
-No adelantes los codos al final del ROM (mantenlos atrás)
-Intenta que las poleas no estén muy separadas entre sí, que no vengan en diagonal
-Átate con straps en caso de que el agarre sea limitante', null),
('Curl bayesian sentada en banco entre poleas bajas', 'Seated bayesian curl', 'Bíceps', '-Extiende por completo los codos al comienzo de cada rep
-Lleva los húmeros (brazos) paralelos a los cables en todo momento
-Aléjate bastante de las poleas (1,5m aprox)
-No adelantes los codos al final del ROM (mantenlos atrás)
-Intenta que las poleas no estén muy separadas entre sí, que no vengan en diagonal
-Átate con straps en caso de que el agarre sea limitante', null),
('Curl bayesian unilateral desde polea baja', 'Single arm low cable bayesian curl', 'Bíceps', '-ROM completo
-No te balancees
- Mantén el hombro en extensión', 'https://www.youtube.com/shorts/lU-_i3ccQp0'),
('Curl bayesian unilateral desde polea media', 'Single arm middle cable bayesian curl', 'Bíceps', '-ROM completo
-No te balancees
- Mantén el hombro en extensión', 'https://www.youtube.com/shorts/lU-_i3ccQp0'),
('Flexiones de codos tumbado en banco inclinado 45º', '40º Inclined bench biceps curl', 'Bíceps', '-ROM completo
-No te balancees
- Mantén el hombro en extensión', null),
('Flexiones de codos tumbada en banco inclinado 45º', '40º Inclined bench biceps curl', 'Bíceps', '-ROM completo
-No te balancees
- Mantén el hombro en extensión', null),
('Flexiones de codos en banco Scott inverso con mancuernas', 'Dumbbell seated scoot bench curl', 'Bíceps', '-ROM completo
-No te balancees', null),
('Curl concentrado', 'Single arm concentration curl', 'Bíceps', '-ROM completo
-No te balancees', null),
('Curl bayesian entre poleas', 'Bayesian curl between cables', 'Bíceps', '-ROM completo
-No te balancees', null),
('Flexiones de codos de pie con barra Z agarre estrecho', 'Close grip Ez-bar curl', 'Bíceps', '-ROM completo
-No te balancees', null),
('Flexiones de codos de pie con barra Z agarre amplio', 'Wide grip z-bar biceps curl', 'Bíceps', '-ROM completo
-No te balancees', null),
('Kazz press plano en Multipower', 'Smith kazz press', 'Tríceps', '-No bajes los codos de la línea del tronco al final del ROM (abajo)
-No abras excesivamente los codos
-Utiliza un agarre ligeramente más estrecho que el biacromial
-Empuja hacia arriba, no hacia atrás
-Mantén los codos y húmeros lo más paralelos posible entre ellos', 'https://www.youtube.com/shorts/XtsVampMfjQ'),
('Kazz press plano en Multipower con banda de resistencia', 'Reverse band Smith kazz press', 'Tríceps', '-No bajes los codos de la línea del tronco al final del ROM (abajo)
-No abras excesivamente los codos
-Utiliza un agarre ligeramente más estrecho que el biacromial
-Empuja hacia arriba, no hacia atrás
-Mantén los codos y húmeros lo más paralelos posible entre ellos', null),
('Kazz press con mancuernas', 'Dumbbell kazz press', 'Tríceps', '- Piensa en extender el codo
- No realices excesivo arco lumbar
- No separes los codos', null),
('Kazz press en banco inclinado', 'Inclined bench kazz press', 'Tríceps', '- Piensa en extender el codo
- No realices excesivo arco lumbar
- No separes los codos', null),
('Press francés en banco plano con mancuernas', 'Dumbbell french press', 'Tríceps', '-Lleva los codos ligeramente separados (hacia fuera)
-Mantén los húmeros (brazos) lo más perpendiculares al suelo y paralelos entre sí en todo el ROM
-No relajes los tríceps al contactar los bíceps con los antebrazos, al comienzo
-No modifiques la posición de los codos al subir
-Agarra las mancuernas por el límite', 'https://www.youtube.com/shorts/DFFD1LU_iXw'),
('Press francés en banco inclinado 45º con mancuernas', '45º Dumbbell french press', 'Tríceps', '-Lleva los codos ligeramente separados (hacia fuera)
-Mantén los húmeros (brazos) lo más perpendiculares al suelo y paralelos entre sí en todo el ROM
-No relajes los tríceps al contactar los bíceps con los antebrazos, al comienzo
-No modifiques la posición de los codos al subir
-Agarra las mancuernas por el límite', 'https://www.youtube.com/shorts/C4jBxuNd9kc'),
('Press francés en banco plano con barra z', 'Z barbell french press', 'Tríceps', '- Piensa en extender el codo
- No realices excesivo arco lumbar
- No separes los codos', 'https://www.youtube.com/shorts/CAUWI4sNPKk'),
('Press francés en banco inclinado 45º con barra z', 'Z barbell french press', 'Tríceps', '- Piensa en extender el codo
- No realices excesivo arco lumbar
- No separes los codos', 'https://youtube.com/shorts/w7Ee8wkvydU?si=dcvvdWuHEv1vOkhA'),
('Press francés en el suelo', 'Floor french press', 'Tríceps', '- Piensa en extender el codo
- No realices excesivo arco lumbar
- No separes los codos', null),
('Press francés en banco Scott inverso con mancuernas', 'Seated dumbbell french press on  scoot bench', 'Tríceps', '- Piensa en extender el codo
- No realices excesivo arco lumbar
- No separes los codos', null),
('Press francés en banco 15º', '15º bench french press', 'Tríceps', '- Piensa en extender el codo
- No realices excesivo arco lumbar
- No separes los codos', null),
('Press francés over con barra Z', 'Z barbell overhead french press', 'Tríceps', '- Piensa en extender el codo
- No realices excesivo arco lumbar
- No separes los codos', null),
('Extensiones de codos trasnuca con mancuernas', 'Double overhead dumbbell triceps extensions', 'Tríceps', '-Realízalo sentad@ si es posible, por ejemplo: en el banco scott del revés
-Lleva los codos ligeramente separados (hacia fuera)
-Mantén los húmeros (brazos) lo más perpendiculares al suelo y paralelos entre sí en todo el ROM
-No relajes los tríceps al contactar los bíceps con los antebrazos, al comienzo
-No modifiques la posición de los codos al subir
-Agarra las mancuernas por el límite', null),
('Extensiones de codo trasnuca unilateral con mancuerna', 'Single arm dumbbell overhead triceps extension', 'Tríceps', '- No generes inercias
- Alinea el húmero con la dirección de la resistencia', null),
('Extensiones de codo unilaterales trasnuca desde polea baja', 'Sible arm cable overhead triceps extensions', 'Tríceps', '-No es necesario que coloques la polea abajo del todo
-Alinea el húmero (brazo) al cable
-Utiliza una muñequera y agárrala
-Agárrate con la mano libre si es posible
-Colócate de lado a la polea (a no ser que se indique lo contrario)', 'https://www.youtube.com/shorts/VfL4HE7C55U'),
('Press francés unilateral desde polea a media altura', 'Single arm mid cable horizontal extension', 'Tríceps', '-Busca generar un punto de restricción por detrás del codo (una cinta o una mano)
-Lleva el cable por el lateral de la cabeza
-No relajes los tríceps al llegar a tocar con el bíceps al antebrazo
-No modifiques la posición del hombro (no muevas el brazo)', null),
('Extensiones de codo unilaterales desde polea paralelo al suelo vertical', 'Single arm mid cable vertical extension', 'Tríceps', '- No generes inercias, trata de tener un punto de resitricción posterior
- Alinea el húmero con la dirección de la resistencia', null),
('Extensiones de codo desde polea alta', 'Cable triceps extensions', 'Tríceps', '- No generes inercias, trata de tener un punto de resitricción posterior
- Alinea el húmero con la dirección de la resistencia', 'https://www.youtube.com/shorts/xguGXQAvbKk'),
('Extensiones de codos en X', 'Cable cross triceps extensions', 'Tríceps', '-Realízalo sentad@ si es posible
-Lleva los codos ligeramente separados del tronco
-Extiende en diagonal por delante del cuerpo, no de lado
-No relajes los tríceps al contactar los bíceps con los antebrazos, al comienzo
-Lleva en línea los húmeros (brazos) y los cables
-Utiliza muñequeras y agárralas', 'https://www.youtube.com/shorts/uID8NFK1p5Y'),
('Extensiones de codo unilaterales desde polea alta', 'Single arm high cable triceps extensions', 'Tríceps', '-Utiliza muñequera y agárrala
-No te coloques de lado totalemente a la polea, sino en diagonal
-Baja el cable pegado al cuerpo, por el otro lado de la cabeza
-Lleva el húmero (brazo) en línea con el cable y extiende hacia fuera del cuerpo
-No relajes el tríceps al apoyar el bíceps sobre el antebrazo (al comienzo)', null),
('Extensiones de codos en máquina (hombro en flexión)', 'Triceps extensions machine', 'Tríceps', '-Ánclate bien a la máquina
-Aplica fuerza con los codos contra el respaldo
-Apoya el brazo entero, no separes mucho las axilas', null),
('Extensiones de codos en máquina de placas (hombros neutros)', 'Arm extension machine', 'Tríceps', '-Si te separa mucho los brazos del tronco, puedes hacerlo de forma unilateral
-Mantén los codos en el mismo sitio durante todo el ROM
-Flexiona los codos lo máximo posible al subir sin llegar a apoyar el peso (baja el asiento si es necesario)', null),
('Extensiones de codos en máquina de palancas (agarre estrecho) (fondos)', 'Triceps extensions machine', 'Tríceps', '-Intenta anclarte a la máquina para que no te levante
-No te inclines demasiado
-Termina con los hombros en línea con las manos y la perpendicular con el suelo
-No separes mucho los brazos del tronco', null),
('Press francés unilateral con mancuerna', 'Single arm dumbbell bench french press', 'Tríceps', '- No generes inercias
- Alinea el húmero con la dirección de la resistencia', null),
('Curl de bíceps desde polea baja agarre prono', 'Cable prone wrist curl', 'Antebrazo', '-No utilices straps
-Utiliza un agarre biacromial
-Extiende por completo los codos abajo
-No te ayudes de la extensión de las rodillas ni la espalda (no impulsos)', null),
('Curl de bíceps de pie con barra Z y agarre prono', 'Barbell prone wrist curl', 'Antebrazo', '-No utilices straps
-Utiliza un agarre biacromial
-Extiende por completo los codos abajo
-No te ayudes de la extensión de las rodillas ni la espalda (no impulsos)', null),
('Curl de bíceps con mancuerna agarre prono', 'Dumbbell prone wrist curl', 'Antebrazo', '-No generes inercias', null),
('Flexiones de muñecas de pie con barra', 'Standing barbell wrist curl', 'Antebrazo', '-Detrás del cuerpo
-No generes inercias', null),
('Extensión de muñecas con mancuernas', 'Dumbbell wrist extension', 'Antebrazo', '-No generes inercias', null),
('Extensión de muñecas con barra', 'Barbel wrist extension', 'Antebrazo', '-No generes inercias', null),
('Flexion de muñecas predicador en banco con mancuernas', 'Preacher bench wrist curl', 'Antebrazo', '-No generes inercias', null),
('Curl martillo de pie con mancuernas', 'Standing dumbbell hammer curl', 'Antebrazo', '-ROM completo
-No te balancees', null),
('Curl martillo de pie alterno con mancuernas', 'Alternative standing dumbbell hammer curl', 'Antebrazo', '-ROM completo
-No te balancees', null),
('Curl martillo de pie unilateral con mancuernas', 'Unilateral standing barbbell hammer curl', 'Antebrazo', '-ROM completo
-No te balancees', null),
('Curl martillo con mancuernas de pie tumbado contra el banco scott del revés', 'Scott lying dumbbell hammer curl', 'Antebrazo', '-Extiende por completo los codos abajo en cada rep
-No flexiones ni extiendas los hombros arriba (no separes los codos del tronco)
-Agarra las mancuernas por el límite
-Usa straps en caso de que limite el agarre', null),
('Curl martillo con mancuernas de pie tumbada contra el banco scott del revés', 'Scott lying dumbbell hammer curl', 'Antebrazo', '-Extiende por completo los codos abajo en cada rep
-No flexiones ni extiendas los hombros arriba (no separes los codos del tronco)
-Agarra las mancuernas por el límite
-Usa straps en caso de que limite el agarre', null),
('Curl martillo sentado con mancuernas', 'Seated barbbell hammer curl', 'Antebrazo', '-Busca un punto de restricción posterior para los codos haciéndolo por ejemplo en el banco scott del revés o en el jalón del revés
-Extiende por completo los codos abajo en cada rep
-No flexiones ni extiendas los hombros arriba (no separes los codos del tronco)
-Agarra las mancuernas por el límite
-Usa straps en caso de que limite el agarre', null),
('Curl martillo sentada con mancuernas', 'Seated barbbell hammer curl', 'Antebrazo', '-Busca un punto de restricción posterior para los codos haciéndolo por ejemplo en el banco scott del revés o en el jalón del revés
-Extiende por completo los codos abajo en cada rep
-No flexiones ni extiendas los hombros arriba (no separes los codos del tronco)
-Agarra las mancuernas por el límite
-Usa straps en caso de que limite el agarre', null),
('Curl martillo alterno sentado con mancuernas', 'Alternative seated barbbell hammer curl', 'Antebrazo', '-ROM completo
-No te balancees', null),
('Curl martillo unilateral sentado con mancuernas', 'Unilateral seated barbbell hammer curl', 'Antebrazo', '-ROM completo
-No te balancees', null),
('Flexiones de tronco en el suelo', 'Chrunches', 'Abdomen', '-Fíjate en no reaizaar una flexión de cadera', null),
('Flexiones de tronco de rodillas desde polea alta', 'High pulley crunches', 'Abdomen', '-Realiza una flexo-extensión de columna, no de cadera
-Piensa en "dejar el ombligo abajo" cuando subas
-Extiende lo máximo posible la columna para estirar el abdomen
-Utiliza un agarre que no te limite (átate mejor) y lleva los brazos pegados a la cabeza, llevando el peso detrás de la cabeza, no en la nuca
-Flexiona lo máximo posible el tronco al bajar, buscando llevar los codos a las rodillas
-Fija atrás la cadera buscando un punto de restricción', 'https://www.youtube.com/shorts/qvjrb9HDuf4'),
('Flexiones de tronco en máquina', 'Abdominal crunch machine', 'Abdomen', '-Realiza una flexo-extensión de columna, no de cadera
-Piensa en "dejar el ombligo abajo" cuando subas
-Extiende lo máximo posible la columna para estirar el abdomen
-Flexiona lo máximo posible el tronco al bajar, buscando llevar los codos a las rodillas
-Fija atrás la cadera buscando un punto de restricción', null),
('Flexiones de tronco tumbado en banco inclinado 45º de espaldas a la polea baja', 'Low cable crunch', 'Abdomen', '-Realiza una flexo-extensión de columna, no de cadera
-Extiende la columna lo máximo posible llevando el límite del banco en la mitad de la espalda (punto de restricción)
-Utiliza un agarre que no te limite (átate mejor) y lleva los brazos pegados a la cabeza, llevando el peso detrás de la cabeza, no en la nuca
-Flexiona lo máximo posible el tronco al flexionar la columna, buscando llevar los codos hacia la cadera
-Aleja el banco ligeramente de la polea (1 m aprox)', null),
('Flexiones de tronco tumbada en banco inclinado 45º de espaldas a la polea baja', 'Low cable crunch', 'Abdomen', '-Realiza una flexo-extensión de columna, no de cadera
-Extiende la columna lo máximo posible llevando el límite del banco en la mitad de la espalda (punto de restricción)
-Utiliza un agarre que no te limite (átate mejor) y lleva los brazos pegados a la cabeza, llevando el peso detrás de la cabeza, no en la nuca
-Flexiona lo máximo posible el tronco al flexionar la columna, buscando llevar los codos hacia la cadera
-Aleja el banco ligeramente de la polea (1 m aprox)', null),
('Flexiones de tronco inversas en banco plano', 'Reverse crunch', 'Abdomen', '-Extiende lo máximo posible la columna al comienzo del todo (abajo)
-Realízalo en un banco como donde se hace remo Gironda para que no se levante
-Baja hasta rozar el suelo con los talones (sin tocarlo)
-Flexiona ligeramente las rodillas y bloquéalas (no cambies su flexión en ningún momento)
-Lleva una mancuerna entre los pies en caso de ser necesaria más carga externa para ajustarte a la intensidad
-Al final (arriba) eleva la cadera
-Haz coincidir el comienzo del ROM con el punto de máximas demandas', null),
('Elevaciones de pierna colgado en barra', 'Hanging leg raises', 'Abdomen', '-Fíjate en no reaizaar una flexión de cadera', null),
('Elevaciones de pierna colgada en barra', 'Hanging leg raises', 'Abdomen', '-Fíjate en no reaizaar una flexión de cadera', null),
('Elevaciones de rodillas colgado en barra', 'Hanging knee raises', 'Abdomen', '-Fíjate en no reaizaar una flexión de cadera', null),
('Elevaciones de rodillas colgada en barra', 'Hanging knee raises', 'Abdomen', '-Fíjate en no reaizaar una flexión de cadera', null),
('Flexiones de tronco arrodillado con rueda', 'Roller wheel', 'Abdomen', '-Fíjate en no reaizaar una flexión de cadera', null),
('Flexiones de tronco arrodillada con rueda', 'Roller wheel', 'Abdomen', '-Fíjate en no reaizaar una flexión de cadera', null),
('Plancha facial', 'Isometric plank', 'Abdomen', '-Fíjate en no reaizaar una flexión de cadera', null),
('Aducciones de cadera sentado en máquina', 'Hip adductions machine', 'Aductores', '-Mantén la espalda baja y la cadera apoyadas en todo el ROM (90º de flexión de cadera)
-Ánclate a la máquina lo máximo posible a través de los agarres y el respaldo
-No apliques fuerzas intencionales con los pies, si puedes apoya los talones, no las plantas de los pies', 'https://www.youtube.com/watch?v=wyPbVJS7oYw&amp;pp=ygUoQWR1Y2Npb25lcyBkZSBjYWRlcmEgc2VudGFkbyBlbiBtw6FxdWluYQ%3D%3D'),
('Aducciones de cadera sentada en máquina', 'Hip adductions machine', 'Aductores', '-Mantén la espalda baja y la cadera apoyadas en todo el ROM (90º de flexión de cadera)
-Ánclate a la máquina lo máximo posible a través de los agarres y el respaldo
-No apliques fuerzas intencionales con los pies, si puedes apoya los talones, no las plantas de los pies', 'https://www.youtube.com/watch?v=wyPbVJS7oYw&amp;pp=ygUoQWR1Y2Npb25lcyBkZSBjYWRlcmEgc2VudGFkbyBlbiBtw6FxdWluYQ%3D%3D'),
('Aducciones de cadera unilaterales desde polea baja', 'Cable single leg adduction', 'Aductores', '-Controla la excéntrica
-No generes inercias', null),
('Aducciones Copenhague', 'Copenhague adductions', 'Aductores', '-Controla la excéntrica
-No generes inercias', null),
('Aducciones de cadera sentado entre poleas', 'Seated hip adductions cable', 'Aductores', '-Mantén la espalda baja y la cadera apoyadas en todo el ROM (90º de flexión de cadera)
-Apoya los talones en el suelo para no tener demandas sobre el psoas
-Ata los cables lo más cerca posible de las rodillas con las muñequeras
-No te adelantes excesivamente de las poleas
-No apliques fuerzas intencionales con los pies, si puedes apoya los talones, no las plantas de los pies', null),
('Aducciones de cadera unilaterales sentado en máquina de placas', 'Single leg hip adduction machine', 'Aductores', null, null),
('Aducciones de cadera unilaterales en máquina de placas (Multicadera)', 'Single leg hip adduction machine', 'Aductores', null, null),
('Extensiones de rodillas en máquina de placas', 'Leg extension', 'Cuádriceps', '-No separes la espalda baja y la cadera del asiento y el respaldo
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos neutros ("punteras hacia arriba")
-Ánclate si es posible a los agarres y al respaldo', 'https://www.youtube.com/shorts/zPdFwh0pXGY'),
('Extensiones de rodillas en máquina de palancas', 'Plate load leg extension', 'Cuádriceps', '- No separes la espalda baja y la cadera del asiento
- Alinea el eje de la máquina con la articulación de la rodilla', null),
('Sentadilla sissy con peso corporal', 'Sissy squat', 'Cuádriceps', '- Trata de llevar la cadera lo más extendida posible', 'https://www.youtube.com/shorts/4fObIU3n_zo'),
('Sentadilla sissy en máquina', 'Machine sissy squat', 'Cuádriceps', '- Trata de llevar la cadera lo más extendida posible', null),
('Sentadilla en Hack 45º', '45 º Hack squat', 'Cuádriceps', '-Coloca el pie lo más abajo posible en la plataforma sin que se llegue a levantar el talón
-Empuja con la rodilla en la dirección de la puntera del pie (que no se meta hacia dentro)
-Coloca los hombros en el punto de intersección del respaldo con el apoyo vertical y apoya la cabeza
-No separes la espalda baja cuando llegues al final del ROM (abajo)
-Extiende con control la rodilla arriba
-Estandariza el n.º de respiraciones en cada repetición (2: espiración al llegar arriba, inspiración-espiración-inspiración al bajar y sube en apnea)
-Máxima profundidad a no ser que se indique lo contrario', null),
('Sentadilla en Hack 30º', '30 º Hack squat', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', null),
('Sentadilla Hack en Multipower', 'Multipower hack squat', 'Cuádriceps', '-Lleva la espalda perpendicular al suelo en todo el ROM
-Lleva la cadera debajo de la barra en todo el ROM
-Coloca los pies lo más atrás posible para aumentar la fuerzas reactivas de fricción sobre estos (coloca si es necesario un pequeño tacón)
-Estandariza el n.º de respiraciones en cada repetición (2: espiración al llegar arriba, inspiración-espiración-inspiración al bajar y sube en apnea)
-Máxima profundidad a no ser que se indique lo contrario', 'https://youtube.com/shorts/1y3D2I1cquU?si=VBH8DDxMPbCSd3mI'),
('Sentadilla en Power Squat', 'Power squat', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', null),
('Sentadilla en V-Squat', 'V-Squat', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', 'https://www.youtube.com/watch?v=5s5NDDv9mw8&amp;pp=ygUVU2VudGFkaWxsYSBlbiBWLVNxdWF0'),
('Sentadilla frontal en V-Squat', 'Front V-Squat', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- Mantén la espalda recta sin general anteversión pélcida
- No separes los talones del suelo', null),
('Sentadilla en Multipower', 'Smith Squat', 'Cuádriceps', '- Genera la fuerza desde los talones
- No realices una retroversión cuando estés abajo', 'https://www.youtube.com/shorts/xU4cuTffVZc'),
('Sentadilla con barra libre', 'High barbell squat', 'Cuádriceps', '- Genera la fuerza desde los talones
- No realices una retroversión cuando estés abajo', null),
('Sentadilla con barra de seguridad', 'Safety bar squat', 'Cuádriceps', '- Genera la fuerza desde los talones
- No realices una retroversión cuando estés abajo', null),
('Sentadilla frontal con barra libre', 'Front barbell squat', 'Cuádriceps', '- Genera la fuerza desde los talones
- No realices una retroversión cuando estés abajo', null),
('Sentadilla sumo en Multipower', 'Sumo smith squat', 'Cuádriceps', '- Genera la fuerza desde los talones
- No realices una retroversión cuando estés abajo', null),
('Sentadilla sumo con mancuerna', 'Sumo dumbbell squat', 'Cuádriceps', '- Genera la fuerza desde los talones
- No realices una retroversión cuando estés abajo', 'https://www.youtube.com/shorts/iQVIUv1s4K4'),
('Sentadilla sumo con barra libre', 'Sumo barbell squat', 'Cuádriceps', '- Genera la fuerza desde los talones
- No realices una retroversión cuando estés abajo', null),
('Press en prensa 45º', '45º leg press', 'Cuádriceps', '-Coloca el pie lo más abajo posible en la plataforma sin que se llegue a levantar el talón
-Empuja con la rodilla en la dirección de la puntera del pie (que no se meta hacia dentro)
-Coloca el respaldo lo más perpendicular posible a la plataforma de los pies que tu movilidad de tobillo te permita
-No separes la espalda baja cuando llegues al final del ROM (abajo)
-Extiende con control la rodilla al final
-Estandariza el n.º de respiraciones en cada repetición (2: espiración al llegar al final, inspiración-espiración-inspiración al bajar y empuja en apnea)
-Máxima profundidad a no ser que se indique lo contrario', 'https://www.youtube.com/shorts/NYa0tZCW4fk'),
('Press unilateral en prensa 45º', '45º single leg press', 'Cuádriceps', '-Coloca el pie lo más abajo posible en la plataforma sin que se llegue a levantar el talón
-Empuja con la rodilla en la dirección de la puntera del pie (que no se meta hacia dentro)
-Coloca el respaldo lo más perpendicular posible a la plataforma de los pies que tu movilidad de tobillo te permita
-No separes la espalda baja cuando llegues al final del ROM (abajo)
-Extiende con control la rodilla al final
-Estandariza el n.º de respiraciones en cada repetición (2: espiración al llegar al final, inspiración-espiración-inspiración al bajar y empuja en apnea)
-Máxima profundidad a no ser que se indique lo contrario', 'https://www.youtube.com/shorts/DGU9HGwz0yc'),
('Press en prensa pendular horizontal', 'Horizontal pendulum leg press', 'Cuádriceps', '-Coloca el pie lo más abajo posible en la plataforma sin que se llegue a levantar el talón
-Empuja con la rodilla en la dirección de la puntera del pie (que no se meta hacia dentro)
-Coloca el respaldo lo más cerca posible a la plataforma de los pies que tu movilidad de tobillo te permita
-No separes la espalda baja cuando llegues al final del ROM (abajo)
-Extiende con control la rodilla al final
-Estandariza el n.º de respiraciones en cada repetición (2: espiración al llegar al final, inspiración-espiración-inspiración al bajar y empuja en apnea)
-Máxima profundidad a no ser que se indique lo contrario', 'https://www.youtube.com/shorts/A65ZTIKHpQw'),
('Press unilateral en prensa pendular horizontal', 'Single horizontal pendulum leg press', 'Cuádriceps', '-Coloca el pie lo más abajo posible en la plataforma sin que se llegue a levantar el talón
-Empuja con la rodilla en la dirección de la puntera del pie (que no se meta hacia dentro)
-Coloca el respaldo lo más cerca posible a la plataforma de los pies que tu movilidad de tobillo te permita
-No separes la espalda baja cuando llegues al final del ROM (abajo)
-Extiende con control la rodilla al final
-Estandariza el n.º de respiraciones en cada repetición (2: espiración al llegar al final, inspiración-espiración-inspiración al bajar y empuja en apnea)
-Máxima profundidad a no ser que se indique lo contrario
-Oriéntate hacia el lado ejecutante', 'https://www.youtube.com/shorts/FzmwX3w05Z4'),
('Press en prensa pendular', 'Pendulum leg press', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', 'https://www.youtube.com/shorts/v-KbJOHk0W4'),
('Press unilateral en prensa pendular', 'Single pendulum leg press', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', 'https://www.youtube.com/shorts/UyqxgP8jJIo'),
('Press en prensa horizontal de placas de cadena cinética abierta', 'Horizontal open kinetic chain plate leg press', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', null),
('Press unilateral en prensa horizontal de placas', 'Horizontal plate single leg press', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', null),
('Press en prensa 30º', '30º leg press', 'Cuádriceps', '-Coloca el pie lo más abajo posible en la plataforma sin que se llegue a levantar el talón
-Empuja con la rodilla en la dirección de la puntera del pie (que no se meta hacia dentro)
-Coloca el respaldo lo más perpendicular posible a la plataforma de los pies que tu movilidad de tobillo te permita
-No separes la espalda baja cuando llegues al final del ROM (abajo)
-Extiende con control la rodilla al final
-Estandariza el n.º de respiraciones en cada repetición (2: espiración al llegar al final, inspiración-espiración-inspiración al bajar y empuja en apnea)
-Máxima profundidad a no ser que se indique lo contrario', null),
('Press unilateral en prensa 30º', '30º single leg press', 'Cuádriceps', '-Coloca el pie lo más abajo posible en la plataforma sin que se llegue a levantar el talón
-Empuja con la rodilla en la dirección de la puntera del pie (que no se meta hacia dentro)
-Coloca el respaldo lo más perpendicular posible a la plataforma de los pies que tu movilidad de tobillo te permita
-No separes la espalda baja cuando llegues al final del ROM (abajo)
-Extiende con control la rodilla al final
-Estandariza el n.º de respiraciones en cada repetición (2: espiración al llegar al final, inspiración-espiración-inspiración al bajar y empuja en apnea)
-Máxima profundidad a no ser que se indique lo contrario', null),
('Sentadilla en Hack pendular', 'Pendulum hack squat', 'Cuádriceps', '-Coloca el pie lo más abajo posible en la plataforma sin que se llegue a levantar el talón
-Empuja con la rodilla en la dirección de la puntera del pie (que no se meta hacia dentro)
-Coloca los hombros en el punto de intersección del respaldo con el apoyo vertical y apoya la cabeza
-No separes la espalda baja cuando llegues al final del ROM (abajo)
-Extiende con control la rodilla arriba
-Estandariza el n.º de respiraciones en cada repetición (2: espiración al llegar arriba, inspiración-espiración-inspiración al bajar y sube en apnea)
-Máxima profundidad a no ser que se indique lo contrario', 'https://www.youtube.com/shorts/qzu_K5OBPoI'),
('Extensiones de rodilla unilaterales en máquina de placas', 'Plate single leg extension', 'Cuádriceps', '-No separes la espalda baja y la cadera del asiento y el respaldo
-Alinea el eje de la máquina con tu eje anatómico (rodilla)
-Lleva los tobillos neutros ("punteras hacia arriba")
-Ánclate si es posible a los agarres y al respaldo', null),
('Extensiones de rodilla unilaterales en máquina de palancas', 'Plate load single leg extension', 'Cuádriceps', '-No separes la espalda baja y la cadera del asiento y el respaldo
-Alinea el eje de la máquina con tu eje anatómico (rodilla)
-Lleva los tobillos neutros ("punteras hacia arriba")
-Ánclate si es posible a los agarres y al respaldo', 'https://www.youtube.com/shorts/zDHbrgWf1bg'),
('Zancadas estáticas unilaterales', 'Single leg static lunges', 'Cuádriceps', '- No lleves la cadera hacia atrás, sino la rodilla adelante
- Genera la fuerza desde el talón
- La pierna de apoyo sólo es de apoyo', null),
('Zancadas estáticas en Multipower', 'Smith static lunges', 'Cuádriceps', '- No lleves la cadera hacia atrás, sino la rodilla adelante
- Genera la fuerza desde el talón
- La pierna de apoyo sólo es de apoyo', 'https://www.youtube.com/shorts/gQYiWgXC6rA'),
('Zancadas dinámicas', 'Dinamic lunges', 'Cuádriceps', '- No lleves la cadera hacia atrás, sino la rodilla adelante
- Genera la fuerza desde el talón
- La pierna de apoyo sólo es de apoyo', 'https://www.youtube.com/shorts/ZiVTLNYWp20'),
('Sentadillas búlgaras con mancuernas', 'Dumbbell bulgarian split squat', 'Cuádriceps', '- No lleves la cadera hacia atrás, sino la rodilla adelante
- Genera la fuerza desde el talón
- La pierna de apoyo sólo es de apoyo', 'https://www.youtube.com/shorts/OPtXZbqgYUc'),
('Sentadillas búlgaras en Multipower', 'Smith bulgarian split squat', 'Cuádriceps', '-Coloca el pie ejecutante lo más atrás posible sin que se llegue a levantar el talón (puedes usar un pequeño tacón)
-Lleva la rodilla de la pierna atrasada, por detrás de la cadera
-Lleva la espalda y la cadera debajo de la barra, perpendiculares al suelo
-Realiza todo el ROM con el tronco erguido
-Lleva el apoyo de atrás a la altura de las rodillas
-Coloca un step debajo del pie ejecutante en caso de que puedas aprovechar la profundidad por la movilidad de cadera', 'https://www.youtube.com/shorts/NkljjWiE_x0'),
('Press en prensa pendular de cadena cinética cerrada', 'Pendulum close kinetic chain leg press', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', null),
('Press en prensa 45º de cadena cinética cerrada', '45º close kinetic chain leg press', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', null),
('Press en prensa de placas de cadena cinética cerrada', 'Close kinetic chain plate leg press', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', null),
('Press en prensa 45º con banda de resistencia', '45º reverse band leg press', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', null),
('Press unilateral en prensa 45º con banda de resistencia', '45º reverse band single leg press', 'Cuádriceps', '-Coloca el pie lo más abajo posible en la plataforma sin que se llegue a levantar el talón
-Empuja con la rodilla en la dirección de la puntera del pie (que no se meta hacia dentro)
-Coloca el respaldo lo más perpendicular posible a la plataforma de los pies que tu movilidad de tobillo te permita
-No separes la espalda baja cuando llegues al final del ROM (abajo)
-Extiende con control la rodilla al final
-Estandariza el n.º de respiraciones en cada repetición (2: espiración al llegar al final, inspiración-espiración-inspiración al bajar y empuja en apnea)
-Máxima profundidad a no ser que se indique lo contrario', null),
('Press en prensa 30º con banda de resistencia', '30º reverse band leg press', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo
-Coloca el respaldo lo más perpendicular posible a la plataforma de los pies que tu movilidad de tobillo te permita
-No separes la espalda baja cuando llegues al final del ROM (abajo)
-Extiende con control la rodilla arriba', null),
('Press unilateral en prensa 30º con banda de resistencia', '30º reverse band single leg press', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', null),
('Sentadilla en Hack 45º con banda de resistencia', '45º reverse band hack squat', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo
-Coloca el respaldo lo más perpendicular posible a la plataforma de los pies que tu movilidad de tobillo te permita
-No separes la espalda baja cuando llegues al final del ROM (abajo)
-Extiende con control la rodilla arriba', null),
('Sentadilla Hack en Multipower con banda de resistencia', 'Smith reverse band hack squat', 'Cuádriceps', '- Genera la fuerza desde los talones
- No realices una retroversión cuando estés abajo', null),
('Curl nórdico inverso', 'Reverse nordic curl', 'Cuádriceps', '-Mantén la cadera completamente extendida
-Máximo ROM al bajar (estiramiento), puedes colocar un step debajo de las rodillas para ganar ROM
-No descanses arriba', null),
('Curl nórdico inverso con banda de resistencia', 'Reverse nordic curl band assisted', 'Cuádriceps', '-Mantén la cadera completamente extendida
-Mantén extendidos los codos en todo el ROM
-Máximo ROM al bajar (estiramiento), coloca un step debajo de las rodillas
-Colócate siempre a la misma altura de la goma y usa la misma goma
-Ata siempre la goma a la misma altura (la de los hombros)
-No descanses arriba', null),
('Curl nórdico inverso en máquina', 'Reverse nordic curl machine', 'Cuádriceps', '-Mantén la cadera completamente extendida
-Apoya el PAD del curl femoral tumbado contra el pecho
-Máximo ROM al bajar (estiramiento)
-No descanses arriba', null),
('Sentadilla en Tru Squat', 'Tru squat', 'Cuádriceps', '- No lleves la cadera hacia atrás, sino las rodillas adelante
- No hiperextiendas el cuello
- Genera la fuerza en los talones', null),
('Sentadilla búlgara en máquina de palancas', 'Plate loaded squat lunge', 'Cuádriceps', '- No lleves la cadera hacia atrás, sino las rodillas adelante
- No hiperextiendas el cuello
- Genera la fuerza con el talón', null),
('Press en prensa vertical', 'Vertical leg press', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', null),
('Press unilateral en prensa vertical', 'Vertical single leg press', 'Cuádriceps', '- Trata de progresar en dorsiflexión
- No separes la espalda baja ni la cadera del respaldo
- No separes los talones del suelo', null),
('Sentadilla en máquina de cinturón', 'Belt squat', 'Cuádriceps', '- No lleves la cadera hacia atrás, sino las rodillas adelante
- No hiperextiendas el cuello
- Genera la fuerza en los talones', 'https://www.youtube.com/shorts/tA41lqxMIkE'),
('Sentadillas en swing squat', 'Swing squat', 'Cuádriceps', null, null),
('Curl nórdico', 'Nordic curl', 'Isquiosurales', '- Mantén la cadera extendida
- Utiliza un punto de apoyo para no caerte
- Utiliza un punto de restricción en los tobillos', null),
('Curl nórdico en máquina', 'Nordic curl machine', 'Isquiosurales', '- Mantén la cadera extendida', null),
('Flexiones de rodillas tumbado en máquina de placas', 'Machine lying leg curl', 'Isquiosurales', '-No hagas excesiva anteversión pélvica
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos con flexión dorsal ("punteras hacia las tibias")
-Aplica fuerza con la rodillas contra el punto de restricción frontal
-Extiende por completo la rodilla abajo', 'https://youtube.com/shorts/OYoW4IzWdrw?si=ZBQTlVnEynsyp-Ny'),
('Flexiones de rodillas tumbada en máquina de placas', 'Machine lying leg curl', 'Isquiosurales', '- Realiza un retroversión pélvida
- Alinea el eje de la máquina con la rodilla', 'https://youtube.com/shorts/OYoW4IzWdrw?si=ZBQTlVnEynsyp-Ny'),
('Flexiones de rodillas tumbado en máquina de palancas', 'Plate loaded lying leg curl', 'Isquiosurales', '- Realiza un retroversión pélvida
- Alinea el eje de la máquina con la rodilla', null),
('Flexiones de rodillas tumbada en máquina de palancas', 'Plate loaded lying leg curl', 'Isquiosurales', '- Realiza un retroversión pélvida
- Alinea el eje de la máquina con la rodilla', null),
('Flexiones de rodilla unilaterales tumbado en máquina de placas', 'Machine lying single leg curl', 'Isquiosurales', '-No hagas excesiva anteversión pélvica
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos con flexión dorsal ("punteras hacia las tibias")
-Aplica fuerza con la rodillas contra el punto de restricción frontal
-Extiende por completo la rodilla abajo', 'https://www.youtube.com/shorts/gf6Xo98X9Og'),
('Flexiones de rodilla unilaterales tumbada en máquina de placas', 'Machine lying single leg curl', 'Isquiosurales', '-No hagas excesiva anteversión pélvica
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos con flexión dorsal ("punteras hacia las tibias")
-Aplica fuerza con la rodillas contra el punto de restricción frontal
-Extiende por completo la rodilla abajo', 'https://www.youtube.com/shorts/gf6Xo98X9Og'),
('Flexiones de rodilla unilaterales tumbado en máquina de palancas', 'Plate loaded lying single leg curl', 'Isquiosurales', '-No hagas excesiva anteversión pélvica
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos con flexión dorsal ("punteras hacia las tibias")
-Aplica fuerza con la rodillas contra el punto de restricción frontal
-Extiende por completo la rodilla abajo', null),
('Flexiones de rodilla unilaterales tumbada en máquina de palancas', 'Plate loaded lying single leg curl', 'Isquiosurales', '-No hagas excesiva anteversión pélvica
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos con flexión dorsal ("punteras hacia las tibias")
-Aplica fuerza con la rodillas contra el punto de restricción frontal
-Extiende por completo la rodilla abajo', null),
('Flexiones de rodillas sentado en máquina de palancas', 'Plate loaded seated leg curl', 'Isquiosurales', '-No separes la espalda baja y la cadera del asiento y el respaldo
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos con flexión dorsal ("punteras hacia las tibias")
-Ánclate si es posible a los agarres y al respaldo
-En caso de que tu máquina tenga el punto de restricción anterior, por encima de las rodillas, acércalo a estas lo máximo posible', null),
('Flexiones de rodillas sentada en máquina de palancas', 'Plate loaded seated leg curl', 'Isquiosurales', '-No separes la espalda baja y la cadera del asiento y el respaldo
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos con flexión dorsal ("punteras hacia las tibias")
-Ánclate si es posible a los agarres y al respaldo
-En caso de que tu máquina tenga el punto de restricción anterior, por encima de las rodillas, acércalo a estas lo máximo posible', null),
('Flexiones de rodillas sentado en máquina de placas', 'Seated leg curl', 'Isquiosurales', '-No separes la espalda baja y la cadera del asiento y el respaldo
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos con flexión dorsal ("punteras hacia las tibias")
-Ánclate si es posible a los agarres y al respaldo
-En caso de que tu máquina tenga el punto de restricción anterior, por encima de las rodillas, acércalo a estas lo máximo posible', 'https://www.youtube.com/shorts/ySKCPpXy1XQ'),
('Flexiones de rodillas sentada en máquina de placas', 'Seated leg curl', 'Isquiosurales', '-No separes la espalda baja y la cadera del asiento y el respaldo
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos con flexión dorsal ("punteras hacia las tibias")
-Ánclate si es posible a los agarres y al respaldo
-En caso de que tu máquina tenga el punto de restricción anterior, por encima de las rodillas, acércalo a estas lo máximo posible', 'https://www.youtube.com/shorts/ySKCPpXy1XQ'),
('Flexiones de rodilla unilaterales de pie', 'Standing leg curl', 'Isquiosurales', '-No hagas excesiva anteversión pélvica
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos con flexión dorsal ("punteras hacia las tibias")
-Aplica fuerza con la rodillas contra el punto de restricción frontal
-Extiende por completo la rodilla abajo', 'https://www.youtube.com/watch?v=r6Pu-3qyC4Y&amp;pp=ygUZRkVNT1JBTCBVTklMQVRFUkFMIERFIFBJRQ%3D%3D'),
('Flexiones de rodilla unilaterales de pie en máquina de placas', 'Standing leg curl', 'Isquiosurales', '-No hagas excesiva anteversión pélvica
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos con flexión dorsal ("punteras hacia las tibias")
-Aplica fuerza con la rodillas contra el punto de restricción frontal
-Extiende por completo la rodilla abajo', null),
('Flexiones de rodilla unilaterales de pie en máquina de palancas', 'Standing plate load leg curl machine', 'Isquiosurales', '-No hagas excesiva anteversión pélvica
-Alinea el eje de la máquina con tus ejes anatómicos (rodillas)
-Lleva los tobillos con flexión dorsal ("punteras hacia las tibias")
-Aplica fuerza con la rodillas contra el punto de restricción frontal
-Extiende por completo la rodilla abajo', 'https://www.youtube.com/watch?v=r6Pu-3qyC4Y&amp;pp=ygUZRkVNT1JBTCBVTklMQVRFUkFMIERFIFBJRQ%3D%3D'),
('Peso muerto piernas rígidas con barra libre', 'Stiff legged deadlift', 'Isquiosurales', '-Atrasa la cadera lo máximo posible a medida que bajas manteniéndola arriba del todo
-Utiliza la mínima flexión de rodillas posible
-Corta la bajada en el momento que no seas capaz de seguir atrasando la cadera sin flexionar las rodillas
-Lleva el cuello en línea con la espalda
-Mantén la espalda neutra
-Lleva la barra pegada a ti y no la apoyes en el suelo', 'https://www.youtube.com/shorts/EDaWUZnFKz8'),
('Peso muerto piernas rígidas con mancuernas', 'Dumbbell stiff legged deadlift', 'Isquiosurales', '- Lleva la cadera lo más atrás posible. con la espalda recta
- No lleves las rodillas hacia adelante
- No hiperextiendas el cuello', null),
('Peso muerto piernas rígidas en máquina de palancas', 'Stiff legged deadlift plate load machine', 'Isquiosurales', '-Atrasa la cadera lo máximo posible a medida que bajas manteniéndola arriba del todo
-Utiliza la mínima flexión de rodillas posible
-Corta la bajada en el momento que no seas capaz de seguir atrasando la cadera sin flexionar las rodillas
-Lleva el cuello en línea con la espalda
-Mantén la espalda neutra', 'https://www.youtube.com/shorts/rcglh17mBIs'),
('Flexiones de rodillas unilaterales de pie desde polea baja', 'Single leg cable hamstring curl', 'Isquiosurales', '- Utiliza un step para la pierna de apoyo
- Mantén retroversión pélvica', 'https://www.youtube.com/shorts/bkwW1flKchc'),
('Flexiones de rodilla unilaterales desde polea baja tumbado en banco declinado', 'Single leg cable lying hamstring curl', 'Isquiosurales', '-No hagas excesiva anteversión pélvica
-Lleva los tobillos con flexión dorsal (""punteras hacia las tibias"")
-Coloca la resistencia en el tobillo a través de una muñequera
-Coloca el respaldo del banco ligeramente inclinado y túmbate del revés (rodillas por encima de los hombros)
-Colócate a la distancia de la polea que te haga tener las máximas demandas en el 2/4 del ROM
-Aplica fuerza con la rodilla contra el repaldo del banco
-Extiende por completo la rodilla abajo', null),
('Flexiones de rodilla unilaterales desde polea baja tumbada en banco declinado', 'Single leg cable lying hamstring curl', 'Isquiosurales', '-No hagas excesiva anteversión pélvica
-Lleva los tobillos con flexión dorsal (""punteras hacia las tibias"")
-Coloca la resistencia en el tobillo a través de una muñequera
-Coloca el respaldo del banco ligeramente inclinado y túmbate del revés (rodillas por encima de los hombros)
-Colócate a la distancia de la polea que te haga tener las máximas demandas en el 2/4 del ROM
-Aplica fuerza con la rodilla contra el repaldo del banco
-Extiende por completo la rodilla abajo', null),
('Flexiones de rodillas tumbad@ desde polea', 'Lying cable leg curl', 'Isquiosurales', '- Mantén retroversión pélvica', null),
('Peso muerto sumo con barra', 'Barbell sumo deadlift', 'Isquiosurales', '- Lleva la cadera lo más atrás posible. con la espalda recta
- No lleves las rodillas hacia adelante
- No hiperextiendas el cuello', 'https://www.youtube.com/shorts/OxuEUlxAXSk'),
('Peso muerto convencional con barra', 'Barbell conventional deadlift', 'Isquiosurales', '- Lleva la espalda recta
- No hiperextiendas el cuello', 'https://youtube.com/shorts/rzpikhhtwwA?si=uofcQhykQ49H_-AX'),
('Peso muerto rumano con barra hexagonal', 'Hexagonal barbell romanian deadlift', 'Isquiosurales', '- Lleva la cadera lo más atrás posible. con la espalda recta
- No lleves las rodillas hacia adelante
- No hiperextiendas el cuello', null),
('Peso muerto piernas rígidas con barra hexagonal', 'Hexagonal barbell stiff legged deadlift', 'Isquiosurales', '- Lleva la cadera lo más atrás posible. con la espalda recta
- No lleves las rodillas hacia adelante
- No hiperextiendas el cuello', null),
('Flexiones de rodilla unilaterales sentado en máquina', 'Seated single leg curl', 'Isquiosurales', '- Realiza un retroversión pélvida
- Alinea el eje de la máquina con la rodilla', null),
('Flexiones de rodilla unilaterales sentada en máquina', 'Seated single leg curl', 'Isquiosurales', '- Realiza un retroversión pélvida
- Alinea el eje de la máquina con la rodilla', null),
('Sentadilla buenos días con barra libre', 'Barbell good morning squat', 'Isquiosurales', '- Lleva la cadera lo más atrás posible
- Mantén la espalda recta, sin extender el cuello
- No flexiones las rodillas', null),
('Sentadilla buenos días con barra de seguridad', 'Safety bar good morning squat', 'Isquiosurales', '- Lleva la cadera lo más atrás posible
- Mantén la espalda recta, sin extender el cuello
- No flexiones las rodillas', null),
('Sentadilla buenos días en Hack inversa', 'Reverse hack good morning squat', 'Isquiosurales', '-Atrasa la cadera lo máximo posible a medida que bajas manteniéndola arriba del todo
-Utiliza la mínima flexión de rodillas posible
-Coloca los pies lo más abajo posible de la plataforma, la inclinación de esta es indiferente
-Corta la bajada en el momento que no seas capaz de seguir atrasando la cadera sin flexionar las rodillas
-Lleva el cuello en línea con la espalda
-Mantén la espalda neutra
-Lleva los brazos por debajo de la cabeza', 'https://www.youtube.com/shorts/w5oHEaF6OF8'),
('Sentadilla buenos días en Multipower', 'Smith good morning squat', 'Isquiosurales', '- Lleva la cadera lo más atrás posible
- Mantén la espalda recta, sin extender el cuello
- No flexiones las rodillas', null),
('Peso muerto rumano unilateral con mancuerna', 'Dumbbell single leg romanian deadlift', 'Isquiosurales', '- Lleva la cadera lo más atrás posible. con la espalda recta
- No lleves las rodillas hacia adelante
- No hiperextiendas el cuello', 'https://www.youtube.com/watch?v=wHMRxe9qZ84&amp;pp=ygUrUGVzbyBtdWVydG8gcnVtYW5vIHVuaWxhdGVyYWwgY29uIG1hbmN1ZXJuYQ%3D%3D'),
('Extensiones de cadera (para isquios) en banco romano', 'Roman bench hip extension', 'Isquiosurales', '-Mantén las rodillas ligeramente flexionadas
-Mantén la espalda ligeramente flexionada ("redondeada")
-Lleva la cadera por encima del pad frontal
-Agarra peso (con los codos extendidos) si lo necesitas', 'https://www.youtube.com/shorts/Scr22jY7FPA'),
('Extensiones de cadera (para isquios) en GHD', 'GHD hip extension', 'Isquiosurales', '- Llevar la espalda flexionada
- Colóca la máquina a mitad del fémur', null),
('Flexiones de rodillas en el suelo', 'Slide curl', 'Isquiosurales', '- Apoya los pies en una Fitball
-  Mantén la cadera lo más extendida posible
- No generes anteversión pélvica', null),
('Peso muerto rumano en máquina de belt squat', 'Belt squat romanian deadlift', 'Isquiosurales', '- Lleva la cadera lo más atrás posible. con la espalda recta
- No lleves las rodillas hacia adelante
- No hiperextiendas el cuello', 'https://www.youtube.com/shorts/_Ra_GHm_e-8'),
('Extensiones de cadera con barra libre', 'Hip thrust', 'Glúteos', '-Coloca los pies con el ancho de las caderas y que estén debajo de las rodillas cuando estés arriba
-Orienta las punteras de los pies ligeramente hacia fuera
-Controla el empuje desde abajo para no llegar arriba con inercia', null),
('Extensiones de cadera en Multipower', 'Smith hip thrust', 'Glúteos', '-Coloca los pies con el ancho de las caderas y que estén debajo de las rodillas cuando estés arriba
-Orienta las punteras de los pies ligeramente hacia fuera
-Controla el empuje desde abajo para no llegar arriba con inercia
-Coloca un step debajo de los pies en caso de que el ROM sea insuficiente', null),
('Extensiones de cadera con barra libre en el suelo ("puentes")', 'Floor hip trhust', 'Glúteos', '-  Cuando estés arriba las rodillan deben estar a 90º
- No hagas anteversión pélvica', null),
('Extensiones de cadera desde polea a media altura', 'Pull throught', 'Glúteos', '- No hagas anteversión pélvica', null),
('Extensiones de cadera en máquina', 'Hip thrust machine', 'Glúteos', '-Coloca los pies con el ancho de las caderas y que estén debajo de las rodillas cuando estés arriba
-Orienta las punteras de los pies ligeramente hacia fuera
-Controla el empuje desde abajo para no llegar arriba con inercia', 'https://www.youtube.com/shorts/E5ycCzO5Ld0'),
('Extensiones de cadera sentado en máquina', 'Seated hip thrust machine', 'Glúteos', '- No hagas anteversión pélvica', null),
('Extensiones de cadera tumbado en máquina  ("patada de rana")', 'Frog kicks', 'Glúteos', '- No hagas anteversión pélvica', null),
('Extensiones de cadera tumbada en máquina  ("patada de rana")', 'Frog kicks', 'Glúteos', '- No hagas anteversión pélvica', null),
('Extensiones de cadera tumbado en Multipower ("patada de rana")', 'Frog kicks', 'Glúteos', '-Lleva las tibias perpendiculares al suelo y debajo de la barra, al igual que las rodillas
-Fija la barra con dos muñequeras para que no se enganchen los ganchos
-Coloca algo blando entre la cadera y el banco', 'https://www.youtube.com/shorts/EB8XVFSZRAE'),
('Extensiones de cadera tumbada en Multipower ("patada de rana")', 'Frog kicks', 'Glúteos', '-Lleva las tibias perpendiculares al suelo y debajo de la barra, al igual que las rodillas
-Fija la barra con dos muñequeras para que no se enganchen los ganchos
-Coloca algo blando entre la cadera y el banco', 'https://www.youtube.com/shorts/EB8XVFSZRAE'),
('Patadas de glúteo en máquina de placas', 'Glute kickback machine', 'Glúteos', '- No hagas anteversión pélvica', 'https://www.youtube.com/shorts/INEQRb1PlAQ'),
('Patadas de glúteo en máquina de palancas', 'Plate loaded glute kickback', 'Glúteos', '- No hagas anteversión pélvica', 'https://www.youtube.com/shorts/uB6wn7ojQes'),
('Patadas de glúteo desde de pie polea alta', 'High cable glute kickback', 'Glúteos', '-Mantén la rodilla extendida', 'https://www.youtube.com/shorts/B0cLG1-H9ow'),
('Patadas de glúteo desde polea a media altura en banco', 'Bench cable glute kickback', 'Glúteos', '-Coloca la cadera a la altura de la cadera (estando de pie)
-Orienta el respaldo del banco hacia el lado contrario por el que vas a ejecutar
-Pega la rodilla libre contra el respaldo y agárrate a él para mayor estabilidad
-Átate en la polea y luego camina hasta el banco
-Realiza 180º de extensión de cadera (un semi-círculo), es decir, comienza con el pie a la altura de la cadera y termina igual pero detrás del cuerpo', null),
('Patadas de glúteo de pie desde polea baja', 'Stretched stand position glute kickback', 'Glúteos', '-Mantén la rodilla extendida', 'https://www.youtube.com/shorts/FclsfZvytqM'),
('Abducciones de cadera sentado en máquina', 'Hip abductions', 'Glúteos', '-Mantén la espalda baja y la cadera apoyadas en todo el ROM (90º de flexión de cadera)
-Ánclate a la máquina lo máximo posible a través de los agarres y el respaldo
-No apliques fuerzas intencionales con los pies, si puedes apoya los talones, no las plantas de los pies
-No dejes que se toquen las placas al principio
-Controla el final del ROM sin que se generen inercias', 'https://www.youtube.com/shorts/a2voYXm6THs'),
('Abducciones de cadera sentada en máquina', 'Hip abductions', 'Glúteos', '-Mantén la espalda baja y la cadera apoyadas en todo el ROM (90º de flexión de cadera)
-Ánclate a la máquina lo máximo posible a través de los agarres y el respaldo
-No apliques fuerzas intencionales con los pies, si puedes apoya los talones, no las plantas de los pies
-No dejes que se toquen las placas al principio
-Controla el final del ROM sin que se generen inercias', 'https://www.youtube.com/shorts/a2voYXm6THs'),
('Abducciones de cadera unilaterales sentado/a en máquina', 'Single leg hip abductions', 'Glúteos', '-No eleves la cadera', null),
('Abducciones de cadera unilaterales en máquina (multicadera)', 'Single leg hip abductions', 'Glúteos', '-No eleves la cadera', null),
('Abducciones de cadera unilaterales de pie desde polea baja', 'Stanted cable single leg hip abductions', 'Glúteos', '-Pon la tobillera por encima de la altura de la rodilla', 'https://www.youtube.com/shorts/sg6r9o2AS7Q'),
('Abducciones de cadera unilaterales desde polea a media altura en banco', 'Bench suported cable single leg hip abductions', 'Glúteos', '-Coloca la cadera a la altura de la cadera (estando de pie)
-Orienta el respaldo del banco hacia el lado contrario por el que vas a ejecutar
-Túmbate de lado contra el banco inclinado dejando alejado la pierna ejecutora
-Átate en la polea y luego camina hasta el banco
-Realiza 180º de extensión de cadera (un semi-círculo), es decir, comienza con el pie a la altura de la cadera y termina igual pero detrás del cuerpo', null),
('Abducciones de cadera de pie con glute band', 'Glute band abductions', 'Glúteos', '-Pon la banda por encima de la altura de la rodilla', null),
('Sentadillas búlgaras (para glúteos) con mancuerna por el lado ejecutante', 'Lunge squat with dumbbell on the performing side', 'Glúteos', '- Lleva la cadera atrás
- No generes fuerza en la pierna de apoyo', null),
('Sentadillas búlgaras (para glúteos) con mancuerna por el lado contrado al ejecutante', 'Lunge squat with dumbbell on the opposite side', 'Glúteos', '-No llegues a extender la rodilla adelantada, arriba (al final), realiza 2/3 del ROM
-Desliza la mano libre por un punto de apoyo externo (no te agarres ni te ayudes, solo es para dar estabilidad)
-Arriba, el pie atrasado debe de estar a la altura de su rodilla
-Coloca un step debajo del pie adelantado
-Inclina el tronco llevando el centro de gravedad sobre la rodilla del pie adelantado
-Estira el glúteo del lado ejecutante lo máximo posible abajo', null),
('Sentadillas búlgaras (para glúteos) con mancuernas', 'Dumbbell lunge squat (glutes)', 'Glúteos', '- Lleva la cadera atrás
- No generes fuerza en la pierna de apoyo', 'https://www.youtube.com/shorts/U21PehSXdYg'),
('Sentadillas búlgaras (para glúteos) en Multipower', 'Smith lunge squat (glutes)', 'Glúteos', '- Lleva la cadera atrás
- No generes fuerza en la pierna de apoyo', null),
('Extensiones de cadera (para glúteos) en banco romano', 'Roman bench glute extension', 'Glúteos', '-Mantén las rodillas ligeramente flexionadas
-Mantén la espalda ligeramente flexionada ("redondeada")
-Lleva los glúteos desde el máximo estiramiento al máximo acortamiento sin modificar la espalda ni las rodillas
-Apoya la cadera sobre el pad frontal
-Agarra peso (con los codos extendidos) si lo necesitas', 'https://www.youtube.com/shorts/QUDXHUSgEts'),
('Extensiones de cadera (para glúteos) en GHD', 'GHD glute extension', 'Glúteos', '- Encaja la cadera con el punto de apoyo
- Lleva la espalda flexionada', null),
('Peso muerto rumano B-stance con mancuernas', 'B-stance dumbbell RDL', 'Glúteos', '-Atrasa la cadera lo máximo posible a medida que bajas
-Corta la bajada en el momento que no seas capaz de seguir atrasando la cadera sin flexionar las rodillas
-Se permite cierta flexión de rodillas (la justa)
-Parte a poder ser de un banco
-Mantén la espalda neutra
-Lleva el cuello en línea con la espalda
-Aplica la fuerza con la pierna adelantada', 'https://www.youtube.com/shorts/dlLOpMjQsOQ'),
('Peso muerto rumano con mancuernas', 'Dumbbell romanian deadlift', 'Glúteos', '-Atrasa la cadera lo máximo posible a medida que bajas
-Corta la bajada en el momento que no seas capaz de seguir atrasando la cadera sin flexionar las rodillas
-Se permite cierta flexión de rodillas (la justa)
-Parte a poder ser de un banco
-Mantén la espalda neutra
-Lleva el cuello en línea con la espalda', 'https://www.youtube.com/shorts/3u9M3nh0C0g'),
('Peso muerto rumano con barra libre', 'Barbell romanian deadlift', 'Glúteos', '-Atrasa la cadera lo máximo posible a medida que bajas
-Corta la bajada en el momento que no seas capaz de seguir atrasando la cadera sin flexionar las rodillas
-Se permite cierta flexión de rodillas (la justa)
-Parte a poder ser del rack
-Mantén la espalda neutra
-No adelantes la barra a la altura de las rodillas
-Lleva el cuello en línea con la espalda', 'https://www.youtube.com/shorts/PeBisSr1yys'),
('Peso muerto rumano desde polea baja', 'Low cable romanian deadlift', 'Glúteos', '- Lleva la cadera lo más atrás posible. con la espalda recta
- No lleves las rodillas hacia adelante
- No hiperextiendas el cuello', 'https://www.youtube.com/shorts/9cCz08h6L_8'),
('Flexiones plantar de pie con mancuernas', 'Standing dumbbell calf raises', 'Gemelos', '- Mantén las rodillas y cadera en extensión', 'https://www.youtube.com/watch?v=GyWw_Q_aIbE&amp;pp=ygUdU3RhbmRpbmcgZHVtYmJlbGwgY2FsZiByYWlzZXM%3D'),
('Flexiones plantares unilaterales de pie con mancuernas', 'Single leg standing dumbbell calf raises', 'Gemelos', '- Mantén las rodillas y cadera en extensión', 'https://www.youtube.com/watch?v=PTn6icEeH3Y&amp;pp=ygUoU2luZ2xlIGxlZyBzdGFuZGluZyBkdW1iYmVsbCBjYWxmIHJhaXNlcw%3D%3D'),
('Flexiones plantares con rodillas y cadera extendidas', 'Standing calf raises', 'Gemelos', '-Realízalo de pie en: máquina o Multipower
-No adelantes la cadera al subir
-No flexiones las rodillas (ni un poco) en ningún momento
-Coloca los talones debajo de la barra
-Añade un escalón/step debajo de las punteras para buscar el máximo ROM
-Apoya hasta el metatarso del pie (no más)', 'https://www.youtube.com/shorts/IrrmU7_swBI'),
('Flexiones plantares con rodillas extendidas y cadera flexionada', 'Calf raises leg press', 'Gemelos', '-Realízalo sentad@ en: máquina o prensa (cualquier tipo)
-NMantén una anteversión pélvica y extensión del cuello durante todo el ROM para evitar carga neural
-No flexiones las rodillas (ni un poco) en ningún momento
-Máximo ROM
-Apoya hasta el metatarso del pie (no más)', 'https://www.youtube.com/shorts/1cvpm--Y-4I'),
('Flexiones plantares con rodillas y cadera flexionadas', 'Sitting calf raises', 'Gemelos', '-En máquina de soleo', 'https://www.youtube.com/shorts/NZiLMcFasiY');
