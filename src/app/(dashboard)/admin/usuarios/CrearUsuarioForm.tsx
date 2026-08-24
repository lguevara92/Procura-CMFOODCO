"use client";

import { useActionState } from "react";
import { crearUsuario } from "./actions";
import { ROLE_LABELS } from "@/lib/constants";
import type { Operacion, UserRole } from "@/types/database";

const ROLES: UserRole[] = ["compras", "logistica", "administracion", "operacion", "admin_sistema"];

export function CrearUsuarioForm({ operaciones }: { operaciones: Operacion[] }) {
  const [state, formAction, pending] = useActionState(crearUsuario, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Correo</label>
        <input
          name="email"
          type="email"
          required
          className="w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Nombre</label>
        <input name="nombre" required className="w-48 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Rol</label>
        <select name="rol" required defaultValue="" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900">
          <option value="" disabled>
            Selecciona
          </option>
          {ROLES.map((rol) => (
            <option key={rol} value={rol}>
              {ROLE_LABELS[rol]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Operación (si aplica)</label>
        <select name="operacion_id" defaultValue="" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900">
          <option value="">— Ninguna —</option>
          {operaciones.map((op) => (
            <option key={op.id} value={op.id}>
              {op.nombre}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Creando..." : "Crear usuario"}
      </button>

      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.ok && (
        <p className="w-full text-sm text-emerald-700">
          Usuario creado. Le llegó un correo para que configure su propia contraseña.
        </p>
      )}
    </form>
  );
}
