import { z } from "zod"

export const damageReportSchema = z.object({
  // 1. lépés — Személyes adatok
  ownerName: z.string().min(2, "Legalább 2 karakter szükséges"),
  ownerAddress: z.string().optional(),
  driverName: z.string().optional(),
  driverAddress: z.string().optional(),
  driverPhone: z.string().optional(),
  customerEmail: z.string().email("Érvénytelen e-mail cím"),
  customerPhone: z.string().optional(),

  // 2. lépés — Jármű és biztosítás
  vehiclePlate: z.string().min(3, "Rendszám minimum 3 karakter"),
  vehicleMake: z.string().min(1, "Gyártmány kötelező"),
  vehicleModel: z.string().min(1, "Típus kötelező"),
  vehicleYear: z.coerce.number().min(1970).max(2026).optional(),
  vehicleVin: z.string().optional(),
  hasCasco: z.boolean(),
  cascoInsurer: z.string().optional(),
  liabilityInsurer: z.string().optional(),
  relevantInsurer: z.string().optional(),

  // 3. lépés — Baleset körülményei
  accidentDate: z.string().optional(),
  accidentCountry: z.string().optional(),
  accidentCity: z.string().optional(),
  accidentStreet: z.string().optional(),
  outsideSettlement: z.boolean(),
  roadNumber: z.string().optional(),
  kilometerMark: z.string().optional(),
  policeInvolved: z.boolean(),
  policeReportNo: z.string().optional(),
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
  liableParty: z.enum(["own", "other", "both"], {
    errorMap: () => ({ message: "Válasszon felelős felet" }),
  }),
  underInfluence: z.boolean(),
  licenseValid: z.boolean(),
  taxNumber: z.string().optional(),
  consentToPhotocopy: z.boolean(),
  cascoClaimRequest: z.boolean(),
  vehicleEncumbrance: z.boolean(),

  // 6. lépés — Aláírás
  ownerSignatureUrl: z.string().min(1, "Tulajdonos aláírása kötelező"),
  driverSignatureUrl: z.string().optional(),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "GDPR beleegyezés kötelező" }),
  }),
})

export type DamageReportInput = z.infer<typeof damageReportSchema>

// Szerkesztési schema — csak a módosítható mezőket tartalmazza
// Readonly: photoUrls, aláírások, gdprConsent, createdAt, emailSentAt
export const editReportSchema = damageReportSchema
  .omit({
    photoUrls: true,
    ownerSignatureUrl: true,
    driverSignatureUrl: true,
    gdprConsent: true,
  })
  .strict()

export type EditReportInput = z.infer<typeof editReportSchema>
