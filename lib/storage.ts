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
  type: "owner" | "driver"
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

// Client-side: convert file to base64 for transport to API
export async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
