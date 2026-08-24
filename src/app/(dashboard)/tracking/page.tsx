import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { DIAS_ALERTA_TRACKING } from "@/lib/constants";
import type { OrdenCompra, Tracking } from "@/types/database";

type TrackingConOrden = Tracking & {
  orden: (OrdenCompra & { proveedor: { nombre: string } | null; operacion: { nombre: string } | null }) | null;
};

export default async function TrackingPage() {
  await requireProfile();
  const supabase = await createClient();

  // RLS ya limita esto: staff ve todo, operación solo sus propias órdenes.
  const { data } = await supabase
    .from("tracking")
    .select("*, orden:ordenes_compra(*, proveedor:proveedores(nombre), operacion:operaciones(nombre))")
    .order("ultima_actualizacion", { ascending: false });

  const trackings = (data ?? []) as unknown as TrackingConOrden[];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Rastreo de embarques</h1>
        <p className="text-sm text-slate-500">Dónde va cada carga, sin entrar a la página de cada transportista.</p>
      </div>

      <div className="flex flex-col gap-3">
        {trackings.map((tracking) => {
          // eslint-disable-next-line react-hooks/purity -- página de servidor, se evalúa una vez por request
          const ahora = Date.now();
          const diasSinActualizar = Math.floor((ahora - new Date(tracking.ultima_actualizacion).getTime()) / 86400000);
          const desactualizado = diasSinActualizar > DIAS_ALERTA_TRACKING;

          return (
            <div key={tracking.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/ordenes/${tracking.orden_id}`} className="font-medium text-slate-900 hover:underline">
                    {tracking.orden?.proveedor?.nombre ?? "Orden"}
                  </Link>
                  <span className="ml-2 text-sm text-slate-500">{tracking.orden?.operacion?.nombre}</span>
                </div>
                <div className="text-sm text-slate-500">
                  {tracking.numero_guia}
                  {tracking.transportista && <span> · {tracking.transportista}</span>}
                </div>
              </div>

              <TrackingTimeline estatus={tracking.estatus} substatus={tracking.substatus} />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>
                  {tracking.ubicacion_actual && <>Ubicación: {tracking.ubicacion_actual} · </>}
                  Última actualización: {new Date(tracking.ultima_actualizacion).toLocaleString("es-MX")}
                  {desactualizado && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                      Sin novedades hace {diasSinActualizar} días
                    </span>
                  )}
                </span>
                {tracking.fecha_estimada_entrega && <span>Entrega estimada: {tracking.fecha_estimada_entrega}</span>}
              </div>
            </div>
          );
        })}

        {trackings.length === 0 && (
          <p className="rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
            No hay embarques con rastreo registrado todavía.
          </p>
        )}
      </div>
    </div>
  );
}
