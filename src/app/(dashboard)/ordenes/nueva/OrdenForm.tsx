"use client";

import { useActionState, useState } from "react";
import { createOrden } from "../actions";
import type { Operacion, Proveedor } from "@/types/database";

export function OrdenForm({ proveedores, operaciones }: { proveedores: Proveedor[]; operaciones: Operacion[] }) {
  const [state, formAction, pending] = useActionState(createOrden, null);
  const [proveedorNuevo, setProveedorNuevo] = useState(false);
  const [operacionNueva, setOperacionNueva] = useState(false);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4 rounded-xl border border-slate-200 p-6">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Proveedor</label>
        <select
          name="proveedor_id"
          required
          onChange={(e) => setProveedorNuevo(e.target.value === "__nuevo__")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          defaultValue=""
        >
          <option value="" disabled>
            Selecciona un proveedor
          </option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
          <option value="__nuevo__">+ Nuevo proveedor</option>
        </select>
        {proveedorNuevo && (
          <input
            name="proveedor_nuevo"
            placeholder="Nombre del nuevo proveedor"
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Operación destino</label>
        <select
          name="operacion_id"
          required
          onChange={(e) => setOperacionNueva(e.target.value === "__nuevo__")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          defaultValue=""
        >
          <option value="" disabled>
            Selecciona una operación
          </option>
          {operaciones.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
          <option value="__nuevo__">+ Nueva operación</option>
        </select>
        {operacionNueva && (
          <input
            name="operacion_nueva"
            placeholder="Nombre de la nueva operación"
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Incoterm</label>
          <input
            name="incoterm"
            required
            placeholder="FOB, CIF, EXW..."
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <div className="flex w-28 flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Moneda</label>
          <input
            name="moneda"
            defaultValue="USD"
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Creando..." : "Crear orden"}
      </button>
    </form>
  );
}
