"use client";

import { useActionState, useRef } from "react";
import { crearOperacion } from "./actions";

export function CrearOperacionForm() {
  const [state, formAction, pending] = useActionState(crearOperacion, null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex items-end gap-2 rounded-lg border border-slate-200 p-4"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Nueva operación</label>
        <input
          name="nombre"
          required
          placeholder="Ej. Planta Monterrey"
          className="w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Agregando..." : "Agregar operación"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">Operación agregada.</p>}
    </form>
  );
}
