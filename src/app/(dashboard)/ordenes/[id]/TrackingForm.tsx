"use client";

import { useActionState } from "react";
import { registrarTracking } from "./tracking-actions";

export function TrackingForm({ ordenId }: { ordenId: string }) {
  const [state, formAction, pending] = useActionState(registrarTracking, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="orden_id" value={ordenId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Número de guía / BL</label>
        <input
          name="numero_guia"
          required
          placeholder="Ej. 9400111899562537624326"
          className="w-64 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Detectando paquetería..." : "Agregar guía"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
