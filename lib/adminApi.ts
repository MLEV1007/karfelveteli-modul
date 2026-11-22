// Közös segédek az admin API route-okhoz.
import type { NextRequest } from "next/server"
import { adminJson } from "./adminSession"
import { readBodyLimited } from "./bodyLimit"

const ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/
export function isValidId(id: string): boolean {
  return ID_REGEX.test(id)
}

/** JSON törzs beolvasása valós méretkorláttal (Content-Length + stream); érvénytelen JSON vagy túl nagy törzs esetén null. */
export async function readJsonBody(
  req: Pick<NextRequest, "headers" | "body">,
  maxBytes = 1_000_000
): Promise<unknown | null> {
  try {
    const bytes = await readBodyLimited(req, maxBytes)
    const text = new TextDecoder().decode(bytes)
    return text ? JSON.parse(text) : {}
  } catch {
    return null
  }
}

export const badRequest = (error = "Érvénytelen kérés.", extra: Record<string, unknown> = {}) =>
  adminJson({ error, ...extra }, 400)
export const notFound = () => adminJson({ error: "A kitöltés nem található." }, 404)
export const busy = () =>
  adminJson({ error: "Már fut egy művelet ezen a kitöltésen. Várd meg a végét, majd frissítsd az oldalt." }, 409)
export const serverError = () => adminJson({ error: "Váratlan hiba történt. Próbáld újra később." }, 500)
