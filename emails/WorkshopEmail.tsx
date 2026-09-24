import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Row,
  Column,
  Link,
  Button,
  Img,
} from "@react-email/components"
import type { DamageReportInput } from "@/lib/validation"

interface WorkshopEmailProps {
  data: DamageReportInput & { id: string; referenceNumber: string; createdAt: Date; editToken?: string }
  // A mellékelt (a technikus által kiválasztott) meghatalmazások cégnevei
  authorizationNames?: string[]
}

// Rövid, csak a legfontosabb adatokat tartalmazó összefoglaló a műhelynek — a teljes
// kárfelvételi lap minden részlettel a csatolt PDF-ben található, ezt az emailt nem
// duplikáljuk. Azonos vizuális stílus a TechnicianNotificationEmail-lel (logó, navy
// riasztó-doboz rendszámmal, kék CTA gomb, egységes lábléc).
export default function WorkshopEmail({ data, authorizationNames = [] }: WorkshopEmailProps) {
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("hu-HU", {
      timeZone: "Europe/Budapest",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)

  return (
    <Html lang="hu">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src={`${process.env.NEXT_PUBLIC_APP_URL}/api/logo`}
              alt="M1 Szerviz Tata"
              width={160}
              height={38}
              style={logoStyle}
            />
          </Section>

          <Section style={alertBoxWrapper}>
            <Section style={alertBox}>
              <Heading style={alertHeading}>KÁRÜGY LEZÁRVA — ÚJ KÁRFELVÉTEL</Heading>
              <Text style={plateNumber}>{data.vehiclePlate.toUpperCase()}</Text>
              <Text style={alertSubtext}>{formatDate(data.createdAt)}</Text>
            </Section>
          </Section>

          <Text style={text}>
            A kárügy lezárásra került, a teljes kárfelvételi lap csatoltan érkezik PDF
            formátumban. Az alábbiakban a legfontosabb adatok gyors áttekintéshez.
          </Text>

          <Section style={summaryBox}>
            <DataRow label="Tulajdonos" value={data.ownerName} />
            {data.customerPhone && (
              <DataRow
                label="Telefon"
                value={
                  <Link href={`tel:${data.customerPhone}`} style={link}>
                    {data.customerPhone}
                  </Link>
                }
              />
            )}
            <DataRow
              label="E-mail"
              value={
                <Link href={`mailto:${data.customerEmail}`} style={link}>
                  {data.customerEmail}
                </Link>
              }
            />
            <DataRow label="Jármű" value={`${data.vehicleMake} ${data.vehicleModel}`} />
            <DataRow
              label="Biztosítás"
              value={
                data.hasCasco
                  ? `Casco${data.cascoInsurer ? ` — ${data.cascoInsurer}` : ""}`
                  : data.liabilityInsurer
                    ? `Kötelező — ${data.liabilityInsurer}`
                    : "Nincs megadva"
              }
            />
          </Section>

          <Section style={section}>
            <Heading as="h2" style={h2}>
              Kár leírása
            </Heading>
            <Text style={descriptionText}>{data.damageDescription}</Text>
          </Section>

          {data.photoUrls && data.photoUrls.length > 0 && (
            <Section style={section}>
              <Heading as="h2" style={h2}>
                Feltöltött fotók ({data.photoUrls.length} db)
              </Heading>
              {data.photoUrls.map((url, index) => (
                <Text key={index} style={photoLink}>
                  <Link href={url} style={link}>
                    Fotó {index + 1} megtekintése →
                  </Link>
                </Text>
              ))}
            </Section>
          )}

          {/* Szerkesztési link (csak szerviznek) */}
          {data.editToken && (
            <Section style={buttonSection}>
              <Button
                href={`${process.env.NEXT_PUBLIC_APP_URL}/api/edit/session?id=${data.id}&token=${data.editToken}`}
                style={button}
              >
                Beküldött adatok szerkesztése →
              </Button>
              <Text style={smallText}>A szerkesztési link 14 napig érvényes.</Text>
            </Section>
          )}

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Csatolva: a teljes kárfelvételi lap PDF-ben
              {authorizationNames.length > 0 && (
                <>
                  {" "}
                  és {authorizationNames.length > 1 ? "a meghatalmazások" : "a meghatalmazás"} (
                  <strong>{authorizationNames.join(", ")}</strong>) — közvetlenül továbbítható a
                  biztosítónak.
                </>
              )}
            </Text>
            <Text style={footerText}>
              Azonosító: <strong>{data.referenceNumber}</strong>
            </Text>
            <Hr style={hr} />
            <Text style={footerText}>
              <strong>M1 Szerviz Tata</strong>
            </Text>
            <Text style={footerText}>Autóüveg · Karosszéria · Autószerviz</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Row style={dataRow}>
      <Column style={labelColumn}>
        <Text style={labelText}>{label}:</Text>
      </Column>
      <Column style={valueColumn}>
        <Text style={valueText}>{value}</Text>
      </Column>
    </Row>
  )
}

const logoSection = {
  textAlign: "center" as const,
  padding: "24px 40px 0",
}

const logoStyle = {
  objectFit: "contain" as const,
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
}

// A vízszintes 40px térközt a tartalomhoz a wrapper PADDING-je adja, nem a belső doboz
// margin-ja — táblázat-alapú (Section) elemeken a margin levelezőkliensenként eltérően
// (vagy egyáltalán nem) érvényesül, és a navy háttér ilyenkor túllóghat a kártya szélén.
const alertBoxWrapper = {
  padding: "0 40px",
}

const alertBox = {
  backgroundColor: "#1e3a5f",
  color: "#ffffff",
  padding: "24px",
  textAlign: "center" as const,
  borderRadius: "8px",
}

const alertHeading = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 12px 0",
}

const plateNumber = {
  color: "#fbbf24",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "8px 0",
  letterSpacing: "2px",
}

const alertSubtext = {
  color: "#cbd5e1",
  fontSize: "14px",
  margin: "8px 0 0 0",
}

const text = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
  padding: "0 40px",
  margin: "16px 0",
}

const summaryBox = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 40px",
  width: "auto",
}

const section = {
  padding: "0 40px",
  margin: "16px 0",
}

const h2 = {
  color: "#1e3a5f",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0 0 8px 0",
}

const dataRow = {
  marginBottom: "6px",
}

const labelColumn = {
  width: "35%",
  paddingRight: "12px",
  verticalAlign: "top" as const,
}

const valueColumn = {
  width: "65%",
  verticalAlign: "top" as const,
}

const labelText = {
  color: "#64748b",
  fontSize: "14px",
  margin: "0",
}

const valueText = {
  color: "#1e293b",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
}

const link = {
  color: "#2563eb",
  textDecoration: "underline",
}

const descriptionText = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  padding: "12px",
  color: "#1e293b",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
}

const photoLink = {
  color: "#525f7f",
  fontSize: "14px",
  margin: "4px 0",
}

const buttonSection = {
  textAlign: "center" as const,
  padding: "8px 40px",
  margin: "16px 0",
}

const button = {
  display: "inline-block",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  padding: "14px 28px",
  borderRadius: "8px",
}

const smallText = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "18px",
  textAlign: "center" as const,
  margin: "12px 0 0 0",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "24px 40px",
}

const footer = {
  textAlign: "center" as const,
  padding: "0 40px",
}

const footerText = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "4px 0",
}
