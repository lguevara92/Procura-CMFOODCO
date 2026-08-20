"use client";

import { useActionState } from "react";
import { uploadDocumento } from "./actions";
import { DOCUMENTO_LABELS, DOCUMENTOS_REQUERIDOS } from "@/lib/constants";

export function DocumentoUploadForm({ ordenId }: { ordenId: string }) {
  const [state, formAction, pending] = useActionState(uploadDocumento, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="orden_id" value={ordenId} />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Tipo de documento</label>
        <select name="tipo" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900">
          {DOCUMENTOS_REQUERIDOS.map((tipo) => (
            <option key={tipo} value={tipo}>
              {DOCUMENTO_LABELS[tipo]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Fecha de vencimiento (opcional)</label>
        <input type="date" name="fecha_vencimiento" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Archivo</label>
        <input type="file" name="archivo" required className="text-sm text-slate-700" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Subiendo..." : "Subir documento"}
      </button>

      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
