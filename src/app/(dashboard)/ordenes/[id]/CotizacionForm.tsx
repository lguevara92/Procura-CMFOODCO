"use client";

import { useActionState, useState } from "react";
import { addCotizacion } from "./cotizaciones-actions";
import type { Proveedor } from "@/types/database";

export function CotizacionForm({ ordenId, proveedores }: { ordenId: string; proveedores: Proveedor[] }) {
  const [state, formAction, pending] = useActionState(addCotizacion, null);
  const [proveedorNuevo, setProveedorNuevo] = useState(false);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="orden_id" value={ordenId} />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Proveedor logístico</label>
        <select
          name="proveedor_id"
          required
          defaultValue=""
          onChange={(e) => setProveedorNuevo(e.target.value === "__nuevo__")}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        >
          <option value="" disabled>
            Selecciona
          </option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
          <option value="__nuevo__">+ Nuevo proveedor logístico</option>
        </select>
        {proveedorNuevo && (
          <div className="mt-1 flex flex-col gap-1">
            <input
              name="proveedor_nuevo_nombre"
              placeholder="Nombre del proveedor"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
            />
            <input
              name="proveedor_nuevo_email"
              type="email"
              placeholder="Correo de contacto (para notificarle)"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Costo</label>
        <input
          name="costo"
          type="number"
          step="0.01"
          min="0"
          required
          className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Moneda</label>
        <input
          name="moneda"
          defaultValue="USD"
          required
          className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Tiempo de tránsito</label>
        <input
          name="tiempo_transito"
          placeholder="15 días"
          className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Ruta</label>
        <input name="ruta" className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Vigente hasta</label>
        <input
          name="vigencia"
          type="date"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Agregar cotización"}
      </button>

      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
