// Az /admin/** és /api/admin/** útvonalak besorolása a middleware számára (tiszta, tesztelhető).
//  - "public-munkalap": a nyilvános, tokenes technikusi oldal (/admin/munkalap/*) — a middleware NEM nyúl hozzá
//  - "auth-open":       bejelentkezési oldalak és auth API-k — session nélkül elérhetők
//  - "protected":       minden más — teljes admin session kell
export type AdminPathClass = "public-munkalap" | "auth-open" | "protected"

export function classifyAdminPath(rawPath: string): AdminPathClass {
  // Fail-closed: kódolt vagy trükkös útvonal (%2e%2e, \, //, ., ..) soha nem kap kivételt.
  if (rawPath.includes("%") || rawPath.includes("\\") || rawPath.includes("//")) return "protected"
  if (rawPath.split("/").some((seg) => seg === "." || seg === "..")) return "protected"

  const p = rawPath.length > 1 && rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath

  if (p === "/admin/login" || p === "/admin/login/2fa") return "auth-open"
  if (p.startsWith("/api/admin/auth/") && p.length > "/api/admin/auth/".length) return "auth-open"
  if (p.startsWith("/admin/munkalap/") && p.length > "/admin/munkalap/".length) return "public-munkalap"
  return "protected"
}
