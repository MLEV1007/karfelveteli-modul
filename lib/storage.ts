import { uploadToR2 } from "./r2"

function formatDateForFolder(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function sanitizeVehiclePlate(plate: string): string {
  // Replace special characters with dashes for folder naming
  return plate.replace(/[^a-zA-Z0-9]/g, "-")
}

// Server-side only: upload photo with proper folder structure
export async function uploadDamagePhotoServer(
  fileBuffer: Buffer,
  vehiclePlate: string,
  reportId: string,
  index: number
): Promise<string> {
  const dateStr = formatDateForFolder()
  const sanitizedPlate = sanitizeVehiclePlate(vehiclePlate)
  const key = `${sanitizedPlate}/${dateStr}_${reportId}/foto_${index + 1}.jpg`
  
  return await uploadToR2(fileBuffer, key, "image/jpeg")
}

// Server-side only: upload signature with proper folder structure
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
  const buffer = Buffer.from(bytes)
  const dateStr = formatDateForFolder()
  const sanitizedPlate = sanitizeVehiclePlate(vehiclePlate)
  const key = `${sanitizedPlate}/${dateStr}_${reportId}/${type}_alairas.png`
  
  return await uploadToR2(buffer, key, "image/png")
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
