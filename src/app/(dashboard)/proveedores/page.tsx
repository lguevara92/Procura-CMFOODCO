import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_STAFF } from "@/lib/constants";
import type { Proveedor } from "@/types/database";

export default async function ProveedoresPage() {
  const profile = await requireProfile();
  if (!ROLES_STAFF.includes(profile.rol)) redirect("/ordenes");

  const supabase = await createClient();
  const { data } = await supabase.from("proveedores").select("*").order("nombre");
  const proveedores = (data ?? []) as Proveedor[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Proveedores</h1>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Contacto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proveedores.map((proveedor) => (
              <tr key={proveedor.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/proveedores/${proveedor.id}`} className="font-medium text-slate-900 hover:underline">
                    {proveedor.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {proveedor.tipo === "compra" ? "Compra" : "Logística"}
                </td>
                <td className="px-4 py-3 text-slate-500">{proveedor.contacto ?? "—"}</td>
              </tr>
            ))}

            {proveedores.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  Aún no hay proveedores registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
