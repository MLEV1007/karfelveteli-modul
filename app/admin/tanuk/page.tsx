// Tanúk kezelése: a meghatalmazásokon szereplő két (aktív) tanú.
import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/adminSession"
import { listAdminWitnesses, type AdminWitnessList } from "@/lib/adminWitnesses"
import AdminShell from "@/components/admin/AdminShell"
import WitnessManager from "@/components/admin/WitnessManager"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Tanúk — Admin", robots: { index: false, follow: false } }

export default async function AdminWitnessesPage() {
  const admin = await requireAdminPage()

  let list: AdminWitnessList | null = null
  try {
    list = await listAdminWitnesses()
  } catch (error) {
    console.error("Admin tanú-lista hiba:", error instanceof Error ? error.name : "ismeretlen")
  }

  return (
    <AdminShell adminName={admin.name} active="tanuk">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Tanúk</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        A meghatalmazások pontosan 2 aktív tanúval készülnek. A már kiadott dokumentumokon a lezáráskor rögzített tanúk maradnak.
      </p>
      {list ? (
        <WitnessManager initial={list} />
      ) : (
        <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200 text-sm">
          A tanúk betöltése nem sikerült (adatbázis- vagy tárolóhiba). Próbáld újra később.
        </div>
      )}
    </AdminShell>
  )
}
