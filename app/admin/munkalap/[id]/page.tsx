import { redirect } from "next/navigation"
import { validateTechnicianToken } from "@/lib/auth"
import MunkalapForm from "@/components/MunkalapForm"

interface MunkalapPageProps {
  params: { id: string }
  searchParams: { token?: string }
}

export default async function MunkalapPage({ params, searchParams }: MunkalapPageProps) {
  const { id } = params
  const token = searchParams.token

  if (!token) {
    redirect("/?error=missing_token")
  }

  const report = await validateTechnicianToken(id, token)

  if (!report) {
    redirect("/?error=invalid_token")
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Munkalap</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Rendszám: <strong>{report.vehiclePlate.toUpperCase()}</strong> • Azonosító:{" "}
            <strong>{report.id.slice(-8).toUpperCase()}</strong>
          </p>
        </div>

        <MunkalapForm report={report} token={token} />
      </div>
    </main>
  )
}
