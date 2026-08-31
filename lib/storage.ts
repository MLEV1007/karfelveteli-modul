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

// Server-side only: a 3 önálló Meghatalmazás-PDF feltöltése a "reports" bucketbe, a fő
// összevont PDF-fel azonos {rendszám}/{dátum}_{reportId}/ mappába, de külön fájlnévvel
// (lásd lib/pdf/index.tsx generateAuthorizationPdfs — a `filename` már tartalmazza a
// "meghatalmazas-{key}.pdf" alakot). A visszaadott map kulcsai a LegalEntity.key értékek
// (pl. "m1", "autouveg", "bodrogi"), ez kerül a DamageReport.authorizationPdfUrls Json mezőbe.
export async function uploadAuthorizationPdfs(
  pdfs: { key: string; filename: string; buffer: Buffer }[],
  vehiclePlate: string,
  reportId: string
): Promise<Record<string, string>> {
  const dateStr = formatDateForFolder()
  const sanitizedPlate = sanitizeVehiclePlate(vehiclePlate)
  const urls: Record<string, string> = {}

  for (const pdf of pdfs) {
    const path = `${sanitizedPlate}/${dateStr}_${reportId}/${pdf.filename}`

    const { error } = await supabaseAdmin.storage
      .from("reports")
      .upload(path, pdf.buffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (error) throw new Error(`Supabase Storage hiba (Meghatalmazás PDF, ${pdf.key}): ${error.message}`)

    const { data: publicData } = supabaseAdmin.storage.from("reports").getPublicUrl(path)
    urls[pdf.key] = publicData.publicUrl
  }

  return urls
}

// Server-side only: az ügyfélnek szánt, 1 összesített Meghatalmazás-PDF feltöltése a "reports"
// bucketbe, a fő összevont PDF-fel és a műhelynek szánt 3 önálló Meghatalmazás-PDF-fel azonos
// {rendszám}/{dátum}_{reportId}/ mappába (lásd lib/pdf/index.tsx generateCombinedAuthorizationPdf).
export async function uploadCombinedAuthorizationPdf(
  pdfBuffer: Buffer,
  vehiclePlate: string,
  reportId: string
): Promise<string> {
  const dateStr = formatDateForFolder()
  const sanitizedPlate = sanitizeVehiclePlate(vehiclePlate)
  const path = `${sanitizedPlate}/${dateStr}_${reportId}/meghatalmazasok-osszevont.pdf`

  const { error } = await supabaseAdmin.storage
    .from("reports")
    .upload(path, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (error) throw new Error(`Supabase Storage hiba (Meghatalmazás összesített PDF): ${error.message}`)

  const { data } = supabaseAdmin.storage.from("reports").getPublicUrl(path)
  return data.publicUrl
}

// Server-side only: letölt egy tárolt aláírás-PNG-t és base64 data URI-vá alakítja.
// A "signatures" bucket SZÁNDÉKOSAN privát (az aláírások nem nyilvánosak), ezért a DB-ben
// tárolt getPublicUrl()-lal képzett URL-t sima fetch-csel nem lehet elérni — a service role
// kulccsal hitelesített .download()-t kell használni, ami privát bucketnél is működik.
export async function downloadSignatureAsBase64(signatureUrl: string): Promise<string> {
  const marker = "/object/public/signatures/"
  const idx = signatureUrl.indexOf(marker)
  if (idx === -1) {
    throw new Error(`Ismeretlen formátumú aláírás URL: ${signatureUrl}`)
  }
  const path = signatureUrl.slice(idx + marker.length)

  const { data, error } = await supabaseAdmin.storage.from("signatures").download(path)
  if (error || !data) {
    throw new Error(`Nem sikerült letölteni az aláírást (${path}): ${error?.message ?? "ismeretlen hiba"}`)
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  return `data:image/png;base64,${buffer.toString("base64")}`
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
