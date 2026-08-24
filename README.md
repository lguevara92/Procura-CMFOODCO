# Procura — CM Foodco

Plataforma interna para Compras/Procura, Logística y Administración: ciclo completo de una compra
internacional, desde cotización de flete hasta landed cost, con checklist de documentos y trazabilidad.

Fases 1 a 5 completas: login + roles, CRUD de órdenes, repositorio de documentos con checklist,
cotizaciones de flete, landed cost (con escáner de facturas/packing list por IA y PDF automático),
base de datos de proveedores, y rastreo de embarques.

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

## 7. Servicios externos opcionales

Cada uno se activa solo con su variable de entorno — sin ella, la función relacionada muestra un error
o se omite silenciosamente, el resto de la app sigue funcionando:

| Variable | Para qué | Dónde se obtiene |
|---|---|---|
| `RESEND_API_KEY` | Notificaciones por correo (cotización elegida, landed cost listo) | resend.com → API Keys |
| `ANTHROPIC_API_KEY` | Escáner de facturas/packing list con IA en landed cost | console.anthropic.com → API Keys |
| `TRACKINGMORE_API_KEY` | Rastreo de embarques | trackingmore.com → API |
| `TRACKINGMORE_WEBHOOK_SECRET` | Protege el webhook de TrackingMore | cualquier cadena aleatoria larga, la generas tú |
| `SUPABASE_SERVICE_ROLE_KEY` | Permite que el webhook de TrackingMore escriba sin sesión de usuario | Supabase → Project Settings → API Keys → `service_role` (secreta) |

### Configurar el webhook de TrackingMore

Para que el estatus se actualice solo (sin depender del botón "Actualizar" manual):

1. En el dashboard de TrackingMore, ve a **Settings → Webhook**.
2. Pon como URL: `https://tu-dominio.vercel.app/api/webhooks/trackingmore?secret=TU_TRACKINGMORE_WEBHOOK_SECRET`
   (el mismo valor que pusiste en la variable de entorno).
3. Guarda. TrackingMore va a llamar esa URL cada vez que cambie el estatus de una guía registrada.

## 8. Roadmap pendiente

- Integración con ClickUp para sincronizar solicitudes de pago a finanzas al crear una orden (pendiente
  de que IT confirme la cuenta/lista correcta).
- Alertas por correo cuando un embarque lleva varios días sin actualización (hoy solo se muestra como
  aviso visual en `/tracking`).
