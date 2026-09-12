import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { DOCUMENTO_LABELS, ESTATUS_LABELS, TIPO_ENVIO_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import type { Documento, LandedCost, OrdenCompra, OrdenEstatus, OrdenTipoEnvio } from "@/types/database";

const fmtUsd = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "USD" });

// Cuántos días puede llevar abierta una orden (sin llegar a entregado/cerrado)
// antes de marcarla como atrasada en este panel.
const DIAS_ATRASO = 30;
// Ventana hacia adelante para mostrar documentos por vencer (además de los ya vencidos).
const DIAS_VENCIMIENTO = 30;

type OrdenConRelaciones = OrdenCompra & {
  proveedor: { nombre: string } | null;
  operacion: { nombre: string } | null;
};

type DocumentoConOrden = Documento & {
  orden: {
    id: string;
    estatus: OrdenEstatus;
    proveedor: { nombre: string } | null;
    operacion: { nombre: string } | null;
  } | null;
};

export default async function DashboardPage() {
  const profile = await requireProfile();
  if (profile.rol !== "administracion" && profile.rol !== "admin_sistema") {
    redirect("/ordenes");
  }

  const supabase = await createClient();

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [{ data: ordenesData }, { data: landedCostsData }, { data: documentosData }] = await Promise.all([
    supabase
      .from("ordenes_compra")
      .select("*, proveedor:proveedores(nombre), operacion:operaciones(nombre)")
      .order("fecha_creacion", { ascending: true }),
    supabase
      .from("landed_costs")
      .select("*")
      .gte("fecha_calculo", inicioMes.toISOString())
      .order("fecha_calculo", { ascending: false }),
    supabase
      .from("documentos")
      .select("*, orden:ordenes_compra(id, estatus, proveedor:proveedores(nombre), operacion:operaciones(nombre))")
      .not("fecha_vencimiento", "is", null)
      .order("fecha_vencimiento", { ascending: true }),
  ]);

  const ordenes = (ordenesData ?? []) as unknown as OrdenConRelaciones[];
  const landedCosts = (landedCostsData ?? []) as LandedCost[];
  const documentos = (documentosData ?? []) as unknown as DocumentoConOrden[];

  // Gasto por operación este mes: solo el landed cost más reciente de cada orden.
  const ultimoLandedPorOrden = new Map<string, LandedCost>();
  for (const lc of landedCosts) {
    if (!ultimoLandedPorOrden.has(lc.orden_id)) ultimoLandedPorOrden.set(lc.orden_id, lc);
  }
  const ordenesPorId = new Map(ordenes.map((o) => [o.id, o]));
  const gastoPorOperacion = new Map<string, number>();
  let gastoTotalMes = 0;
  for (const lc of ultimoLandedPorOrden.values()) {
    const orden = ordenesPorId.get(lc.orden_id);
    const nombreOperacion = orden?.operacion?.nombre ?? "Sin operación";
    gastoPorOperacion.set(nombreOperacion, (gastoPorOperacion.get(nombreOperacion) ?? 0) + lc.total);
    gastoTotalMes += lc.total;
  }
  const gastoOrdenado = Array.from(gastoPorOperacion.entries()).sort((a, b) => b[1] - a[1]);

  // Órdenes abiertas (no entregadas/cerradas), la más antigua primero.
  // eslint-disable-next-line react-hooks/purity -- página de servidor, se evalúa una vez por request
  const hoy = Date.now();
  const ordenesAbiertas = ordenes
    .filter((o) => o.estatus !== "entregado" && o.estatus !== "cerrado")
    .map((o) => ({
      ...o,
      diasAbierta: Math.floor((hoy - new Date(o.fecha_creacion).getTime()) / 86400000),
    }))
    .sort((a, b) => b.diasAbierta - a.diasAbierta);
  const ordenesAtrasadas = ordenesAbiertas.filter((o) => o.diasAbierta >= DIAS_ATRASO);

  // Documentos vencidos o por vencer en los próximos DIAS_VENCIMIENTO días.
  const hoyStr = new Date().toISOString().slice(0, 10);
  const limiteStr = new Date(hoy + DIAS_VENCIMIENTO * 86400000).toISOString().slice(0, 10);
  const documentosPorVencer = documentos.filter(
    (d) =>
      d.fecha_vencimiento &&
      d.fecha_vencimiento <= limiteStr &&
      d.orden?.estatus !== "cerrado" &&
      d.orden?.estatus !== "entregado",
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Gasto total este mes (landed cost)" value={fmtUsd(gastoTotalMes)} />
        <Stat label="Órdenes abiertas" value={String(ordenesAbiertas.length)} />
        <Stat label={`Órdenes atrasadas (${DIAS_ATRASO}+ días abiertas)`} value={String(ordenesAtrasadas.length)} tono={ordenesAtrasadas.length > 0 ? "alerta" : undefined} />
      </div>

      <section className="rounded-xl border border-slate-200 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Gasto por operación este mes</h2>
        {gastoOrdenado.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no hay landed cost calculado este mes.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {gastoOrdenado.map(([operacion, monto]) => (
              <li key={operacion} className="flex items-center justify-between rounded-md px-2 py-1 text-sm">
                <span className="text-slate-600">{operacion}</span>
                <span className="font-medium text-slate-900">{fmtUsd(monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Documentos vencidos o por vencer (próximos {DIAS_VENCIMIENTO} días)
        </h2>
        {documentosPorVencer.length === 0 ? (
          <p className="text-sm text-slate-400">No hay documentos vencidos ni por vencer.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Orden</th>
                  <th className="py-2 pr-3">Documento</th>
                  <th className="py-2">Vence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documentosPorVencer.map((doc) => {
                  const vencido = doc.fecha_vencimiento! < hoyStr;
                  return (
                    <tr key={doc.id}>
                      <td className="py-2 pr-3">
                        {doc.orden ? (
                          <Link href={`/ordenes/${doc.orden.id}`} className="text-slate-900 hover:underline">
                            {doc.orden.proveedor?.nombre ?? "—"} · {doc.orden.operacion?.nombre ?? "—"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{DOCUMENTO_LABELS[doc.tipo]}</td>
                      <td className={`py-2 ${vencido ? "font-medium text-red-600" : "text-amber-600"}`}>
                        {new Date(doc.fecha_vencimiento!).toLocaleDateString("es-MX")}
                        {vencido ? " (vencido)" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Órdenes abiertas más antiguas</h2>
        {ordenesAbiertas.length === 0 ? (
          <p className="text-sm text-slate-400">No hay órdenes abiertas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Proveedor</th>
                  <th className="py-2 pr-3">Operación</th>
                  <th className="py-2 pr-3">Tipo de envío</th>
                  <th className="py-2 pr-3">Estatus</th>
                  <th className="py-2">Días abierta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordenesAbiertas.slice(0, 10).map((orden) => (
                  <tr key={orden.id}>
                    <td className="py-2 pr-3">
                      <Link href={`/ordenes/${orden.id}`} className="font-medium text-slate-900 hover:underline">
                        {orden.proveedor?.nombre ?? "—"}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{orden.operacion?.nombre ?? "—"}</td>
                    <td className="py-2 pr-3 text-slate-600">{TIPO_ENVIO_LABELS[orden.tipo_envio as OrdenTipoEnvio]}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge estatus={orden.estatus as OrdenEstatus} />
                    </td>
                    <td className={`py-2 ${orden.diasAbierta >= DIAS_ATRASO ? "font-medium text-red-600" : "text-slate-500"}`}>
                      {orden.diasAbierta} días
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ordenesAbiertas.length > 10 && (
              <p className="mt-2 text-xs text-slate-400">
                Mostrando 10 de {ordenesAbiertas.length} órdenes abiertas — ve a{" "}
                <Link href="/ordenes" className="underline">
                  Órdenes
                </Link>{" "}
                para ver todas.
              </p>
            )}
          </div>
        )}
      </section>

      <p className="text-xs text-slate-400">Estatus: {Object.values(ESTATUS_LABELS).join(", ")}.</p>
    </div>
  );
}

function Stat({ label, value, tono }: { label: string; value: string; tono?: "alerta" }) {
  return (
    <div className={`rounded-xl border p-4 ${tono === "alerta" ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${tono === "alerta" ? "text-red-700" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}
