// Minta-PDF-ek generálása tesztadatokkal, a rendszer saját PDF-komponenseivel.
// Futtatás a modul gyökeréből (a fontok/logó a process.cwd()-hez képest töltődnek):
//   npx tsx scripts/minta-pdf-2026-09.tsx
// Kimenet: ./minta-pdf-2026-09/<eset>/*.pdf
import fs from "fs"
import path from "path"
import { generateMainReportPDF, generateAuthorizationPdfs, type FullPdfData } from "@/lib/pdf"
import { getDefaultEquipmentChecklist, EQUIPMENT_CHECKLIST_ITEMS } from "@/lib/equipment"
import { DAMAGE_TYPE_PRESET_DESCRIPTIONS } from "@/lib/damageTypes"
import { SIG_OWNER, SIG_DRIVER, SIG_TECH } from "./minta-pdf-alairasok"

const OUT_DIR = path.join(process.cwd(), "minta-pdf-2026-09")

// Felszereltség: `all` esetén minden tétel bejelölve és a részletmezők kitöltve (a Jegyzőkönyv
// egyoldalasságának „legrosszabb eset” próbája), különben minden második tétel.
function fullEquipment(all = false) {
  const eq = getDefaultEquipmentChecklist() as Record<string, unknown>
  EQUIPMENT_CHECKLIST_ITEMS.forEach((def, i) => {
    if (!all && i % 2 === 1) return
    if (def.type === "boolean") eq[def.key] = true
    else if (def.type === "count") eq[def.key] = { checked: true, count: 2 }
    else if (def.type === "text") eq[def.key] = { checked: true, type: "gyári" }
    else eq[def.key] = { checked: true, value: 8 }
  })
  return eq as FullPdfData["equipmentChecklist"]
}

const base: FullPdfData = {
  id: "minta",
  referenceNumber: "BIZT9001",
  createdAt: new Date("2026-09-21T08:15:00Z"),
  munkalapClosedAt: new Date("2026-09-21T13:40:00Z"),
  ownerType: "MAGANSZEMELY",
  ownerName: "Kovács János",
  ownerAddress: "2890 Tata, Ady Endre út 12.",
  idOrTaxNumber: "123456AB",
  driverSameAsOwner: true,
  driverName: "Kovács János",
  driverAddress: "2890 Tata, Ady Endre út 12.",
  driverPhone: "+36 30 123 4567",
  driverBirthDate: "1980-04-12T00:00:00.000Z",
  driverLicenseNumber: "AB123456",
  driverLicenseValidUntil: "2031-04-12T00:00:00.000Z",
  customerEmail: "kovacs.janos@example.hu",
  customerPhone: "+36 30 123 4567",
  vehiclePlate: "abc-123",
  vehicleMake: "Škoda",
  vehicleModel: "Octavia Combi",
  vehicleYear: 2019,
  vehicleVin: "TMBJJ7NE0K0123456",
  hasCasco: true,
  cascoInsurer: "Allianz Hungária",
  liabilityInsurer: "Generali Biztosító",
  relevantInsurer: "UNIQA Biztosító",
  insuranceCompany: "ALLIANZ",
  insuranceCompanyOther: undefined,
  vehicleRegistrationDate: "2019-03-01T00:00:00.000Z",
  vehicleInspectionValidUntil: "2027-03-01T00:00:00.000Z",
  vehicleEngineCapacity: 1968,
  vehiclePowerKw: 110,
  vehicleColor: "Metálszürke",
  // Az adatbázisból érkező alak (a begépelt falióra-idő UTC-ként tárolva)
  accidentDate: "2026-09-18T14:30:00.000Z",
  accidentCountry: "Magyarország",
  accidentCity: "Tatabánya",
  accidentStreet: "M1 autópálya, 56. km",
  outsideSettlement: true,
  roadNumber: "M1",
  kilometerMark: "56+300",
  policeInvolved: false,
  policeStation: undefined,
  otherVehiclePlate: undefined,
  otherVehicleType: undefined,
  otherVehicleColor: undefined,
  additionalParties: undefined,
  vehicleInspectionLocation: undefined,
  damageType: "EGYEB",
  damageDescription:
    "Az M1 autópályán Budapest felé haladva az előttem haladó jármű kereke alól felpattanó kavics a szélvédő bal alsó részén csillag alakú sérülést okozott, amelyből azóta egy kb. 15 cm-es repedés indult el a műszerfal felé.",
  damagePoints: [
    { x: 180, y: 110, dx: 0, dy: 0, label: "1" },
    { x: 220, y: 120, dx: 20, dy: -25, label: "2" },
  ],
  photoUrls: ["a", "b", "c", "d"],
  liableParty: "other",
  underInfluence: false,
  licenseValid: true,
  vatReclaimEligible: false,
  taxNumber: undefined,
  consentToPhotocopy: true,
  cascoClaimRequest: false,
  vehicleEncumbrance: false,
  encumbranceFinancier: undefined,
  accept8DayPayment: true,
  knowsCascoTerms: true,
  ownerSignatureUrl: SIG_OWNER,
  driverSignatureUrl: undefined,
  gdprConsent: true,
  vehicleCheckIn: "2026-09-21T08:30:00.000Z",
  vehicleCheckOut: "2026-09-21T13:30:00.000Z",
  vehicleCategory: "SZEMELYGEPKOCSI",
  workProcess: "CSERE",
  vehicleCondition: "MOZGASKEPES",
  equipmentChecklist: fullEquipment(),
  damageNotes:
    "Szélvédő bal alsó sarkában csillagtörés, repedés a műszerfal irányába. Jobb hátsó ajtón kisebb karc (nem a káresemény része). Belső tér tiszta.",
  technicianName: "Nagy Péter",
  technicianSignatureUrl: SIG_TECH,
  selectedAuthorizations: ["m1"],
}

