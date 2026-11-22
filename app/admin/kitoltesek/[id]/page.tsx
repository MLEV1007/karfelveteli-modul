// Egy kitöltés részletei: mezők csoportosítva, fájlok (5 perces signed URL-ek, minden betöltéskor újak),
// műveletek (újragenerálás, technikusi link, újrapróbálás), szerkesztés.
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAdminPage } from "@/lib/adminSession"
import { prisma } from "@/lib/db"
import { isValidId } from "@/lib/adminApi"
import { buildReportSections } from "@/lib/adminReportView"
import { signStoredUrl, SIGNED_URL_TTL_SECONDS } from "@/lib/adminStorage"
import { WORKSHOP_LEGAL_ENTITIES } from "@/lib/workshop"
import AdminShell from "@/components/admin/AdminShell"
import StatusBadge from "@/components/admin/StatusBadge"
import ReportActions from "@/components/admin/ReportActions"
import DeleteReportButton from "@/components/admin/DeleteReportButton"
import Card from "@/components/ui/Card"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Kitöltés — Admin", robots: { index: false, follow: false } }

interface FileItem {
  label: string
  kind: "image" | "pdf"
  url: string | null
}

function authorizationUrls(value: unknown): { key: string; url: string }[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>)
    .filter((e): e is [string, string] => typeof e[1] === "string")
    .map(([key, url]) => ({ key, url }))
}

export default async function AdminReportDetailPage({ params }: { params: { id: string } }) {
  const admin = await requireAdminPage()
  if (!isValidId(params.id)) notFound()

  const report = await prisma.damageReport.findUnique({ where: { id: params.id } })
  if (!report) notFound()

  // A signed URL-eket minden oldalbetöltéskor újra előállítjuk; sehol nem tároljuk őket.
  const entries: { label: string; kind: FileItem["kind"]; stored: string | null }[] = [
    ...report.photoUrls.map((u, i) => ({ label: `Fotó ${i + 1}`, kind: "image" as const, stored: u })),
    { label: "Tulajdonos aláírása", kind: "image", stored: report.ownerSignatureUrl },
    { label: "Vezető aláírása", kind: "image", stored: report.driverSignatureUrl },
    { label: "Technikus aláírása", kind: "image", stored: report.technicianSignatureUrl },
    { label: "Összevont kárfelvételi PDF", kind: "pdf", stored: report.finalPdfUrl },
    ...authorizationUrls(report.authorizationPdfUrls).map(({ key, url }) => ({
      label: `Meghatalmazás — ${WORKSHOP_LEGAL_ENTITIES.find((e) => e.key === key)?.companyName ?? key}`,
      kind: "pdf" as const,
      stored: url,
    })),
  ]
  const files: (FileItem & { present: boolean })[] = await Promise.all(
    entries
      .filter((e) => !!e.stored)
      .map(async (e) => ({ label: e.label, kind: e.kind, present: true, url: await signStoredUrl(e.stored) }))
  )

  const sections = buildReportSections(report)

  return (
    <AdminShell adminName={admin.name} active="kitoltesek">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-blue-700 dark:text-blue-300 hover:underline">← Vissza a listához</Link>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {report.referenceNumber} · <span className="font-mono">{report.vehiclePlate.toUpperCase()}</span>
        </h1>
        <StatusBadge status={report.status} />
        <Link
          href={`/admin/kitoltesek/${report.id}/szerkesztes`}
          className="ml-auto inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          Szerkesztés
        </Link>
      </div>

      <ReportActions reportId={report.id} status={report.status} customerEmail={report.customerEmail} />
      <DeleteReportButton reportId={report.id} referenceNumber={report.referenceNumber} />

      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Fájlok</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          A hivatkozások {SIGNED_URL_TTL_SECONDS / 60} percig érvényesek; lejárat után töltsd újra az oldalt.
        </p>
        {files.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">Nincs feltöltött fájl.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((f, i) => (
              <li key={`${f.label}-${i}`} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">{f.label}</p>
                {f.url ? (
                  <>
                    {f.kind === "image" && (
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={f.url}
                          alt={f.label}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-32 w-full object-contain rounded bg-gray-100 dark:bg-gray-800"
                        />
                      </a>
                    )}
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center min-h-[44px] text-sm text-blue-700 dark:text-blue-300 hover:underline"
                    >
                      {f.kind === "pdf" ? "PDF megnyitása" : "Megnyitás teljes méretben"}
                    </a>
                  </>
                ) : (
                  <p className="text-sm text-red-600 dark:text-red-400">A fájl most nem érhető el (hiányzik vagy a tároló nem válaszol).</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {sections.map((section) => (
        <Card key={section.title} className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{section.title}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-[minmax(0,14rem)_1fr] gap-x-6 gap-y-2 text-sm">
            {section.rows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-gray-500 dark:text-gray-400">{row.label}</dt>
                <dd className="text-gray-900 dark:text-gray-100 break-words whitespace-pre-line mb-2 sm:mb-0">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
    </AdminShell>
  )
}
