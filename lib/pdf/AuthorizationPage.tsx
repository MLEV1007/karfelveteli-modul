import { Page, View, Text } from "@react-pdf/renderer"
import { s, BORDER, PageHeader, PageFooter, SectionHeader, Cell, SignatureBlock, formatDate } from "./shared"
import { getInsuranceCompanyLabel } from "@/lib/validation"
import { WORKSHOP_LEGAL_M1, WORKSHOP_LEGAL_AUTOUVEG, WORKSHOP_LEGAL_KAROSSZERIA } from "@/lib/workshop"
import type { FullPdfData } from "./types"

// 2. oldal — Meghatalmazás
export default function AuthorizationPage({ data }: { data: FullPdfData }) {
  const insurerLabel = getInsuranceCompanyLabel(data.insuranceCompany, data.insuranceCompanyOther)

  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        title="MEGHATALMAZÁS"
        subtitle={`Azonosító: ${data.referenceNumber} • Kelt: ${formatDate(data.createdAt)}`}
      />

      <View style={[s.outerBorder, { marginTop: 4 }]}>
        <SectionHeader title="MEGHATALMAZÓ (ÜGYFÉL) ADATAI" />
        <View style={s.row}>
          <Cell label="Név" value={data.ownerName} flex={1} />
          <Cell label="Lakcím" value={data.ownerAddress} flex={1} noBorderRight />
        </View>
        <View style={s.row}>
          <Cell label="Személyi igazolvány- / adószám" value={data.idOrTaxNumber} flex={1} />
          <Cell label="Telefonszám" value={data.customerPhone} flex={1} />
          <Cell label="E-mail cím" value={data.customerEmail} flex={1} noBorderRight />
        </View>
      </View>

      <View style={s.outerBorder}>
        <SectionHeader title="A KÁRESEMÉNNYEL ÉRINTETT GÉPJÁRMŰ ÉS BIZTOSÍTÁS" />
        <View style={s.row}>
          <Cell label="Rendszám" value={data.vehiclePlate.toUpperCase()} width={90} />
          <Cell label="Gyártmány / Típus" value={`${data.vehicleMake} ${data.vehicleModel}`} flex={1} />
          <Cell label="Alvázszám (VIN)" value={data.vehicleVin} flex={1} noBorderRight />
        </View>
        <View style={s.row}>
          <Cell label="Illetékes biztosító" value={insurerLabel} flex={1} noBorderRight />
        </View>
      </View>

      <Text style={s.docTitle}>MEGHATALMAZÁS KÁRÜGYINTÉZÉSRE</Text>

      <Text style={s.paragraph}>
        Alulírott <Text style={s.bold}>{data.ownerName}</Text> (lakcím: {data.ownerAddress}, személyi
        igazolvány- vagy adószám: {data.idOrTaxNumber}), mint a fent megjelölt gépjármű tulajdonosa/üzembentartója
        (a továbbiakban: Meghatalmazó), ezúton meghatalmazom a{" "}
        <Text style={s.bold}>{WORKSHOP_LEGAL_M1.companyName}</Text>-t (adószám: {WORKSHOP_LEGAL_M1.taxNumber},
        a továbbiakban: Meghatalmazott), hogy a fent megjelölt gépjárművön bekövetkezett káreseménnyel
        kapcsolatban a {insurerLabel} biztosítónál a kárügyet teljes körűen képviselje, a kárrendezéshez
        szükséges nyilatkozatokat, dokumentumokat a Meghatalmazó nevében aláírja, a javítással kapcsolatos
        számlát a biztosító felé közvetlenül benyújtsa, és a kárrendezés eredményeként megítélt összeget —
        a Meghatalmazó kifejezett hozzájárulásával — közvetlenül a Meghatalmazott bankszámlájára
        (számlaszám: {WORKSHOP_LEGAL_M1.bankAccount}) kérje folyósítani.
      </Text>

      <Text style={s.paragraph}>
        A Meghatalmazó tudomásul veszi és hozzájárul ahhoz, hogy a Meghatalmazott a kárügyintézésbe és a
        javítási munkálatokba közreműködőként bevonja az alábbi vállalkozásokat:{" "}
        <Text style={s.bold}>{WORKSHOP_LEGAL_AUTOUVEG.companyName}</Text> (adószám:{" "}
        {WORKSHOP_LEGAL_AUTOUVEG.taxNumber}) és{" "}
        <Text style={s.bold}>{WORKSHOP_LEGAL_KAROSSZERIA.companyName}</Text> (adószám:{" "}
        {WORKSHOP_LEGAL_KAROSSZERIA.taxNumber}). A jelen meghatalmazás e közreműködők tekintetében is a
        Meghatalmazottéval megegyező jogkört biztosít a kárügy vitelére.
      </Text>

      <Text style={s.paragraph}>
        <Text style={s.bold}>8 napos fizetési záradék:</Text> A Meghatalmazó tudomásul veszi és elfogadja, hogy
        amennyiben a biztosító a kárt — bármely okból — nem, vagy csak részben téríti meg, a Meghatalmazó a
        javítás teljes vagy hátramaradó díját a munka elvégzésétől (a gépjármű visszaadásától) számított{" "}
        <Text style={s.bold}>8 (nyolc) napon belül</Text> köteles megfizetni a Meghatalmazott részére.
      </Text>

      <Text style={s.paragraph}>
        <Text style={s.bold}>CASCO feltételek tudomásul vétele:</Text> A Meghatalmazó kijelenti, hogy a
        kárrendezés alapjául szolgáló CASCO (vagy egyéb vonatkozó) biztosítási szerződés feltételeit,
        önrészét és kizárásait ismeri, és tudomásul veszi, hogy ezek a kárrendezés végeredményét
        befolyásolhatják.
      </Text>

      <View style={s.outerBorder}>
        <SectionHeader title="NYILATKOZATOK MEGERŐSÍTÉSE" />
        <View style={s.row}>
          <View style={[s.cell, { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }]}>
            <View style={data.accept8DayPayment ? s.checkBoxFilled : s.checkBox}>
              {data.accept8DayPayment && (
                <Text style={{ fontSize: 6, color: "#ffffff", fontWeight: "bold" }}>✓</Text>
              )}
            </View>
            <Text style={s.value}>A 8 napos fizetési záradékot elfogadom</Text>
          </View>
          <View style={[s.cell, { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }]} >
            <View style={data.knowsCascoTerms ? s.checkBoxFilled : s.checkBox}>
              {data.knowsCascoTerms && (
                <Text style={{ fontSize: 6, color: "#ffffff", fontWeight: "bold" }}>✓</Text>
              )}
            </View>
            <Text style={s.value}>A CASCO feltételeket tudomásul veszem</Text>
          </View>
        </View>
      </View>

      <View style={s.outerBorder}>
        <SectionHeader title="MEGHATALMAZOTT ADATAI" />
        <View style={s.row}>
          <Cell label="Cégnév" value={WORKSHOP_LEGAL_M1.companyName} flex={1} />
          <Cell label="Adószám" value={WORKSHOP_LEGAL_M1.taxNumber} flex={1} />
          <Cell label="Bankszámlaszám" value={WORKSHOP_LEGAL_M1.bankAccount} flex={1} noBorderRight />
        </View>
      </View>

      <View style={s.outerBorder}>
        <SectionHeader title="KÖZREMŰKÖDŐK (A MEGHATALMAZOTT ÁLTAL BEVONT VÁLLALKOZÁSOK)" />
        <View style={s.row}>
          <Cell label="Cégnév" value={WORKSHOP_LEGAL_AUTOUVEG.companyName} flex={1} />
          <Cell label="Adószám" value={WORKSHOP_LEGAL_AUTOUVEG.taxNumber} flex={1} />
          <Cell label="Bankszámlaszám" value={WORKSHOP_LEGAL_AUTOUVEG.bankAccount} flex={1} noBorderRight />
        </View>
        <View style={s.row}>
          <Cell label="Cégnév" value={WORKSHOP_LEGAL_KAROSSZERIA.companyName} flex={1} />
          <Cell label="Adószám" value={WORKSHOP_LEGAL_KAROSSZERIA.taxNumber} flex={1} />
          <Cell label="Bankszámlaszám" value={WORKSHOP_LEGAL_KAROSSZERIA.bankAccount} flex={1} noBorderRight />
        </View>
      </View>

      <View style={s.signatureRow}>
        <SignatureBlock label="Meghatalmazó (ügyfél) aláírása" signatureDataUrl={data.ownerSignatureUrl} />
        <View style={{ flex: 1 }}>
          <Text style={[s.label, { marginBottom: 20 }]}>Kelt: {formatDate(data.createdAt)}, {WORKSHOP_LEGAL_M1.location}</Text>
        </View>
      </View>

      <PageFooter
        referenceNumber={data.referenceNumber}
        note="A jelen meghatalmazás a fenti káreseménnyel kapcsolatos kárügyintézésre korlátozódik, és a kárügy lezárásáig érvényes."
      />
    </Page>
  )
}
