import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_STAFF } from "@/lib/constants";
import type { HistorialPrecio, Proveedor } from "@/types/database";

const fmtUsd = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "USD" });

type HistorialConProveedor = HistorialPrecio & {
  proveedor: Pick<Proveedor, "id" | "nombre" | "tipo"> | null;
};

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireProfile();
  if (!ROLES_STAFF.includes(profile.rol)) redirect("/ordenes");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();
  const { data } = await supabase.from("proveedores").select("*").order("nombre");
  const proveedores = (data ?? []) as Proveedor[];

  let resultados: Map<string, HistorialConProveedor[]> | null = null;
  if (query) {
    const { data: historialData } = await supabase
      .from("historial_precios")
      .select("*, proveedor:proveedores(id, nombre, tipo)")
      .ilike("articulo", `%${query}%`)
      .order("fecha", { ascending: false });

    resultados = new Map();
    for (const item of (historialData ?? []) as unknown as HistorialConProveedor[]) {
      const clave = item.articulo.trim().toLowerCase();
      const lista = resultados.get(clave) ?? [];
      lista.push(item);
      resultados.set(clave, lista);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Proveedores</h1>

      <form className="flex items-end gap-2 rounded-lg border border-slate-200 p-4">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Buscar producto</label>
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Ej. tornillo hexagonal 1/2..."
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
          Buscar
        </button>
        {query && (
          <Link href="/proveedores" className="text-sm text-slate-500 hover:underline">
            Limpiar
          </Link>
        )}
      </form>

      {resultados && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Resultados para &ldquo;{query}&rdquo; ({resultados.size} producto{resultados.size === 1 ? "" : "s"})
          </h2>
          {resultados.size === 0 ? (
            <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-400">
              Ningún proveedor tiene ese producto en su historial de precios.
            </p>
          ) : (
            Array.from(resultados.entries()).map(([clave, items]) => (
              <div key={clave} className="overflow-x-auto rounded-xl border border-slate-200 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-900">{items[0].articulo}</p>
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Proveedor</th>
                      <th className="py-2 pr-3">Precio</th>
                      <th className="py-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 pr-3">
                          {item.proveedor ? (
                            <Link href={`/proveedores/${item.proveedor.id}`} className="font-medium text-slate-900 hover:underline">
                              {item.proveedor.nombre}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 pr-3 text-slate-600">{fmtUsd(item.precio)}</td>
                        <td className="py-2 text-slate-500">{new Date(item.fecha).toLocaleDateString("es-MX")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}

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
