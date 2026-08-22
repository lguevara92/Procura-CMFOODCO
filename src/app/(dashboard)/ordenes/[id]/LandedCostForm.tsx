"use client";

import { useActionState } from "react";
import { calcularLandedCost } from "./landed-cost-actions";

const CAMPOS = [
  { name: "flete", label: "Flete internacional" },
  { name: "seguro", label: "Seguro" },
  { name: "aranceles", label: "Aranceles / impuestos" },
  { name: "honorarios", label: "Honorarios agente aduanal" },
  { name: "gastos_locales", label: "Gastos locales (maniobras, almacenaje)" },
];

export function LandedCostForm({
  ordenId,
  fobInicial,
  cajasInicial,
  cbmInicial,
}: {
  ordenId: string;
  fobInicial?: number;
  cajasInicial?: number;
  cbmInicial?: number;
}) {
  const [state, formAction, pending] = useActionState(calcularLandedCost, null);

  return (
    <form
      key={`${fobInicial ?? "sin-fob"}-${cajasInicial ?? "sin-cajas"}-${cbmInicial ?? "sin-cbm"}`}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4"
    >
      <input type="hidden" name="orden_id" value={ordenId} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">FOB / Valor factura</label>
          <input
            name="fob"
            type="number"
            step="0.01"
            min="0"
            defaultValue={fobInicial ?? 0}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </div>
        {CAMPOS.map((campo) => (
          <div key={campo.name} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">{campo.label}</label>
            <input
              name={campo.name}
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
            />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Unidades recibidas</label>
          <input
            name="unidades_recibidas"
            type="number"
            step="0.01"
            min="0"
            required
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Cajas recibidas (opcional)</label>
          <input
            name="cajas"
            type="number"
            step="1"
            min="0"
            defaultValue={cajasInicial ?? ""}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">CBM total (opcional)</label>
          <input
            name="cbm"
            type="number"
            step="0.0001"
            min="0"
            defaultValue={cbmInicial ?? ""}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Calculando..." : "Calcular y notificar a la operación"}
      </button>
    </form>
  );
}
