"use client";

import { useState, useTransition } from "react";
import { actualizarTracking } from "./tracking-actions";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { DIAS_ALERTA_TRACKING } from "@/lib/constants";
import type { Tracking } from "@/types/database";

export function TrackingCard({
  tracking,
  ordenId,
  puedeActualizar,
  diasSinActualizar,
}: {
  tracking: Tracking;
  ordenId: string;
  puedeActualizar: boolean;
  diasSinActualizar: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const desactualizado = diasSinActualizar > DIAS_ALERTA_TRACKING;

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium text-slate-900">{tracking.numero_guia}</span>
          {tracking.transportista && <span className="ml-2 text-slate-500">· {tracking.transportista}</span>}
          {tracking.ubicacion_actual && <span className="ml-2 text-slate-500">· {tracking.ubicacion_actual}</span>}
        </div>
        {puedeActualizar && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await actualizarTracking(tracking.id, ordenId);
                if (res?.error) setError(res.error);
              })
            }
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {pending ? "Actualizando..." : "Actualizar"}
          </button>
        )}
      </div>

      <TrackingTimeline estatus={tracking.estatus} substatus={tracking.substatus} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          Última actualización: {new Date(tracking.ultima_actualizacion).toLocaleString("es-MX")}
          {desactualizado && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
              Sin novedades hace {diasSinActualizar} días
            </span>
          )}
        </span>
        {tracking.fecha_estimada_entrega && <span>Entrega estimada: {tracking.fecha_estimada_entrega}</span>}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
