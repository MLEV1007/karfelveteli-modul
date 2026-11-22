// Kliens IP meghatározása (tiszta függvény, külön fájlban, hogy DB / Redis import nélkül tesztelhető legyen).
import type { NextRequest } from "next/server"

/**
 * Kliens IP: req.ip (Vercel) → x-real-ip → x-forwarded-for UTOLSÓ eleme (az első elem a kliens által
 * hamisítható; a platform proxyja a saját látott címet fűzi a lánc végére). Érvénytelen alak → null.
 */
export function clientIp(req: Pick<NextRequest, "ip" | "headers">): string | null {
  const xff = req.headers.get("x-forwarded-for")
  const candidate = req.ip ?? req.headers.get("x-real-ip") ?? (xff ? xff.split(",").pop() : null) ?? null
  const ip = candidate?.trim()
  if (!ip || ip.length > 45 || !/^[0-9a-fA-F:.]+$/.test(ip)) return null
  return ip
}
