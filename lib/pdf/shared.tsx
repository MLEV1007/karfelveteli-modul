import { View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer"
import path from "path"
import fs from "fs"

const fontsDir = path.join(process.cwd(), "lib", "fonts")
const robotoRegular = fs.readFileSync(path.join(fontsDir, "Roboto-Regular.ttf"))
const robotoBold = fs.readFileSync(path.join(fontsDir, "Roboto-Bold.ttf"))

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "pictures", "0001_cropped.png"))
export const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`

Font.register({
  family: "Roboto",
  fonts: [
    { src: `data:font/truetype;base64,${robotoRegular.toString("base64")}`, fontWeight: "normal" },
    { src: `data:font/truetype;base64,${robotoBold.toString("base64")}`, fontWeight: "bold" },
  ],
})

export const BORDER = "1pt solid #374151"
export const BORDER_LIGHT = "0.5pt solid #9ca3af"
export const HEADER_BG = "#1e3a5f"
export const SECTION_BG = "#e8edf4"
export const LABEL_COLOR = "#374151"
export const VALUE_COLOR = "#111827"
export const HEADER_TEXT = "#ffffff"

export const s = StyleSheet.create({
  page: {
    paddingTop: 14,
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 14,
    fontSize: 7.5,
    fontFamily: "Roboto",
    backgroundColor: "#ffffff",
  },

  // ── Fejléc ──────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    borderBottom: BORDER,
    marginBottom: 0,
  },
  headerLeft: {
    flex: 1,
    padding: 6,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: HEADER_BG,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 2,
  },
  headerRight: {
    width: 200,
    flexDirection: "row",
    borderLeft: BORDER,
    alignItems: "center",
    padding: 6,
    gap: 8,
  },
  logo: {
    width: 90,
    height: 18,
    objectFit: "contain",
  },
  workshopInfo: {
    flex: 1,
  },
  workshopName: {
    fontSize: 9,
    fontWeight: "bold",
    color: HEADER_BG,
  },
  workshopDetail: {
    fontSize: 6.5,
    color: "#6b7280",
    marginTop: 1,
  },

  // ── Szekció fejléc ──────────────────────────────────────
  sectionHeader: {
    backgroundColor: HEADER_BG,
    padding: "3 5",
  },
  sectionHeaderText: {
    fontSize: 7,
    fontWeight: "bold",
    color: HEADER_TEXT,
    letterSpacing: 0.3,
  },

  // ── Sor és cella alapelemek ──────────────────────────────
  row: {
    flexDirection: "row",
  },
  cell: {
    padding: "3 5",
    borderRight: BORDER_LIGHT,
    borderBottom: BORDER_LIGHT,
  },
  cellNoBorderRight: {
    padding: "3 5",
    borderBottom: BORDER_LIGHT,
  },
  label: {
    fontSize: 6,
    color: "#6b7280",
    marginBottom: 1.5,
  },
  value: {
    fontSize: 8,
    fontWeight: "bold",
    color: VALUE_COLOR,
    minHeight: 10,
  },
  valuePlaceholder: {
    fontSize: 8,
    color: "#d1d5db",
    minHeight: 10,
  },

  // ── Checkbox sor ─────────────────────────────────────────
  checkBox: {
    width: 8,
    height: 8,
    border: "1pt solid #6b7280",
    marginRight: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  checkBoxFilled: {
    width: 8,
    height: 8,
    border: "1pt solid #1e3a5f",
    backgroundColor: HEADER_BG,
    marginRight: 3,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Külső keret ──────────────────────────────────────────
  outerBorder: {
    border: BORDER,
    marginBottom: 4,
  },

  // ── Lábléc ──────────────────────────────────────────────
  footer: {
    marginTop: 4,
    borderTop: BORDER_LIGHT,
    paddingTop: 3,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 5.5,
    color: "#9ca3af",
    flex: 1,
  },
  footerRight: {
    fontSize: 5.5,
    color: "#9ca3af",
    textAlign: "right",
  },

  // ── Dokumentum-stílusú oldalak (Meghatalmazás / Iratösszesítő / Munkalap) ──
  docTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: HEADER_BG,
    marginTop: 8,
    marginBottom: 8,
    textAlign: "center",
  },
  paragraph: {
    fontSize: 8,
    color: VALUE_COLOR,
    lineHeight: 1.5,
    marginBottom: 6,
    textAlign: "justify",
  },
  bold: {
    fontWeight: "bold",
  },
  signatureRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 16,
  },
  signatureBox: {
    flex: 1,
    minHeight: 90,
    justifyContent: "flex-end",
  },
  signatureImage: {
    width: "100%",
    height: 50,
    objectFit: "contain",
  },
  signatureLine: {
    borderTop: BORDER_LIGHT,
    marginTop: 4,
    paddingTop: 2,
  },
  signatureLabel: {
    fontSize: 7,
    color: "#6b7280",
    textAlign: "center",
  },
})

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatDateTimeShort(value?: string | Date | null): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={s.headerRow}>
      <View style={s.headerLeft}>
        <Text style={s.headerTitle}>{title}</Text>
        <Text style={s.headerSubtitle}>{subtitle}</Text>
      </View>
      <View style={s.headerRight}>
        <Image src={logoBase64} style={s.logo} />
        <View style={s.workshopInfo}>
          <Text style={s.workshopName}>M1 SZERVIZ TATA</Text>
          <Text style={s.workshopDetail}>Autóüveg · Karosszéria · Autószerviz</Text>
          <Text style={s.workshopDetail}>2890 Tata, Kalapács u. 1.</Text>
          <Text style={s.workshopDetail}>Tel.: 0670/540-1062</Text>
          <Text style={s.workshopDetail}>www.m1szerviztata.hu</Text>
        </View>
      </View>
    </View>
  )
}

export function PageFooter({ id, note }: { id: string; note: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{note}</Text>
      <Text style={s.footerRight}>
        M1 Szerviz Tata • www.m1szerviztata.hu{"\n"}
        Azonosító: {id.slice(-8).toUpperCase()}
      </Text>
    </View>
  )
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionHeaderText}>{title}</Text>
    </View>
  )
}

export function Cell({
  label,
  value,
  flex,
  width,
  noBorderRight,
  tall,
}: {
  label: string
  value?: string | number | null
  flex?: number
  width?: number | string
  noBorderRight?: boolean
  tall?: boolean
}) {
  const cellStyle = [
    noBorderRight ? s.cellNoBorderRight : s.cell,
    flex !== undefined ? { flex } : {},
    width !== undefined ? { width } : {},
    tall ? { minHeight: 28 } : {},
  ]
  return (
    <View style={cellStyle}>
      <Text style={s.label}>{label}</Text>
      {value ? (
        <Text style={s.value}>{String(value)}</Text>
      ) : (
        <Text style={s.valuePlaceholder}>—</Text>
      )}
    </View>
  )
}

export function CheckCell({
  label,
  checked,
  flex,
  width,
  noBorderRight,
}: {
  label: string
  checked: boolean
  flex?: number
  width?: number | string
  noBorderRight?: boolean
}) {
  const cellStyle = [
    noBorderRight ? s.cellNoBorderRight : s.cell,
    flex !== undefined ? { flex } : {},
    width !== undefined ? { width } : {},
    { flexDirection: "row" as const, alignItems: "center" as const, gap: 4 },
  ]
  return (
    <View style={cellStyle}>
      <View style={checked ? s.checkBoxFilled : s.checkBox}>
        {checked && <Text style={{ fontSize: 6, color: "#ffffff", fontWeight: "bold" }}>✓</Text>}
      </View>
      <View>
        <Text style={s.label}>{label}</Text>
        <Text style={s.value}>{checked ? "Igen" : "Nem"}</Text>
      </View>
    </View>
  )
}

export function SignatureBlock({
  label,
  signatureDataUrl,
  fallbackText,
}: {
  label: string
  signatureDataUrl?: string | null
  fallbackText?: string
}) {
  return (
    <View style={s.signatureBox}>
      {signatureDataUrl ? (
        <Image src={signatureDataUrl} style={s.signatureImage} />
      ) : (
        <Text style={[s.value, { fontWeight: "normal", color: "#9ca3af" }]}>
          {fallbackText ?? ""}
        </Text>
      )}
      <View style={s.signatureLine}>
        <Text style={s.signatureLabel}>{label}</Text>
      </View>
    </View>
  )
}
