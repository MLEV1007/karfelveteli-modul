import { Page, View, Text } from "@react-pdf/renderer"
import {
  s,
  BORDER,
  BORDER_LIGHT,
  PageHeader,
  PageFooter,
  SectionHeader,
  Cell,
  CheckCell,
  SignatureBlock,
  DamageDiagram,
  formatDate,
  formatDateTimeShort,
} from "./shared"
import { EQUIPMENT_CHECKLIST_ITEMS, isEquipmentChecked, formatEquipmentDetail, type EquipmentItemDef } from "@/lib/equipment"
import type { FullPdfData } from "./types"

function formatAccidentDate(raw: string): string {
  return raw.replace("T", " ")
}

// Egy felszereltségi tétel sora: checkbox + felirat + opcionális (db / típus / sebességfok) kiegészítés
function EquipmentRow({ def, value }: { def: EquipmentItemDef; value: unknown }) {
  const checked = isEquipmentChecked(def, value as never)
  const detail = formatEquipmentDetail(def, value as never)
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 1.5 }}>
      <View style={checked ? s.checkBoxFilled : s.checkBox}>
        {checked && <Text style={{ fontSize: 5, color: "#ffffff", fontWeight: "bold" }}>✓</Text>}
      </View>
      <Text style={{ fontSize: 6, color: "#111827" }}>
        {def.label}
        {detail}
      </Text>
    </View>
  )
}

function chunk<T>(items: T[], columns: number): T[][] {
  const size = Math.ceil(items.length / columns)
  return Array.from({ length: columns }, (_, i) => items.slice(i * size, i * size + size))
}

// 4. oldal — Jegyzőkönyv (átadás-átvétel + felszereltségi állapotfelmérés)
export default function JegyzokonyvPage({ data }: { data: FullPdfData }) {
  const hasDamagePoints = !!(data.damagePoints && data.damagePoints.length > 0)
  const equipment = data.equipmentChecklist as Record<string, unknown>
  const columns = chunk(EQUIPMENT_CHECKLIST_ITEMS, 3)

  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        title="JEGYZŐKÖNYV"
        subtitle={`Azonosító: ${data.id.slice(-8).toUpperCase()} • Lezárva: ${formatDate(data.createdAt)}`}
      />

      <View style={[s.outerBorder, { marginTop: 4 }]}>
        <SectionHeader title="ÜGYFÉL ÉS JÁRMŰ ADATAI" />
        <View style={s.row}>
          <Cell label="Tulajdonos neve" value={data.ownerName} flex={1} />
          <Cell label="Rendszám" value={data.vehiclePlate.toUpperCase()} width={90} />
          <Cell label="Gyártmány / Típus" value={`${data.vehicleMake} ${data.vehicleModel}`} flex={1} noBorderRight />
        </View>
        <View style={s.row}>
          <Cell label="Lakcím" value={data.ownerAddress} flex={1} />
          <Cell label="Alvázszám (VIN)" value={data.vehicleVin} flex={1} noBorderRight />
        </View>
      </View>

      <View style={s.outerBorder}>
        <SectionHeader title="A BALESET (KÁRESEMÉNY) KÖRÜLMÉNYEI" />
        <View style={s.row}>
          {data.accidentDate && (
            <Cell label="A baleset időpontja" value={formatAccidentDate(data.accidentDate)} width={120} />
          )}
          <Cell label="Ország" value={data.accidentCountry} width={90} />
          <Cell label="Város / Település" value={data.accidentCity} flex={1} />
          <CheckCell label="Rendőrség intézkedett" checked={data.policeInvolved} width={110} noBorderRight />
        </View>
      </View>

      <View style={s.outerBorder}>
        <SectionHeader title="SÉRÜLÉS HELYE ÉS LEÍRÁSA" />
        <View style={s.row}>
          <View style={{ flex: 3, borderRight: hasDamagePoints ? BORDER : undefined }}>
            <View style={[s.cell, { minHeight: hasDamagePoints ? 110 : 40 }]}>
              <Text style={s.label}>A káresemény leírása</Text>
              <Text style={[s.value, { lineHeight: 1.5, fontWeight: "normal" }]}>{data.damageDescription}</Text>
            </View>
          </View>
          {hasDamagePoints && (
            <View style={{ flex: 2, padding: 6 }}>
              <Text style={[s.label, { marginBottom: 4, textAlign: "center" }]}>Sérülés helye és iránya:</Text>
              <DamageDiagram points={data.damagePoints!} />
            </View>
          )}
        </View>
      </View>

      <View style={s.outerBorder}>
        <SectionHeader title="ÁTVÉTEL / VISSZAADÁS" />
        <View style={s.row}>
          <Cell label="Átvétel időpontja" value={formatDateTimeShort(data.vehicleCheckIn)} flex={1} />
          <Cell label="Visszaadás időpontja" value={formatDateTimeShort(data.vehicleCheckOut)} flex={1} noBorderRight />
        </View>
      </View>

      <View style={s.outerBorder}>
        <SectionHeader title="A GÉPJÁRMŰ FELSZERELTSÉGE" />
        <View style={[s.row, { padding: 5 }]}>
          {columns.map((col, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                paddingRight: 4,
                borderRight: i < columns.length - 1 ? BORDER_LIGHT : undefined,
              }}
            >
              {col.map((def) => (
                <EquipmentRow key={def.key} def={def} value={equipment?.[def.key]} />
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={s.outerBorder}>
        <SectionHeader title="ÁTVÉTELKORI ÁLLAPOT / MEGJEGYZÉSEK" />
        <View style={[s.cell, { minHeight: 30 }]}>
          <Text style={[s.value, { fontWeight: "normal", lineHeight: 1.4 }]}>{data.damageNotes}</Text>
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
        note="A jelen jegyzőkönyv a gépjármű átvételkori állapotát, felszereltségét és a sérülés helyét rögzíti. Az aláírások a jármű átadását-átvételét igazolják."
      />
    </Page>
  )
}
