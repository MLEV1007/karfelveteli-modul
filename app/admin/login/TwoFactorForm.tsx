"use client"

import { FormEvent, useState } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import AuthField from "./AuthField"

export default function TwoFactorForm() {
  const [useRecovery, setUseRecovery] = useState(false)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function toggleMode() {
    setUseRecovery((v) => !v)
    setCode("")
    setError(null)
  }

  function onChange(value: string) {
    // TOTP: csak számjegy, max. 6; helyreállító kód: betű/szám/kötőjel, max. 9 karakter
    setCode(useRecovery ? value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 9) : value.replace(/\D/g, "").slice(0, 6))
  }

  const complete = useRecovery ? code.replace(/-/g, "").length === 8 : code.length === 6

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading || !complete) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/admin/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      if (res.ok) {
        window.location.assign("/admin")
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
      if (res.status === 401 && data?.code === "expired") {
        window.location.assign("/admin/login")
        return
      }
      setError(data?.error ?? "Hibás adatok")
      setCode("")
    } catch {
      setError("A kapcsolat megszakadt. Kérjük, próbálja újra.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="max-w-md mx-auto">
        <Card>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Kétlépcsős azonosítás</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {useRecovery
              ? "Adja meg az egyik, még fel nem használt helyreállító kódját. Minden kód csak egyszer használható."
              : "Adja meg a hitelesítő alkalmazás (jelszókezelő) által mutatott 6 jegyű kódot."}
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            {useRecovery ? (
              <AuthField
                key="recovery"
                label="Helyreállító kód"
                name="code"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={code}
                onChange={(e) => onChange(e.target.value)}
                hint="Formátum: XXXX-XXXX"
                required
                autoFocus
                invalid={!!error}
                describedBy={error ? "twofa-error" : undefined}
              />
            ) : (
              <AuthField
                key="totp"
                label="6 jegyű kód"
                name="code"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => onChange(e.target.value)}
                required
                autoFocus
                invalid={!!error}
                describedBy={error ? "twofa-error" : undefined}
              />
            )}
            {error && (
              <p id="twofa-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" fullWidth loading={loading} disabled={!complete}>
              Bejelentkezés
            </Button>
          </form>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <button
              type="button"
              onClick={toggleMode}
              className="text-left text-blue-700 dark:text-blue-400 underline underline-offset-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              {useRecovery ? "Vissza a hitelesítő alkalmazás kódjához" : "Helyreállító kód használata"}
            </button>
            <a
              href="/admin/login"
              className="text-gray-600 dark:text-gray-400 underline underline-offset-2 min-h-[44px] inline-flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Vissza a bejelentkezéshez
            </a>
          </div>
        </Card>
      </div>
    </main>
  )
}
