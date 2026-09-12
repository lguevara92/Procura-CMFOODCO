"use client";

import { useActionState, useState } from "react";
import { actualizarProveedor } from "./actions";
import type { Proveedor } from "@/types/database";

export function EditarProveedorForm({ proveedor }: { proveedor: Proveedor }) {
  const [editando, setEditando] = useState(false);
  const [state, formAction, pending] = useActionState(actualizarProveedor, null);

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="text-sm text-slate-500 hover:underline"
      >
        Editar
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        setEditando(false);
      }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 p-3"
    >
      <input type="hidden" name="proveedor_id" value={proveedor.id} />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Nombre</label>
        <input
          name="nombre"
          required
          defaultValue={proveedor.nombre}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Tipo</label>
        <select
          name="tipo"
          defaultValue={proveedor.tipo}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        >
          <option value="compra">Compra</option>
          <option value="logistica">Logística</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Contacto</label>
        <input
          name="contacto"
          defaultValue={proveedor.contacto ?? ""}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Guardar"}
      </button>
      <button type="button" onClick={() => setEditando(false)} className="text-sm text-slate-500 hover:underline">
        Cancelar
      </button>

      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
