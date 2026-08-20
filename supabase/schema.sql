-- =============================================================================
-- Procura (CM Foodco) — Esquema de base de datos
-- Ejecutar completo en el SQL Editor de Supabase (proyecto nuevo, en orden).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tipos enumerados
-- ---------------------------------------------------------------------------
create type user_role as enum ('compras', 'logistica', 'administracion', 'operacion', 'admin_sistema');
create type proveedor_tipo as enum ('compra', 'logistica');
create type documento_tipo as enum (
  'factura_comercial', 'packing_list', 'bl_awb', 'pedimento',
  'certificado_origen', 'poliza_seguro'
);
create type orden_estatus as enum (
  'cotizando_flete', 'confirmado', 'en_transito', 'en_aduana', 'entregado', 'cerrado'
);

-- ---------------------------------------------------------------------------
-- 2. Tablas principales
-- ---------------------------------------------------------------------------

create table public.operaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

-- Perfil de cada usuario autenticado (1:1 con auth.users)
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  email text not null,
  rol user_role not null default 'operacion',
  operacion_id uuid references public.operaciones (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo proveedor_tipo not null,
  contacto text,
  created_at timestamptz not null default now()
);

create table public.ordenes_compra (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores (id),
  operacion_id uuid not null references public.operaciones (id),
  incoterm text not null,
  moneda text not null default 'USD',
  estatus orden_estatus not null default 'cotizando_flete',
  fecha_creacion timestamptz not null default now(),
  created_by uuid references public.users (id)
);

-- Auditoría de cambios de estatus (línea de tiempo de la orden)
create table public.orden_eventos (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes_compra (id) on delete cascade,
  estatus_anterior orden_estatus,
  estatus_nuevo orden_estatus not null,
  usuario_id uuid references public.users (id),
  fecha timestamptz not null default now()
);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes_compra (id) on delete cascade,
  tipo documento_tipo not null,
  url_archivo text not null,
  fecha_carga timestamptz not null default now(),
  usuario_id uuid references public.users (id),
  fecha_vencimiento date
);

create table public.cotizaciones_flete (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes_compra (id) on delete cascade,
  proveedor_logistico_id uuid not null references public.proveedores (id),
  costo numeric(14, 2) not null,
  moneda text not null default 'USD',
  tiempo_transito text,
  ruta text,
  vigencia date,
  elegida boolean not null default false,
  justificacion text,
  created_at timestamptz not null default now()
);

create table public.landed_costs (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes_compra (id) on delete cascade,
  fob numeric(14, 2) not null default 0,
  flete numeric(14, 2) not null default 0,
  seguro numeric(14, 2) not null default 0,
  aranceles numeric(14, 2) not null default 0,
  honorarios numeric(14, 2) not null default 0,
  gastos_locales numeric(14, 2) not null default 0,
  total numeric(14, 2) generated always as
    (fob + flete + seguro + aranceles + honorarios + gastos_locales) stored,
  unidades_recibidas numeric(14, 2) not null default 0,
  costo_unitario numeric(14, 4) generated always as (
    case when unidades_recibidas > 0
      then (fob + flete + seguro + aranceles + honorarios + gastos_locales) / unidades_recibidas
      else 0
    end
  ) stored,
  fecha_calculo timestamptz not null default now()
);

create table public.historial_precios (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores (id) on delete cascade,
  articulo text not null,
  precio numeric(14, 4) not null,
  fecha date not null default current_date
);

create table public.tracking (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes_compra (id) on delete cascade,
  numero_guia text not null,
  transportista text,
  estatus text,
  ubicacion_actual text,
  fecha_estimada_entrega date,
  ultima_actualizacion timestamptz not null default now()
);

create index on public.ordenes_compra (operacion_id);
create index on public.ordenes_compra (proveedor_id);
create index on public.orden_eventos (orden_id);
create index on public.documentos (orden_id);
create index on public.cotizaciones_flete (orden_id);
create index on public.landed_costs (orden_id);
create index on public.tracking (orden_id);

-- ---------------------------------------------------------------------------
-- 3. Helpers para RLS (evitan recursión al leer el rol del usuario actual)
-- ---------------------------------------------------------------------------

create function public.current_user_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select rol from public.users where id = auth.uid();
$$;

create function public.current_user_operacion()
returns uuid
language sql stable security definer set search_path = public as $$
  select operacion_id from public.users where id = auth.uid();
$$;

create function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('compras', 'logistica', 'administracion', 'admin_sistema');
$$;

-- Crea automáticamente el perfil en public.users cuando alguien se registra en Supabase Auth.
-- Rol por defecto: 'operacion' (el más restringido); admin_sistema lo ajusta después.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Registra en orden_eventos cada cambio de estatus de una orden.
create function public.log_orden_estatus_change()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or old.estatus is distinct from new.estatus then
    insert into public.orden_eventos (orden_id, estatus_anterior, estatus_nuevo, usuario_id)
    values (new.id, case when tg_op = 'INSERT' then null else old.estatus end, new.estatus, auth.uid());
  end if;
  return new;
end;
$$;

create trigger orden_estatus_change
  after insert or update on public.ordenes_compra
  for each row execute function public.log_orden_estatus_change();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.operaciones enable row level security;
