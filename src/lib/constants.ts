import type { DocumentoTipo, OrdenEstatus, UserRole } from "@/types/database";

export const ROLE_LABELS: Record<UserRole, string> = {
  compras: "Compras/Procura",
  logistica: "Logística",
  administracion: "Administración",
  operacion: "Operación",
  admin_sistema: "Admin del sistema",
};

export const ESTATUS_LABELS: Record<OrdenEstatus, string> = {
  cotizando_flete: "Cotizando flete",
  confirmado: "Confirmado",
  en_transito: "En tránsito",
  en_aduana: "En aduana",
  entregado: "Entregado",
  cerrado: "Cerrado",
};

export const ESTATUS_ORDER: OrdenEstatus[] = [
  "cotizando_flete",
  "confirmado",
  "en_transito",
  "en_aduana",
  "entregado",
  "cerrado",
];

export const DOCUMENTO_LABELS: Record<DocumentoTipo, string> = {
  factura_comercial: "Factura comercial",
  packing_list: "Packing list",
  bl_awb: "BL / AWB",
  pedimento: "Pedimento",
  certificado_origen: "Certificado de origen",
  poliza_seguro: "Póliza de seguro",
};

// Documentos que debe tener toda orden para considerarse "completa" en el checklist.
export const DOCUMENTOS_REQUERIDOS: DocumentoTipo[] = [
  "factura_comercial",
  "packing_list",
  "bl_awb",
  "pedimento",
  "certificado_origen",
  "poliza_seguro",
];

export const ROLES_QUE_CREAN_ORDENES: UserRole[] = ["compras", "admin_sistema"];
export const ROLES_QUE_SUBEN_DOCUMENTOS: UserRole[] = ["compras", "logistica", "admin_sistema"];
export const ROLES_STAFF: UserRole[] = ["compras", "logistica", "administracion", "admin_sistema"];
export const ROLES_LANDED_COST: UserRole[] = ["logistica", "admin_sistema"];
export const ROLES_TRACKING: UserRole[] = ["logistica", "admin_sistema"];
export const DIAS_ALERTA_TRACKING = 5;
