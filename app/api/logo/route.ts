import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  const logoPath = path.join(process.cwd(), "pictures", "0001.png")
  const logo = fs.readFileSync(logoPath)
  return new NextResponse(logo, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
