import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ADMIN_PENDING_COOKIE, getAdminIdentity, readTokenAdminId } from "@/lib/adminSession"
import TwoFactorForm from "../TwoFactorForm"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Kétlépcsős azonosítás",
  robots: { index: false, follow: false },
}

export default async function AdminTwoFactorPage() {
  if (await getAdminIdentity()) redirect("/admin")
  // Érvényes "2FA függőben" cookie nélkül (lejárt / nincs jelszó-lépés) vissza a bejelentkezéshez
  const pendingId = await readTokenAdminId(cookies().get(ADMIN_PENDING_COOKIE)?.value, "pending")
  if (!pendingId) redirect("/admin/login")
  return <TwoFactorForm />
}
