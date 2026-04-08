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

// Roboto font – latin + latin-ext merged TTF (covers all Hungarian characters: á, é, í, ó, ö, ő, ú, ü, ű)
const fontsDir = path.join(process.cwd(), "lib", "fonts")
const robotoRegular = fs.readFileSync(path.join(fontsDir, "Roboto-Regular.ttf"))
const robotoBold = fs.readFileSync(path.join(fontsDir, "Roboto-Bold.ttf"))

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "pictures", "0001.png"))
const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: `data:font/truetype;base64,${robotoRegular.toString("base64")}`,
      fontWeight: "normal",
    },
    {
      src: `data:font/truetype;base64,${robotoBold.toString("base64")}`,
      fontWeight: "bold",
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingLeft: 30,
    paddingRight: 30,
    paddingBottom: 70, // extra hely a fixed lábléc miatt
    fontSize: 10,
    fontFamily: "Roboto",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderBottom: "2px solid #1e3a5f",
    paddingBottom: 10,
  },
  headerLeft: {
    width: 80,
    marginRight: 16,
  },
  headerRight: {
    flex: 1,
  },
  logo: {
    width: 80,
    height: 40,
    objectFit: "contain",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a5f",
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitleWrapper: {
    // minPresenceAhead biztosítja, hogy a szekciócím után
    // legalább 60pt hely maradjon az oldalon — nem marad egyedül alul
    minPresenceAhead: 60,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    backgroundColor: "#f3f4f6",
    padding: 4,
    marginBottom: 6,
    color: "#1e3a5f",
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    width: "40%",
    color: "#6b7280",
  },
  value: {
    width: "60%",
    color: "#1e293b",
  },
  signatureBox: {
    border: "1px solid #d1d5db",
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    width: "48%",
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  signatureImage: {
    width: 200,
    height: 80,
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    borderTop: "1px solid #d1d5db",
    paddingTop: 6,
    fontSize: 8,
    color: "#9ca3af",
  },
  textBlock: {
    marginTop: 4,
    lineHeight: 1.4,
  },
  damageImageBox: {
    border: "1px solid #d1d5db",
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
    backgroundColor: "#ffffff",
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
    own: "Saját felelősség",
    other: "Másik fél felelőssége",
    both: "Mindkét fél felelőssége",
  }
  return map[party] || party
}

// Szekciócím wrapper: minPresenceAhead megakadályozza az árva fejléc sort
function SectionTitle({ children }: { children: string }) {
  return (
    <View style={styles.sectionTitleWrapper}>
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  )
}

const DamageReportPDF = ({ data }: { data: PDFData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Fejléc */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image src={logoBase64} style={styles.logo} />
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.title}>GÉPJÁRMŰ KÁRFELVÉTELI LAP</Text>
          <Text style={styles.subtitle}>Azonosító: {data.id.slice(-8).toUpperCase()}</Text>
          <Text style={styles.subtitle}>{formatDate(data.createdAt)}</Text>
        </View>
      </View>

      {/* 1. Személyes adatok */}
      <View style={styles.section}>
        <SectionTitle>1. SZEMÉLYES ADATOK</SectionTitle>
        <View style={styles.row}>
          <Text style={styles.label}>Tulajdonos neve:</Text>
          <Text style={styles.value}>{data.ownerName}</Text>
        </View>
        {data.ownerAddress && (
          <View style={styles.row}>
            <Text style={styles.label}>Tulajdonos címe:</Text>
            <Text style={styles.value}>{data.ownerAddress}</Text>
          </View>
        )}
        {data.driverName && (
          <View style={styles.row}>
            <Text style={styles.label}>Vezető neve:</Text>
            <Text style={styles.value}>{data.driverName}</Text>
          </View>
        )}
        {data.driverAddress && (
          <View style={styles.row}>
            <Text style={styles.label}>Vezető címe:</Text>
            <Text style={styles.value}>{data.driverAddress}</Text>
          </View>
        )}
        {data.driverPhone && (
          <View style={styles.row}>
            <Text style={styles.label}>Vezető telefonszáma:</Text>
            <Text style={styles.value}>{data.driverPhone}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>E-mail cím:</Text>
          <Text style={styles.value}>{data.customerEmail}</Text>
        </View>
        {data.customerPhone && (
          <View style={styles.row}>
            <Text style={styles.label}>Telefonszám:</Text>
            <Text style={styles.value}>{data.customerPhone}</Text>
          </View>
        )}
      </View>

      {/* 2. Jármű és biztosítás */}
      <View style={styles.section}>
        <SectionTitle>2. JÁRMŰ ÉS BIZTOSÍTÁSI ADATOK</SectionTitle>
        <View style={styles.row}>
          <Text style={styles.label}>Rendszám:</Text>
          <Text style={styles.value}>{data.vehiclePlate.toUpperCase()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Gyártmány/Típus:</Text>
          <Text style={styles.value}>
            {data.vehicleMake} {data.vehicleModel}
          </Text>
        </View>
        {data.vehicleYear && (
          <View style={styles.row}>
            <Text style={styles.label}>Évjárat:</Text>
            <Text style={styles.value}>{data.vehicleYear}</Text>
          </View>
        )}
        {data.vehicleVin && (
          <View style={styles.row}>
            <Text style={styles.label}>Alvázszám:</Text>
            <Text style={styles.value}>{data.vehicleVin}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Casco biztosítás:</Text>
          <Text style={styles.value}>{data.hasCasco ? "Igen" : "Nem"}</Text>
        </View>
        {data.cascoInsurer && (
          <View style={styles.row}>
            <Text style={styles.label}>Casco biztosító:</Text>
            <Text style={styles.value}>{data.cascoInsurer}</Text>
          </View>
        )}
        {data.liabilityInsurer && (
          <View style={styles.row}>
            <Text style={styles.label}>Kötelező biztosító:</Text>
            <Text style={styles.value}>{data.liabilityInsurer}</Text>
          </View>
        )}
        {data.relevantInsurer && (
          <View style={styles.row}>
            <Text style={styles.label}>Illetékes biztosító:</Text>
            <Text style={styles.value}>{data.relevantInsurer}</Text>
          </View>
        )}
      </View>

      {/* 3. Baleset körülményei */}
      <View style={styles.section}>
        <SectionTitle>3. BALESET KÖRÜLMÉNYEI</SectionTitle>
        {data.accidentDate && (
          <View style={styles.row}>
            <Text style={styles.label}>Baleset dátuma:</Text>
            <Text style={styles.value}>{data.accidentDate}</Text>
          </View>
        )}
        {data.accidentCountry && (
          <View style={styles.row}>
            <Text style={styles.label}>Ország:</Text>
            <Text style={styles.value}>{data.accidentCountry}</Text>
          </View>
        )}
        {data.accidentCity && (
          <View style={styles.row}>
            <Text style={styles.label}>Város:</Text>
            <Text style={styles.value}>{data.accidentCity}</Text>
          </View>
        )}
        {data.accidentStreet && (
          <View style={styles.row}>
            <Text style={styles.label}>Utca:</Text>
            <Text style={styles.value}>{data.accidentStreet}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Lakott területen kívül:</Text>
          <Text style={styles.value}>{data.outsideSettlement ? "Igen" : "Nem"}</Text>
        </View>
        {data.roadNumber && (
          <View style={styles.row}>
            <Text style={styles.label}>Út száma:</Text>
            <Text style={styles.value}>{data.roadNumber}</Text>
          </View>
        )}
        {data.kilometerMark && (
          <View style={styles.row}>
            <Text style={styles.label}>Kilométer-szelvény:</Text>
            <Text style={styles.value}>{data.kilometerMark}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Rendőrség:</Text>
          <Text style={styles.value}>{data.policeInvolved ? "Igen" : "Nem"}</Text>
        </View>
        {data.policeReportNo && (
          <View style={styles.row}>
            <Text style={styles.label}>Jegyzőkönyv száma:</Text>
            <Text style={styles.value}>{data.policeReportNo}</Text>
          </View>
        )}
        {data.policeStation && (
          <View style={styles.row}>
            <Text style={styles.label}>Intézkedő kapitányság:</Text>
            <Text style={styles.value}>{data.policeStation}</Text>
          </View>
        )}
        {data.otherVehiclePlate && (
          <View style={styles.row}>
            <Text style={styles.label}>Másik jármű rendszáma:</Text>
            <Text style={styles.value}>{data.otherVehiclePlate}</Text>
          </View>
        )}
        {data.otherVehicleType && (
          <View style={styles.row}>
            <Text style={styles.label}>Másik jármű típusa:</Text>
            <Text style={styles.value}>{data.otherVehicleType}</Text>
          </View>
        )}
        {data.otherVehicleColor && (
          <View style={styles.row}>
            <Text style={styles.label}>Másik jármű színe:</Text>
            <Text style={styles.value}>{data.otherVehicleColor}</Text>
          </View>
        )}
        {data.additionalParties && (
          <View style={styles.row}>
            <Text style={styles.label}>További érintettek:</Text>
            <Text style={styles.value}>{data.additionalParties}</Text>
          </View>
        )}
        {data.vehicleInspectionLocation && (
          <View style={styles.row}>
            <Text style={styles.label}>Szemle helyszíne:</Text>
            <Text style={styles.value}>{data.vehicleInspectionLocation}</Text>
          </View>
        )}
      </View>

      {/* 4. Kár leírása */}
      <View style={styles.section}>
        <SectionTitle>4. KÁR LEÍRÁSA</SectionTitle>
        <View style={styles.textBlock}>
          <Text>{data.damageDescription}</Text>
        </View>

        {/* Sérülésjelölés diagram — wrap={false}: soha nem törik ketté */}
        {data.damagePoints && data.damagePoints.length > 0 && (
          <View style={styles.damageImageBox} wrap={false}>
            <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 6, color: "#1e3a5f" }}>
              Sérülés helye és iránya a járművön:
            </Text>
            <Svg viewBox="0 0 400 300" style={{ width: "100%", height: 200 }}>
              <G transform="translate(111, 61) scale(3.8)" fill="#9ca3af" stroke="#6b7280" strokeWidth="0.2">
                <Path d="M29.395,0H17.636c-3.117,0-5.643,3.467-5.643,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759
                  c3.116,0,5.644-2.527,5.644-5.644V6.584C35.037,3.467,32.511,0,29.395,0z M34.05,14.188v11.665l-2.729,0.351v-4.806
                  L34.05,14.188z M32.618,10.773c-1.016,3.9-2.219,8.51-2.219,8.51H16.631l-2.222-8.51
                  C14.41,10.773,23.293,7.755,32.618,10.773z M15.741,21.713v4.492l-2.73-0.349V14.502L15.741,21.713z
                  M13.011,37.938V27.579l2.73,0.343v8.196L13.011,37.938z M14.568,40.882l2.218-3.336h13.771l2.219,3.336H14.568z
                  M31.321,35.805v-7.872l2.729-0.355v10.048L31.321,35.805z" />
              </G>

              <Text x="10" y="70" style={{ fontSize: 12, fill: "#6b7280", fontWeight: "bold" }}>ELÖL</Text>
              <Text x="345" y="70" style={{ fontSize: 12, fill: "#6b7280", fontWeight: "bold" }}>HÁTUL</Text>

              {data.damagePoints.map((pt, i) => {
                const hasArrow = pt.dx !== 0 || pt.dy !== 0

                let arrowPoints = ""
                if (hasArrow) {
                  const endX = pt.x + pt.dx
                  const endY = pt.y + pt.dy
                  const angle = Math.atan2(pt.dy, pt.dx)
                  const arrowSize = 6
                  const p1x = endX
                  const p1y = endY
                  const p2x = endX - arrowSize * Math.cos(angle - Math.PI / 6)
                  const p2y = endY - arrowSize * Math.sin(angle - Math.PI / 6)
                  const p3x = endX - arrowSize * Math.cos(angle + Math.PI / 6)
                  const p3y = endY - arrowSize * Math.sin(angle + Math.PI / 6)
                  arrowPoints = `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`
                }

                return (
                  <G key={i}>
                    {hasArrow ? (
                      <>
                        <Line
                          x1={pt.x}
                          y1={pt.y}
                          x2={pt.x + pt.dx}
                          y2={pt.y + pt.dy}
                          stroke="#ef4444"
                          strokeWidth="2.5"
                        />
                        <Polygon points={arrowPoints} fill="#ef4444" />
                        <Circle cx={pt.x} cy={pt.y} r="5" fill="#ef4444" />
                        <Text
                          x={pt.x - 8}
                          y={pt.y - 8}
                          style={{ textAnchor: "middle", fontSize: 9, fill: "#ef4444", fontWeight: "bold" }}
                        >
                          {i + 1}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Circle cx={pt.x} cy={pt.y} r="8" fill="#ef4444" />
                        <Text
                          x={pt.x}
                          y={pt.y + 4}
                          style={{ textAnchor: "middle", fontSize: 9, fill: "white", fontWeight: "bold" }}
                        >
                          {i + 1}
                        </Text>
                      </>
                    )}
                  </G>
                )
              })}
            </Svg>
            <Text style={{ fontSize: 8, color: "#6b7280", marginTop: 4 }}>
              {data.damagePoints.length} pont megjelölve
              {data.damagePoints.some(pt => pt.dx !== 0 || pt.dy !== 0) && " (nyilak = becsapódás iránya)"}
            </Text>
          </View>
        )}

        {data.photoUrls && data.photoUrls.length > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Fényképek száma:</Text>
            <Text style={styles.value}>{data.photoUrls.length} db</Text>
          </View>
        )}
      </View>

      {/* 5. Nyilatkozatok — wrap={false}: kompakt szekció, nem törik ketté */}
      <View style={styles.section} wrap={false}>
        <SectionTitle>5. NYILATKOZATOK</SectionTitle>
        <View style={styles.row}>
          <Text style={styles.label}>Felelős fél:</Text>
          <Text style={styles.value}>{formatLiableParty(data.liableParty)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Alkohol/kábítószer befolyás:</Text>
          <Text style={styles.value}>{data.underInfluence ? "Igen" : "Nem"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Érvényes jogosítvány:</Text>
          <Text style={styles.value}>{data.licenseValid ? "Igen" : "Nem"}</Text>
        </View>
        {data.taxNumber && (
          <View style={styles.row}>
            <Text style={styles.label}>Adószám:</Text>
            <Text style={styles.value}>{data.taxNumber}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Fotómásolási engedély:</Text>
          <Text style={styles.value}>{data.consentToPhotocopy ? "Igen" : "Nem"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>CASCO alapú kárrendezés:</Text>
          <Text style={styles.value}>{data.cascoClaimRequest ? "Igen" : "Nem"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tulajdonjogi terhelés:</Text>
          <Text style={styles.value}>{data.vehicleEncumbrance ? "Igen" : "Nem"}</Text>
        </View>
      </View>

      {/* 6. Aláírások — wrap={false}: aláírásképek soha nem törik ketté */}
      <View style={styles.section} wrap={false}>
        <SectionTitle>6. ALÁÍRÁSOK</SectionTitle>
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={{ marginBottom: 4, fontWeight: "bold" }}>Tulajdonos aláírása:</Text>
            {data.ownerSignatureUrl && (
              <Image
                src={data.ownerSignatureUrl}
                style={styles.signatureImage}
              />
            )}
          </View>
          {data.driverSignatureUrl && (
            <View style={styles.signatureBox}>
              <Text style={{ marginBottom: 4, fontWeight: "bold" }}>Vezető aláírása:</Text>
              <Image
                src={data.driverSignatureUrl}
                style={styles.signatureImage}
              />
            </View>
          )}
        </View>
      </View>

      {/* Lábléc — fixed: minden oldalon megjelenik */}
      <View style={styles.footer} fixed>
        <Text>
          Jelen dokumentum az Ön által megadott adatok alapján készült. Az adatokat a GDPR
          előírásainak megfelelően kezeljük. A kárfelvételi lap digitális formában került
          rögzítésre.
        </Text>
        <Text style={{ marginTop: 4 }}>Kelt: {formatDate(data.createdAt)}</Text>
        <Text style={{ marginTop: 4 }}>M1 Szerviz Tata • www.m1szerviztata.hu</Text>
      </View>
    </Page>
  </Document>
)

export async function generatePDF(data: PDFData): Promise<Buffer> {
  const doc = <DamageReportPDF data={data} />
  return await renderToBuffer(doc)
}
