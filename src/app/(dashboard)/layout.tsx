import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { ROLE_LABELS, ROLES_STAFF } from "@/lib/constants";
import { signOut } from "@/app/login/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const canSeeAdminChecklist = profile.rol === "administracion" || profile.rol === "admin_sistema";
  const canSeeProveedores = ROLES_STAFF.includes(profile.rol);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="CM Foodco" className="h-8 w-auto" />
          <span className="text-lg font-semibold text-slate-900">Procura</span>

          <nav className="ml-8 flex items-center gap-1">
            <Link
              href="/ordenes"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Órdenes
            </Link>
            {canSeeAdminChecklist && (
              <Link
                href="/admin/documentos"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Admin Ordenes
              </Link>
            )}
            {canSeeProveedores && (
              <Link
                href="/proveedores"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Proveedores
              </Link>
            )}
            <Link
              href="/tracking"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Rastreo
            </Link>
            {profile.rol === "admin_sistema" && (
              <Link
                href="/admin/usuarios"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Usuarios
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <div className="font-medium text-slate-900">{profile.nombre}</div>
            <div className="text-xs text-slate-500">{ROLE_LABELS[profile.rol]}</div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 bg-white px-6 py-6">{children}</main>
    </div>
  );
}
