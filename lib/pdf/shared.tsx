import { View, Text, Image, StyleSheet, Font, Svg, Path, Line, Circle, G, Polygon, Rect } from "@react-pdf/renderer"
import path from "path"
import fs from "fs"
import { WORKSHOP_BRAND } from "@/lib/workshop"

const fontsDir = path.join(process.cwd(), "lib", "fonts")
const robotoRegular = fs.readFileSync(path.join(fontsDir, "Roboto-Regular.ttf"))
const robotoBold = fs.readFileSync(path.join(fontsDir, "Roboto-Bold.ttf"))

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "pictures", "logo.png"))
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
  // Bal oldalt a logó a sarokban, mellette a dokumentum címe, alatta az azonosító és a
  // dátumok; jobb oldalt a cégadatok ("M1 Szerviz Tata Kft." + cím, telefon, web).
  headerRow: {
    flexDirection: "row",
    borderBottom: BORDER,
    marginBottom: 0,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: "5 6",
    gap: 10,
  },
  logo: {
    width: 104,
    height: 25,
    objectFit: "contain",
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: HEADER_BG,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 7,
    color: "#4b5563",
    marginTop: 1.5,
  },
  headerRight: {
    width: 150,
    borderLeft: BORDER,
    justifyContent: "center",
    padding: "5 8",
  },
  workshopName: {
    fontSize: 9,
    fontWeight: "bold",
    color: HEADER_BG,
    marginBottom: 1,
  },
  workshopDetail: {
    fontSize: 6.5,
    color: "#4b5563",
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
    // Fix méret (nem flex:1!) — flex:1 egy auto-magasságú szülőben (pl. a Kárbejelentő
    // lap táblázat-cellájában) Yoga-szinten 0 flex-basis-re eshet vissza, és a doboz
    // a tényleges tartalmánál alacsonyabbra zsugorodik, miközben a kép a doboz alján
    // (justifyContent: flex-end) a keretvonalon túlra csúszik.
    height: 90,
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

export function formatDateOnly(value?: string | Date | null): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
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

// Közös fejléc mindhárom dokumentumhoz. A `details` sorok (azonosító, dátumok) a cím
// alatt, egymás alatt jelennek meg.
export function PageHeader({ title, details }: { title: string; details: string[] }) {
  return (
    <View style={s.headerRow}>
      <View style={s.headerLeft}>
        <Image src={logoBase64} style={s.logo} />
        <View style={s.headerTitleBlock}>
          <Text style={s.headerTitle}>{title}</Text>
          {details.map((line, i) => (
            <Text key={i} style={s.headerSubtitle}>
              {line}
            </Text>
          ))}
        </View>
      </View>
      <View style={s.headerRight}>
        <Text style={s.workshopName}>{WORKSHOP_BRAND.legalName}</Text>
        <Text style={s.workshopDetail}>{WORKSHOP_BRAND.address}</Text>
        <Text style={s.workshopDetail}>Tel.: {WORKSHOP_BRAND.phone}</Text>
        <Text style={s.workshopDetail}>{WORKSHOP_BRAND.website}</Text>
      </View>
    </View>
  )
}

export function PageFooter({ referenceNumber, note }: { referenceNumber: string; note: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{note}</Text>
      <Text style={s.footerRight}>
        {WORKSHOP_BRAND.legalName} • {WORKSHOP_BRAND.website}{"\n"}
        Azonosító: {referenceNumber}
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

// Font-független jelölőnégyzet: fehér négyzet vékony fekete kerettel, bejelölve két
// SVG-vonallal rajzolt fekete X. A Roboto betűtípusban nincs "✓" karakter, ezért a
// korábbi szöveges pipa nem látszott (fekete-fehér nyomtatásban pedig a kitöltött
// sötétkék négyzet sem különült el egy üres négyzettől).
export function CheckMark({ checked, size = 8 }: { checked: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10" style={{ marginRight: 3 }}>
      <Rect x="0.5" y="0.5" width="9" height="9" fill="#ffffff" stroke="#111827" strokeWidth="0.9" />
      {checked && <Line x1="2.2" y1="2.2" x2="7.8" y2="7.8" stroke="#000000" strokeWidth="1.6" />}
      {checked && <Line x1="7.8" y1="2.2" x2="2.2" y2="7.8" stroke="#000000" strokeWidth="1.6" />}
    </Svg>
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
      <CheckMark checked={checked} />
      <View>
        <Text style={s.label}>{label}</Text>
        <Text style={s.value}>{checked ? "Igen" : "Nem"}</Text>
      </View>
    </View>
  )
}

// A vezető és a tulajdonos ugyanaz a személy-e. A korábbi kárügyeknél (driverSameAsOwner
// NULL/false) azonosnak tekintjük, ha a vezető neve üres vagy megegyezik a tulajdonoséval —
// így a régi PDF-ek újragenerálásakor sem jelenik meg kétszer ugyanaz a személy.
export function isDriverSameAsOwner(d: {
  driverSameAsOwner?: boolean | null
  driverName?: string | null
  ownerName: string
}): boolean {
  if (d.driverSameAsOwner) return true
  const norm = (x?: string | null) => (x ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("hu")
  return !norm(d.driverName) || norm(d.driverName) === norm(d.ownerName)
}

export interface DamagePoint {
  x: number
  y: number
  dx: number
  dy: number
  label: string
}

// A gépjármű felülnézeti sérülési ábrája — a Kárbejelentő és a Jegyzőkönyv oldal is használja.
export function DamageDiagram({ points, height = 130 }: { points: DamagePoint[]; height?: number }) {
  return (
    <Svg viewBox="0 0 400 310" style={{ width: "100%", height }}>
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
    <View style={s.signatureBox} wrap={false}>
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
