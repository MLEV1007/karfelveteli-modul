import { notFound } from "next/navigation"
import SignatureDemo from "./SignatureDemo"

// Csak fejlesztői / e2e tesztoldal az aláíró komponenshez. Production buildben 404.
export default function SignatureDevPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <SignatureDemo />
}
