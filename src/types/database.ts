export type UserRole = "compras" | "logistica" | "administracion" | "operacion" | "admin_sistema";

export type ProveedorTipo = "compra" | "logistica";

export type DocumentoTipo =
  | "factura_comercial"
  | "packing_list"
  | "bl_awb"
  | "pedimento"
  | "certificado_origen"
  | "poliza_seguro";

export type OrdenEstatus =
  | "cotizando_flete"
  | "confirmado"
  | "en_transito"
  | "en_aduana"
  | "entregado"
  | "cerrado";

export interface Operacion {
  id: string;
  nombre: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  operacion_id: string | null;
  created_at: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  tipo: ProveedorTipo;
  contacto: string | null;
  created_at: string;
}

export interface OrdenCompra {
  id: string;
  proveedor_id: string;
  operacion_id: string;
  incoterm: string;
  moneda: string;
  estatus: OrdenEstatus;
  fecha_creacion: string;
  created_by: string | null;
}

export interface OrdenEvento {
  id: string;
  orden_id: string;
  estatus_anterior: OrdenEstatus | null;
  estatus_nuevo: OrdenEstatus;
  usuario_id: string | null;
  fecha: string;
}

export interface Documento {
  id: string;
  orden_id: string;
  tipo: DocumentoTipo;
  url_archivo: string;
  fecha_carga: string;
  usuario_id: string | null;
  fecha_vencimiento: string | null;
}

export interface CotizacionFlete {
  id: string;
  orden_id: string;
  proveedor_logistico_id: string;
  costo: number;
  moneda: string;
  tiempo_transito: string | null;
  ruta: string | null;
  vigencia: string | null;
  elegida: boolean;
  justificacion: string | null;
  created_at: string;
}

export interface LandedCost {
  id: string;
  orden_id: string;
  fob: number;
  flete: number;
  seguro: number;
  aranceles: number;
  honorarios: number;
  gastos_locales: number;
  total: number;
  unidades_recibidas: number;
  costo_unitario: number;
  cajas: number | null;
  cbm: number | null;
  costo_por_caja: number | null;
  fecha_calculo: string;
}

export interface HistorialPrecio {
  id: string;
  proveedor_id: string;
  articulo: string;
  precio: number;
  fecha: string;
}

export interface Tracking {
  id: string;
  orden_id: string;
  numero_guia: string;
  transportista: string | null;
  estatus: string | null;
  ubicacion_actual: string | null;
  fecha_estimada_entrega: string | null;
  ultima_actualizacion: string;
}
