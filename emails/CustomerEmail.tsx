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

interface CustomerEmailProps {
  data: DamageReportInput & { id: string; createdAt: Date }
}

export default function CustomerEmail({ data }: CustomerEmailProps) {
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("hu-HU", {
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
              width={120}
              height={60}
              style={logoStyle}
            />
          </Section>
          <Heading style={h1}>Kárfelvételi visszaigazolás</Heading>

          <Text style={text}>Tisztelt {data.ownerName}!</Text>

          <Text style={text}>
            Köszönjük, hogy igénybe veszi szervizünk szolgáltatásait. Kárfelvételi
            bejelentése sikeresen beérkezett hozzánk.
          </Text>

          <Section style={summaryBox}>
            <Heading as="h2" style={h2}>
              Összefoglaló
            </Heading>
            <Row>
              <Column style={labelColumn}>
                <Text style={label}>Tulajdonos neve:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{data.ownerName}</Text>
              </Column>
            </Row>
            <Row>
              <Column style={labelColumn}>
                <Text style={label}>Rendszám:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{data.vehiclePlate.toUpperCase()}</Text>
              </Column>
            </Row>
            <Row>
              <Column style={labelColumn}>
                <Text style={label}>Jármű:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>
                  {data.vehicleMake} {data.vehicleModel}
                </Text>
              </Column>
            </Row>
            <Row>
              <Column style={labelColumn}>
                <Text style={label}>Beküldés ideje:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{formatDate(data.createdAt)}</Text>
              </Column>
            </Row>
            <Row>
              <Column style={labelColumn}>
                <Text style={label}>Azonosító:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{data.id.slice(-8).toUpperCase()}</Text>
              </Column>
            </Row>
          </Section>

          <Text style={text}>
            A részletes kárfelvételi lapot PDF formátumban csatoltan küldjük.
          </Text>

          {data.photoUrls && data.photoUrls.length > 0 && (
            <Section style={photoSection}>
              <Text style={photoTitle}>Feltöltött fotók</Text>
              {data.photoUrls.map((url, index) => (
                <Text key={index} style={photoLink}>
                  <Link href={url} style={linkStyle}>
                    Fotó {index + 1} megtekintése →
                  </Link>
                </Text>
              ))}
            </Section>
          )}

          <Text style={text}>
            Munkatársunk hamarosan felveszi Önnel a kapcsolatot a további teendők
            egyeztetése érdekében.
          </Text>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              <strong>M1 Szerviz Tata</strong>
            </Text>
            <Text style={footerText}>Autószerelő műhely és szerviz</Text>
            <Text style={footerText}>www.m1szerviztata.hu</Text>
            <Text style={footerText}>info@m1szerviztata.hu</Text>
          </Section>
        </Container>
      </Body>
    </Html>
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

const h1 = {
  color: "#1e3a5f",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0 40px",
}

const h2 = {
  color: "#1e3a5f",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 12px 0",
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

const labelColumn = {
  width: "45%",
  paddingRight: "8px",
  verticalAlign: "top" as const,
}

const valueColumn = {
  width: "55%",
  verticalAlign: "top" as const,
}

const label = {
  color: "#64748b",
  fontSize: "14px",
  margin: "4px 0",
}

const value = {
  color: "#1e293b",
  fontSize: "14px",
  fontWeight: "600",
  margin: "4px 0",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 40px",
}

const footer = {
  textAlign: "center" as const,
  padding: "0 40px",
}

const footerText = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "4px 0",
}

const photoSection = {
  padding: "0 40px",
  margin: "16px 0",
}

const photoTitle = {
  color: "#1e3a5f",
  fontSize: "14px",
  fontWeight: "bold" as const,
  margin: "0 0 8px 0",
}

const photoLink = {
  color: "#525f7f",
  fontSize: "14px",
  margin: "4px 0",
}

const linkStyle = {
  color: "#2563eb",
  textDecoration: "underline",
  fontWeight: "600",
}
