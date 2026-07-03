-- ============================================================
-- PLATAFORMA LIVIU — Migración 1: esquema de datos
-- (especificación §5). Ejecutar en un proyecto Supabase de
-- región UE (Frankfurt o París).
-- ============================================================

-- ------------------------------------------------------------
-- Núcleo
-- ------------------------------------------------------------

-- Perfiles: una fila por usuario de auth.users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol text not null default 'cliente' check (rol in ('entrenador', 'cliente')),
  nombre text not null default '',
  email text not null default '',
  fecha_alta timestamptz not null default now(),
  objetivo text,
  plan text check (plan in ('mensual', 'trimestral')),
  estado text not null default 'activo' check (estado in ('activo', 'pausado', 'baja')),
  notas_entrenador text, -- notas privadas del entrenador, el cliente nunca las ve
  consentimiento_salud timestamptz -- fecha/hora del consentimiento RGPD (art. 9)
);

-- Invitaciones: el alta de clientes es SOLO por invitación
create table public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  email text not null,
  nombre text not null default '',
  objetivo text,
  plan text check (plan in ('mensual', 'trimestral')),
  usada boolean not null default false,
  creada_por uuid references public.profiles (id) on delete set null,
  creada_en timestamptz not null default now(),
  expira timestamptz not null default now() + interval '7 days'
);

-- Ajustes generales del estudio (una sola fila)
create table public.ajustes (
  id boolean primary key default true check (id), -- fuerza fila única
  dias_sin_entrenar integer not null default 5 -- umbral de la alerta "sin entrenar"
);
insert into public.ajustes default values;

-- ------------------------------------------------------------
-- Entrenamiento
-- ------------------------------------------------------------

-- Biblioteca de ejercicios (creado_por null = biblioteca base)
create table public.ejercicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  grupo_muscular text not null,
  material text,
  instrucciones text,
  video_url text,
  creado_por uuid references public.profiles (id) on delete set null
);

-- Rutinas (cliente_id null = plantilla)
create table public.rutinas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.profiles (id) on delete cascade,
  nombre text not null default '',
  es_plantilla boolean not null default false,
  activa boolean not null default true,
  notas text,
  creada_en timestamptz not null default now()
);

create table public.rutina_dias (
  id uuid primary key default gen_random_uuid(),
  rutina_id uuid not null references public.rutinas (id) on delete cascade,
  orden integer not null default 0,
  nombre text not null default ''
);

create table public.rutina_ejercicios (
  id uuid primary key default gen_random_uuid(),
  dia_id uuid not null references public.rutina_dias (id) on delete cascade,
  ejercicio_id uuid not null references public.ejercicios (id),
  orden integer not null default 0,
  descanso_seg integer not null default 120,
  notas text
);

create table public.series_prescritas (
  id uuid primary key default gen_random_uuid(),
  rutina_ejercicio_id uuid not null references public.rutina_ejercicios (id) on delete cascade,
  orden integer not null default 0,
  tipo text not null default 'efectiva'
    check (tipo in ('calentamiento', 'efectiva', 'dropset', 'fallo')),
  kg numeric(6, 2),
  reps integer,
  rir integer
);

-- ------------------------------------------------------------
-- Registro del cliente: lo realizado (se usa desde la Fase 2,
-- pero el esquema se crea ya para las vistas de alertas)
-- ------------------------------------------------------------

create table public.sesiones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  dia_id uuid references public.rutina_dias (id) on delete set null,
  fecha_inicio timestamptz not null default now(),
  fecha_fin timestamptz,
  sensacion integer check (sensacion between 1 and 5),
  notas_cliente text
);

create table public.series_realizadas (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones (id) on delete cascade,
  rutina_ejercicio_id uuid references public.rutina_ejercicios (id) on delete set null,
  orden integer not null default 0,
  tipo text not null default 'efectiva'
    check (tipo in ('calentamiento', 'efectiva', 'dropset', 'fallo')),
  kg numeric(6, 2),
  reps integer,
  rir integer,
  completada boolean not null default false
);

