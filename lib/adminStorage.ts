// Admin felület: rövid élettartamú signed URL-ek a fájlokhoz (Supabase Storage / R2 fotók).
// Az URL-ek CSAK az oldal kiszolgálásakor jönnek létre, soha nem tároljuk őket.
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { parseStorageRef } from "./storageRef"
import { getPresignedDownloadUrl } from "./r2"

export const SIGNED_URL_TTL_SECONDS = 300 // 5 perc

let client: SupabaseClient | null = null
function storageAdmin(): SupabaseClient | null {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    client = createClient(url, key)
  }
  return client
}

/** Signed URL egy bucket/path párhoz; hiba esetén null (és érzékeny adat nélküli log). */
export async function signStorageObject(bucket: string, path: string): Promise<string | null> {
  const admin = storageAdmin()
  if (!admin) return null
  try {
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (error || !data?.signedUrl) return null
    return data.signedUrl
  } catch (e) {
    console.error("Signed URL hiba:", e instanceof Error ? e.name : "ismeretlen")
    return null
  }
}

/** A DB-ben tárolt fájl-URL-hez signed URL: Supabase Storage objektum, vagy R2 fotó; különben null. */
export async function signStoredUrl(storedUrl: string | null | undefined): Promise<string | null> {
  if (!storedUrl) return null
  const ref = parseStorageRef(storedUrl)
  if (ref) return signStorageObject(ref.bucket, ref.path)
  try {
    return await getPresignedDownloadUrl(storedUrl, SIGNED_URL_TTL_SECONDS)
  } catch (e) {
    console.error("R2 signed URL hiba:", e instanceof Error ? e.name : "ismeretlen")
    return null
  }
}

/** A tanú aláírás-kulcsához (witnesses/<id>/signature.png) signed URL. */
export function signWitnessSignature(signatureKey: string): Promise<string | null> {
  return signStorageObject("signatures", signatureKey)
}
