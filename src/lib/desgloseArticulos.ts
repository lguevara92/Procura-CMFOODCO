import type { ArticuloExtraido } from "@/app/(dashboard)/ordenes/[id]/factura-actions";
import type { ArticuloPacking } from "@/app/(dashboard)/ordenes/[id]/packing-list-actions";

export type BaseAsignacion = "cbm" | "peso" | "valor";

export interface ArticuloCombinado {
  codigo: string;
  nombre: string;
  cantidad: number;
  fobValor: number;
  cbm: number;
  peso: number;
}

export interface ArticuloDesglosado extends ArticuloCombinado {
  proporcion: number;
  gastoAsignado: number;
  costoTotal: number;
  costoUnitario: number;
}

function normalizar(texto: string) {
  return texto.trim().toLowerCase();
}

// Junta los artículos de la factura (código, cantidad, precio) con los del
// packing list (cajas, CBM, peso) — hace match por código y, si no hay, por nombre.
export function combinarArticulos(
  articulosFactura: ArticuloExtraido[],
  articulosPacking: ArticuloPacking[],
): ArticuloCombinado[] {
  const porCodigo = new Map<string, ArticuloPacking>();
  const porNombre = new Map<string, ArticuloPacking>();

  for (const p of articulosPacking) {
    if (p.codigo?.trim()) porCodigo.set(normalizar(p.codigo), p);
    porNombre.set(normalizar(p.nombre), p);
  }

  return articulosFactura.map((f) => {
    const match =
      (f.codigo?.trim() && porCodigo.get(normalizar(f.codigo))) || porNombre.get(normalizar(f.nombre)) || null;

    return {
      codigo: f.codigo || match?.codigo || "",
      nombre: f.nombre,
      cantidad: f.cantidad,
      fobValor: f.cantidad * f.precio_unitario,
      cbm: match?.cbm ?? 0,
      peso: match?.peso ?? 0,
    };
  });
}

// Reparte los gastos compartidos (flete + seguro + aranceles + honorarios + gastos
// locales) entre los artículos, proporcional a CBM, peso o valor FOB según se elija.
export function calcularDesglose(
  articulos: ArticuloCombinado[],
  gastosCompartidos: number,
  base: BaseAsignacion,
): ArticuloDesglosado[] {
  const valorBase = (a: ArticuloCombinado) => (base === "cbm" ? a.cbm : base === "peso" ? a.peso : a.fobValor);
  const totalBase = articulos.reduce((suma, a) => suma + valorBase(a), 0);

  return articulos.map((a) => {
    const proporcion = totalBase > 0 ? valorBase(a) / totalBase : 0;
    const gastoAsignado = proporcion * gastosCompartidos;
    const costoTotal = a.fobValor + gastoAsignado;
    const costoUnitario = a.cantidad > 0 ? costoTotal / a.cantidad : 0;
    return { ...a, proporcion, gastoAsignado, costoTotal, costoUnitario };
  });
}