const cases: { dir: string; data: FullPdfData }[] = [
  // (a) azonos vezető és tulajdonos, magánszemély
  { dir: "a-azonos-szemely-maganszemely", data: { ...base } },
  // (b) eltérő vezető, céges tulajdonos, ÁFA: Igen
  {
    dir: "b-eltero-vezeto-ceg-afa-igen",
    data: {
      ...base,
      referenceNumber: "BIZT9002",
      ownerType: "CEG",
      ownerName: "Példa Logisztika Kft.",
      ownerAddress: "2800 Tatabánya, Győri út 5.",
      idOrTaxNumber: "12345678-2-11",
      driverSameAsOwner: false,
      driverName: "Szabó Éva",
      driverAddress: "2890 Tata, Kossuth tér 3.",
      driverPhone: "+36 20 987 6543",
      customerEmail: "flotta@peldalogisztika.hu",
      customerPhone: "+36 34 555 111",
      vatReclaimEligible: true,
      taxNumber: "12345678-2-11",
      driverSignatureUrl: SIG_DRIVER,
      vehicleCategory: "TEHERGEPKOCSI",
      workProcess: "JAVITAS",
      vehicleCondition: "MOZGASKEPTELEN",
      vehicleMake: "Ford",
      vehicleModel: "Transit Custom",
      vehiclePlate: "aa-bc-123",
      selectedAuthorizations: ["m1", "autouveg", "bodrogi"],
      // Maximum-közeli tartalom: minden felszereltség bejelölve, hosszú leírás és megjegyzés
      equipmentChecklist: fullEquipment(true),
      damageDescription:
        "A Tatabánya felé vezető szakaszon egy előttünk haladó, sóderrel megrakott tehergépkocsiról lehulló kavics a szélvédő jobb felső részét és a motorháztető elejét érte. A szélvédőn két csillagtörés keletkezett, az egyikből kb. 25 cm-es repedés indult a vezető látómezeje felé. A motorháztetőn több apró lepattogzás látható, a jobb oldali visszapillantó tükör háza megrepedt.",
      damageNotes:
        "Szélvédő: két csillagtörés, 25 cm-es repedés a vezető látómezejében. Motorháztető eleje: 6–8 db apró lakksérülés. Jobb tükörház repedt, tükörlap ép. Bal hátsó lökhárítón régi, a káreseménytől független karc. Belső tér tiszta, a raktér üres, a pótkerék és az emelő megvan. Üzemanyagszint: kb. 1/2. Km-óra állás: 184 350 km.",
    },
  },
  // (c) szélvédőcsere, csak az Autóüveg meghatalmazással
  {
    dir: "c-szelvedocsere-autouveg",
    data: {
      ...base,
      referenceNumber: "BIZT9003",
      ownerName: "Tóth Anna",
      driverName: "Tóth Anna",
      ownerAddress: "2890 Tata, Béke u. 8.",
      driverAddress: "2890 Tata, Béke u. 8.",
      idOrTaxNumber: "987654CD",
      customerEmail: "toth.anna@example.hu",
      damageType: "SZELVEDO_CSERE",
      selectedAuthorizations: ["autouveg"],
      damageDescription: DAMAGE_TYPE_PRESET_DESCRIPTIONS.SZELVEDO_CSERE!,
      damagePoints: [{ x: 200, y: 100, dx: 0, dy: 0, label: "1" }],
      workProcess: "CSERE",
    },
  },
]

async function main() {
  for (const c of cases) {
    const dir = path.join(OUT_DIR, c.dir)
    fs.mkdirSync(dir, { recursive: true })
    const plate = c.data.vehiclePlate.toUpperCase()
    const main = await generateMainReportPDF(c.data)
    fs.writeFileSync(path.join(dir, `karfelvetel-${plate}-${c.data.referenceNumber}.pdf`), main)
    const auths = await generateAuthorizationPdfs(c.data)
    for (const a of auths) fs.writeFileSync(path.join(dir, a.filename), a.buffer)
    console.log(`${c.dir}: kész (${1 + auths.length} PDF)`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
