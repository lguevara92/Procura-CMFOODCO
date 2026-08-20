# Procura — CM Foodco

Plataforma interna para Compras/Procura, Logística y Administración: ciclo completo de una compra
internacional, desde cotización de flete hasta landed cost, con checklist de documentos y trazabilidad.

Este repo contiene la **Fase 1**: login + roles, CRUD de órdenes de compra, repositorio de documentos
y checklist automático (incluyendo la vista de Administración). Las fases siguientes (cotizaciones de
flete, landed cost, base de datos de proveedores, tracking) se construyen sobre esta misma base — el
esquema de las tablas para esas fases ya está incluido en `supabase/schema.sql`.

## 1. Requisitos

- Node.js 20+
- Una cuenta y proyecto en [Supabase](https://supabase.com) (plan gratuito es suficiente para arrancar)

## 2. Configurar Supabase

1. Crea un proyecto nuevo en Supabase.
2. Ve a **SQL Editor** y ejecuta completo el contenido de [`supabase/schema.sql`](supabase/schema.sql).
   Esto crea todas las tablas, roles, políticas de seguridad (RLS) y el bucket de Storage `documentos`.
3. Ve a **Project Settings → API** y copia:
   - `Project URL`
   - `anon public` key
4. Crea al menos una fila en `operaciones` (por ejemplo desde el Table Editor): la operación/planta que
   podrá recibir órdenes de compra.

## 3. Variables de entorno

Copia `.env.local.example` a `.env.local` y llena los valores del paso anterior:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## 4. Correr el proyecto

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## 5. Crear el primer usuario (Admin del sistema)

No hay pantalla de "registro" pública — los usuarios se crean vía Supabase Auth y su rol se asigna en
la tabla `users`:

1. En el dashboard de Supabase, ve a **Authentication → Users → Add user** y crea un usuario con correo
   y contraseña.
2. Al crearse, un trigger genera automáticamente su fila en `public.users` con rol `operacion` (el más
   restringido).
3. En el **Table Editor**, abre `users` y cambia el campo `rol` de ese usuario a `admin_sistema`.
4. Ahora puedes iniciar sesión en la app con ese usuario y desde ahí (Table Editor por ahora, hasta que
   se construya una pantalla de administración de usuarios) dar de alta al resto del equipo y asignar
   sus roles: `compras`, `logistica`, `administracion`, `operacion`.
5. Si un usuario es de rol `operacion`, asígnale también su `operacion_id` para que solo vea las
   órdenes de su operación.

## 6. Roles del sistema

| Rol | Puede |
|---|---|
| `compras` | Crear órdenes de compra, subir factura comercial / packing list, ver checklist |
| `logistica` | Subir BL/AWB, pedimento, certificados; cambiar estatus de la orden |
| `administracion` | Ver el checklist de documentos de **todas** las órdenes (`/admin/documentos`), filtrar por proveedor/operación/antigüedad |
| `operacion` | Solo lectura de las órdenes de su propia operación (estatus, sin acceso al repositorio de documentos) |
| `admin_sistema` | Todo lo anterior + gestión de usuarios, roles y catálogo de proveedores |

## 7. Identidad visual pendiente

El header usa un placeholder ("CM" sobre fondo oscuro) en vez del logo real de CM Foodco. Para
reemplazarlo:

1. Coloca el archivo del logo (idealmente `.svg` o `.png` con fondo transparente) en `public/logo.svg`.
2. En [`src/app/(dashboard)/layout.tsx`](src/app/(dashboard)/layout.tsx) y
   [`src/app/login/page.tsx`](src/app/login/page.tsx), reemplaza el `<div>` con las iniciales "CM" por
   `<img src="/logo.svg" alt="CM Foodco" className="h-9 w-9" />`.
3. El color de acento (`--accent` en [`src/app/globals.css`](src/app/globals.css)) es un placeholder —
   ajústalo al manual de marca de CM Foodco o al color principal del logo.

## 8. Próximas fases

2. Cotizaciones de flete + selección + notificación por correo.
3. Landed cost + envío automático a operación + histórico.
4. Base de datos de proveedores con métricas e histórico de precios, dashboards.
5. Rastreo unificado de embarques (AfterShip / 17TRACK / TrackingMore) + alertas.

El modelo de datos completo para estas fases (`cotizaciones_flete`, `landed_costs`,
`historial_precios`, `tracking`) ya existe en la base de datos desde la Fase 1.