-- ------------------------------------------------------------
-- Nutrición (Fase 1: objetivos + comidas en texto libre)
-- ------------------------------------------------------------

create table public.dietas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.profiles (id) on delete cascade, -- null = plantilla
  nombre text, -- nombre visible de la plantilla
  es_plantilla boolean not null default false,
  kcal_obj integer not null default 2000,
  prot_obj integer not null default 150,
  carb_obj integer not null default 180,
  gras_obj integer not null default 60,
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);

create table public.dieta_comidas (
  id uuid primary key default gen_random_uuid(),
  dieta_id uuid not null references public.dietas (id) on delete cascade,
  orden integer not null default 0,
  nombre text not null default '',
  descripcion_libre text
);

-- ------------------------------------------------------------
-- Seguimiento
-- ------------------------------------------------------------

create table public.medidas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  fecha date not null default current_date,
  peso numeric(5, 2),
  cintura numeric(5, 2),
  pecho numeric(5, 2),
  brazo numeric(5, 2),
  pierna numeric(5, 2),
  -- Fotos de progreso (Fase 4): bucket privado con URLs firmadas
  foto_frontal_url text,
  foto_lateral_url text,
  foto_espalda_url text
);

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------

create index idx_rutinas_cliente on public.rutinas (cliente_id);
create index idx_rutina_dias_rutina on public.rutina_dias (rutina_id);
create index idx_rutina_ejercicios_dia on public.rutina_ejercicios (dia_id);
create index idx_series_prescritas_re on public.series_prescritas (rutina_ejercicio_id);
create index idx_sesiones_cliente on public.sesiones (cliente_id, fecha_inicio desc);
create index idx_series_realizadas_sesion on public.series_realizadas (sesion_id);
create index idx_medidas_cliente on public.medidas (cliente_id, fecha desc);
create index idx_dietas_cliente on public.dietas (cliente_id);
create index idx_dieta_comidas_dieta on public.dieta_comidas (dieta_id);
create index idx_invitaciones_token on public.invitaciones (token);

-- ------------------------------------------------------------
-- Alta de usuarios: crea el perfil al registrarse.
--  · El PRIMER usuario del proyecto se convierte en entrenador.
--  · El resto necesita una invitación válida (token en metadata).
-- ------------------------------------------------------------

create or replace function public.gestionar_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_primero boolean;
  v_token uuid;
  v_inv public.invitaciones%rowtype;
  v_consentimiento timestamptz;
begin
  select count(*) = 0 into v_primero from public.profiles;

  v_consentimiento := nullif(new.raw_user_meta_data ->> 'consentimiento', '')::timestamptz;

  if v_primero then
    -- Primer usuario = el entrenador (alta manual, ver README)
    insert into public.profiles (id, rol, nombre, email)
    values (
      new.id,
      'entrenador',
      coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
      new.email
    );
    return new;
  end if;

  -- Resto de usuarios: solo por invitación
  v_token := nullif(new.raw_user_meta_data ->> 'invitacion', '')::uuid;
  if v_token is null then
    raise exception 'El alta solo es posible con una invitación del entrenador.';
  end if;

  select * into v_inv
  from public.invitaciones
  where token = v_token and not usada and expira > now();

  if not found then
    raise exception 'La invitación no es válida o ha caducado. Pide una nueva a tu entrenador.';
  end if;

  update public.invitaciones set usada = true where id = v_inv.id;

  insert into public.profiles (id, rol, nombre, email, objetivo, plan, consentimiento_salud)
  values (
    new.id,
    'cliente',
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), v_inv.nombre),
    new.email,
    v_inv.objetivo,
    v_inv.plan,
    v_consentimiento
  );

  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.gestionar_nuevo_usuario();
