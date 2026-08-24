// Extrae el primer número de un texto libre como "15 días" o "20-25 dias" (días de tránsito).
export function parseDiasTransito(texto: string | null): number | null {
  if (!texto) return null;
  const match = texto.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

export function promedio(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((suma, v) => suma + v, 0) / valores.length;
}
