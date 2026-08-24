import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_QUE_CREAN_ORDENES } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { SemaforoBadge } from "@/components/SemaforoBadge";
import { evaluarChecklist } from "@/lib/checklist";
import type { Documento, OrdenEstatus, OrdenCompra } from "@/types/database";

type OrdenConRelaciones = OrdenCompra & {
  proveedor: { nombre: string } | null;
  operacion: { nombre: string } | null;
  documentos: Pick<Documento, "tipo" | "fecha_vencimiento">[];
};

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ mostrar_cerradas?: string }>;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { mostrar_cerradas } = await searchParams;
  const mostrarCerradas = mostrar_cerradas === "1";

  const { data, error } = await supabase
    .from("ordenes_compra")
    .select(
      "*, proveedor:proveedores(nombre), operacion:operaciones(nombre), documentos(tipo, fecha_vencimiento)",
    )
    .order("fecha_creacion", { ascending: false });

  const todasLasOrdenes = (data ?? []) as unknown as OrdenConRelaciones[];
  const ordenesCerradas = todasLasOrdenes.filter((o) => o.estatus === "cerrado");
  const ordenes = mostrarCerradas ? todasLasOrdenes : todasLasOrdenes.filter((o) => o.estatus !== "cerrado");
  const puedeCrear = ROLES_QUE_CREAN_ORDENES.includes(profile.rol);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Órdenes de compra</h1>
        {puedeCrear && (
          <Link
            href="/ordenes/nueva"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Nueva orden
          </Link>
        )}
      </div>

      <div>
        <Link
          href={mostrarCerradas ? "/ordenes" : "/ordenes?mostrar_cerradas=1"}
          className="text-sm text-slate-500 hover:underline"
        >
          {mostrarCerradas ? "Ocultar cerradas" : `Mostrar cerradas (${ordenesCerradas.length})`}
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">No se pudieron cargar las órdenes: {error.message}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Operación</th>
              <th className="px-4 py-3">Incoterm</th>
              <th className="px-4 py-3">Estatus</th>
              <th className="px-4 py-3">Documentos</th>
              <th className="px-4 py-3">Creada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ordenes.map((orden) => {
              const checklist = evaluarChecklist(orden.documentos ?? []);
              return (
                <tr key={orden.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/ordenes/${orden.id}`} className="font-medium text-slate-900 hover:underline">
                      {orden.proveedor?.nombre ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{orden.operacion?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{orden.incoterm}</td>
                  <td className="px-4 py-3">
                    <StatusBadge estatus={orden.estatus as OrdenEstatus} />
                  </td>
                  <td className="px-4 py-3">
                    <SemaforoBadge semaforo={checklist.semaforo} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(orden.fecha_creacion).toLocaleDateString("es-MX")}
                  </td>
                </tr>
              );
            })}

            {ordenes.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Aún no hay órdenes de compra.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
