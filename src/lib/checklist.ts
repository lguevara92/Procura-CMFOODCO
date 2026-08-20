import { DOCUMENTOS_REQUERIDOS } from "@/lib/constants";
import type { Documento, DocumentoTipo } from "@/types/database";

export type ChecklistSemaforo = "completo" | "parcial" | "faltante" | "vencido";

export interface ChecklistResultado {
  semaforo: ChecklistSemaforo;
  presentes: DocumentoTipo[];
  faltantes: DocumentoTipo[];
}

export function evaluarChecklist(documentos: Pick<Documento, "tipo" | "fecha_vencimiento">[]): ChecklistResultado {
  const presentes = Array.from(new Set(documentos.map((d) => d.tipo)));
  const faltantes = DOCUMENTOS_REQUERIDOS.filter((tipo) => !presentes.includes(tipo));

  const hoy = new Date().toISOString().slice(0, 10);
  const hayVencido = documentos.some((d) => d.fecha_vencimiento && d.fecha_vencimiento < hoy);

  let semaforo: ChecklistSemaforo;
  if (hayVencido) {
    semaforo = "vencido";
  } else if (faltantes.length === 0) {
    semaforo = "completo";
  } else if (presentes.length === 0) {
    semaforo = "faltante";
  } else {
    semaforo = "parcial";
  }

  return { semaforo, presentes, faltantes };
}

export const SEMAFORO_LABELS: Record<ChecklistSemaforo, string> = {
  completo: "Completo",
  parcial: "Parcial",
  faltante: "Faltante",
  vencido: "Vencido",
};

export const SEMAFORO_CLASSES: Record<ChecklistSemaforo, string> = {
  completo: "bg-emerald-100 text-emerald-700",
  parcial: "bg-amber-100 text-amber-700",
  faltante: "bg-red-100 text-red-700",
  vencido: "bg-red-100 text-red-700",
};
