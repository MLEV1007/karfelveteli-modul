import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  renderToBuffer,
  Svg,
  Path,
  Line,
  Circle,
  G,
  Polygon,
} from "@react-pdf/renderer"
import path from "path"
import fs from "fs"
import type { DamageReportInput } from "./validation"

const fontsDir = path.join(process.cwd(), "lib", "fonts")
const robotoRegular = fs.readFileSync(path.join(fontsDir, "Roboto-Regular.ttf"))
const robotoBold = fs.readFileSync(path.join(fontsDir, "Roboto-Bold.ttf"))

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "pictures", "0001.png"))
const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`

Font.register({
  family: "Roboto",
  fonts: [
    { src: `data:font/truetype;base64,${robotoRegular.toString("base64")}`, fontWeight: "normal" },
    { src: `data:font/truetype;base64,${robotoBold.toString("base64")}`, fontWeight: "bold" },
  ],
})

const BORDER = "1pt solid #374151"
const BORDER_LIGHT = "0.5pt solid #9ca3af"
const HEADER_BG = "#1e3a5f"
const SECTION_BG = "#e8edf4"
const LABEL_COLOR = "#374151"
const VALUE_COLOR = "#111827"
const HEADER_TEXT = "#ffffff"

const s = StyleSheet.create({
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
    width: 48,
    height: 32,
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
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: "3 5",
    borderBottom: BORDER_LIGHT,
    gap: 4,
  },
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
  checkLabel: {
    fontSize: 7,
    color: LABEL_COLOR,
  },
  checkValue: {
    fontSize: 7,
    fontWeight: "bold",
    color: VALUE_COLOR,
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
})

interface PDFData extends DamageReportInput {
  id: string
  createdAt: Date
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatLiableParty(party: string): string {
  const map: Record<string, string> = {
    own: "Én / saját gépjárművem vezetője",
    other: "A másik fél",
    both: "Mindkét résztvevő",
  }
  return map[party] || party
}

// Egy cella: label + value, rugalmas szélességgel
function Cell({
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

// Checkbox cella
function CheckCell({
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

// Szekciócím sáv
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionHeaderText}>{title}</Text>
    </View>
  )
}

const DamageReportPDF = ({ data }: { data: PDFData }) => {
  const hasDriver = !!(data.driverName || data.driverAddress || data.driverPhone)
  const hasOtherVehicle = !!(data.otherVehiclePlate || data.otherVehicleType || data.otherVehicleColor)
  const hasPoliceDetails = !!(data.policeReportNo || data.policeStation)
  const hasLocationDetails = !!(data.roadNumber || data.kilometerMark)
  const hasDamagePoints = !!(data.damagePoints && data.damagePoints.length > 0)

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ═══════════════════════════════════════════════════
            FEJLÉC
        ═══════════════════════════════════════════════════ */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>GÉPJÁRMŰ KÁRBEJELENTŐ LAP</Text>
            <Text style={s.headerSubtitle}>
              Azonosító: {data.id.slice(-8).toUpperCase()} • Kitöltés időpontja: {formatDate(data.createdAt)}
            </Text>
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

        {/* ═══════════════════════════════════════════════════
            1. SZEMÉLYES ADATOK + JÁRMŰ ÉS BIZTOSÍTÁS
        ═══════════════════════════════════════════════════ */}
        <View style={[s.outerBorder, { marginTop: 4 }]}>
          <View style={s.row}>
            {/* Bal: Személyes adatok */}
            <View style={{ flex: 1, borderRight: BORDER }}>
              <SectionHeader title="SZEMÉLYES ADATOK" />
              <View style={s.row}>
                <Cell label="Tulajdonos (üzembentartó) neve" value={data.ownerName} flex={1} />
              </View>
              {data.ownerAddress && (
                <View style={s.row}>
                  <Cell label="Tulajdonos címe" value={data.ownerAddress} flex={1} />
                </View>
              )}
              {hasDriver && (
                <>
                  <View style={s.row}>
                    <Cell label="Vezető neve" value={data.driverName} flex={1} />
                  </View>
                  {data.driverAddress && (
                    <View style={s.row}>
                      <Cell label="Vezető címe" value={data.driverAddress} flex={1} />
                    </View>
                  )}
                </>
              )}
              <View style={s.row}>
                <Cell label="E-mail cím" value={data.customerEmail} flex={1} />
                {(data.customerPhone || data.driverPhone) && (
                  <Cell label="Telefonszám" value={data.customerPhone || data.driverPhone} flex={1} noBorderRight />
                )}
              </View>
            </View>

            {/* Jobb: Jármű és biztosítás */}
            <View style={{ flex: 1 }}>
              <SectionHeader title="JÁRMŰ ÉS BIZTOSÍTÁSI ADATOK" />
              <View style={s.row}>
                <Cell label="Rendszám" value={data.vehiclePlate.toUpperCase()} width={80} />
                <Cell label="Gyártmány / Típus" value={`${data.vehicleMake} ${data.vehicleModel}`} flex={1} />
                {data.vehicleYear && (
                  <Cell label="Évjárat" value={String(data.vehicleYear)} width={50} noBorderRight />
                )}
              </View>
              {data.vehicleVin && (
                <View style={s.row}>
                  <Cell label="Alvázszám (VIN)" value={data.vehicleVin} flex={1} />
                </View>
              )}
              <View style={s.row}>
                <CheckCell label="Casco biztosítás" checked={data.hasCasco} flex={1} />
                {data.cascoInsurer && (
                  <Cell label="Casco biztosító" value={data.cascoInsurer} flex={1} noBorderRight />
                )}
              </View>
              {(data.liabilityInsurer || data.relevantInsurer) && (
                <View style={s.row}>
                  {data.liabilityInsurer && (
                    <Cell label="Kötelező biztosító" value={data.liabilityInsurer} flex={1} />
                  )}
                  {data.relevantInsurer && (
                    <Cell
                      label="Illetékes biztosító"
                      value={data.relevantInsurer}
                      flex={1}
                      noBorderRight={!data.liabilityInsurer}
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════
            2. BALESET KÖRÜLMÉNYEI
        ═══════════════════════════════════════════════════ */}
        <View style={s.outerBorder}>
          <SectionHeader title="A BALESET (KÁRESEMÉNY) KÖRÜLMÉNYEI" />
          <View style={s.row}>
            {data.accidentDate && (
              <Cell label="A baleset időpontja" value={data.accidentDate} width={120} />
            )}
            <Cell label="Ország" value={data.accidentCountry} width={90} />
            <Cell label="Város / Település" value={data.accidentCity} flex={1} />
            {data.accidentStreet && (
              <Cell label="Utca / Helyszín" value={data.accidentStreet} flex={1} noBorderRight />
            )}
          </View>
          {(data.outsideSettlement || hasLocationDetails) && (
            <View style={s.row}>
              <CheckCell label="Lakott területen kívül" checked={data.outsideSettlement} width={130} />
              {data.roadNumber && <Cell label="Út száma" value={data.roadNumber} width={80} />}
              {data.kilometerMark && (
                <Cell label="Km-szelvény" value={data.kilometerMark} flex={1} noBorderRight />
              )}
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════
            3. SZEMLE HELYSZÍNE + MÁSIK JÁRMŰ + RENDŐRSÉG
        ═══════════════════════════════════════════════════ */}
        <View style={s.outerBorder}>
          <View style={s.row}>
            {/* Szemle helyszíne */}
            <View style={{ flex: 1, borderRight: BORDER }}>
              <SectionHeader title="HOL TEKINTHETŐ MEG A GÉPJÁRMŰ?" />
              <View style={s.row}>
                <Cell
                  label="Helyszíni szemle helyszíne"
                  value={data.vehicleInspectionLocation || "M1 SZERVIZ TATA Kft. – 2890 Tata, Kalapács u. 1."}
                  flex={1}
                  noBorderRight
                  tall
                />
              </View>
            </View>

            {/* Rendőrség */}
            <View style={{ flex: 1 }}>
              <SectionHeader title="RENDŐRI INTÉZKEDÉS" />
              <View style={s.row}>
                <CheckCell label="Rendőrség intézkedett" checked={data.policeInvolved} flex={1} />
                {data.policeReportNo && (
                  <Cell label="Jkv. száma" value={data.policeReportNo} flex={1} noBorderRight />
                )}
              </View>
              {data.policeStation && (
                <View style={s.row}>
                  <Cell label="Intézkedő kapitányság / rendőrőrs" value={data.policeStation} flex={1} noBorderRight />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════
            4. MÁSIK JÁRMŰ (csak ha van adat)
        ═══════════════════════════════════════════════════ */}
        {hasOtherVehicle && (
          <View style={s.outerBorder}>
            <SectionHeader title="MÁSIK JÁRMŰ ADATAI" />
            <View style={s.row}>
              <Cell label="Rendszám" value={data.otherVehiclePlate} flex={1} />
              <Cell label="Típus / Gyártmány" value={data.otherVehicleType} flex={1} />
              <Cell label="Szín" value={data.otherVehicleColor} flex={1} noBorderRight />
            </View>
            {data.additionalParties && (
              <View style={s.row}>
                <Cell label="További résztvevők" value={data.additionalParties} flex={1} noBorderRight />
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════
            5. KÁR LEÍRÁSA + SÉRÜLÉSI ÁBRA
        ═══════════════════════════════════════════════════ */}
        <View style={s.outerBorder}>
          <SectionHeader title="KÁR LEÍRÁSA ÉS SÉRÜLÉS HELYE" />
          <View style={s.row}>
            {/* Bal: Szöveges leírás */}
            <View style={{ flex: 3, borderRight: hasDamagePoints ? BORDER : undefined }}>
              <View style={[s.cell, { minHeight: hasDamagePoints ? 130 : 60 }]}>
                <Text style={s.label}>A káresemény leírása</Text>
                <Text style={[s.value, { lineHeight: 1.5, fontWeight: "normal" }]}>
                  {data.damageDescription}
                </Text>
              </View>
              {data.photoUrls && data.photoUrls.length > 0 && (
                <View style={s.row}>
                  <Cell label="Csatolt fényképek száma" value={`${data.photoUrls.length} db`} flex={1} noBorderRight />
                </View>
              )}
            </View>

            {/* Jobb: Sérülési ábra (csak ha van pont) */}
            {hasDamagePoints && (
              <View style={{ flex: 2, padding: 6 }}>
                <Text style={[s.label, { marginBottom: 4, textAlign: "center" }]}>
                  Rajzolja be a gépjármű sérüléseit:
                </Text>
                <Svg viewBox="0 0 400 310" style={{ width: "100%", height: 130 }}>
                  {/* Jármű sziluett */}
                  <G transform="translate(111, 61) scale(3.8)" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.4">
                    <Path d="M29.395,0H17.636c-3.117,0-5.643,3.467-5.643,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759
                      c3.116,0,5.644-2.527,5.644-5.644V6.584C35.037,3.467,32.511,0,29.395,0z M34.05,14.188v11.665l-2.729,0.351v-4.806
                      L34.05,14.188z M32.618,10.773c-1.016,3.9-2.219,8.51-2.219,8.51H16.631l-2.222-8.51
                      C14.41,10.773,23.293,7.755,32.618,10.773z M15.741,21.713v4.492l-2.73-0.349V14.502L15.741,21.713z
                      M13.011,37.938V27.579l2.73,0.343v8.196L13.011,37.938z M14.568,40.882l2.218-3.336h13.771l2.219,3.336H14.568z
                      M31.321,35.805v-7.872l2.729-0.355v10.048L31.321,35.805z" />
                  </G>
                  {/* Irányjelzők */}
                  <Text x="200" y="52" style={{ fontSize: 9, fill: "#374151", fontWeight: "bold", textAnchor: "middle" }}>
                    ▲ ELÖL
                  </Text>
                  <Text x="200" y="298" style={{ fontSize: 9, fill: "#374151", fontWeight: "bold", textAnchor: "middle" }}>
                    HÁTUL ▼
                  </Text>
                  {/* Sérülési pontok */}
                  {data.damagePoints!.map((pt, i) => {
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
                <Text style={[s.label, { textAlign: "center", marginTop: 2 }]}>
                  {data.damagePoints!.length} jelölt sérülési pont
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════
            6. NYILATKOZATOK
        ═══════════════════════════════════════════════════ */}
        <View style={s.outerBorder}>
          <SectionHeader title="NYILATKOZATOK" />
          <View style={s.row}>
            <View style={{ flex: 1, borderRight: BORDER }}>
              <View style={s.row}>
                <Cell label="Felelős fél megjelölése" value={formatLiableParty(data.liableParty)} flex={1} noBorderRight />
              </View>
              {data.taxNumber && (
                <View style={s.row}>
                  <Cell label="Adószám (ÁFA visszaigénylés esetén)" value={data.taxNumber} flex={1} noBorderRight />
                </View>
              )}
            </View>
            <View style={{ flex: 2 }}>
              <View style={s.row}>
                <CheckCell label="Kábítószer / alkohol befolyás" checked={data.underInfluence} flex={1} />
                <CheckCell label="Érvényes jogosítvány" checked={data.licenseValid} flex={1} />
                <CheckCell label="Tulajdonjogi terhelés" checked={data.vehicleEncumbrance} flex={1} noBorderRight />
              </View>
              <View style={s.row}>
                <CheckCell label="DEKRA fotómásolási engedély" checked={data.consentToPhotocopy} flex={1} />
                <CheckCell label="CASCO alapú kárrendezés igénylése" checked={data.cascoClaimRequest} flex={2} noBorderRight />
              </View>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════
            7. ALÁÍRÁSOK
        ═══════════════════════════════════════════════════ */}
        <View style={s.outerBorder}>
          <SectionHeader title="ALÁÍRÁSOK" />
          <View style={s.row}>
            <View style={[s.cell, { flex: 1, borderRight: BORDER }]}>
              <Text style={s.label}>Tulajdonos aláírása:</Text>
              {data.ownerSignatureUrl && (
                <Image src={data.ownerSignatureUrl} style={{ width: "100%", height: 55, objectFit: "contain" }} />
              )}
            </View>
            {data.driverSignatureUrl ? (
              <View style={[s.cell, { flex: 1 }]}>
                <Text style={s.label}>Vezető aláírása:</Text>
                <Image src={data.driverSignatureUrl} style={{ width: "100%", height: 55, objectFit: "contain" }} />
              </View>
            ) : (
              <View style={[s.cell, { flex: 1 }]}>
                <Text style={s.label}>Kelt:</Text>
                <Text style={[s.value, { marginTop: 8 }]}>{formatDate(data.createdAt)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════
            LÁBLÉC
        ═══════════════════════════════════════════════════ */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Jelen dokumentum az Ön által megadott adatok alapján digitálisan rögzítésre került. Az adatokat a GDPR előírásainak megfelelően kezeljük. A bejelentett adatok valódiságáért az ügyfél felelős.
          </Text>
          <Text style={s.footerRight}>
            M1 Szerviz Tata • www.m1szerviztata.hu{"\n"}
            Azonosító: {data.id.slice(-8).toUpperCase()}
          </Text>
        </View>

      </Page>
    </Document>
  )
}

export async function generatePDF(data: PDFData): Promise<Buffer> {
  const doc = <DamageReportPDF data={data} />
  return await renderToBuffer(doc)
}
