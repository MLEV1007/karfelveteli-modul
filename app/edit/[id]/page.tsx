import { redirect } from "next/navigation"
import { validateEditToken } from "@/lib/auth"
import EditForm from "@/components/EditForm"

interface EditPageProps {
  params: { id: string }
  searchParams: { token?: string }
}

export default async function EditPage({ params, searchParams }: EditPageProps) {
  const { id } = params
  const token = searchParams.token

  // Token hiányzik
  if (!token) {
    redirect("/?error=missing_token")
  }

  // Token validálás szerver oldalon
  const report = await validateEditToken(id, token)

  // Ha invalid vagy lejárt
  if (!report) {
    redirect("/?error=invalid_token")
  }

  // Token érvényes, átadjuk az adatokat a kliens komponensnek
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Kárfelvételi jelentés szerkesztése
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Rendszám: <strong>{report.vehiclePlate.toUpperCase()}</strong> •
            Azonosító: <strong>{report.id.slice(-8).toUpperCase()}</strong>
          </p>
        </div>

        <EditForm report={report} token={token} />
      </div>
    </main>
  )
}
