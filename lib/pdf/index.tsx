import { Document, renderToBuffer } from "@react-pdf/renderer"
import DamageReportPage from "./DamageReportPage"
import AuthorizationPage from "./AuthorizationPage"
import DocumentChecklistPage from "./DocumentChecklistPage"
import JegyzokonyvPage from "./JegyzokonyvPage"
import { WORKSHOP_LEGAL_ENTITIES } from "@/lib/workshop"
import type { FullPdfData } from "./types"

export type { FullPdfData }

// Szigorú, kódszinten kényszerített oldalsorrend a fő, összevont PDF-hez — nem konfigurálható:
// 1) Kárbejelentő lap, 2) Iratösszesítő, 3) Jegyzőkönyv.
// A Meghatalmazás ebből KIVÉVE — a műhely a 3 entitáshoz (M1 / Autóüveg / Bodrogi Róbert)
// 3 önálló PDF-et kap (lásd generateAuthorizationPdfs), az ügyfél viszont ugyanezt a 3
// oldalt egyetlen összefűzött PDF-ben kapja (lásd generateCombinedAuthorizationPdf).
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

// A 3 jogi entitáshoz (M1 Szerviz Tata Kft. / Autóüveg Szinak Gábor e.v. / Bodrogi Róbert e.v.)
// 3 külön, önálló Meghatalmazás-PDF-et generál. Ezeket a műhely kapja meg emailben mind
// a 3-at (lásd lib/email.ts sendFinalReportEmails) — az ügyfélnek szánt, 1 összesített
// változatot lásd generateCombinedAuthorizationPdf.
export async function generateAuthorizationPdfs(
  data: FullPdfData
): Promise<{ key: string; filename: string; buffer: Buffer }[]> {
  const results: { key: string; filename: string; buffer: Buffer }[] = []
  for (const grantee of WORKSHOP_LEGAL_ENTITIES) {
    const doc = (
      <Document>
        <AuthorizationPage data={data} grantee={grantee} />
      </Document>
    )
    const buffer = await renderToBuffer(doc)
    results.push({ key: grantee.key, filename: `meghatalmazas-${grantee.key}.pdf`, buffer })
  }
  return results
}

// Az ügyfélnek szánt Meghatalmazás-PDF: ugyanaz a 3 AuthorizationPage oldal (M1 / Autóüveg /
// Bodrogi Róbert), de — a műhelynek küldött 3 önálló fájllal szemben — egyetlen, 1 összefűzött
// PDF-be téve (lásd lib/email.ts sendFinalReportEmails — ez megy csatolva az ügyfél emailjéhez).
export async function generateCombinedAuthorizationPdf(data: FullPdfData): Promise<Buffer> {
  const doc = (
    <Document>
      {WORKSHOP_LEGAL_ENTITIES.map((grantee) => (
        <AuthorizationPage key={grantee.key} data={data} grantee={grantee} />
      ))}
    </Document>
  )
  return await renderToBuffer(doc)
}
