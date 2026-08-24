import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { LOGO_BASE64 } from "@/lib/logoBase64";
import type { LandedCost } from "@/types/database";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  logo: { width: 140, height: 34 },
  title: { fontSize: 16, fontWeight: 700 },
  subtitle: { fontSize: 9, color: "#64748b", marginTop: 2 },
  infoBox: { marginBottom: 16, padding: 10, backgroundColor: "#f8fafc", borderRadius: 4 },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { width: 120, color: "#64748b" },
  infoValue: { fontWeight: 700 },
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 6, paddingHorizontal: 10 },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { flex: 1, color: "#475569" },
  rowValue: { width: 120, textAlign: "right" },
  rowHighlight: { backgroundColor: "#ecfdf5" },
  rowHighlightText: { color: "#065f46", fontWeight: 700 },
  rowTotalText: { fontWeight: 700 },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#94a3b8", textAlign: "center" },
});

function fmt(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "USD" });
}

export function LandedCostDocument({
  landedCost,
  proveedorNombre,
  operacionNombre,
  incoterm,
}: {
  landedCost: LandedCost;
  proveedorNombre: string;
  operacionNombre: string;
  incoterm: string;
}) {
  const fecha = new Date(landedCost.fecha_calculo);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_BASE64} style={styles.logo} />
          <View>
            <Text style={styles.title}>Landed Cost</Text>
            <Text style={styles.subtitle}>Generado el {fecha.toLocaleString("es-MX")}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Proveedor</Text>
            <Text style={styles.infoValue}>{proveedorNombre}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Operación</Text>
            <Text style={styles.infoValue}>{operacionNombre}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Incoterm</Text>
            <Text style={styles.infoValue}>{incoterm}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>FOB / Valor factura</Text>
            <Text style={styles.rowValue}>{fmt(landedCost.fob)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Flete internacional</Text>
            <Text style={styles.rowValue}>{fmt(landedCost.flete)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Seguro</Text>
            <Text style={styles.rowValue}>{fmt(landedCost.seguro)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Aranceles / impuestos</Text>
            <Text style={styles.rowValue}>{fmt(landedCost.aranceles)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Honorarios agente aduanal</Text>
            <Text style={styles.rowValue}>{fmt(landedCost.honorarios)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Gastos locales</Text>
            <Text style={styles.rowValue}>{fmt(landedCost.gastos_locales)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, styles.rowTotalText]}>Total</Text>
            <Text style={[styles.rowValue, styles.rowTotalText]}>{fmt(landedCost.total)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Unidades recibidas</Text>
            <Text style={styles.rowValue}>{landedCost.unidades_recibidas}</Text>
          </View>
          <View style={[styles.row, styles.rowHighlight]}>
            <Text style={[styles.rowLabel, styles.rowHighlightText]}>Costo unitario</Text>
            <Text style={[styles.rowValue, styles.rowHighlightText]}>{fmt(landedCost.costo_unitario)}</Text>
          </View>
          {landedCost.cajas ? (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Cajas recibidas</Text>
                <Text style={styles.rowValue}>{landedCost.cajas}</Text>
              </View>
              <View style={[styles.row, styles.rowHighlight]}>
                <Text style={[styles.rowLabel, styles.rowHighlightText]}>Costo por caja</Text>
                <Text style={[styles.rowValue, styles.rowHighlightText]}>{fmt(landedCost.costo_por_caja ?? 0)}</Text>
              </View>
            </>
          ) : null}
          {landedCost.cbm ? (
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.rowLabel}>CBM total</Text>
              <Text style={styles.rowValue}>{landedCost.cbm} m³</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>Procura — CM Foodco · Reporte generado automáticamente</Text>
      </Page>
    </Document>
  );
}
