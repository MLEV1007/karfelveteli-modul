// IDEIGLENES admin főoldal — a következő (admin felület) agent felülírja.
import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/adminSession"
import Card from "@/components/ui/Card"
import LogoutButton from "./login/LogoutButton"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } }

export default async function AdminHomePage() {
  const admin = await requireAdminPage()
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="max-w-md mx-auto">
        <Card>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Bejelentkezve</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{admin.name}</p>
          <LogoutButton />
        </Card>
      </div>
    </main>
  )
}