alter table public.users enable row level security;
alter table public.proveedores enable row level security;
alter table public.ordenes_compra enable row level security;
alter table public.orden_eventos enable row level security;
alter table public.documentos enable row level security;
alter table public.cotizaciones_flete enable row level security;
alter table public.landed_costs enable row level security;
alter table public.historial_precios enable row level security;
alter table public.tracking enable row level security;

-- operaciones: lectura para cualquier usuario autenticado; solo admin_sistema escribe.
create policy "operaciones_select" on public.operaciones for select to authenticated using (true);
create policy "operaciones_write" on public.operaciones for all to authenticated
  using (public.current_user_role() = 'admin_sistema')
  with check (public.current_user_role() = 'admin_sistema');

-- users: cada quien ve su propio perfil; admin_sistema ve y administra todos.
create policy "users_select_self_or_admin" on public.users for select to authenticated
  using (id = auth.uid() or public.current_user_role() = 'admin_sistema');
create policy "users_update_admin" on public.users for update to authenticated
  using (public.current_user_role() = 'admin_sistema')
  with check (public.current_user_role() = 'admin_sistema');
create policy "users_update_self_nombre" on public.users for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- proveedores: staff (todo menos "operacion") lee y escribe.
create policy "proveedores_select" on public.proveedores for select to authenticated
  using (public.is_staff());
create policy "proveedores_write" on public.proveedores for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ordenes_compra: staff ve todas; operación solo las de su operación.
create policy "ordenes_select" on public.ordenes_compra for select to authenticated
  using (public.is_staff() or operacion_id = public.current_user_operacion());
create policy "ordenes_insert" on public.ordenes_compra for insert to authenticated
  with check (public.current_user_role() in ('compras', 'admin_sistema'));
create policy "ordenes_update" on public.ordenes_compra for update to authenticated
  using (public.current_user_role() in ('compras', 'logistica', 'administracion', 'admin_sistema'))
  with check (public.current_user_role() in ('compras', 'logistica', 'administracion', 'admin_sistema'));
create policy "ordenes_delete" on public.ordenes_compra for delete to authenticated
  using (public.current_user_role() = 'admin_sistema');

-- orden_eventos: visible para quien puede ver la orden asociada.
create policy "orden_eventos_select" on public.orden_eventos for select to authenticated
  using (exists (
    select 1 from public.ordenes_compra o where o.id = orden_id
    and (public.is_staff() or o.operacion_id = public.current_user_operacion())
  ));

-- documentos: solo staff (la operación solicitante no entra al repositorio, solo recibe el landed cost).
create policy "documentos_select" on public.documentos for select to authenticated
  using (public.is_staff());
create policy "documentos_insert" on public.documentos for insert to authenticated
  with check (public.current_user_role() in ('compras', 'logistica', 'admin_sistema'));
create policy "documentos_delete" on public.documentos for delete to authenticated
  using (usuario_id = auth.uid() or public.current_user_role() = 'admin_sistema');

-- cotizaciones_flete: staff (logística cotiza/elige; compras y administración consultan).
create policy "cotizaciones_select" on public.cotizaciones_flete for select to authenticated
  using (public.is_staff());
create policy "cotizaciones_write" on public.cotizaciones_flete for all to authenticated
  using (public.current_user_role() in ('logistica', 'admin_sistema'))
  with check (public.current_user_role() in ('logistica', 'admin_sistema'));

-- landed_costs: staff ve todo; la operación ve el de sus propias órdenes.
create policy "landed_costs_select" on public.landed_costs for select to authenticated
  using (exists (
    select 1 from public.ordenes_compra o where o.id = orden_id
    and (public.is_staff() or o.operacion_id = public.current_user_operacion())
  ));
create policy "landed_costs_write" on public.landed_costs for all to authenticated
  using (public.current_user_role() in ('logistica', 'admin_sistema'))
  with check (public.current_user_role() in ('logistica', 'admin_sistema'));

-- historial_precios: staff.
create policy "historial_precios_select" on public.historial_precios for select to authenticated
  using (public.is_staff());
create policy "historial_precios_write" on public.historial_precios for all to authenticated
  using (public.current_user_role() in ('compras', 'logistica', 'admin_sistema'))
  with check (public.current_user_role() in ('compras', 'logistica', 'admin_sistema'));

-- tracking: staff ve todo; la operación ve el de sus propias órdenes.
create policy "tracking_select" on public.tracking for select to authenticated
  using (exists (
    select 1 from public.ordenes_compra o where o.id = orden_id
    and (public.is_staff() or o.operacion_id = public.current_user_operacion())
  ));
create policy "tracking_write" on public.tracking for all to authenticated
  using (public.current_user_role() in ('logistica', 'admin_sistema'))
  with check (public.current_user_role() in ('logistica', 'admin_sistema'));

-- ---------------------------------------------------------------------------
-- 5. Storage: bucket privado para los documentos de cada orden
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy "documentos_storage_select" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.is_staff());
create policy "documentos_storage_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.current_user_role() in ('compras', 'logistica', 'admin_sistema'));
create policy "documentos_storage_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and (owner = auth.uid() or public.current_user_role() = 'admin_sistema'));

-- ---------------------------------------------------------------------------
-- 6. Datos semilla mínimos (opcional, borrar o editar antes de producción)
-- ---------------------------------------------------------------------------

-- insert into public.operaciones (nombre) values ('Planta Monterrey'), ('Planta Guadalajara');
