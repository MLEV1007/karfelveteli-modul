import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Img,
  Link,
} from "@react-email/components"

interface TechnicianNotificationEmailProps {
  vehiclePlate: string
  ownerName: string
  createdAt: Date
  munkalapUrl: string
}

export default function TechnicianNotificationEmail({
  vehiclePlate,
  ownerName,
  createdAt,
  munkalapUrl,
}: TechnicianNotificationEmailProps) {
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
              width={120}
              height={60}
              style={logoStyle}
            />
          </Section>

          <Section style={alertBox}>
            <Heading style={alertHeading}>ÚJ KÁRFELVÉTEL — JEGYZŐKÖNYV KITÖLTÉSE SZÜKSÉGES</Heading>
            <Text style={plateNumber}>{vehiclePlate.toUpperCase()}</Text>
            <Text style={alertSubtext}>{formatDate(createdAt)}</Text>
          </Section>

          <Text style={text}>
            {ownerName} ügyfelünk beküldte a kárfelvételi adatait és a meghatalmazást aláírta. A
            kárügy lezárásához és a végleges dokumentumok (Kárbejelentő, Meghatalmazás,
            Iratösszesítő, Jegyzőkönyv) kiküldéséhez szükséges a technikusi jegyzőkönyv
            kitöltése: átvétel/visszaadás időpontjai, a gépjármű felszereltsége, az átvételkori
            állapot és az átvevő aláírása.
          </Text>

          <Section style={buttonSection}>
            <Link href={munkalapUrl} style={button}>
              Jegyzőkönyv megnyitása →
            </Link>
          </Section>

          <Text style={smallText}>
            Ha a gomb nem működik, másolja be a böngészőbe ezt a linket:
            <br />
            {munkalapUrl}
          </Text>

          <Hr style={hr} />

          <Section style={footer}>
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

const alertBox = {
  backgroundColor: "#1e3a5f",
  color: "#ffffff",
  padding: "24px",
  textAlign: "center" as const,
  borderRadius: "8px",
  margin: "0 40px",
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
  padding: "0 40px",
  margin: "16px 0",
  wordBreak: "break-all" as const,
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
