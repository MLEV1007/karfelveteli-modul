import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export async function uploadToR2(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  )

  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
}

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]

export async function getPresignedUploadUrl(
  contentType: string,
  index: number
): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!ALLOWED_PHOTO_TYPES.includes(contentType)) {
    throw new Error("Nem engedélyezett fájltípus")
  }

  const ext = contentType.split("/")[1].replace("jpeg", "jpg")
  const key = `uploads/${crypto.randomUUID()}/foto_${index + 1}.${ext}`

  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 }) // 15 perc

  return {
    uploadUrl,
    publicUrl: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
  }
}

// Rövid életű letöltési URL egy R2-ben tárolt fotóhoz (admin felület). A `publicUrl` a DB-ben
// tárolt nyilvános URL; csak a saját CLOUDFLARE_R2_PUBLIC_URL alatti kulcs írható alá.
// Null, ha az URL nem a mi R2 bucketünké, vagy az R2 nincs beállítva.
export async function getPresignedDownloadUrl(publicUrl: string, expiresInSeconds: number): Promise<string | null> {
  const base = process.env.CLOUDFLARE_R2_PUBLIC_URL
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME
  if (!base || !bucket || !process.env.CLOUDFLARE_R2_ACCOUNT_ID) return null
  const prefix = base.replace(/\/+$/, "") + "/"
  if (!publicUrl.startsWith(prefix)) return null
  const key = decodeURIComponent(publicUrl.slice(prefix.length).split(/[?#]/)[0])
  if (!key || key.split("/").some((s) => s === ".." || s === "")) return null
  return getSignedUrl(r2Client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expiresInSeconds })
}
