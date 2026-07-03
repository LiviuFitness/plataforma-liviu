# LivFit — Fase 1: Panel de entrenador

**LivFit**, la plataforma de coaching de LIVIU Fitness Studio. Esta fase incluye el panel
de entrenador completo: clientes con alta por invitación, constructor de
rutinas estilo Hevy, dietas (objetivos + comidas), medidas y progreso,
plantillas reutilizables y alertas.

**Stack:** Next.js (App Router) + Tailwind CSS + Supabase (PostgreSQL, Auth,
RLS). PWA instalable. Todo en español.

---

## 1. Crear el proyecto Supabase (una sola vez)

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto nuevo.
2. **Región: elige Frankfurt o París (UE)** — obligatorio por RGPD.
3. Apunta la contraseña de la base de datos en un lugar seguro.

## 2. Ejecutar las migraciones

En el panel de Supabase → **SQL Editor** → pega y ejecuta, **en este orden**,
el contenido de:

1. `supabase/migrations/20260702090000_esquema.sql` — tablas y trigger de alta
2. `supabase/migrations/20260702090100_rls_y_funciones.sql` — seguridad RLS, vistas y funciones
3. `supabase/migrations/20260702090200_semilla_ejercicios.sql` — biblioteca de ~150 ejercicios

> Alternativa con CLI: `npx supabase db push` si tienes el proyecto vinculado.

## 3. Configurar las variables de entorno

```bash
copy .env.example .env.local
```

Rellena en `.env.local` los valores de Supabase → **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
```

## 4. Crear la cuenta del entrenador

**El primer usuario que se registra en el proyecto se convierte
automáticamente en entrenador.** Para crearlo:

1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Email y contraseña de Liviu. Marca **Auto Confirm User**.
3. Listo: ese usuario ya puede entrar en la plataforma como entrenador.

Todos los usuarios posteriores necesitan una invitación (se crean desde la
pantalla «Clientes» del panel).

> Recomendado: en **Authentication → Sign In / Up**, desactiva
> «Allow new users to sign up» solo si se quiere cerrar del todo el registro
> por API; la plataforma ya exige invitación válida mediante el trigger de
> base de datos.

## 5. Activar el inicio de sesión con Google (opcional)

1. En [Google Cloud Console](https://console.cloud.google.com) crea un
   proyecto → **APIs & Services → Credentials → Create OAuth client ID**
   (tipo *Web application*).
2. En *Authorized redirect URIs* añade la URL que te da Supabase en
   **Authentication → Sign In / Providers → Google** (tiene la forma
   `https://tu-proyecto.supabase.co/auth/v1/callback`).
3. Copia el *Client ID* y el *Client Secret* en esa misma pantalla de
   Supabase y activa el proveedor.

> Google solo sirve para **entrar** con una cuenta ya existente (o la del
> entrenador). El alta de clientes nuevos sigue siendo únicamente por
> invitación: si alguien sin cuenta intenta entrar con Google, la base de
> datos lo rechaza y vuelve al login con un aviso.

## 6. Arrancar en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e inicia sesión con la
cuenta del entrenador.

## 7. Desplegar en Vercel

1. Sube el repositorio a GitHub y conéctalo en [vercel.com](https://vercel.com).
2. Añade las dos variables de entorno de `.env.local`.
3. En Supabase → **Authentication → URL Configuration**, añade la URL de
   producción como *Site URL* y en *Redirect URLs* (necesario para la
   recuperación de contraseña).

---

## Flujo de trabajo diario (Liviu)

1. **Clientes → + Invitar**: crea la invitación y envía el enlace por WhatsApp.
2. El cliente abre el enlace, acepta el consentimiento de datos de salud y crea su cuenta.
3. **Ficha del cliente → Entreno**: crea la rutina día a día (o asigna una plantilla).
4. **Ficha → Dieta**: objetivos kcal/macros y comidas.
5. **Ficha → Progreso**: registra medidas en cada valoración.
6. **Hoy**: cada mañana, un vistazo a las alertas.

## Legal (RGPD)

- Los textos de `/aviso-legal`, `/politica-privacidad`, `/politica-cookies` y
  `/terminos` son **borradores**: deben completarse los [corchetes] y
  **revisarse por un profesional antes del lanzamiento**.
- `docs/registro-actividades-tratamiento.md` contiene la base del registro de
  actividades de tratamiento (art. 30 RGPD).
- El consentimiento de datos de salud se recoge en el alta (checkbox separado,
  sin premarcar) y se guarda con fecha y hora en `profiles.consentimiento_salud`.

## Estructura

```
src/
  app/
    (auth)/       login, recuperar, restablecer, alta/[token]
    (panel)/      hoy, clientes, clientes/[id], plantillas
    (legal)/      aviso legal, privacidad, cookies, términos
  componentes/    EditorRutina, EditorDia (estilo Hevy), EditorDieta, ui…
  lib/            clientes de Supabase, tipos, transformaciones
supabase/
  migrations/     esquema, RLS + vistas + funciones, semilla de ejercicios
docs/             registro de actividades de tratamiento
```

## Fases siguientes

- **Fase 2:** app del cliente (sesión en curso con prescrito vs. realizado,
  temporizador de descanso, PRs, registro de peso propio).
- **Fase 3:** nutrición completa (base de alimentos, registro por gramos).
- **Fase 4:** fotos de progreso, informes PDF, notificaciones push.
