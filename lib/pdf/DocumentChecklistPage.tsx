import { Page, View, Text } from "@react-pdf/renderer"
import { s, CheckMark, PageHeader, PageFooter, SectionHeader, formatDateTimeShort } from "./shared"
import type { FullPdfData } from "./types"
import { resolveSelectedAuthorizations } from "@/lib/workshop"

interface ChecklistItem {
  label: string
  note?: string
  done: boolean
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  return (
    <View style={[s.row, { padding: "5 6", borderBottom: "0.5pt solid #9ca3af", alignItems: "center", gap: 6 }]}>
      <CheckMark checked={item.done} size={9} />
      <View style={{ flex: 1 }}>
        <Text style={[s.value, { fontWeight: "normal" }]}>{item.label}</Text>
        {item.note && <Text style={s.label}>{item.note}</Text>}
      </View>
    </View>
  )
}

// 3. oldal — Iratösszesítő
export default function DocumentChecklistPage({ data }: { data: FullPdfData }) {
  const items: ChecklistItem[] = [
    {
      label: "Forgalmi engedély (törzskönyv) másolata",
      note: "A gépjármű forgalmi engedélyének mindkét oldala",
      done: data.consentToPhotocopy,
    },
    {
      label: "Vezetői engedély (jogosítvány) másolata",
      note: "A gépjárművet a káreseménykor vezető személy jogosítványa",
      done: data.consentToPhotocopy,
    },
    {
      label: "Személyi igazolvány / lakcímkártya másolata",
      note: "A meghatalmazó azonosításához",
      done: data.consentToPhotocopy,
    },
    {
      label: "Biztosítási kötvény / díjfizetési igazolás másolata",
      note: data.relevantInsurer ? `Illetékes biztosító: ${data.relevantInsurer}` : undefined,
      done: !!data.relevantInsurer,
    },
    {
      label: "CASCO szerződés adatai (amennyiben van CASCO biztosítás)",
      note: data.cascoInsurer ? `CASCO biztosító: ${data.cascoInsurer}` : "Nincs CASCO biztosítás bejelölve",
      done: data.hasCasco,
    },
    {
      label: "Rendőrségi jegyzőkönyv (amennyiben volt rendőri intézkedés)",
      note: data.policeInvolved && data.policeStation ? `Intézkedő kapitányság: ${data.policeStation}` : data.policeInvolved ? undefined : "Nem volt rendőri intézkedés",
      done: data.policeInvolved,
    },
    {
      label: "Aláírt Meghatalmazás",
      note: `Külön PDF-ben: ${resolveSelectedAuthorizations(data.selectedAuthorizations)
        .map((e) => e.companyName)
        .join(", ")}`,
      done: !!data.ownerSignatureUrl,
    },
    {
      label: "Kitöltött és aláírt Kárbejelentő lap",
      note: "Jelen dokumentum 1. oldala (Kárbejelentő lap)",
      done: !!data.ownerSignatureUrl,
    },
  ]

  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        title="IRATÖSSZESÍTŐ"
        details={[
          `Azonosító: ${data.referenceNumber}`,
          `Kitöltés: ${formatDateTimeShort(data.createdAt)}`,
        ]}
      />

      <Text style={[s.docTitle, { marginTop: 8 }]}>A KÁRÜGY INTÉZÉSÉHEZ SZÜKSÉGES MELLÉKLETEK</Text>
      <Text style={s.paragraph}>
        Az alábbi ellenőrző lista a {data.vehiclePlate.toUpperCase()} rendszámú gépjármű kárügyéhez szükséges
        dokumentumokat sorolja fel. A bejelölt tételek a beküldött adatok alapján rendelkezésre állnak vagy
        nem relevánsak a jelen kárügyben; a hiányzó mellékleteket az ügyfélnek vagy a szervizmunkatársnak
        szükséges pótolnia a kárrendezés lezárásáig.
      </Text>

      <View style={s.outerBorder}>
        <SectionHeader title="MELLÉKLETEK" />
        {items.map((item, i) => (
          <ChecklistRow key={i} item={item} />
        ))}
      </View>

      <PageFooter
        referenceNumber={data.referenceNumber}
        note="Az iratösszesítő tájékoztató jellegű; a tényleges kárrendezéshez a biztosító további dokumentumokat is kérhet."
      />
    </Page>
  )
}
