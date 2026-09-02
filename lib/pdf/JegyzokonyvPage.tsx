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
  formatDateOnly,
  formatDateTimeShort,
} from "./shared"
import { EQUIPMENT_CHECKLIST_ITEMS, isEquipmentChecked, formatEquipmentDetail, type EquipmentItemDef } from "@/lib/equipment"
import {
  VEHICLE_CATEGORY_OPTIONS,
  WORK_PROCESS_OPTIONS,
  VEHICLE_CONDITION_OPTIONS,
} from "@/lib/protocolChoices"
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

// Egy kizárólagos-választós (2 elemű) mezőcsoport sora — checkBox/checkBoxFilled stílussal,
// a kiválasztott opció kitöltve, egymás alatt (nem szabadon kombinálható, mint a felszereltség).
function ExclusiveChoiceGroup({
  title,
  options,
  selected,
}: {
  title: string
  options: readonly { value: string; label: string }[]
  selected?: string | null
}) {
  return (
    <View style={{ flex: 1, padding: 4 }}>
      <Text style={[s.label, { marginBottom: 2 }]}>{title}</Text>
      {options.map((opt) => {
        const checked = opt.value === selected
        return (
          <View key={opt.value} style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 1.5 }}>
            <View style={checked ? s.checkBoxFilled : s.checkBox}>
              {checked && <Text style={{ fontSize: 5, color: "#ffffff", fontWeight: "bold" }}>✓</Text>}
            </View>
            <Text style={{ fontSize: 6, color: "#111827" }}>{opt.label}</Text>
          </View>
        )
      })}
    </View>
  )
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
        subtitle={`Azonosító: ${data.referenceNumber} • Lezárva: ${formatDate(data.createdAt)}`}
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
        <View style={s.row}>
          <Cell label="Forgalomba helyezés dátuma" value={formatDateOnly(data.vehicleRegistrationDate)} flex={1} />
          <Cell label="Műszaki érvényesség" value={formatDateOnly(data.vehicleInspectionValidUntil)} flex={1} />
          <Cell
            label="Hengerűrtartalom / Teljesítmény"
            value={
              data.vehicleEngineCapacity || data.vehiclePowerKw
                ? `${data.vehicleEngineCapacity ? `${data.vehicleEngineCapacity} cm³` : "—"} / ${data.vehiclePowerKw ? `${data.vehiclePowerKw} kW` : "—"}`
                : undefined
            }
            flex={1}
          />
          <Cell label="Szín" value={data.vehicleColor} width={70} noBorderRight />
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
        <SectionHeader title="JÁRMŰ KATEGÓRIA / MUNKAFOLYAMAT / ÁLLAPOT" />
        <View style={[s.row, { padding: 2 }]}>
          <ExclusiveChoiceGroup title="Jármű kategória" options={VEHICLE_CATEGORY_OPTIONS} selected={data.vehicleCategory} />
          <ExclusiveChoiceGroup title="Munkafolyamat" options={WORK_PROCESS_OPTIONS} selected={data.workProcess} />
          <ExclusiveChoiceGroup title="Jármű állapota" options={VEHICLE_CONDITION_OPTIONS} selected={data.vehicleCondition} />
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

      {/* wrap={false} az utolsó tartalmi szekció + az aláírás-sor közös külső blokkján:
          így az aláírás SOHA nem kerülhet egyedül egy (majdnem) üres oldal tetejére —
          ha a kettő együtt nem fér ki az aktuális oldalon, az egész blokk (a megjegyzés-
          szekcióval együtt) egyben csúszik a következő oldalra. */}
      <View wrap={false}>
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
      </View>

      <PageFooter
        referenceNumber={data.referenceNumber}
        note="A jelen jegyzőkönyv a gépjármű átvételkori állapotát, felszereltségét és a sérülés helyét rögzíti. Az aláírások a jármű átadását-átvételét igazolják."
      />
    </Page>
  )
}
