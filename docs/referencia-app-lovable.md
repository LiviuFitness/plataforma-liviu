# Referencia: app anterior de Lovable (app.livfit.es)

> Inventario funcional de la versión hecha en Lovable, recorrida el 3 jul 2026.
> Sirve como guía de qué características traer a esta plataforma en cada fase.

## Estructura general

- **Una sola app** con navegación inferior: Inicio · Entrenos · Dieta · Perfil · Coach.
- El panel de entrenador es la pestaña "Coach" (visible solo para el admin).
- Modelo freemium: "Atletas" (usuarios registrados gratis) vs "Clientes VIP"
  (con asesoría; toggle de suscripción activa por cliente).
- Logo oficial LIVIU Fitness Studio en cabecera. PWA con banner "Instalar app".
- Notificaciones con campana y contador.

## App del cliente (→ nuestra Fase 2)

| Pantalla | Qué tiene |
|---|---|
| Inicio | Frase motivacional del día · anillo "Progreso semanal 0/5 días" · **racha actual 🔥 (días seguidos)** · "Tus hábitos de hoy" · resumen semanal de sesiones (L-D) · "Nutrición de hoy": anillo kcal + barras de progreso de proteína/carbos/grasas |
| Entrenos | Estado vacío simpático: "Tu rutina está en el horno 🔥 En breve tu coach te asignará tu plan" |
| Dieta | "Lista de la compra (próximos 7 días)" generada del plan · **"Generar receta con IA" (Smart Chef: dime qué tienes y te creo una receta)** · pestañas "Mi Plan" / "Diario Libre" · diario libre con contadores kcal/macros · **contador de agua 0/8 vasos** |
| Perfil | KPIs (entrenos totales, peso actual, kcal diarias) · editar perfil · mi progreso (peso) · mis progresos · historial de actividad · ajustes de notificaciones · suscripción/premium · LIVIU Vault |

## Panel Coach (→ mejoras de nuestra Fase 1 y fases 2-3)

Pestañas: Clientes · Atletas · Revisiones · Chat · Vault · Plantillas.

- **Clientes**: lista con etiquetas de objetivo, edad, toggle "Suscripción activa"
  (si está inactiva el cliente no accede), eliminar, y ficha en modal con:
  - **Ajustar macros con "Auto-calcular" (Harris-Benedict + factor de actividad + objetivo)**, editable antes de guardar.
  - **Hábitos asignados** al cliente (texto + selector de icono).
  - Editor de plan con pestañas **Entrenamiento / Nutrición**:
    - Entrenamiento: título del plan, días colapsables, ejercicios (texto libre),
      series con nº/Reps/RIR/Peso, notas por ejercicio (tempo, técnica), añadir serie/ejercicio/día.
    - Nutrición: sugerencia kcal Harris-Benedict, macros totales, comidas con
      alimentos por cantidad y — la joya — **equivalencias automáticas por alimento**
      (150 g pan blanco ≈ 108 g quinoa ≈ 110 g arroz integral ≈ 153 g pan centeno…)
      para que el cliente pueda intercambiar.
  - **Evolución Mesociclo**: matriz de progresión semanal (verde sube / rojo baja).
- **Atletas**: registrados sin asesoría VIP; se pueden convertir en clientes.
- **Revisiones**: check-ins semanales por cliente (🟢 enviado / 🔴 pendiente).
- **Chat**: mensajería coach ↔ cliente.
- **Vault**: biblioteca de recursos (título, descripción, tipo enlace, URL) publicados a los clientes.
- **Plantillas**: mesociclos de 12 semanas con "Editar" y "Asignar" en un clic
  (Full Body 3 días, Upper/Lower 4, Push/Pull/Legs 5, Pérdida de grasa + funcional, Fuerza 5×5).

## Qué mejora nuestra versión respecto a Lovable

- Biblioteca real de ejercicios (~150) con buscador y filtro por músculo
  (en Lovable el ejercicio es texto libre).
- Tipos de serie (calentamiento/efectiva/dropset/fallo) y descanso por ejercicio.
- Alta por invitación con consentimiento RGPD registrado.
- RLS real en base de datos propia.

## Ideas a incorporar (prioridad sugerida)

1. **Fase 1.5**: auto-cálculo de macros (Harris-Benedict) en la dieta — barato y muy útil.
2. **Fase 2**: racha + anillo semanal + hábitos en el Inicio del cliente; revisiones semanales.
3. **Fase 3**: equivalencias de alimentos, lista de la compra, diario libre, agua.
4. **Fase 4**: chat, Vault, receta con IA, evolución mesociclo, notificaciones.
