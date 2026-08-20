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
import type { CotizacionFlete, Documento, OrdenEstatus, OrdenEvento, Proveedor } from "@/types/database";

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

  const [{ data: documentos }, { data: eventos }, { data: cotizaciones }, { data: proveedoresLogisticos }] =
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
    ]);

  const docs = (documentos ?? []) as Documento[];
  const checklist = evaluarChecklist(docs);
  const esStaff = ROLES_STAFF.includes(profile.rol);
  const puedeSubirDocs = ROLES_QUE_SUBEN_DOCUMENTOS.includes(profile.rol);
  const cotizacionesConProveedor = (cotizaciones ?? []) as unknown as (CotizacionFlete & {
    proveedor: { nombre: string } | null;
  })[];

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
