import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAdminIdentity } from "@/lib/adminSession"
import LoginForm from "./LoginForm"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Admin bejelentkezés",
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage() {
  // Már bejelentkezett admin (érvényes session + aktív felhasználó) → irány az admin felület
  if (await getAdminIdentity()) redirect("/admin")
  return <LoginForm />
}
