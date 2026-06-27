import { Document, renderToBuffer } from "@react-pdf/renderer"
import DamageReportPage from "./DamageReportPage"
import AuthorizationPage from "./AuthorizationPage"
import DocumentChecklistPage from "./DocumentChecklistPage"
import JegyzokonyvPage from "./JegyzokonyvPage"
import type { FullPdfData } from "./types"

export type { FullPdfData }

// Szigorú, kódszinten kényszerített oldalsorrend — nem konfigurálható:
// 1) Kárbejelentő lap, 2) Meghatalmazás, 3) Iratösszesítő, 4) Jegyzőkönyv.
const PAGE_ORDER = [DamageReportPage, AuthorizationPage, DocumentChecklistPage, JegyzokonyvPage] as const

export async function generateFullReportPDF(data: FullPdfData): Promise<Buffer> {
  const doc = (
    <Document>
      {PAGE_ORDER.map((PageComponent, i) => (
        <PageComponent key={i} data={data} />
      ))}
    </Document>
  )
  return await renderToBuffer(doc)
}
