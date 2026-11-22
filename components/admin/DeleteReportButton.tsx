"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"

interface DeleteReportButtonProps {
  reportId: string
  referenceNumber: string
}

// Végleges törlés: a kárfelvétel minden adata (adatbázis, audit-diffek, fotók, aláírások, PDF-ek).
// Csak akkor aktív a gomb, ha a felhasználó pontosan beírja a referenciaszámot.
export default function DeleteReportButton({ reportId, referenceNumber }: DeleteReportButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<{ warning?: string } | null>(null)

  const matches = typed.trim() === referenceNumber

  async function onDelete() {
    if (!matches || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/kitoltesek/${reportId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceNumber: typed.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setError("A munkamenet lejárt. Jelentkezz be újra.")
        return
      }
      if (!res.ok || data.ok === false) {
        setError(data.error || "A törlés nem sikerült.")
        return
      }
      setDeleted({ warning: data.storageWarning })
      if (!data.storageWarning) {
        router.push("/admin")
        router.refresh()
      }
    } catch {
      setError("Hálózati hiba — a törlés eredménye bizonytalan. Nézd meg a listát, mielőtt újra próbálod.")
    } finally {
      setBusy(false)
    }
  }

  if (deleted) {
    return (
      <Card className="mb-6">
        <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">A kárfelvétel törölve.</p>
        {deleted.warning && (
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">{deleted.warning}</p>
        )}
        <Button onClick={() => { router.push("/admin"); router.refresh() }}>Vissza a listához</Button>
      </Card>
    )
  }

  return (
    <Card className="mb-6 border border-red-200 dark:border-red-800">
      <h2 className="text-base font-semibold text-red-700 dark:text-red-400 mb-2">Veszélyes művelet</h2>
      {!open ? (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            A kárfelvétel végleges törlése minden adatával együtt. Ez nem vonható vissza.
          </p>
          <Button onClick={() => setOpen(true)}>Kárfelvétel törlése…</Button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Törlődik a rekord az adatbázisból, az audit-napló korábbi bejegyzései róla, valamint a fotók, aláírások és
            PDF-ek a tárolóból. A törléshez írd be pontosan a referenciaszámot:{" "}
            <span className="font-mono font-semibold">{referenceNumber}</span>
          </p>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
            aria-label="Referenciaszám megerősítése"
            className="w-full mb-3 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-3">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button onClick={onDelete} disabled={!matches || busy}>
              {busy ? "Törlés…" : "Végleges törlés"}
            </Button>
            <Button variant="secondary" onClick={() => { setOpen(false); setTyped(""); setError(null) }} disabled={busy}>
              Mégse
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
