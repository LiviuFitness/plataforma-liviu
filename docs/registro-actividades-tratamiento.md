# Registro de actividades de tratamiento (art. 30 RGPD)

> **Borrador base para Liviu.** Completar los [corchetes] y revisar con un
> profesional antes del lanzamiento.

## Responsable del tratamiento

- **Nombre:** [NOMBRE Y APELLIDOS / DENOMINACIÓN SOCIAL]
- **NIF:** [NIF]
- **Domicilio:** [DIRECCIÓN]
- **Contacto:** [EMAIL] · [TELÉFONO]

## Actividad 1 — Seguimiento deportivo y nutricional de clientes

| Campo | Detalle |
|---|---|
| Finalidad | Prestación del servicio de entrenamiento personal: planificación de rutinas y dietas, registro de entrenamientos, medidas corporales y evolución. |
| Base jurídica | Ejecución de contrato (art. 6.1.b RGPD) y consentimiento explícito para datos de salud (art. 9.2.a RGPD), recogido en el alta con fecha y hora. |
| Categorías de interesados | Clientes del estudio (adultos). |
| Categorías de datos | Identificativos (nombre, email). **Salud:** peso, medidas corporales, registros de entrenamiento y alimentación, sensación tras el ejercicio, fotos de progreso (opcionales). |
| Destinatarios | No hay cesiones. Encargados de tratamiento: Supabase (BBDD y autenticación, región UE) y Vercel (alojamiento web). |
| Transferencias internacionales | No previstas. Datos alojados en la UE ([Frankfurt/París]). Verificar cláusulas de los encargados. |
| Plazo de supresión | Fin de la relación contractual + plazos de prescripción legal ([5 años]); después, borrado o anonimización. |
| Medidas de seguridad | Autenticación con contraseña, HTTPS, Row Level Security (aislamiento por cliente), almacenamiento privado de fotos con URLs firmadas, acceso restringido al panel de administración de Supabase. |

## Actividad 2 — Gestión de invitaciones de alta

| Campo | Detalle |
|---|---|
| Finalidad | Dar de alta a nuevos clientes por invitación. |
| Base jurídica | Medidas precontractuales a petición del interesado (art. 6.1.b RGPD). |
| Categorías de datos | Nombre y email. |
| Plazo de supresión | Las invitaciones caducan a los 7 días; las no usadas pueden eliminarse desde el panel. |

## Derechos de los interesados

Procedimiento: el cliente escribe a [EMAIL] o utiliza las opciones de su
perfil (exportación de datos y eliminación de cuenta, disponibles en la app
del cliente — Fase 2). Plazo de respuesta: 1 mes.
