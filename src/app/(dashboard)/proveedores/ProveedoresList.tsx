"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Proveedor } from "@/types/database";

export function ProveedoresList({ proveedores }: { proveedores: Proveedor[] }) {
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return proveedores;
    return proveedores.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [proveedores, query]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar proveedor por nombre..."
        className="w-full max-w-sm rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Contacto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((proveedor) => (
              <tr key={proveedor.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/proveedores/${proveedor.id}`} className="font-medium text-slate-900 hover:underline">
                    {proveedor.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {proveedor.tipo === "compra" ? "Compra" : "Logística"}
                </td>
                <td className="px-4 py-3 text-slate-500">{proveedor.contacto ?? "—"}</td>
              </tr>
            ))}

            {filtrados.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  {proveedores.length === 0
                    ? "Aún no hay proveedores registrados."
                    : "Ningún proveedor coincide con la búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
