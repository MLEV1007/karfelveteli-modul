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
  Img,
} from "@react-email/components"
import type { DamageReportInput } from "@/lib/validation"

interface WorkshopEmailProps {
  data: DamageReportInput & { id: string; createdAt: Date; editToken?: string }
}

export default function WorkshopEmail({ data }: WorkshopEmailProps) {
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("hu-HU", {
      timeZone: "Europe/Budapest",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)

  const formatLiableParty = (party: string) => {
    const map: Record<string, string> = {
      own: "Saját felelősség",
      other: "Másik fél felelőssége",
      both: "Mindkét fél felelőssége",
    }
    return map[party] || party
  }

  return (
    <Html lang="hu">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src={`${process.env.NEXT_PUBLIC_APP_URL}/api/logo`}
              alt="M1 Szerviz Tata"
              width={120}
              height={60}
              style={logoStyle}
            />
          </Section>
          <Section style={alertBox}>
            <Heading style={alertHeading}>ÚJ KÁRFELVÉTEL BEÉRKEZETT</Heading>
            <Text style={plateNumber}>{data.vehiclePlate.toUpperCase()}</Text>
            <Text style={alertSubtext}>{formatDate(data.createdAt)}</Text>
          </Section>

          <Section style={section}>
            <Heading as="h2" style={h2}>
              1. Személyes adatok
            </Heading>
            <DataRow label="Tulajdonos neve" value={data.ownerName} />
            {data.ownerAddress && (
              <DataRow label="Tulajdonos címe" value={data.ownerAddress} />
            )}
            {data.driverName && <DataRow label="Vezető neve" value={data.driverName} />}
            {data.driverAddress && (
              <DataRow label="Vezető címe" value={data.driverAddress} />
            )}
            <DataRow
              label="E-mail"
              value={
                <Link href={`mailto:${data.customerEmail}`} style={link}>
                  {data.customerEmail}
                </Link>
              }
            />
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
          </Section>

          <Section style={section}>
            <Heading as="h2" style={h2}>
              2. Jármű és biztosítási adatok
            </Heading>
            <DataRow label="Rendszám" value={data.vehiclePlate.toUpperCase()} />
            <DataRow label="Gyártmány" value={data.vehicleMake} />
            <DataRow label="Típus" value={data.vehicleModel} />
            {data.vehicleYear && (
              <DataRow label="Évjárat" value={data.vehicleYear.toString()} />
            )}
            {data.vehicleVin && <DataRow label="Alvázszám" value={data.vehicleVin} />}
            <DataRow label="Casco biztosítás" value={data.hasCasco ? "Igen" : "Nem"} />
            {data.cascoInsurer && (
              <DataRow label="Casco biztosító" value={data.cascoInsurer} />
            )}
            {data.liabilityInsurer && (
              <DataRow label="Kötelező biztosító" value={data.liabilityInsurer} />
            )}
          </Section>

          <Section style={section}>
            <Heading as="h2" style={h2}>
              3. Baleset körülményei
            </Heading>
            {data.accidentDate && (
              <DataRow label="Baleset dátuma" value={data.accidentDate} />
            )}
            {data.accidentCountry && (
              <DataRow label="Ország" value={data.accidentCountry} />
            )}
            {data.accidentCity && <DataRow label="Város" value={data.accidentCity} />}
            {data.accidentStreet && <DataRow label="Utca" value={data.accidentStreet} />}
            <DataRow
              label="Rendőrség részvétele"
              value={data.policeInvolved ? "Igen" : "Nem"}
            />
            {data.policeReportNo && (
              <DataRow label="Jegyzőkönyv száma" value={data.policeReportNo} />
            )}
            {data.otherVehiclePlate && (
              <DataRow label="Másik jármű rendszáma" value={data.otherVehiclePlate} />
            )}
            {data.otherVehicleType && (
              <DataRow label="Másik jármű típusa" value={data.otherVehicleType} />
            )}
            {data.otherVehicleColor && (
              <DataRow label="Másik jármű színe" value={data.otherVehicleColor} />
            )}
            {data.additionalParties && (
              <DataRow label="További érintettek" value={data.additionalParties} />
            )}
          </Section>

          <Section style={section}>
            <Heading as="h2" style={h2}>
              4. Kár leírása
            </Heading>
            <Text style={descriptionText}>{data.damageDescription}</Text>
            {data.photoUrls && data.photoUrls.length > 0 && (
              <DataRow
                label="Fényképek száma"
                value={`${data.photoUrls.length} db`}
              />
            )}
          </Section>

          <Section style={section}>
            <Heading as="h2" style={h2}>
              5. Nyilatkozatok
            </Heading>
            <DataRow label="Felelős fél" value={formatLiableParty(data.liableParty)} />
            <DataRow
              label="Alkohol/kábítószer befolyás"
              value={data.underInfluence ? "Igen ⚠️" : "Nem"}
            />
            <DataRow
              label="Érvényes jogosítvány"
              value={data.licenseValid ? "Igen" : "Nem ⚠️"}
            />
            {data.taxNumber && <DataRow label="Adószám" value={data.taxNumber} />}
            <DataRow
              label="Fotómásolási engedély"
              value={data.consentToPhotocopy ? "Igen" : "Nem"}
            />
          </Section>

          {/* Feltöltött fotók */}
          {data.photoUrls && data.photoUrls.length > 0 && (
            <Section style={section}>
              <Heading as="h2" style={h2}>
                Feltöltött fotók
              </Heading>
              {data.photoUrls.map((url, index) => (
                <Row key={index} style={dataRow}>
                  <Column style={valueColumn}>
                    <Link href={url} style={link}>
                      Fotó {index + 1} megtekintése →
                    </Link>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          <Hr style={hr} />

          {/* Szerkesztési link (csak szerviznek) */}
          {data.editToken && (
            <Section style={editLinkSection}>
              <Heading as="h2" style={h2}>
                Jelentés szerkesztése
              </Heading>
              <Text style={editDescription}>
                Az alábbi linkkel szerkesztheti a beküldött adatokat (fotók és aláírások
                kivételével). A link 7 napig érvényes a beküldéstől számítva.
              </Text>
              <Link
                href={`${process.env.NEXT_PUBLIC_APP_URL}/edit/${data.id}?token=${data.editToken}`}
                style={editButton}
              >
                Szerkesztés megnyitása →
              </Link>
            </Section>
          )}

          <Hr style={hr} />

          <Section style={section}>
            <Text style={footerNote}>
              A teljes kárfelvételi lapot PDF formátumban csatoltan küldjük.
            </Text>
            <Text style={footerNote}>
              Azonosító: <strong>{data.id.slice(-8).toUpperCase()}</strong>
            </Text>
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
  backgroundColor: "#ffffff",
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
  maxWidth: "700px",
}

const alertBox = {
  backgroundColor: "#1e3a5f",
  color: "#ffffff",
  padding: "24px",
  textAlign: "center" as const,
  borderRadius: "8px 8px 0 0",
}

const alertHeading = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0 0 12px 0",
}

const plateNumber = {
  color: "#fbbf24",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "8px 0",
  letterSpacing: "2px",
}

const alertSubtext = {
  color: "#cbd5e1",
  fontSize: "14px",
  margin: "8px 0 0 0",
}

const section = {
  padding: "0 40px",
  margin: "24px 0",
}

const h2 = {
  color: "#1e3a5f",
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
  borderBottom: "2px solid #e2e8f0",
  paddingBottom: "8px",
}

const dataRow = {
  marginBottom: "8px",
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
  margin: "0 0 12px 0",
  whiteSpace: "pre-wrap" as const,
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 40px",
}

const footerNote = {
  color: "#64748b",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "8px 0",
  textAlign: "center" as const,
}

const editLinkSection = {
  padding: "0 40px",
  margin: "24px 0",
  textAlign: "center" as const,
}

const editDescription = {
  color: "#64748b",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 20px 0",
  textAlign: "center" as const,
}

const editButton = {
  display: "inline-block",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  padding: "14px 28px",
  borderRadius: "8px",
  margin: "8px 0",
}
