import { View, Text, Image, StyleSheet, Font, Svg, Path, Line, Circle, G, Polygon } from "@react-pdf/renderer"
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

  // ── Dokumentum-stílusú oldalak (Meghatalmazás / Iratösszesítő / Jegyzőkönyv) ──
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

export interface DamagePoint {
  x: number
  y: number
  dx: number
  dy: number
  label: string
}

// A gépjármű felülnézeti sérülési ábrája — a Kárbejelentő és a Jegyzőkönyv oldal is használja.
export function DamageDiagram({ points }: { points: DamagePoint[] }) {
  return (
    <Svg viewBox="0 0 400 310" style={{ width: "100%", height: 130 }}>
      <G transform="translate(111, 61) scale(3.8)" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.4">
        <Path d="M29.395,0H17.636c-3.117,0-5.643,3.467-5.643,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759
          c3.116,0,5.644-2.527,5.644-5.644V6.584C35.037,3.467,32.511,0,29.395,0z M34.05,14.188v11.665l-2.729,0.351v-4.806
          L34.05,14.188z M32.618,10.773c-1.016,3.9-2.219,8.51-2.219,8.51H16.631l-2.222-8.51
          C14.41,10.773,23.293,7.755,32.618,10.773z M15.741,21.713v4.492l-2.73-0.349V14.502L15.741,21.713z
          M13.011,37.938V27.579l2.73,0.343v8.196L13.011,37.938z M14.568,40.882l2.218-3.336h13.771l2.219,3.336H14.568z
          M31.321,35.805v-7.872l2.729-0.355v10.048L31.321,35.805z" />
      </G>
      <Text x="200" y="52" style={{ fontSize: 9, fill: "#374151", fontWeight: "bold", textAnchor: "middle" }}>
        ▲ ELÖL
      </Text>
      <Text x="200" y="298" style={{ fontSize: 9, fill: "#374151", fontWeight: "bold", textAnchor: "middle" }}>
        HÁTUL ▼
      </Text>
      {points.map((pt, i) => {
        const hasArrow = pt.dx !== 0 || pt.dy !== 0
        if (!hasArrow) {
          return (
            <G key={i}>
              <Circle cx={pt.x} cy={pt.y} r="8" fill="#dc2626" />
              <Text x={pt.x} y={pt.y + 3} style={{ textAnchor: "middle", fontSize: 8, fill: "white", fontWeight: "bold" }}>
                {i + 1}
              </Text>
            </G>
          )
        }
        const endX = pt.x + pt.dx
        const endY = pt.y + pt.dy
        const angle = Math.atan2(pt.dy, pt.dx)
        const as = 6
        const arrowPoints = `${endX},${endY} ${endX - as * Math.cos(angle - Math.PI / 6)},${endY - as * Math.sin(angle - Math.PI / 6)} ${endX - as * Math.cos(angle + Math.PI / 6)},${endY - as * Math.sin(angle + Math.PI / 6)}`
        return (
          <G key={i}>
            <Line x1={pt.x} y1={pt.y} x2={endX} y2={endY} stroke="#dc2626" strokeWidth="2" />
            <Polygon points={arrowPoints} fill="#dc2626" />
            <Circle cx={pt.x} cy={pt.y} r="5" fill="#dc2626" />
            <Text x={pt.x - 8} y={pt.y - 7} style={{ fontSize: 7, fill: "#dc2626", fontWeight: "bold" }}>
              {i + 1}
            </Text>
          </G>
        )
      })}
    </Svg>
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
