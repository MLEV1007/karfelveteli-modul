import { NextRequest, NextResponse } from "next/server"
import { getPresignedUploadUrl } from "@/lib/r2"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
const MAX_FILES = 5

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { files } = body as { files: { contentType: string }[] }

    if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES) {
      return NextResponse.json(
        { error: "Érvénytelen kérés: 1–5 fájl engedélyezett" },
        { status: 400 }
      )
    }

    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.contentType)) {
        return NextResponse.json(
          { error: `Nem engedélyezett fájltípus: ${f.contentType}` },
          { status: 400 }
        )
      }
    }

    const urls = await Promise.all(
      files.map((f, i) => getPresignedUploadUrl(f.contentType, i))
    )

    return NextResponse.json({ urls })
  } catch (error) {
    console.error("Presigned URL hiba:", error)
    return NextResponse.json(
      { error: "Feltöltési URL generálási hiba" },
      { status: 500 }
    )
  }
}
