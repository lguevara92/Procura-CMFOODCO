import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { DOCUMENTO_LABELS, DOCUMENTOS_REQUERIDOS } from "@/lib/constants";
import { evaluarChecklist } from "@/lib/checklist";
import { SemaforoBadge } from "@/components/SemaforoBadge";
import { StatusBadge } from "@/components/StatusBadge";
import type { Documento, OrdenCompra, OrdenEstatus, OrdenEvento, Operacion, Proveedor } from "@/types/database";

type OrdenConRelaciones = OrdenCompra & {
  proveedor: { nombre: string } | null;
  operacion: { nombre: string } | null;
  documentos: Pick<Documento, "tipo" | "fecha_vencimiento">[];
};

export default async function AdminDocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ proveedor_id?: string; operacion_id?: string; dias_min?: string }>;
}) {
  const profile = await requireProfile();
  if (profile.rol !== "administracion" && profile.rol !== "admin_sistema") {
    redirect("/ordenes");
  }

  const { proveedor_id, operacion_id, dias_min } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("ordenes_compra")
    .select("*, proveedor:proveedores(nombre), operacion:operaciones(nombre), documentos(tipo, fecha_vencimiento)")
    .order("fecha_creacion", { ascending: false });

  if (proveedor_id) query = query.eq("proveedor_id", proveedor_id);
  if (operacion_id) query = query.eq("operacion_id", operacion_id);

  const [{ data: ordenesData }, { data: proveedores }, { data: operaciones }] = await Promise.all([
    query,
    supabase.from("proveedores").select("*").order("nombre"),
    supabase.from("operaciones").select("*").order("nombre"),
  ]);

  let ordenes = (ordenesData ?? []) as unknown as OrdenConRelaciones[];

  const diasMinNum = dias_min ? Number(dias_min) : 0;
  if (diasMinNum > 0) {
    // eslint-disable-next-line react-hooks/purity -- página de servidor, se evalúa una vez por request
    const limite = Date.now() - diasMinNum * 24 * 60 * 60 * 1000;
    ordenes = ordenes.filter((o) => new Date(o.fecha_creacion).getTime() <= limite);
  }

  const ordenIdsCerradas = ordenes.filter((o) => o.estatus === "cerrado").map((o) => o.id);
  const { data: eventosCierre } = ordenIdsCerradas.length
    ? await supabase
        .from("orden_eventos")
        .select("orden_id, fecha")
        .eq("estatus_nuevo", "cerrado")
        .in("orden_id", ordenIdsCerradas)
        .order("fecha", { ascending: false })
    : { data: [] as Pick<OrdenEvento, "orden_id" | "fecha">[] };

  const fechaCierrePorOrden = new Map<string, string>();
  for (const evento of eventosCierre ?? []) {
    if (!fechaCierrePorOrden.has(evento.orden_id)) fechaCierrePorOrden.set(evento.orden_id, evento.fecha);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Admin Órdenes — checklist de todas las órdenes</h1>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Proveedor</label>
          <select name="proveedor_id" defaultValue={proveedor_id ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Todos</option>
            {(proveedores as Proveedor[] | null)?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Operación</label>
          <select name="operacion_id" defaultValue={operacion_id ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Todas</option>
            {(operaciones as Operacion[] | null)?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Antigüedad mínima (días)</label>
          <input
            type="number"
            name="dias_min"
            min={0}
            defaultValue={dias_min ?? ""}
            className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
          Filtrar
        </button>
        <Link href="/admin/documentos" className="text-sm text-slate-500 hover:underline">
          Limpiar
        </Link>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Operación</th>
              <th className="px-4 py-3">Estatus</th>
              <th className="px-4 py-3">Checklist</th>
              <th className="px-4 py-3">Documentos faltantes</th>
              <th className="px-4 py-3">Creada</th>
              <th className="px-4 py-3">Cerrada</th>
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
                  <td className="px-4 py-3">
                    <StatusBadge estatus={orden.estatus as OrdenEstatus} />
                  </td>
                  <td className="px-4 py-3">
                    <SemaforoBadge semaforo={checklist.semaforo} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {checklist.faltantes.length === 0
                      ? "—"
                      : checklist.faltantes.map((tipo) => DOCUMENTO_LABELS[tipo]).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(orden.fecha_creacion).toLocaleDateString("es-MX")}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {fechaCierrePorOrden.has(orden.id)
                      ? new Date(fechaCierrePorOrden.get(orden.id)!).toLocaleDateString("es-MX")
                      : "—"}
                  </td>
                </tr>
              );
            })}

            {ordenes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No hay órdenes que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Documentos requeridos por orden: {DOCUMENTOS_REQUERIDOS.map((t) => DOCUMENTO_LABELS[t]).join(", ")}.
      </p>
    </div>
  );
}
