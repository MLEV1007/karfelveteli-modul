// Admin szerkesztés: az EditForm komponens „admin módban” (PATCH /api/admin/kitoltesek/[id], optimista zárolással).
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAdminPage } from "@/lib/adminSession"
import { prisma } from "@/lib/db"
import { isValidId } from "@/lib/adminApi"
import AdminShell from "@/components/admin/AdminShell"
import EditForm from "@/components/EditForm"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Szerkesztés — Admin", robots: { index: false, follow: false } }

export default async function AdminEditPage({ params }: { params: { id: string } }) {
  const admin = await requireAdminPage()
  if (!isValidId(params.id)) notFound()

  const report = await prisma.damageReport.findUnique({ where: { id: params.id } })
  if (!report) notFound()

  // A kliensnek átadott rekord NEM tartalmaz tokent, fájl-URL-t és tanú-kulcsot: az EditForm ezekből csak
  // azt használja, hogy van-e fotó/aláírás (darabszám / jelenlét), ezért helyőrzőt adunk át.
  const safeReport = {
    ...report,
    editToken: null,
    technicianToken: null,
    photoUrls: report.photoUrls.map(() => ""),
    ownerSignatureUrl: report.ownerSignatureUrl ? "present" : null,
    driverSignatureUrl: report.driverSignatureUrl ? "present" : null,
    technicianSignatureUrl: report.technicianSignatureUrl ? "present" : null,
    finalPdfUrl: null,
    authorizationPdfUrls: null,
    witnessSnapshot: null,
  }

  return (
    <AdminShell adminName={admin.name} active="kitoltesek">
      <div className="mb-4">
        <Link href={`/admin/kitoltesek/${report.id}`} className="text-sm text-blue-700 dark:text-blue-300 hover:underline">
          ← Vissza a részletekhez
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Kitöltés szerkesztése</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Rendszám: <strong>{report.vehiclePlate.toUpperCase()}</strong> • Azonosító: <strong>{report.referenceNumber}</strong>
      </p>
      <div className="max-w-4xl">
        <EditForm report={safeReport} mode="admin" />
      </div>
    </AdminShell>
  )
}
