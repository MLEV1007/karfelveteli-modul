import type { FullReportInput } from "@/lib/validation"

// A teljes, összevont kárfelvételi adatállomány, amelyből mind a 4 PDF oldal épül.
// A signature mezők itt már letöltött/konvertált base64 data URI-k, nem Supabase URL-ek —
// a react-pdf renderelés nem indíthat hálózati kérést a saját PDF generálása közben.
export interface FullPdfData extends FullReportInput {
  id: string
  referenceNumber: string
  createdAt: Date
}
