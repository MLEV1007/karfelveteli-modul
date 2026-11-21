import { notFound } from "next/navigation"
import DateFieldDemo from "./DateFieldDemo"

// Csak fejlesztői / e2e tesztoldal a DateField komponenshez — éles buildben 404.
export default function DateFieldDevPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <DateFieldDemo />
}
