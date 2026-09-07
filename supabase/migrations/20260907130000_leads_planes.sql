-- ============================================================
-- PLATAFORMA LIVIU — Migración 38: leads de la página de planes
--
-- La app es solo para clientes ya dados de alta. Esta es la única
-- puerta de entrada pública: un QR (en el gimnasio, en un flyer)
-- lleva a /planes, donde quien no es cliente ve los dos planes y
-- deja sus datos. No hay alta automática ni pago — el lead se
-- queda aquí para que Liviu haga el seguimiento a mano.
-- ============================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  telefono text,
  plan text check (plan in ('automatico', 'presencial')),
  mensaje text,
  origen text, -- de qué QR vino: 'gimnasio', 'flyer'… (?origen= en la URL)
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'contactado', 'cliente', 'descartado')),
  notas text, -- apuntes privados del entrenador
  creado_en timestamptz not null default now()
);

create index if not exists idx_leads_estado on public.leads (estado, creado_en desc);

alter table public.leads enable row level security;

-- Solo el entrenador lee y gestiona los leads. A propósito NO hay
-- política de INSERT: nadie escribe directo en la tabla desde el
-- navegador, todo entra por registrar_lead(), que valida antes.
drop policy if exists "entrenador todo" on public.leads;
create policy "entrenador todo" on public.leads for all
  using (public.es_entrenador())
  with check (public.es_entrenador());

-- ------------------------------------------------------------
-- Alta de un lead desde la página pública (sin sesión).
-- security definer: escribe saltándose el RLS, pero solo puede
-- insertar una fila validada — no leer nada ni tocar otra tabla.
-- ------------------------------------------------------------
create or replace function public.registrar_lead(
  p_nombre text,
  p_email text,
  p_telefono text default null,
  p_plan text default null,
  p_mensaje text default null,
  p_origen text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text := nullif(btrim(p_nombre), '');
  v_email text := lower(nullif(btrim(p_email), ''));
begin
  if v_nombre is null or length(v_nombre) < 2 or length(v_nombre) > 80 then
    raise exception 'Escribe tu nombre.';
  end if;

  if v_email is null or length(v_email) > 120
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' then
    raise exception 'Escribe un correo válido.';
  end if;

  if p_plan is not null and p_plan not in ('automatico', 'presencial') then
    raise exception 'Plan desconocido.';
  end if;

  -- Mismo criterio que el doble guardado de una sesión: si el mismo
  -- correo ya escribió hoy, no se crea un lead repetido. Se sale sin
  -- error para que quien pulse dos veces vea igualmente el "gracias".
  if exists (
    select 1 from public.leads
    where email = v_email and creado_en > now() - interval '24 hours'
  ) then
    return;
  end if;

  insert into public.leads (nombre, email, telefono, plan, mensaje, origen)
  values (
    v_nombre,
    v_email,
    left(nullif(btrim(p_telefono), ''), 30),
    p_plan,
    left(nullif(btrim(p_mensaje), ''), 500),
    left(nullif(btrim(p_origen), ''), 40)
  );
end;
$$;

grant execute on function public.registrar_lead(text, text, text, text, text, text)
  to anon, authenticated;
