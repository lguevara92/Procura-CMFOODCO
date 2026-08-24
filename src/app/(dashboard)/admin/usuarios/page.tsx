import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { CrearUsuarioForm } from "./CrearUsuarioForm";
import { UsuarioRow } from "./UsuarioRow";
import type { Operacion, UserProfile } from "@/types/database";

export default async function UsuariosPage() {
  const profile = await requireProfile();
  if (profile.rol !== "admin_sistema") redirect("/ordenes");

  const supabase = await createClient();
  const [{ data: usuarios }, { data: operaciones }] = await Promise.all([
    supabase.from("users").select("*").order("nombre"),
    supabase.from("operaciones").select("*").order("nombre"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Usuarios</h1>

      <div className="overflow-x-auto rounded-xl border border-slate-200 p-4">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-3">Nombre</th>
              <th className="py-2 pr-3">Correo</th>
              <th className="py-2 pr-3">Rol</th>
              <th className="py-2 pr-3">Operación</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {((usuarios ?? []) as UserProfile[]).map((usuario) => (
              <UsuarioRow
                key={usuario.id}
                usuario={usuario}
                operaciones={(operaciones ?? []) as Operacion[]}
                esUsuarioActual={usuario.id === profile.id}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Crear usuario</h2>
        <CrearUsuarioForm operaciones={(operaciones ?? []) as Operacion[]} />
      </div>
    </div>
  );
}
