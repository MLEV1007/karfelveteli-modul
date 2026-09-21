import { Page, View, Text } from "@react-pdf/renderer"
import {
  s,
  BORDER,
  CheckMark,
  PageHeader,
  PageFooter,
  SectionHeader,
  Cell,
  SignatureBlock,
  formatDateTimeShort,
  formatAccidentDateTime,
  formatLongDate,
} from "./shared"
import { getOwnerLabels } from "@/lib/ownerType"
import { getInsuranceCompanyLabel } from "@/lib/validation"
import type { LegalEntity } from "@/lib/workshop"
import type { FullPdfData } from "./types"

// Az M1 Szerviz Tata Kft.-n kívüli entitásoknak nincs saját `location` mezőjük — a "Kelt:" sor
// esetükben is a székhely szerinti várost, Tatát mutatja (mindhárom cég tatai bejegyzésű).
const WORKSHOP_LOCATION_FALLBACK = "Tata"

// Meghatalmazás — önálló, entitásfüggő dokumentum. A `grantee` paraméter határozza meg,
// melyik vállalkozás részére szól ez a példány; a 3 entitáshoz 3 külön, egymástól
// FÜGGETLEN PDF készül (lásd lib/pdf/index.tsx generateAuthorizationPdfs) — egyik
// dokumentum sem hivatkozik a másik két cégre.
export default function AuthorizationPage({ data, grantee }: { data: FullPdfData; grantee: LegalEntity }) {
  const insurerLabel = getInsuranceCompanyLabel(data.insuranceCompany, data.insuranceCompanyOther)
  // Magánszemély / cég szerinti feliratok (régi, típus nélküli rekordnál a korábbi közös feliratok)
  const labels = getOwnerLabels(data.ownerType)
  const place = grantee.location ?? WORKSHOP_LOCATION_FALLBACK

  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        title="MEGHATALMAZÁS"
        details={[
          `Azonosító: ${data.referenceNumber}`,
          `Kitöltés: ${formatDateTimeShort(data.createdAt)}`,
        ]}
      />

      <View style={[s.outerBorder, { marginTop: 4 }]}>
        <SectionHeader title="MEGHATALMAZÓ (ÜGYFÉL) ADATAI" />
        <View style={s.row}>
          <Cell label={labels.name} value={data.ownerName} flex={1} />
          <Cell label={labels.address} value={data.ownerAddress} flex={1} noBorderRight />
        </View>
        <View style={s.row}>
          <Cell label={labels.id} value={data.idOrTaxNumber} flex={1} />
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
          <Cell label="Illetékes biztosító" value={insurerLabel} flex={1} />
          <Cell label="Káresemény időpontja" value={formatAccidentDateTime(data.accidentDate)} width={130} noBorderRight />
        </View>
        <View style={[s.row, { alignItems: "center", padding: "4 5" }]}>
          <Text style={[s.value, { fontWeight: "normal", marginRight: 10, minHeight: 0 }]}>
            ÁFA-visszatérítésre jogosult:
          </Text>
          <CheckMark checked={data.vatReclaimEligible} size={10} />
          <Text style={[s.value, { marginRight: 12, minHeight: 0 }]}>Igen</Text>
          <CheckMark checked={!data.vatReclaimEligible} size={10} />
          <Text style={[s.value, { minHeight: 0 }]}>Nem</Text>
        </View>
      </View>

      <Text style={s.docTitle}>MEGHATALMAZÁS KÁRÜGYINTÉZÉSRE</Text>

      <Text style={s.paragraph}>
        Alulírott <Text style={s.bold}>{data.ownerName}</Text> ({labels.addressInText}: {data.ownerAddress},{" "}
        {labels.idInText}: {data.idOrTaxNumber}), mint a fent megjelölt gépjármű tulajdonosa/üzembentartója
        (a továbbiakban: Meghatalmazó), ezúton meghatalmazom a{" "}
        <Text style={s.bold}>{grantee.companyName}</Text>-t (adószám: {grantee.taxNumber},
        a továbbiakban: Meghatalmazott), hogy a fent megjelölt gépjárművön bekövetkezett káreseménnyel
        kapcsolatban a {insurerLabel} biztosítónál a kárügyet teljes körűen képviselje, a kárrendezéshez
        szükséges nyilatkozatokat, dokumentumokat a Meghatalmazó nevében aláírja, a javítással kapcsolatos
        számlát a biztosító felé közvetlenül benyújtsa, és a kárrendezés eredményeként megítélt összeget —
        a Meghatalmazó kifejezett hozzájárulásával — közvetlenül a Meghatalmazott bankszámlájára
        (számlaszám: {grantee.bankAccount}) kérje folyósítani.
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
            <CheckMark checked={data.accept8DayPayment} />
            <Text style={s.value}>A 8 napos fizetési záradékot elfogadom</Text>
          </View>
          <View style={[s.cell, { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }]} >
            <CheckMark checked={data.knowsCascoTerms} />
            <Text style={s.value}>A CASCO feltételeket tudomásul veszem</Text>
          </View>
        </View>
      </View>

      {/* wrap={false} az utolsó tartalmi szekció + az aláírás-sor közös külső blokkján:
          így az aláírás SOHA nem kerülhet egyedül egy (majdnem) üres oldal tetejére —
          ha a kettő együtt nem fér ki az aktuális oldalon, az egész blokk (a
          "Meghatalmazott adatai" szekcióval együtt) egyben csúszik a következő oldalra. */}
      <View wrap={false}>
        <View style={s.outerBorder}>
          <SectionHeader title="MEGHATALMAZOTT ADATAI" />
          <View style={s.row}>
            <Cell label="Cégnév" value={grantee.companyName} flex={1} />
            <Cell label="Adószám" value={grantee.taxNumber} flex={1} />
            <Cell label="Bankszámlaszám" value={grantee.bankAccount} flex={1} noBorderRight />
          </View>
        </View>

        {/* Keltezés a bal alsó sarokban: előbb a helység, utána a dátum, időpont nélkül */}
        <View style={s.signatureRow}>
          <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: 14 }}>
            <Text style={{ fontSize: 10.5, color: "#111827" }}>
              {place}, {formatLongDate(data.createdAt)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <SignatureBlock label="Meghatalmazó (ügyfél) aláírása" signatureDataUrl={data.ownerSignatureUrl} />
          </View>
        </View>
      </View>

      <PageFooter
        referenceNumber={data.referenceNumber}
        note="A jelen meghatalmazás a fenti káreseménnyel kapcsolatos kárügyintézésre korlátozódik, és a kárügy lezárásáig érvényes."
      />
    </Page>
  )
}
