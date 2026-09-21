import { Document, renderToBuffer } from "@react-pdf/renderer"
import DamageReportPage from "./DamageReportPage"
import AuthorizationPage from "./AuthorizationPage"
import DocumentChecklistPage from "./DocumentChecklistPage"
import JegyzokonyvPage from "./JegyzokonyvPage"
import { resolveSelectedAuthorizations } from "@/lib/workshop"
import type { FullPdfData } from "./types"

export type { FullPdfData }

// Szigorú, kódszinten kényszerített oldalsorrend a fő, összevont PDF-hez — nem konfigurálható:
// 1) Kárbejelentő lap, 2) Iratösszesítő, 3) Jegyzőkönyv.
// A Meghatalmazás ebből KIVÉVE — a technikus által kiválasztott cégekhez egyenként,
// külön PDF-fájl készül (lásd generateAuthorizationPdfs).
const MAIN_PAGE_ORDER = [DamageReportPage, DocumentChecklistPage, JegyzokonyvPage] as const

export async function generateMainReportPDF(data: FullPdfData): Promise<Buffer> {
  const doc = (
    <Document>
      {MAIN_PAGE_ORDER.map((PageComponent, i) => (
        <PageComponent key={i} data={data} />
      ))}
    </Document>
  )
  return await renderToBuffer(doc)
}

export interface AuthorizationPdf {
  key: string
  companyName: string
  filename: string
  buffer: Buffer
}

// Csak a technikus által kiválasztott meghatalmazások készülnek el (üres kiválasztás = régi
// kárügy -> mindhárom), mindegyik KÜLÖN, önálló PDF-ben — ezeket az ügyfél és a műhely is
// megkapja (lásd lib/email.ts). Fájlnév: meghatalmazas-<cég>-<rendszám>-<azonosító>.pdf
export async function generateAuthorizationPdfs(data: FullPdfData): Promise<AuthorizationPdf[]> {
  const plate = data.vehiclePlate.toUpperCase().replace(/[^A-Z0-9]/g, "")
  const results: AuthorizationPdf[] = []
  for (const grantee of resolveSelectedAuthorizations(data.selectedAuthorizations)) {
    const doc = (
      <Document>
        <AuthorizationPage data={data} grantee={grantee} />
      </Document>
    )
    const buffer = await renderToBuffer(doc)
    results.push({
      key: grantee.key,
      companyName: grantee.companyName,
      filename: `meghatalmazas-${grantee.key}-${plate}-${data.referenceNumber}.pdf`,
      buffer,
    })
  }
  return results
}
