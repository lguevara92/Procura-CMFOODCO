"use client";

import { useState, useTransition } from "react";
import { elegirCotizacion } from "./cotizaciones-actions";
import type { CotizacionFlete } from "@/types/database";

type CotizacionConProveedor = CotizacionFlete & { proveedor: { nombre: string } | null };

export function CotizacionRow({
  ordenId,
  cotizacion,
  puedeElegir,
}: {
  ordenId: string;
  cotizacion: CotizacionConProveedor;
  puedeElegir: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [justificacion, setJustificacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className={`rounded-lg border p-3 ${cotizacion.elegida ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium text-slate-900">{cotizacion.proveedor?.nombre ?? "—"}</span>
          <span className="ml-2 text-slate-600">
            {cotizacion.costo.toLocaleString("es-MX", { style: "currency", currency: cotizacion.moneda })}
          </span>
          {cotizacion.tiempo_transito && <span className="ml-2 text-slate-500">· {cotizacion.tiempo_transito}</span>}
          {cotizacion.ruta && <span className="ml-2 text-slate-500">· {cotizacion.ruta}</span>}
          {cotizacion.vigencia && <span className="ml-2 text-slate-400">· vigente hasta {cotizacion.vigencia}</span>}
        </div>

        {cotizacion.elegida ? (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Elegida
          </span>
        ) : (
          puedeElegir &&
          !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Elegir esta cotización
            </button>
          )
        )}
      </div>

      {cotizacion.elegida && cotizacion.justificacion && (
        <p className="mt-1 text-xs text-slate-500">Justificación: {cotizacion.justificacion}</p>
      )}

      {showForm && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="¿Por qué se eligió esta cotización?"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await elegirCotizacion(ordenId, cotizacion.id, justificacion);
                  if (res?.error) setError(res.error);
                  else setShowForm(false);
                })
              }
              className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Confirmar elección"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </li>
  );
}
