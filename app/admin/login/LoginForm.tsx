"use client"

import { FormEvent, useState } from "react"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import AuthField from "./AuthField"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        window.location.assign("/admin/login/2fa")
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error ?? "Hibás adatok")
      setPassword("")
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Admin bejelentkezés</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Adja meg az e-mail címét és a jelszavát. A következő lépésben a hitelesítő alkalmazás kódját kérjük.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <AuthField
              label="E-mail cím"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              invalid={!!error}
              describedBy={error ? "login-error" : undefined}
              spellCheck={false}
            />
            <AuthField
              label="Jelszó"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              invalid={!!error}
              describedBy={error ? "login-error" : undefined}
            />
            {error && (
              <p id="login-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" fullWidth loading={loading} disabled={!email || !password}>
              Tovább
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
