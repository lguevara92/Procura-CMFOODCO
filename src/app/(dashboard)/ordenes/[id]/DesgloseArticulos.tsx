"use client";

import { useMemo, useState } from "react";
import { calcularDesglose, type ArticuloCombinado, type BaseAsignacion } from "@/lib/desgloseArticulos";
import type { OrdenTipoEnvio } from "@/types/database";

const OPCIONES: { value: BaseAsignacion; label: string }[] = [
  { value: "cbm", label: "Por CBM (LCL / FCL)" },
  { value: "peso", label: "Por peso (paquetería / aéreo)" },
  { value: "valor", label: "Por valor de factura" },
];

// Base de reparto sugerida según el tipo de envío: paquetería normalmente se
// cobra por peso, LCL y FCL por volumen (CBM) del contenedor.
const BASE_SUGERIDA_POR_TIPO: Record<OrdenTipoEnvio, BaseAsignacion> = {
  paqueteria: "peso",
  lcl: "cbm",
  fcl: "cbm",
};

export function DesgloseArticulos({
  articulos,
  gastosCompartidos,
  tipoEnvio,
}: {
  articulos: ArticuloCombinado[];
  gastosCompartidos: number;
  tipoEnvio: OrdenTipoEnvio;
}) {
  const hayCbm = articulos.some((a) => a.cbm > 0);
  const hayPeso = articulos.some((a) => a.peso > 0);
  const sugerida = BASE_SUGERIDA_POR_TIPO[tipoEnvio];
  const baseInicial: BaseAsignacion =
    (sugerida === "cbm" && hayCbm) || (sugerida === "peso" && hayPeso)
      ? sugerida
      : hayCbm
        ? "cbm"
        : hayPeso
          ? "peso"
          : "valor";
  const [base, setBase] = useState<BaseAsignacion>(baseInicial);

  const desglose = useMemo(() => calcularDesglose(articulos, gastosCompartidos, base), [articulos, gastosCompartidos, base]);

  const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "USD" });
  const avisoSinDatos = (base === "cbm" && !hayCbm) || (base === "peso" && !hayPeso);

  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Desglose de landed cost por artículo</h3>
        <select
          value={base}
          onChange={(e) => setBase(e.target.value as BaseAsignacion)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
        >
          {OPCIONES.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>
      </div>

      {base !== sugerida && (
        <p className="mb-2 text-xs text-slate-500">
          Sugerido para este tipo de envío: {sugerida === "cbm" ? "por CBM" : "por peso"}.
        </p>
      )}

      {avisoSinDatos && (
        <p className="mb-2 text-xs text-amber-600">
          No hay {base === "cbm" ? "CBM" : "peso"} por artículo (extrae el packing list con IA para tenerlo) — el
          reparto se está haciendo en partes iguales.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 pr-3">Artículo</th>
              <th className="py-1 pr-3">Cantidad</th>
              <th className="py-1 pr-3">FOB</th>
              {base === "cbm" && <th className="py-1 pr-3">CBM</th>}
              {base === "peso" && <th className="py-1 pr-3">Peso (kg)</th>}
              <th className="py-1 pr-3">% asignado</th>
              <th className="py-1 pr-3">Gasto asignado</th>
              <th className="py-1 pr-3">Costo total</th>
              <th className="py-1">Costo unitario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {desglose.map((a, i) => (
              <tr key={i}>
                <td className="py-1 pr-3">{a.nombre}</td>
                <td className="py-1 pr-3">{a.cantidad}</td>
                <td className="py-1 pr-3">{fmt(a.fobValor)}</td>
                {base === "cbm" && <td className="py-1 pr-3">{a.cbm || "—"}</td>}
                {base === "peso" && <td className="py-1 pr-3">{a.peso || "—"}</td>}
                <td className="py-1 pr-3">{(a.proporcion * 100).toFixed(1)}%</td>
                <td className="py-1 pr-3">{fmt(a.gastoAsignado)}</td>
                <td className="py-1 pr-3">{fmt(a.costoTotal)}</td>
                <td className="py-1 font-medium text-emerald-700">{fmt(a.costoUnitario)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
