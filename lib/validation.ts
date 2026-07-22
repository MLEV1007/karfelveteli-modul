import { z } from "zod"
import { equipmentChecklistSchema } from "./equipment"

// ─────────────────────────────────────────────────────────────
// Enum-szerű literál listák — Prisma enumokkal szinkronban tartva
// ─────────────────────────────────────────────────────────────
export const INSURANCE_COMPANIES = [
  "ALLIANZ",
  "GENERALI",
  "GROUPAMA",
  "UNIQA",
  "KH_BIZTOSITO",
  "UNION",
  "SIGNAL_IDUNA",
  "WABERERS",
  "GENERTEL",
  "MAGYAR_POSTA_BIZTOSITO",
  "EGYEB",
] as const

export type InsuranceCompanyValue = (typeof INSURANCE_COMPANIES)[number]

export const INSURANCE_COMPANY_LABELS: Record<InsuranceCompanyValue, string> = {
  ALLIANZ: "Allianz Hungária",
  GENERALI: "Generali Biztosító",
  GROUPAMA: "Groupama Biztosító",
  UNIQA: "UNIQA Biztosító",
  KH_BIZTOSITO: "K&H Biztosító",
  UNION: "UNION Biztosító",
  SIGNAL_IDUNA: "Signal Iduna Biztosító",
  WABERERS: "Wáberer Hungária Biztosító",
  GENERTEL: "Genertel Biztosító",
  MAGYAR_POSTA_BIZTOSITO: "Magyar Posta Biztosító",
  EGYEB: "Egyéb biztosító",
}

const insuranceCompanySchema = z.enum(INSURANCE_COMPANIES, {
  errorMap: () => ({ message: "Válasszon biztosítót" }),
})

// Az "Egyéb biztosító" választásnál a tényleges nevet az insuranceCompanyOther
// szabadszöveges mező tartalmazza — ez adja a megjelenítendő biztosító-nevet mindenhol
// (PDF, email, admin felületek), hogy az "Egyéb biztosító" placeholder helyett a valós név jelenjen meg.
export function getInsuranceCompanyLabel(
  insuranceCompany?: InsuranceCompanyValue | null,
  insuranceCompanyOther?: string | null
): string {
  if (!insuranceCompany) return "—"
  if (insuranceCompany === "EGYEB") {
    return insuranceCompanyOther?.trim() || INSURANCE_COMPANY_LABELS.EGYEB
  }
  return INSURANCE_COMPANY_LABELS[insuranceCompany]
}

// ─────────────────────────────────────────────────────────────
// Mező-szintű validátorok újrahasználva
// ─────────────────────────────────────────────────────────────
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/ // I, O, Q kizárva (ISO 3779)
const vinSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.toUpperCase() : val),
  z
    .string()
    .length(17, "A VIN szám pontosan 17 karakter hosszú")
    .regex(VIN_REGEX, "A VIN szám nem tartalmazhat I, O vagy Q betűt")
)

const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/
const phoneSchema = z
  .string()
  .regex(PHONE_REGEX, "Érvénytelen telefonszám formátum (pl. +36 30 123 4567)")

// A "YYYY-MM-DDTHH:mm" datetime-local érték év részét korlátozzuk 4 számjegyre —
// egyes böngészők (pl. Chrome) a natív dátumválasztóban gépeléskor ennél többet is
// elfogadnak, ezért ezt a szerver oldalon is ki kell kényszeríteni.
const accidentDateSchema = z
  .string()
  .optional()
  .refine((val) => {
    if (!val) return true
    const yearDigits = val.split("-")[0]
    const year = Number(yearDigits)
    return yearDigits.length <= 4 && year >= 1900 && year <= 2099
  }, "Érvénytelen év a baleset időpontjában (max. 4 számjegy, 1900–2099 között)")

// Ha az "EGYEB" (egyéb biztosító) opciót választja a felhasználó, a konkrét nevet
// szabadszöveges mezőben kell megadnia — ezt a damageReportObjectSchema-ra épülő
// sémák mindegyikén (damageReportSchema, editReportSchema, fullReportSchema) kikényszerítjük.
function insuranceOtherRequired(data: { insuranceCompany?: string; insuranceCompanyOther?: string }) {
  return data.insuranceCompany !== "EGYEB" || !!data.insuranceCompanyOther?.trim()
}

const insuranceOtherRefinement = {
  message: "Adja meg az egyéb biztosító nevét",
  path: ["insuranceCompanyOther"],
}

