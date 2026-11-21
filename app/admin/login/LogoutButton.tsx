"use client"

import { useState } from "react"
import Button from "@/components/ui/Button"

// Kijelentkezés gomb (újrahasznosítható az admin felületi oldalakon is).
export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function logout() {
    setLoading(true)
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" })
    } finally {
      window.location.assign("/admin/login")
    }
  }

  return (
    <Button variant="secondary" onClick={logout} loading={loading}>
      Kijelentkezés
    </Button>
  )
}
