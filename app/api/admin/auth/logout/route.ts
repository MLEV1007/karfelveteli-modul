import { NextRequest } from "next/server"
import {
  ADMIN_PENDING_COOKIE,
  ADMIN_SESSION_COOKIE,
  adminJson,
  checkAdminOrigin,
  clearAdminCookie,
  clientIp,
  logAudit,
  readTokenAdminId,
} from "@/lib/adminSession"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  if (!checkAdminOrigin(req)) return adminJson({ error: "Érvénytelen kérés." }, 403)

  const adminId = await readTokenAdminId(req.cookies.get(ADMIN_SESSION_COOKIE)?.value, "session")
  if (adminId) {
    await logAudit({ adminId, action: "LOGOUT", ip: clientIp(req) })
  }

  const res = adminJson({ ok: true })
  clearAdminCookie(res, ADMIN_SESSION_COOKIE)
  clearAdminCookie(res, ADMIN_PENDING_COOKIE)
  return res
}
