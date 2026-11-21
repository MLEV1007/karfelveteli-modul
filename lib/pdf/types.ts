import type { FullReportInput } from "@/lib/validation"

// A teljes, összevont kárfelvételi adatállomány, amelyből mind a 4 PDF oldal épül.
// A signature mezők itt már letöltött/konvertált base64 data URI-k, nem Supabase URL-ek —
// a react-pdf renderelés nem indíthat hálózati kérést a saját PDF generálása közben.
// A meghatalmazáson szereplő tanú: az aláírás base64 data URL (a hívó töltötte le előre —
// a react-pdf renderelés nem indíthat hálózati kérést)
export interface PdfWitness {
  name: string
  address: string
  signatureDataUrl: string
}

export interface FullPdfData extends FullReportInput {
  id: string
  referenceNumber: string
  createdAt: Date
  // A Jegyzőkönyv lezárásának időpontja (első lezáráskor a pipeline állítja be)
  munkalapClosedAt?: Date | null
  // A meghatalmazások két tanúja (MINDEN meghatalmazáson ugyanaz); csak a meghatalmazás-PDF-ek
  // használják, az összevont PDF többi oldalára nem kerülnek. Pontosan 2 elem kell.
  witnesses?: PdfWitness[]
}
