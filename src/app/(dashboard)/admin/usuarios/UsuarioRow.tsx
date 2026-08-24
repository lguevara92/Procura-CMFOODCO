"use client";

import { useState, useTransition } from "react";
import { actualizarUsuario } from "./actions";
import { ROLE_LABELS } from "@/lib/constants";
import type { Operacion, UserProfile, UserRole } from "@/types/database";

const ROLES: UserRole[] = ["compras", "logistica", "administracion", "operacion", "admin_sistema"];

export function UsuarioRow({
  usuario,
  operaciones,
  esUsuarioActual,
}: {
  usuario: UserProfile;
  operaciones: Operacion[];
  esUsuarioActual: boolean;
}) {
  const [rol, setRol] = useState<UserRole>(usuario.rol);
  const [operacionId, setOperacionId] = useState(usuario.operacion_id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  function guardar(nuevoRol: UserRole, nuevaOperacionId: string) {
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      const res = await actualizarUsuario(usuario.id, nuevoRol, nuevaOperacionId || null);
      if (res?.error) setError(res.error);
      else {
        setGuardado(true);
        setTimeout(() => setGuardado(false), 2000);
      }
    });
  }

  return (
    <tr>
      <td className="py-2 pr-3 text-slate-900">
        {usuario.nombre}
        {esUsuarioActual && <span className="ml-1 text-xs text-slate-400">(tú)</span>}
      </td>
      <td className="py-2 pr-3 text-slate-600">{usuario.email}</td>
      <td className="py-2 pr-3">
        <select
          value={rol}
          disabled={pending || esUsuarioActual}
          onChange={(e) => {
            const nuevo = e.target.value as UserRole;
            setRol(nuevo);
            guardar(nuevo, operacionId);
          }}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 disabled:bg-slate-50"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-3">
        <select
          value={operacionId}
          disabled={pending}
          onChange={(e) => {
            setOperacionId(e.target.value);
            guardar(rol, e.target.value);
          }}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
        >
          <option value="">— Ninguna —</option>
          {operaciones.map((op) => (
            <option key={op.id} value={op.id}>
              {op.nombre}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 text-xs">
        {error && <span className="text-red-600">{error}</span>}
        {guardado && <span className="text-emerald-700">Guardado</span>}
        {esUsuarioActual && !error && !guardado && <span className="text-slate-400">No puedes editarte a ti mismo</span>}
      </td>
    </tr>
  );
}
