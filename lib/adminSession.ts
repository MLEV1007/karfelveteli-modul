// Admin session és védelmi segédfüggvények. Az /admin/** és /api/admin/** útvonalakat
// (kivéve /admin/login*, /admin/munkalap/*) csak teljes admin session éri el.
// FIGYELEM: egyelőre INTERFÉSZ-VÁZ — a megvalósítás az Admin-auth agent dolga.
import type { NextRequest, NextResponse } from "next/server"

export interface AdminIdentity {
  adminId: string
  email: string
  name: string
}

/** API route handlerekhez: érvényes admin session + (mutáló kérésnél) Origin ellenőrzés.
 *  Siker: AdminIdentity. Hiba: kész NextResponse (401/403), amit a handler visszaad. */
export async function requireAdminApi(req: NextRequest): Promise<AdminIdentity | NextResponse> {
  throw new Error("not implemented")
}

/** Szerver oldali oldalakhoz (RSC): érvényes admin session, különben redirect("/admin/login"). */
export async function requireAdminPage(): Promise<AdminIdentity> {
  throw new Error("not implemented")
}

/** Auditnapló-bejegyzés (AdminAuditLog). Soha nem dob: hiba esetén csak naplóz. */
export async function logAudit(entry: {
  adminId?: string | null
  action: string
  reportId?: string | null
  details?: unknown
  ip?: string | null
}): Promise<void> {
  throw new Error("not implemented")
}

export function clientIp(req: NextRequest): string | null {
  throw new Error("not implemented")
}
