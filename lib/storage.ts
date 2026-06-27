import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatDateForFolder(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function sanitizeVehiclePlate(plate: string): string {
  return plate.replace(/[^a-zA-Z0-9]/g, "-")
}

// Server-side only: upload signature to Supabase Storage
export async function uploadSignature(
  dataUrl: string,
  vehiclePlate: string,
  reportId: string,
  type: "owner" | "driver" | "technician"
): Promise<string> {
  const base64 = dataUrl.split(",")[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  const dateStr = formatDateForFolder()
  const sanitizedPlate = sanitizeVehiclePlate(vehiclePlate)
  const path = `${sanitizedPlate}/${dateStr}_${reportId}/${type}_alairas.png`

  const { error } = await supabaseAdmin.storage
    .from("signatures")
    .upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
    })

  if (error) throw new Error(`Supabase Storage hiba: ${error.message}`)

  const { data } = supabaseAdmin.storage.from("signatures").getPublicUrl(path)
  return data.publicUrl
}

// Server-side only: a végleges, összevont PDF feltöltése Supabase Storage-ba
// Bucket: "reports" — kárfelvétel/meghatalmazás/iratösszesítő/munkalap egyetlen fájlban
export async function uploadFinalPdf(
  pdfBuffer: Buffer,
  vehiclePlate: string,
  reportId: string
): Promise<string> {
  const dateStr = formatDateForFolder()
  const sanitizedPlate = sanitizeVehiclePlate(vehiclePlate)
  const path = `${sanitizedPlate}/${dateStr}_${reportId}/karfelvetel-osszevont.pdf`

  const { error } = await supabaseAdmin.storage
    .from("reports")
    .upload(path, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (error) throw new Error(`Supabase Storage hiba (PDF): ${error.message}`)

  const { data } = supabaseAdmin.storage.from("reports").getPublicUrl(path)
  return data.publicUrl
}

// Server-side only: letölti egy tárolt aláírás-PNG-t és base64 data URI-vá alakítja.
// A react-pdf renderelés közben nem indíthat hálózati kérést, ezért a PDF összeállítása előtt
// minden Supabase Storage URL-t base64-re kell konvertálni.
export async function urlToBase64(url: string, contentType = "image/png"): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Nem sikerült letölteni: ${url} (${res.status})`)
  const buffer = Buffer.from(await res.arrayBuffer())
  return `data:${contentType};base64,${buffer.toString("base64")}`
}

// Client-side: convert file to base64 for transport to API
export async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
