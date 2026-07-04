# El método real de Liviu (análisis de sus Google Sheets)

> Recorrido el 4 jul 2026. Estos dos ficheros son la herramienta de trabajo
> actual y definen el listón funcional que la plataforma debe igualar.
> - Entrenamiento: "LIVIU MESOCICLO_02"
> - Dieta: "BALANCE ENERGÉTICO LIVIU"

## 1. Entrenamiento — LIVIU MESOCICLO

**Estructura:** MESOCICLO → MICROCICLOS (semanas: MICRO_01, MICRO_02…) → SESIONES (PUSH / PULL / UPPER PUSH + ARMS…) → ejercicios → series.

**Cabecera del microciclo:** nivel (avanzado/a), nº mesociclo, nº microciclo,
calendario semanal (LUNES REST · MARTES ETTO…), comentarios de autorregulación
("autorregula los descansos, secuencias 3:1, no más de 3 sesiones seguidas") y
objetivos del bloque (bulk, superávit ligero…).

**Panel de volumen (clave del método):** tabla GRUPO MUSCULAR × SERIES:
- SERIES x MICRO, SERIES x SEMANA, SERIES x RIR≤4… con imágenes del músculo,
  gráfica de tarta de distribución y muñeco anatómico.
- Gráfica "SERIES MICRO x STRESS INDEX".
- → En la app esto se puede **calcular automáticamente** de la rutina (gran mejora: en el sheet lo mantiene con fórmulas).

**Cabecera de sesión:** nº, nombre, nº series totales, **PRS (pre)** y
**RPE (post)** (desplegables), protocolo de **CALENTAMIENTO (A/B/C)** que
referencia la hoja WARM UP, anotaciones.

**Por ejercicio:** orden · grupo muscular · nombre (ES + EN) · **TÉCNICA**
(varias líneas de cues: "no separes la espalda baja…") · observaciones ·
**LINK a vídeo**.

**Por serie (columnas):**
| Columna | Ejemplo | Nota |
|---|---|---|
| SETS - RANGO REPS (mín & máx) | 6-10, 5-8, 10-14 | ¡rango, no valor único! |
| RIR objetivo | 0 · **P** · **P+ISO HOLD** | puede ser técnica de intensidad, no solo número |
| CARGA | 190 · "90 (GOMA AZUL)" · 300 | admite texto (bandas) |
| REPS reales | 10 · "8 (+3)" | "+3" = rest-pause/parciales |
| RIR real | 0 · P | |

**Colores:** verde = progresa vs. semana anterior, rojo = baja. (= "Evolución
Mesociclo" de Lovable.)

Otras hojas: EXERCISE DATA BASE (biblioteca propia), WARM UP (protocolos),
ACLARACIONES, hojas (DATA) auxiliares.

## 2. Dieta — BALANCE ENERGÉTICO

**Cabecera Dieta_01:** peso corporal, % grasa aprox., TMB (3483 kcal),
objetivo físico, **peso objetivo** y diferencia, **semanas mínimas / semanas
"cómodas"**, ingesta semanal balance vs. total, y **kcal distintas para días
de entrenamiento y de descanso** (p. ej. 3048 kcal días de entreno).

**Comidas:** 6 franjas (desayuno, media mañana, comida, merienda, cena,
recena) numeradas; cada fila = **alimento + gramos** → kcal, proteínas,
hidratos, grasas y **fibra** calculados por fila + TOTALES por comida.

**REGISTRO SEMANAL (revisiones):**
- Día de revisión: **LUNES**.
- Por semana: nº dieta asignada, ingesta media diaria (kcal, P, H, G, fibra),
  **objetivo −0,25 % de peso/semana (≈ −0,20 kg)**.
- **Peso diario con hora (L-D) → media semanal** (la métrica de decisión).

## 3. Huecos de LivFit respecto al método (prioridad)

1. **Series con rango de reps** (reps_min/reps_max), **RIR como texto corto**
   (admite "P", "P+ISO HOLD") y **carga con anotación de texto** (gomas).
2. **Microciclos/semanas**: duplicar semana con un clic y comparar contra la
   anterior (colores verde/rojo en lo realizado).
3. **Volumen por grupo muscular calculado automáticamente** (series/semana por
   músculo) — mejora directa sobre el sheet.
4. **Peso diario del cliente + media semanal** y **revisión semanal** con
   objetivo %/semana y sugerencia de ajuste de kcal.
5. **Fase 3 nutrición**: alimentos con gramos y fibra, totales por comida,
   kcal distintas entreno/descanso, equivalencias (Lovable).
6. PRS (pre) / RPE (post) por sesión (ya hay sensación post 1-5).
7. Protocolos de calentamiento reutilizables; vídeo por ejercicio en la UI
   (el campo `video_url` ya existe).

## 4. Lo que la app ya hace mejor que el sheet

- El cliente registra la sesión desde el móvil (el sheet lo rellena Liviu).
- Temporizador de descanso, PRs automáticos, racha, adherencia y alertas.
- Auto-cálculo de macros (Mifflin-St Jeor) con los datos del cliente.
- Sin fórmulas que romper; datos aislados por cliente con RLS.
