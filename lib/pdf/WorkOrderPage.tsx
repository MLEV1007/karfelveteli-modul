import { Page, View, Text } from "@react-pdf/renderer"
import { s, PageHeader, PageFooter, SectionHeader, Cell, SignatureBlock, formatDate, formatDateTimeShort } from "./shared"
import { WORK_TYPE_LABELS, MATERIAL_USED_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/validation"
import { WORKSHOP_LEGAL } from "@/lib/workshop"
import type { FullPdfData } from "./types"

function formatHuf(amount: number): string {
  return `${new Intl.NumberFormat("hu-HU").format(amount)} Ft`
}

// 4. oldal — Jegyzőkönyv / Munkalap
export default function WorkOrderPage({ data }: { data: FullPdfData }) {
  const totalCost = data.materialCost + data.laborCost

  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        title="JEGYZŐKÖNYV / MUNKALAP"
        subtitle={`Azonosító: ${data.id.slice(-8).toUpperCase()} • Lezárva: ${formatDate(data.createdAt)}`}
      />

      <View style={[s.outerBorder, { marginTop: 4 }]}>
        <SectionHeader title="JÁRMŰ ÉS ÁTVÉTEL ADATAI" />
        <View style={s.row}>
          <Cell label="Rendszám" value={data.vehiclePlate.toUpperCase()} width={90} />
          <Cell label="Gyártmány / Típus" value={`${data.vehicleMake} ${data.vehicleModel}`} flex={1} />
          <Cell label="Km óraállás" value={`${new Intl.NumberFormat("hu-HU").format(data.mileage)} km`} width={90} noBorderRight />
        </View>
        <View style={s.row}>
          <Cell label="Átvétel időpontja" value={formatDateTimeShort(data.vehicleCheckIn)} flex={1} />
          <Cell label="Visszaadás időpontja" value={formatDateTimeShort(data.vehicleCheckOut)} flex={1} noBorderRight />
        </View>
      </View>

      <View style={s.outerBorder}>
        <SectionHeader title="ELVÉGZETT MUNKA" />
        <View style={s.row}>
          <Cell label="Eurocode" value={data.eurocode} width={120} />
          <Cell
            label="Munkatípus(ok)"
            value={data.workType.map((wt) => WORK_TYPE_LABELS[wt]).join(", ")}
            flex={1}
            noBorderRight
          />
        </View>
        <View style={s.row}>
          <Cell
            label="Felhasznált anyagok"
            value={data.materialsUsed.length > 0 ? data.materialsUsed.map((m) => MATERIAL_USED_LABELS[m]).join(", ") : "—"}
            flex={1}
            noBorderRight
          />
        </View>
        <View style={s.row}>
          <View style={[s.cellNoBorderRight, { flex: 1, minHeight: 40 }]}>
            <Text style={s.label}>Az átvételkori állapot / megjegyzések</Text>
            <Text style={[s.value, { fontWeight: "normal", lineHeight: 1.4 }]}>{data.damageNotes}</Text>
          </View>
        </View>
      </View>

      <View style={s.outerBorder}>
        <SectionHeader title="KÖLTSÉGEK ÉS FIZETÉS" />
        <View style={s.row}>
          <Cell label="Anyagköltség" value={formatHuf(data.materialCost)} flex={1} />
          <Cell label="Munkadíj" value={formatHuf(data.laborCost)} flex={1} />
          <Cell label="Összesen" value={formatHuf(totalCost)} flex={1} noBorderRight />
        </View>
        <View style={s.row}>
          <Cell label="Fizetési mód" value={PAYMENT_METHOD_LABELS[data.paymentMethod]} flex={1} noBorderRight />
        </View>
      </View>

      <View style={s.outerBorder}>
        <SectionHeader title="SZERVIZ ADATAI" />
        <View style={s.row}>
          <Cell label="Cégnév" value={WORKSHOP_LEGAL.companyName} flex={1} />
          <Cell label="Adószám" value={WORKSHOP_LEGAL.taxNumber} flex={1} />
          <Cell label="Bankszámlaszám" value={WORKSHOP_LEGAL.bankAccount} flex={1} noBorderRight />
        </View>
      </View>

      <View style={s.signatureRow}>
        <SignatureBlock label="Átadó (ügyfél) aláírása" signatureDataUrl={data.ownerSignatureUrl} />
        <SignatureBlock
          label={`Átvevő (${data.technicianName}) aláírása`}
          signatureDataUrl={data.technicianSignatureUrl}
        />
      </View>

      <PageFooter
        id={data.id}
        note="A jelen jegyzőkönyv a gépjármű átvételkori állapotát és az elvégzett munkát rögzíti. Az aláírások a jármű átadását-átvételét igazolják."
      />
    </Page>
  )
}
