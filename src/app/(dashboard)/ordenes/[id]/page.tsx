import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { DOCUMENTO_LABELS, DOCUMENTOS_REQUERIDOS, ROLES_QUE_SUBEN_DOCUMENTOS, ROLES_STAFF } from "@/lib/constants";
import { evaluarChecklist } from "@/lib/checklist";
import { StatusBadge } from "@/components/StatusBadge";
import { SemaforoBadge } from "@/components/SemaforoBadge";
import { EstatusSelect } from "./EstatusSelect";
import { DocumentoUploadForm } from "./DocumentoUploadForm";
import { CotizacionForm } from "./CotizacionForm";
import { CotizacionRow } from "./CotizacionRow";
import { LandedCostSection } from "./LandedCostSection";
import { ROLES_LANDED_COST } from "@/lib/constants";
import type { CotizacionFlete, Documento, LandedCost, OrdenEstatus, OrdenEvento, Proveedor } from "@/types/database";

const ROLES_COTIZACIONES = ["logistica", "admin_sistema"];

export default async function OrdenDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: orden } = await supabase
    .from("ordenes_compra")
    .select("*, proveedor:proveedores(nombre), operacion:operaciones(nombre)")
    .eq("id", id)
    .single();

  if (!orden) notFound();

  const puedeGestionarCotizaciones = ROLES_COTIZACIONES.includes(profile.rol);

  const puedeCalcularLandedCost = ROLES_LANDED_COST.includes(profile.rol);

  const [{ data: documentos }, { data: eventos }, { data: cotizaciones }, { data: proveedoresLogisticos }, { data: landedCosts }] =
    await Promise.all([
      supabase.from("documentos").select("*").eq("orden_id", id).order("fecha_carga", { ascending: false }),
      supabase.from("orden_eventos").select("*").eq("orden_id", id).order("fecha", { ascending: true }),
      supabase
        .from("cotizaciones_flete")
        .select("*, proveedor:proveedores(nombre)")
        .eq("orden_id", id)
        .order("costo", { ascending: true }),
      puedeGestionarCotizaciones
        ? supabase.from("proveedores").select("*").eq("tipo", "logistica").order("nombre")
        : Promise.resolve({ data: [] as Proveedor[] }),
      supabase.from("landed_costs").select("*").eq("orden_id", id).order("fecha_calculo", { ascending: false }),
    ]);

  const docs = (documentos ?? []) as Documento[];
  const checklist = evaluarChecklist(docs);
  const esStaff = ROLES_STAFF.includes(profile.rol);
  const puedeSubirDocs = ROLES_QUE_SUBEN_DOCUMENTOS.includes(profile.rol);
  const cotizacionesConProveedor = (cotizaciones ?? []) as unknown as (CotizacionFlete & {
    proveedor: { nombre: string } | null;
  })[];
  const historialLandedCost = (landedCosts ?? []) as LandedCost[];
  const ultimoLandedCost = historialLandedCost[0] ?? null;
  const hayFacturaComercial = docs.some((doc) => doc.tipo === "factura_comercial");

  const docsConUrl = esStaff
    ? await Promise.all(
        docs.map(async (doc) => {
          const { data } = await supabase.storage.from("documentos").createSignedUrl(doc.url_archivo, 60 * 10);
          return { ...doc, signedUrl: data?.signedUrl ?? null };
        }),
      )
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{orden.proveedor?.nombre ?? "Orden"}</h1>
          <p className="text-sm text-slate-500">
            {orden.operacion?.nombre} · {orden.incoterm} · {orden.moneda}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge estatus={orden.estatus as OrdenEstatus} />
          {esStaff && <EstatusSelect ordenId={orden.id} estatusActual={orden.estatus as OrdenEstatus} />}
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Checklist de documentos</h2>
          <SemaforoBadge semaforo={checklist.semaforo} />
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {DOCUMENTOS_REQUERIDOS.map((tipo) => {
            const presente = checklist.presentes.includes(tipo);
            return (
              <li
                key={tipo}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  presente ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                <span>{presente ? "✓" : "○"}</span>
                {DOCUMENTO_LABELS[tipo]}
              </li>
            );
          })}
        </ul>

        {esStaff && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Documentos cargados</h3>
            {docsConUrl.length === 0 && <p className="text-sm text-slate-400">Ningún documento cargado todavía.</p>}
            <ul className="flex flex-col gap-1">
              {docsConUrl.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-slate-50">
                  <span>
                    {DOCUMENTO_LABELS[doc.tipo]}
                    {doc.fecha_vencimiento && (
                      <span className="ml-2 text-xs text-slate-400">vence {doc.fecha_vencimiento}</span>
                    )}
                  </span>
                  {doc.signedUrl ? (
                    <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="text-slate-900 underline">
                      Ver archivo
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">no disponible</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {puedeSubirDocs && (
          <div className="mt-4">
            <DocumentoUploadForm ordenId={orden.id} />
          </div>
        )}
      </section>

      {esStaff && (
        <section className="rounded-xl border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Cotizaciones de flete</h2>

          <ul className="flex flex-col gap-2">
            {cotizacionesConProveedor.map((cotizacion) => (
              <CotizacionRow
                key={cotizacion.id}
                ordenId={orden.id}
                cotizacion={cotizacion}
                puedeElegir={puedeGestionarCotizaciones}
              />
            ))}
            {cotizacionesConProveedor.length === 0 && (
              <li className="text-sm text-slate-400">Aún no hay cotizaciones registradas para esta orden.</li>
            )}
          </ul>

          {puedeGestionarCotizaciones && (
            <div className="mt-4">
              <CotizacionForm ordenId={orden.id} proveedores={(proveedoresLogisticos ?? []) as Proveedor[]} />
            </div>
          )}
        </section>
      )}

      {(esStaff || ultimoLandedCost) && (
        <section className="rounded-xl border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Landed cost</h2>

          {ultimoLandedCost ? (
            <div className="mb-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-3 py-2 text-slate-500">FOB / Factura</td>
                    <td className="px-3 py-2 text-slate-900">
                      {ultimoLandedCost.fob.toLocaleString("es-MX", { style: "currency", currency: "USD" })}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-500">Flete internacional</td>
                    <td className="px-3 py-2 text-slate-900">
                      {ultimoLandedCost.flete.toLocaleString("es-MX", { style: "currency", currency: "USD" })}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-500">Seguro</td>
                    <td className="px-3 py-2 text-slate-900">
                      {ultimoLandedCost.seguro.toLocaleString("es-MX", { style: "currency", currency: "USD" })}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-500">Aranceles</td>
                    <td className="px-3 py-2 text-slate-900">
                      {ultimoLandedCost.aranceles.toLocaleString("es-MX", { style: "currency", currency: "USD" })}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-500">Honorarios agente aduanal</td>
                    <td className="px-3 py-2 text-slate-900">
                      {ultimoLandedCost.honorarios.toLocaleString("es-MX", { style: "currency", currency: "USD" })}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-500">Gastos locales</td>
                    <td className="px-3 py-2 text-slate-900">
                      {ultimoLandedCost.gastos_locales.toLocaleString("es-MX", { style: "currency", currency: "USD" })}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-3 py-2 text-slate-900">Total</td>
                    <td className="px-3 py-2 text-slate-900">
                      {ultimoLandedCost.total.toLocaleString("es-MX", { style: "currency", currency: "USD" })}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-500">Unidades recibidas</td>
                    <td className="px-3 py-2 text-slate-900">{ultimoLandedCost.unidades_recibidas}</td>
                  </tr>
                  <tr className="bg-emerald-50 font-semibold">
                    <td className="px-3 py-2 text-emerald-800">Costo unitario</td>
                    <td className="px-3 py-2 text-emerald-800">
                      {ultimoLandedCost.costo_unitario.toLocaleString("es-MX", { style: "currency", currency: "USD" })}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="px-3 py-2 text-xs text-slate-400">
                Calculado el {new Date(ultimoLandedCost.fecha_calculo).toLocaleString("es-MX")}
              </p>
            </div>
          ) : (
            esStaff && <p className="mb-4 text-sm text-slate-400">Aún no se ha calculado el landed cost de esta orden.</p>
          )}

          {historialLandedCost.length > 1 && (
            <details className="mb-4">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
                Histórico ({historialLandedCost.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-1">
                {historialLandedCost.map((lc) => (
                  <li key={lc.id} className="text-xs text-slate-500">
                    {new Date(lc.fecha_calculo).toLocaleString("es-MX")} — total{" "}
                    {lc.total.toLocaleString("es-MX", { style: "currency", currency: "USD" })}, costo unitario{" "}
                    {lc.costo_unitario.toLocaleString("es-MX", { style: "currency", currency: "USD" })}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {puedeCalcularLandedCost && <LandedCostSection ordenId={orden.id} hayFactura={hayFacturaComercial} />}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Línea de tiempo</h2>
        <ol className="flex flex-col gap-2">
          {((eventos ?? []) as OrdenEvento[]).map((evento) => (
            <li key={evento.id} className="flex items-center gap-3 text-sm text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span className="text-slate-400">{new Date(evento.fecha).toLocaleString("es-MX")}</span>
              <span>
                {evento.estatus_anterior ? `${evento.estatus_anterior} → ` : "Creada con estatus "}
                <strong className="text-slate-900">{evento.estatus_nuevo}</strong>
              </span>
            </li>
          ))}
          {(!eventos || eventos.length === 0) && <li className="text-sm text-slate-400">Sin eventos registrados.</li>}
        </ol>
      </section>
    </div>
  );
}
