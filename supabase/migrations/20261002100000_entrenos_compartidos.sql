-- ============================================================
-- Entrenos compartidos en la comunidad: al terminar un entreno el
-- cliente puede publicarlo (qué entrenó, duración, series, récords y
-- un mensaje; los kilos solo si quiere). Los demás reaccionan con
-- 🔥 💪 👏, sin comentarios. Solo participa quien es visible en la
-- comunidad. El entrenador lo ve todo y puede quitar publicaciones.
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================
create table if not exists public.entrenos_compartidos (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null unique references public.sesiones (id) on delete cascade,
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  nombre_dia text not null check (length(nombre_dia) <= 80),
  duracion_seg integer not null check (duracion_seg >= 0),
  series integer not null check (series >= 0),
  /* null: el cliente no quiere enseñar los kilos */
  tonelaje_kg numeric,
  /* [{ "nombre": "Sentadilla", "kg": 60 }] (kg null si oculta los kilos) */
  records jsonb not null default '[]'::jsonb,
  mensaje text check (length(mensaje) <= 140),
  creado_en timestamptz not null default now()
);
create index if not exists entrenos_compartidos_fecha on public.entrenos_compartidos (creado_en desc);

create table if not exists public.reacciones_entreno (
  entreno_id uuid not null references public.entrenos_compartidos (id) on delete cascade,
  cliente_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null check (tipo in ('fuego', 'fuerza', 'aplauso')),
  creado_en timestamptz not null default now(),
  primary key (entreno_id, cliente_id, tipo)
);

alter table public.entrenos_compartidos enable row level security;
alter table public.reacciones_entreno enable row level security;

drop policy if exists "entrenador todo" on public.entrenos_compartidos;
create policy "entrenador todo" on public.entrenos_compartidos for all
  using (es_entrenador()) with check (es_entrenador());
drop policy if exists "cliente los suyos" on public.entrenos_compartidos;
create policy "cliente los suyos" on public.entrenos_compartidos for select
  using (cliente_id = auth.uid());
drop policy if exists "cliente borra los suyos" on public.entrenos_compartidos;
create policy "cliente borra los suyos" on public.entrenos_compartidos for delete
  using (cliente_id = auth.uid());

drop policy if exists "entrenador todo" on public.reacciones_entreno;
create policy "entrenador todo" on public.reacciones_entreno for all
  using (es_entrenador()) with check (es_entrenador());
/* Reaccionar: solo quien es visible en la comunidad, a un entreno de otro */
drop policy if exists "cliente sus reacciones" on public.reacciones_entreno;
create policy "cliente sus reacciones" on public.reacciones_entreno for all
  using (cliente_id = auth.uid())
  with check (
    cliente_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.visible_en_comunidad)
    and exists (select 1 from public.entrenos_compartidos e where e.id = entreno_id and e.cliente_id <> auth.uid())
  );

revoke all on public.entrenos_compartidos from anon;
revoke all on public.reacciones_entreno from anon;

-- Publicar: comprueba que es visible y que la sesión es suya (la busca
-- por su hora de inicio: la app la acaba de guardar). Si ya estaba
-- publicada, no hace nada.
create or replace function public.compartir_entreno(
  p_fecha_inicio timestamptz,
  p_nombre_dia text,
  p_duracion_seg integer,
  p_series integer,
  p_tonelaje_kg numeric,
  p_records jsonb,
  p_mensaje text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sesion uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and visible_en_comunidad and estado = 'activo') then
    return;
  end if;
  select id into v_sesion from sesiones where cliente_id = auth.uid() and fecha_inicio = p_fecha_inicio limit 1;
  if v_sesion is null then
    return;
  end if;
  insert into entrenos_compartidos (sesion_id, cliente_id, nombre_dia, duracion_seg, series, tonelaje_kg, records, mensaje)
  values (
    v_sesion,
    auth.uid(),
    left(coalesce(p_nombre_dia, 'Entreno'), 80),
    greatest(0, coalesce(p_duracion_seg, 0)),
    greatest(0, coalesce(p_series, 0)),
    p_tonelaje_kg,
    coalesce(p_records, '[]'::jsonb),
    nullif(left(trim(coalesce(p_mensaje, '')), 140), '')
  )
  on conflict (sesion_id) do nothing;
end;
$$;
revoke all on function public.compartir_entreno(timestamptz, text, integer, integer, numeric, jsonb, text) from anon;

-- ------------------------------------------------------------
-- El muro: como las otras vistas de comunidad, NO es security_invoker
-- (así enseña el nombre de pila de otros clientes visibles) y decide
-- ella misma qué se ve: solo autores visibles y activos, últimos 30
-- días. Las reacciones van contadas; "mias" son las del que mira y
-- "quienes" los nombres de quien reaccionó (para el autor).
-- ------------------------------------------------------------
create or replace view public.v_comunidad_entrenos as
select
  e.id,
  e.cliente_id,
  split_part(p.nombre, ' ', 1) as nombre,
  p.avatar_url,
  e.nombre_dia,
  e.duracion_seg,
  e.series,
  e.tonelaje_kg,
  e.records,
  e.mensaje,
  e.creado_en,
  (select count(*) from reacciones_entreno r where r.entreno_id = e.id and r.tipo = 'fuego')::int as fuego,
  (select count(*) from reacciones_entreno r where r.entreno_id = e.id and r.tipo = 'fuerza')::int as fuerza,
  (select count(*) from reacciones_entreno r where r.entreno_id = e.id and r.tipo = 'aplauso')::int as aplauso,
  coalesce(
    (select array_agg(r.tipo) from reacciones_entreno r where r.entreno_id = e.id and r.cliente_id = auth.uid()),
    '{}'::text[]
  ) as mias,
  case when e.cliente_id = auth.uid() then
    coalesce((
      select array_agg(distinct split_part(q.nombre, ' ', 1))
      from reacciones_entreno r join profiles q on q.id = r.cliente_id
      where r.entreno_id = e.id
    ), '{}'::text[])
  else '{}'::text[] end as quienes
from public.entrenos_compartidos e
join public.profiles p on p.id = e.cliente_id
where p.visible_en_comunidad = true
  and p.estado = 'activo'
  and e.creado_en > now() - interval '30 days'
order by e.creado_en desc
limit 60;
revoke select on public.v_comunidad_entrenos from anon;
