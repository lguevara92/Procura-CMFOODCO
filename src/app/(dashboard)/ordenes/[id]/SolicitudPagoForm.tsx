"use client";

import { useState, useTransition } from "react";
import { enviarSolicitudPago } from "./clickup-actions";

const DESCRIPCIONES_PAGO = ["Abono Inicial", "Avance", "Abono Final", "Pago Total"];
const MONEDAS = ["USD", "EUR"];

export function SolicitudPagoForm({ ordenId, montoSugerido, monedaSugerida }: { ordenId: string; montoSugerido: number; monedaSugerida: string }) {
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState(String(montoSugerido || ""));
  const [moneda, setMoneda] = useState(MONEDAS.includes(monedaSugerida) ? monedaSugerida : "USD");
  const [descripcionPago, setDescripcionPago] = useState("Pago Total");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Enviar solicitud de pago
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Enviar solicitud de pago a Finanzas (ClickUp)</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Monto</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Moneda</label>
          <select
            value={moneda}
            onChange={(e) => setMoneda(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          >
            {MONEDAS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Descripción de pago</label>
          <select
            value={descripcionPago}
            onChange={(e) => setDescripcionPago(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          >
            {DESCRIPCIONES_PAGO.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Fecha de vencimiento (opcional)</label>
          <input
            type="date"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-3">
          <label className="text-xs font-medium text-slate-600">Comentarios (opcional)</label>
          <input
            type="text"
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setUrl(null);
            startTransition(async () => {
              const result = await enviarSolicitudPago(ordenId, {
                monto: Number(monto),
                moneda,
                descripcionPago,
                fechaVencimiento: fechaVencimiento || null,
                comentarios: comentarios || null,
              });
              if (result?.error) setError(result.error);
              else if (result?.url) setUrl(result.url);
            });
          }}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Enviar a ClickUp"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="text-sm text-slate-500 hover:underline">
          Cancelar
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {url && (
        <p className="mt-2 text-sm text-emerald-700">
          Solicitud creada.{" "}
          <a href={url} target="_blank" rel="noreferrer" className="underline">
            Ver en ClickUp
          </a>
        </p>
      )}
    </div>
  );
}
