// Supabase Storage URL → (bucket, path) leképezés a signed URL-ek előállításához. Tiszta függvény.
const ALLOWED_BUCKETS = new Set(["signatures", "reports"])

export interface StorageRef {
  bucket: string
  path: string
}

/**
 * A DB-ben tárolt (public) Supabase Storage URL-ből bucket + objektum-útvonal.
 * Elfogadott alak: `.../storage/v1/object/(public|sign|authenticated)/<bucket>/<path>[?query]`.
 * Ismeretlen bucket, hiányzó útvonal vagy `..` szegmens esetén null.
 */
export function parseStorageRef(url: string | null | undefined): StorageRef | null {
  if (!url || typeof url !== "string") return null
  const match = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/.exec(url)
  if (!match) return null
  const bucket = match[1]
  if (!ALLOWED_BUCKETS.has(bucket)) return null
  let path: string
  try {
    path = decodeURIComponent(match[2])
  } catch {
    return null
  }
  if (!path || path.startsWith("/") || path.split("/").some((s) => s === ".." || s === "." || s === "")) return null
  return { bucket, path }
}
