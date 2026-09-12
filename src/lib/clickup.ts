const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

function apiKey(): string {
  const key = process.env.CLICKUP_API_KEY;
  if (!key) throw new Error("Falta configurar CLICKUP_API_KEY.");
  return key;
}

interface ClickUpCampo {
  id: string;
  name: string;
  type: string;
  type_config?: { options?: { id: string; name: string }[] };
}

async function obtenerCamposLista(listId: string): Promise<ClickUpCampo[]> {
  const res = await fetch(`${CLICKUP_API_BASE}/list/${listId}/field`, {
    headers: { Authorization: apiKey() },
  });
  if (!res.ok) throw new Error(`No se pudieron leer los campos de ClickUp (${res.status}).`);
  const data = (await res.json()) as { fields?: ClickUpCampo[] };
  return data.fields ?? [];
}

function buscarCampo(campos: ClickUpCampo[], nombre: string, tipoPreferido?: string): ClickUpCampo | null {
  const candidatos = campos.filter((c) => c.name.trim().toLowerCase() === nombre.trim().toLowerCase());
  if (candidatos.length === 0) return null;
  if (tipoPreferido) return candidatos.find((c) => c.type === tipoPreferido) ?? candidatos[0];
  return candidatos[0];
}

function idDeOpcion(campo: ClickUpCampo, valor: string): string | null {
  const opcion = campo.type_config?.options?.find((o) => o.name.trim().toLowerCase() === valor.trim().toLowerCase());
  return opcion?.id ?? null;
}

export interface SolicitudPagoInput {
  departamento: string;
  ordenante: string;
  nombreProveedor: string;
  correoProveedor: string | null;
  banco: string | null;
  numeroCuenta: string | null;
  swift: string | null;
  direccionBanco: string | null;
  direccionProveedor: string | null;
  ruc: string | null;
  tipoCuenta: string | null;
  monto: number;
  moneda: string;
  descripcionPago: string;
  comentarios: string | null;
  fechaVencimiento: string | null;
}

export interface ClickUpTarea {
  id: string;
  url: string;
}

export async function crearSolicitudPago(listId: string, input: SolicitudPagoInput): Promise<ClickUpTarea> {
  const campos = await obtenerCamposLista(listId);
  const customFields: { id: string; value: unknown }[] = [];

  const setTexto = (nombreCampo: string, valor: string | null) => {
    if (!valor) return;
    const campo = buscarCampo(campos, nombreCampo, "short_text");
    if (campo) customFields.push({ id: campo.id, value: valor });
  };

  const setDropdown = (nombreCampo: string, valor: string | null) => {
    if (!valor) return;
    const campo = buscarCampo(campos, nombreCampo, "drop_down");
    if (!campo) return;
    const opcionId = idDeOpcion(campo, valor);
    if (opcionId) customFields.push({ id: campo.id, value: opcionId });
  };

  setDropdown("DEPARTAMENTO", input.departamento);
  setDropdown("ORDENANTE", input.ordenante);
  setTexto("NOMBRE DEL PROVEEDOR", input.nombreProveedor);

  const campoCorreo = buscarCampo(campos, "CORREO PROVEEDOR", "email");
  if (campoCorreo && input.correoProveedor) customFields.push({ id: campoCorreo.id, value: input.correoProveedor });

  setTexto("BANCO", input.banco);
  setTexto("NUMERO DE CUENTA", input.numeroCuenta);
  setTexto("SWIFT", input.swift);
  setTexto("DIRECCION DEL BANCO INTERNACIONAL", input.direccionBanco);
  setTexto("DIRECCION COMPLETA DEL PROVEEDOR INTERNACIONAL (CIUDAD/PAIS/RESIDENCIA)", input.direccionProveedor);
  setTexto("RUC", input.ruc);
  setDropdown("TIPO DE CUENTA", input.tipoCuenta);
  setDropdown("MONEDA", input.moneda);
  setDropdown("DESCRIPCION DE PAGO", input.descripcionPago);
  setTexto("COMENTARIOS", input.comentarios);

  const campoMonto = buscarCampo(campos, "MONTO:", "number") ?? buscarCampo(campos, "MONTO", "number");
  if (campoMonto) customFields.push({ id: campoMonto.id, value: input.monto });

  const campoFecha = buscarCampo(campos, "FECHA DE VENCIMIENTO", "date");
  if (campoFecha && input.fechaVencimiento) {
    customFields.push({ id: campoFecha.id, value: new Date(input.fechaVencimiento).getTime() });
  }

  const descripcion = [
    `**DEPARTAMENTO:** ${input.departamento}`,
    `**ORDENANTE:** ${input.ordenante}`,
    `**NOMBRE DEL PROVEEDOR:** ${input.nombreProveedor}`,
    `**CORREO PROVEEDOR:** ${input.correoProveedor ?? "N/A"}`,
    `**DIRECCION DEL PROVEEDOR:** ${input.direccionProveedor ?? "N/A"}`,
    `**BANCO:** ${input.banco ?? "N/A"}`,
    `**NUMERO DE CUENTA:** ${input.numeroCuenta ?? "N/A"}`,
    `**SWIFT:** ${input.swift ?? "N/A"}`,
    `**DIRECCION DEL BANCO:** ${input.direccionBanco ?? "N/A"}`,
    `**TIPO DE CUENTA:** ${input.tipoCuenta ?? "N/A"}`,
    `**RUC:** ${input.ruc ?? "N/A"}`,
    `**MONTO:** ${input.monto} ${input.moneda}`,
    `**DESCRIPCION DE PAGO:** ${input.descripcionPago}`,
    `**COMENTARIOS:** ${input.comentarios ?? "N/A"}`,
    `**FECHA DE VENCIMIENTO:** ${input.fechaVencimiento ?? "N/A"}`,
  ].join("\n\n");

  const res = await fetch(`${CLICKUP_API_BASE}/list/${listId}/task`, {
    method: "POST",
    headers: { Authorization: apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Solicitud de pago - ${input.nombreProveedor}`,
      markdown_description: descripcion,
      custom_fields: customFields,
    }),
  });

  if (!res.ok) {
    const texto = await res.text();
    throw new Error(`ClickUp respondió ${res.status}: ${texto}`);
  }

  return (await res.json()) as ClickUpTarea;
}

export async function adjuntarArchivoATarea(
  taskId: string,
  nombreArchivo: string,
  contenido: Buffer,
  contentType: string,
): Promise<void> {
  const form = new FormData();
  form.append("attachment", new Blob([new Uint8Array(contenido)], { type: contentType }), nombreArchivo);

  const res = await fetch(`${CLICKUP_API_BASE}/task/${taskId}/attachment`, {
    method: "POST",
    headers: { Authorization: apiKey() },
    body: form,
  });

  if (!res.ok) {
    const texto = await res.text();
    throw new Error(`No se pudo adjuntar el archivo a ClickUp (${res.status}): ${texto}`);
  }
}
