/**
 * Egyszeri szkript: R2 bucket CORS beállítása presigned URL feltöltéshez.
 * Futtatás: node scripts/setup-r2-cors.mjs
 */

import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

// .env.local betöltése kézzel (dotenv nélkül)
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, "../.env.local")

let envVars = {}
try {
  const envContent = readFileSync(envPath, "utf-8")
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "")
    envVars[key] = value
  }
} catch {
  console.error("Nem sikerült olvasni a .env.local fájlt:", envPath)
  process.exit(1)
}

const accountId = envVars["CLOUDFLARE_R2_ACCOUNT_ID"]
const accessKeyId = envVars["CLOUDFLARE_R2_ACCESS_KEY_ID"]
const secretAccessKey = envVars["CLOUDFLARE_R2_SECRET_ACCESS_KEY"]
const bucketName = envVars["CLOUDFLARE_R2_BUCKET_NAME"]

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error("Hiányzó környezeti változók. Szükséges:")
  console.error("  CLOUDFLARE_R2_ACCOUNT_ID")
  console.error("  CLOUDFLARE_R2_ACCESS_KEY_ID")
  console.error("  CLOUDFLARE_R2_SECRET_ACCESS_KEY")
  console.error("  CLOUDFLARE_R2_BUCKET_NAME")
  process.exit(1)
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
})

const corsConfig = {
  Bucket: bucketName,
  CORSConfiguration: {
    CORSRules: [
      {
        // Böngésző közvetlen feltöltéshez (presigned PUT)
        AllowedOrigins: ["*"],
        AllowedMethods: ["PUT"],
        AllowedHeaders: ["Content-Type"],
        MaxAgeSeconds: 3000,
      },
    ],
  },
}

console.log(`Bucket: ${bucketName}`)
console.log("CORS beállítása...")

try {
  await r2Client.send(new PutBucketCorsCommand(corsConfig))
  console.log("✓ CORS sikeresen beállítva")
} catch (err) {
  console.error("Hiba a CORS beállítása során:", err.message)
  process.exit(1)
}

// Ellenőrzés
try {
  const result = await r2Client.send(new GetBucketCorsCommand({ Bucket: bucketName }))
  console.log("✓ Aktuális CORS konfiguráció:")
  console.log(JSON.stringify(result.CORSRules, null, 2))
} catch (err) {
  console.warn("Figyelmeztetés: CORS lekérdezés sikertelen:", err.message)
}
