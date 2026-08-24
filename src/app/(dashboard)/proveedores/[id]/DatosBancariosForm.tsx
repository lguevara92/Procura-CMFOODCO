"use client";

import { useActionState } from "react";
import { actualizarDatosBancarios } from "./actions";
import { CLICKUP_TIPOS_CUENTA } from "@/lib/constants";
import type { Proveedor } from "@/types/database";

export function DatosBancariosForm({ proveedor }: { proveedor: Proveedor }) {
  const [state, formAction, pending] = useActionState(actualizarDatosBancarios, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      <input type="hidden" name="proveedor_id" value={proveedor.id} />

      <Campo label="Correo del proveedor" name="correo" defaultValue={proveedor.correo} type="email" />
      <Campo label="RUC" name="ruc" defaultValue={proveedor.ruc} />
      <Campo label="Banco" name="banco" defaultValue={proveedor.banco} />
      <Campo label="Número de cuenta" name="numero_cuenta" defaultValue={proveedor.numero_cuenta} />
      <Campo label="SWIFT" name="swift" defaultValue={proveedor.swift} />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Tipo de cuenta</label>
        <select
          name="tipo_cuenta"
          defaultValue={proveedor.tipo_cuenta ?? ""}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        >
          <option value="">— Sin especificar —</option>
          {CLICKUP_TIPOS_CUENTA.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </div>
      <Campo
        label="Dirección del banco (ciudad/país)"
        name="direccion_banco"
        defaultValue={proveedor.direccion_banco}
      />
      <Campo
        label="Dirección del proveedor (ciudad/país)"
        name="direccion_internacional"
        defaultValue={proveedor.direccion_internacional}
      />

      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar datos bancarios"}
        </button>
      </div>

      {state?.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="col-span-full text-sm text-emerald-700">Datos guardados.</p>}
    </form>
  );
}

function Campo({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string | null;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
      />
    </div>
  );
}
