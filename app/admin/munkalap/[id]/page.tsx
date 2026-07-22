import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { sessionCookieName, verifySessionCookieValue } from "@/lib/session"
import { prisma } from "@/lib/db"
import JegyzokonyvForm from "@/components/JegyzokonyvForm"

interface MunkalapPageProps {
  params: { id: string }
}

export default async function MunkalapPage({ params }: MunkalapPageProps) {
  const { id } = params

  // A nyers tokent a /api/munkalap/session csere-endpoint már beváltotta
  // session cookie-ra — ide (és a böngésző URL-jébe) többé nem kerül token.
  const sessionCookie = cookies().get(sessionCookieName("munkalap", id))?.value

  if (!verifySessionCookieValue(sessionCookie, id, "munkalap")) {
    redirect("/?error=invalid_token")
  }

  const report = await prisma.damageReport.findUnique({ where: { id } })

  if (!report) {
    redirect("/?error=invalid_token")
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Jegyzőkönyv</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Rendszám: <strong>{report.vehiclePlate.toUpperCase()}</strong> • Azonosító:{" "}
            <strong>{report.referenceNumber}</strong>
          </p>
        </div>

        <JegyzokonyvForm report={report} />
      </div>
    </main>
  )
}