const damageReportObjectSchema = z.object({
  // 1. lépés — Személyes adatok
  ownerName: z.string().min(2, "Legalább 2 karakter szükséges"),
  ownerAddress: z.string().min(2, "A lakcím megadása kötelező"),
  idOrTaxNumber: z.string().min(5, "Adjon meg érvényes személyi igazolvány- vagy adószámot"),
  driverName: z.string().optional(),
  driverAddress: z.string().optional(),
  driverPhone: z.string().optional(),
  customerEmail: z.string().email("Érvénytelen e-mail cím"),
  customerPhone: phoneSchema,

  // 2. lépés — Jármű, biztosítás és felelősség (ki okozta a kárt?)
  vehiclePlate: z.string().min(3, "Rendszám minimum 3 karakter"),
  vehicleMake: z.string().min(1, "Gyártmány kötelező"),
  vehicleModel: z.string().min(1, "Típus kötelező"),
  vehicleYear: z.coerce.number().min(1970).max(2026).optional(),
  vehicleVin: vinSchema,
  liableParty: z.enum(["own", "other", "both"], {
    errorMap: () => ({ message: "Válasszon felelős felet" }),
  }),
  hasCasco: z.boolean(),
  cascoInsurer: z.string().optional(),
  liabilityInsurer: z.string().optional(),
  relevantInsurer: z.string().optional(),
  insuranceCompany: insuranceCompanySchema,
  insuranceCompanyOther: z.string().optional(),

  // 3. lépés — Baleset körülményei
  accidentDate: accidentDateSchema,
  accidentCountry: z.string().optional(),
  accidentCity: z.string().optional(),
  accidentStreet: z.string().optional(),
  outsideSettlement: z.boolean(),
  roadNumber: z.string().optional(),
  kilometerMark: z.string().optional(),
  policeInvolved: z.boolean(),
  policeStation: z.string().optional(),
  otherVehiclePlate: z.string().optional(),
  otherVehicleType: z.string().optional(),
  otherVehicleColor: z.string().optional(),
  additionalParties: z.string().optional(),
  vehicleInspectionLocation: z.string().optional(),

  // 4. lépés — Kár és sérülés
  damageDescription: z.string().min(20, "A kár leírása legalább 20 karakter kell legyen"),
  damagePoints: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
        dx: z.number(),
        dy: z.number(),
        label: z.string(),
      })
    )
    .optional(),
  photoUrls: z.array(z.string()).optional(),

  // 5. lépés — Nyilatkozatok
  underInfluence: z.boolean(),
  licenseValid: z.boolean(),
  vatReclaimEligible: z.boolean(),
  taxNumber: z.string().optional(),
  consentToPhotocopy: z.boolean(),
  cascoClaimRequest: z.boolean(),
  vehicleEncumbrance: z.boolean(),
  encumbranceFinancier: z.string().optional(),

  // 6. lépés — Meghatalmazás (jogi nyilatkozatok)
  accept8DayPayment: z.literal(true, {
    errorMap: () => ({ message: "A 8 napos fizetési záradék elfogadása kötelező" }),
  }),
  knowsCascoTerms: z.literal(true, {
    errorMap: () => ({ message: "A CASCO feltételek tudomásul vétele kötelező" }),
  }),

  // 7. lépés — Aláírás
  ownerSignatureUrl: z.string().min(1, "Tulajdonos aláírása kötelező"),
  driverSignatureUrl: z.string().optional(),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "GDPR beleegyezés kötelező" }),
  }),
})

export const damageReportSchema = damageReportObjectSchema.refine(
  insuranceOtherRequired,
  insuranceOtherRefinement
)

export type DamageReportInput = z.infer<typeof damageReportObjectSchema>

// Szerkesztési schema — csak a módosítható mezőket tartalmazza
// Readonly: photoUrls, aláírások, gdprConsent, meghatalmazás jognyilatkozatok, createdAt, emailSentAt
// A VIN / biztosító / lakcím / igazolványszám / telefon mezőket lazítjuk, hogy a régebbi,
// e mezők nélkül beküldött jelentések is továbbra is szerkeszthetők maradjanak.
export const editReportSchema = damageReportObjectSchema
  .omit({
    photoUrls: true,
    ownerSignatureUrl: true,
    driverSignatureUrl: true,
    gdprConsent: true,
    accept8DayPayment: true,
    knowsCascoTerms: true,
  })
  .extend({
    ownerAddress: z.string().optional(),
    idOrTaxNumber: z.string().optional(),
    customerPhone: z.string().optional(),
    vehicleVin: vinSchema.optional(),
    insuranceCompany: insuranceCompanySchema.optional(),
  })
  .strict()
  .refine(insuranceOtherRequired, insuranceOtherRefinement)

export type EditReportInput = z.infer<typeof editReportSchema>

// ─────────────────────────────────────────────────────────────
// Jegyzőkönyv — technikusi adatok (csak a /admin/munkalap felületen)
// ─────────────────────────────────────────────────────────────
const munkalapObjectSchema = z.object({
  vehicleCheckIn: z.string().min(1, "Az átvétel időpontja kötelező"),
  vehicleCheckOut: z.string().min(1, "A visszaadás időpontja kötelező"),
  equipmentChecklist: equipmentChecklistSchema,
  damageNotes: z.string().min(1, "Az átvételkori állapot rögzítése kötelező"),
  technicianName: z.string().min(2, "A technikus neve kötelező"),
  technicianSignatureUrl: z.string().min(1, "A technikus (átvevő) aláírása kötelező"),
})

function checkOutAfterCheckIn(data: { vehicleCheckIn: string; vehicleCheckOut: string }) {
  return new Date(data.vehicleCheckOut) > new Date(data.vehicleCheckIn)
}

const checkOutRefinement = {
  message: "A visszaadás időpontja az átvétel időpontja után kell legyen",
  path: ["vehicleCheckOut"],
}

export const munkalapSchema = munkalapObjectSchema.refine(checkOutAfterCheckIn, checkOutRefinement)
export type MunkalapInput = z.infer<typeof munkalapSchema>

// A technikus lezáráskor a teljes, összevont rekordnak érvényesnek kell lennie
export const fullReportSchema = damageReportObjectSchema
  .merge(munkalapObjectSchema)
  .refine(checkOutAfterCheckIn, checkOutRefinement)
  .refine(insuranceOtherRequired, insuranceOtherRefinement)
export type FullReportInput = z.infer<typeof fullReportSchema>
