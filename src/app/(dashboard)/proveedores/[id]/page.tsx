import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_STAFF } from "@/lib/constants";
import { parseDiasTransito, promedio } from "@/lib/proveedorMetrics";
import { StatusBadge } from "@/components/StatusBadge";
import type {
  CotizacionFlete,
  Documento,
  HistorialPrecio,
  LandedCost,
  OrdenCompra,
  OrdenEstatus,
  OrdenEvento,
  Proveedor,
} from "@/types/database";

const fmtUsd = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "USD" });

export default async function ProveedorDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  if (!ROLES_STAFF.includes(profile.rol)) redirect("/ordenes");

  const supabase = await createClient();

  const { data: proveedorData } = await supabase.from("proveedores").select("*").eq("id", id).single();
  if (!proveedorData) notFound();
  const proveedor = proveedorData as Proveedor;

  const { data: historialPrecios } = await supabase
    .from("historial_precios")
    .select("*")
    .eq("proveedor_id", id)
    .order("fecha", { ascending: false })
    .order("articulo");

  const historial = (historialPrecios ?? []) as HistorialPrecio[];
  const documentoIds = Array.from(new Set(historial.map((h) => h.documento_id).filter((v): v is string => !!v)));
  const { data: documentosHistorial } = documentoIds.length
    ? await supabase.from("documentos").select("id, fecha_carga, url_archivo").in("id", documentoIds)
    : { data: [] as Pick<Documento, "id" | "fecha_carga" | "url_archivo">[] };

  const facturasPorId = new Map<string, { fechaCarga: string; signedUrl: string | null }>();
  await Promise.all(
    (documentosHistorial ?? []).map(async (doc) => {
      const { data } = await supabase.storage.from("documentos").createSignedUrl(doc.url_archivo, 60 * 10);
      facturasPorId.set(doc.id, { fechaCarga: doc.fecha_carga, signedUrl: data?.signedUrl ?? null });
    }),
  );

  if (proveedor.tipo === "compra") {
    const { data: ordenesData } = await supabase
      .from("ordenes_compra")
      .select("*, operacion:operaciones(nombre)")
      .eq("proveedor_id", id)
      .order("fecha_creacion", { ascending: false });

    const ordenes = (ordenesData ?? []) as unknown as (OrdenCompra & { operacion: { nombre: string } | null })[];
    const ordenIds = ordenes.map((o) => o.id);

    const [{ data: landedCostsData }, { data: documentosData }, { data: eventosData }] = await Promise.all([
      ordenIds.length
        ? supabase.from("landed_costs").select("*").in("orden_id", ordenIds).order("fecha_calculo", { ascending: false })
        : Promise.resolve({ data: [] as LandedCost[] }),
      ordenIds.length
        ? supabase.from("documentos").select("*").in("orden_id", ordenIds).eq("tipo", "factura_comercial")
        : Promise.resolve({ data: [] as Documento[] }),
      ordenIds.length
        ? supabase.from("orden_eventos").select("*").in("orden_id", ordenIds).eq("estatus_nuevo", "entregado")
        : Promise.resolve({ data: [] as OrdenEvento[] }),
    ]);

    const landedCosts = (landedCostsData ?? []) as LandedCost[];
    const documentos = (documentosData ?? []) as Documento[];
    const eventosEntregado = (eventosData ?? []) as OrdenEvento[];

    // Último landed cost calculado por orden.
    const ultimoLandedPorOrden = new Map<string, LandedCost>();
    for (const lc of landedCosts) {
      if (!ultimoLandedPorOrden.has(lc.orden_id)) ultimoLandedPorOrden.set(lc.orden_id, lc);
    }
    const montoTotal = Array.from(ultimoLandedPorOrden.values()).reduce((suma, lc) => suma + lc.total, 0);

    const diasEntrega = ordenes
      .map((orden) => {
        const evento = eventosEntregado.find((e) => e.orden_id === orden.id);
        if (!evento) return null;
        const dias = (new Date(evento.fecha).getTime() - new Date(orden.fecha_creacion).getTime()) / (1000 * 60 * 60 * 24);
        return dias >= 0 ? dias : null;
      })
      .filter((d): d is number => d !== null);
    const tiempoPromedioEntrega = promedio(diasEntrega);

    const docsConUrl = await Promise.all(
      documentos.map(async (doc) => {
        const { data } = await supabase.storage.from("documentos").createSignedUrl(doc.url_archivo, 60 * 10);
        return { ...doc, signedUrl: data?.signedUrl ?? null };
      }),
    );

    return (
      <div className="flex flex-col gap-6">
        <FichaHeader proveedor={proveedor} />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Órdenes históricas" value={String(ordenes.length)} />
          <Stat label="Monto total (landed cost)" value={fmtUsd(montoTotal)} />
          <Stat label="Facturas asociadas" value={String(documentos.length)} />
          <Stat
            label="Tiempo promedio de entrega"
            value={tiempoPromedioEntrega !== null ? `${tiempoPromedioEntrega.toFixed(1)} días` : "—"}
          />
        </div>

        <section className="rounded-xl border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Órdenes de compra</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Operación</th>
                  <th className="py-2 pr-3">Estatus</th>
                  <th className="py-2 pr-3">Landed cost</th>
                  <th className="py-2">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordenes.map((orden) => (
                  <tr key={orden.id}>
                    <td className="py-2 pr-3">
                      <Link href={`/ordenes/${orden.id}`} className="text-slate-900 hover:underline">
                        {orden.operacion?.nombre ?? "—"}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge estatus={orden.estatus as OrdenEstatus} />
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {ultimoLandedPorOrden.has(orden.id) ? fmtUsd(ultimoLandedPorOrden.get(orden.id)!.total) : "—"}
                    </td>
                    <td className="py-2 text-slate-500">{new Date(orden.fecha_creacion).toLocaleDateString("es-MX")}</td>
                  </tr>
                ))}
                {ordenes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Este proveedor no tiene órdenes todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Facturas asociadas</h2>
          <ul className="flex flex-col gap-1">
            {docsConUrl.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-slate-50">
                <span className="text-slate-600">{new Date(doc.fecha_carga).toLocaleDateString("es-MX")}</span>
                {doc.signedUrl ? (
                  <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="text-slate-900 underline">
                    Ver factura
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">no disponible</span>
                )}
              </li>
            ))}
            {docsConUrl.length === 0 && <p className="text-sm text-slate-400">Sin facturas cargadas todavía.</p>}
          </ul>
        </section>

        <HistorialPreciosSection historial={historial} facturasPorId={facturasPorId} />
      </div>
    );
  }

  // Proveedor logístico
  const { data: cotizacionesData } = await supabase
    .from("cotizaciones_flete")
    .select("*")
    .eq("proveedor_logistico_id", id);

  const cotizaciones = (cotizacionesData ?? []) as CotizacionFlete[];
  const elegidas = cotizaciones.filter((c) => c.elegida);
  const pctGanadas = cotizaciones.length > 0 ? (elegidas.length / cotizaciones.length) * 100 : null;

  const tiemposValidos = cotizaciones
    .map((c) => parseDiasTransito(c.tiempo_transito))
    .filter((d): d is number => d !== null);
  const tiempoTransitoPromedio = promedio(tiemposValidos);

  const ordenIdsElegidas = elegidas.map((c) => c.orden_id);
  const { data: landedCostsData } = ordenIdsElegidas.length
    ? await supabase.from("landed_costs").select("*").in("orden_id", ordenIdsElegidas).order("fecha_calculo", { ascending: false })
    : { data: [] as LandedCost[] };
  const landedCosts = (landedCostsData ?? []) as LandedCost[];
  const cbmPorOrden = new Map<string, number>();
  for (const lc of landedCosts) {
    if (lc.cbm && !cbmPorOrden.has(lc.orden_id)) cbmPorOrden.set(lc.orden_id, lc.cbm);
  }

  const costoPorCbmPorRuta = new Map<string, number[]>();
  for (const cotizacion of elegidas) {
    const cbm = cbmPorOrden.get(cotizacion.orden_id);
    if (!cbm || cbm <= 0) continue;
    const ruta = cotizacion.ruta?.trim() || "Sin ruta especificada";
    const lista = costoPorCbmPorRuta.get(ruta) ?? [];
    lista.push(cotizacion.costo / cbm);
    costoPorCbmPorRuta.set(ruta, lista);
  }

  return (
    <div className="flex flex-col gap-6">
      <FichaHeader proveedor={proveedor} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Cotizaciones enviadas" value={String(cotizaciones.length)} />
        <Stat label="% de cotizaciones ganadas" value={pctGanadas !== null ? `${pctGanadas.toFixed(0)}%` : "—"} />
        <Stat
          label="Tiempo de tránsito promedio"
          value={tiempoTransitoPromedio !== null ? `${tiempoTransitoPromedio.toFixed(1)} días` : "—"}
        />
      </div>

      <section className="rounded-xl border border-slate-200 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Costo promedio por CBM y ruta (cotizaciones ganadas)</h2>
        {costoPorCbmPorRuta.size === 0 ? (
          <p className="text-sm text-slate-400">
            Aún no hay suficiente información (se necesita el CBM calculado en landed cost de las órdenes ganadas).
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {Array.from(costoPorCbmPorRuta.entries()).map(([ruta, valores]) => (
              <li key={ruta} className="flex items-center justify-between rounded-md px-2 py-1 text-sm">
                <span className="text-slate-600">{ruta}</span>
                <span className="font-medium text-slate-900">{fmtUsd(promedio(valores) ?? 0)} / m³</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <HistorialPreciosSection historial={historial} facturasPorId={facturasPorId} />
    </div>
  );
}

function FichaHeader({ proveedor }: { proveedor: Proveedor }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{proveedor.nombre}</h1>
        <p className="text-sm text-slate-500">{proveedor.tipo === "compra" ? "Proveedor de compra" : "Proveedor logístico"}</p>
      </div>
      {proveedor.contacto && <span className="text-sm text-slate-500">{proveedor.contacto}</span>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function HistorialPreciosSection({
  historial,
  facturasPorId,
}: {
  historial: HistorialPrecio[];
  facturasPorId: Map<string, { fechaCarga: string; signedUrl: string | null }>;
}) {
  const grupos = new Map<string, HistorialPrecio[]>();
  for (const h of historial) {
    const clave = h.documento_id ?? "sin-factura";
    const lista = grupos.get(clave) ?? [];
    lista.push(h);
    grupos.set(clave, lista);
  }

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Histórico de precios por factura</h2>
      {historial.length === 0 ? (
        <p className="text-sm text-slate-400">
          Aún no hay historial — se llena automáticamente cuando se extraen facturas con IA en landed cost.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {Array.from(grupos.entries()).map(([clave, items]) => {
            const factura = clave !== "sin-factura" ? facturasPorId.get(clave) : undefined;
            return (
              <div key={clave} className="overflow-x-auto">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {factura ? `Factura del ${new Date(factura.fechaCarga).toLocaleDateString("es-MX")}` : "Sin factura asociada"}
                  </p>
                  {factura?.signedUrl && (
                    <a href={factura.signedUrl} target="_blank" rel="noreferrer" className="text-xs text-slate-900 underline">
                      Ver factura
                    </a>
                  )}
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Artículo</th>
                      <th className="py-2 pr-3">Precio</th>
                      <th className="py-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((h) => (
                      <tr key={h.id}>
                        <td className="py-2 pr-3 text-slate-900">{h.articulo}</td>
                        <td className="py-2 pr-3 text-slate-600">{fmtUsd(h.precio)}</td>
                        <td className="py-2 text-slate-500">{new Date(h.fecha).toLocaleDateString("es-MX")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
