"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Checkbox from "@/components/ui/Checkbox"
import ConfirmDialog from "./ConfirmDialog"

type ActionKey = "regenerate" | "technician" | "retry"

interface ReportActionsProps {
  reportId: string
  status: "PENDING_TECHNICIAN" | "COMPLETED" | "FAILED_PDF" | string
  customerEmail: string
}

const ENDPOINTS: Record<ActionKey, string> = {
  regenerate: "ujragenerals",
  technician: "technikus-link",
  retry: "ujraprobalas",
}

// Admin műveletek: dokumentumok újragenerálása (opt-in e-mailek), technikusi link újraküldése,
// FAILED_PDF újrapróbálása. Minden művelet megerősítést kér; futás közben minden gomb le van tiltva,
// és egy ref is védi a dupla beküldést (a szerver oldalon külön zár és állapot-ellenőrzés van).
export default function ReportActions({ reportId, status, customerEmail }: ReportActionsProps) {
  const router = useRouter()
  const inFlight = useRef(false)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState<ActionKey | null>(null)
  const [sendCustomer, setSendCustomer] = useState(false)
  const [sendWorkshop, setSendWorkshop] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const canRegenerate = status === "COMPLETED"
  const canResendTechnician = status === "PENDING_TECHNICIAN" || status === "FAILED_PDF"
  const canRetry = status === "FAILED_PDF"

  async function run(action: ActionKey) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/kitoltesek/${reportId}/${ENDPOINTS[action]}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "regenerate" ? { emails: { customer: sendCustomer, workshop: sendWorkshop } } : {}
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setMessage({ kind: "error", text: "A munkamenet lejárt. Jelentkezz be újra." })
      } else if (!res.ok || data.ok === false) {
        setMessage({ kind: "error", text: data.error || "A művelet nem sikerült." })
      } else {
        setMessage({
          kind: "ok",
          text:
            action === "regenerate"
              ? "A dokumentumok újragenerálva."
              : action === "technician"
                ? "Az új technikusi link elküldve."
                : "Az újrapróbálás sikerült, a dokumentumok kiküldve.",
        })
        setSendCustomer(false)
        setSendWorkshop(false)
        router.refresh()
      }
    } catch {
      setMessage({ kind: "error", text: "Hálózati hiba — a művelet eredménye bizonytalan. Frissítsd az oldalt, és ellenőrizd az állapotot." })
    } finally {
      setConfirming(null)
      inFlight.current = false
      setBusy(false)
    }
  }

  const emailSummary =
    sendCustomer && sendWorkshop
      ? "Az új PDF-ek e-mailben kimennek az ügyfélnek és a műhelynek is."
      : sendCustomer
        ? "Az új PDF-ek e-mailben kimennek az ügyfélnek."
        : sendWorkshop
          ? "Az új PDF-ek e-mailben kimennek a műhelynek."
          : "E-mail NEM megy ki senkinek."

  return (
    <Card className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Műveletek</h2>

      {message && (
        <div
          role={message.kind === "error" ? "alert" : "status"}
          className={`mb-4 p-3 rounded-lg border text-sm ${
            message.kind === "error"
              ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
              : "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {canRegenerate && (
          <section aria-labelledby="regen-title">
            <h3 id="regen-title" className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dokumentumok újragenerálása</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-2">
              Az összevont PDF és a meghatalmazások újra elkészülnek a jelenlegi adatokból. A rögzített tanúk nem változnak.
            </p>
            <fieldset disabled={busy}>
              <legend className="text-xs font-medium text-gray-600 dark:text-gray-400">E-mail újraküldése az új PDF-ekkel (alapból egyik sem)</legend>
              <Checkbox label={`Ügyfélnek (${customerEmail})`} name="send-customer" checked={sendCustomer} onChange={(e) => setSendCustomer(e.target.checked)} />
              <Checkbox label="Műhelynek (a beállított műhely e-mail-cím(ek)re)" name="send-workshop" checked={sendWorkshop} onChange={(e) => setSendWorkshop(e.target.checked)} />
            </fieldset>
            <Button onClick={() => setConfirming("regenerate")} disabled={busy}>Dokumentumok újragenerálása</Button>
          </section>
        )}

        {canRetry && (
          <section aria-labelledby="retry-title">
            <h3 id="retry-title" className="text-sm font-semibold text-gray-800 dark:text-gray-200">Újrapróbálás (PDF-hiba)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-2">
              A véglegesítés (PDF-generálás, feltöltés, e-mailek) újrafuttatása a technikus által már rögzített adatokkal.
            </p>
            <Button onClick={() => setConfirming("retry")} disabled={busy}>Újrapróbálás</Button>
          </section>
        )}

        {canResendTechnician && (
          <section aria-labelledby="tech-title">
            <h3 id="tech-title" className="text-sm font-semibold text-gray-800 dark:text-gray-200">Technikusi link újraküldése</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-2">
              Új munkalap-linket készít és elküldi a műhelynek; a korábbi link érvénytelenné válik.
            </p>
            <Button variant="secondary" onClick={() => setConfirming("technician")} disabled={busy}>Új technikusi link küldése</Button>
          </section>
        )}

        {!canRegenerate && !canRetry && !canResendTechnician && (
          <p className="text-sm text-gray-600 dark:text-gray-400">Ennél az állapotnál nincs elérhető művelet.</p>
        )}
      </div>

      <ConfirmDialog
        open={confirming === "regenerate"}
        title="Dokumentumok újragenerálása"
        confirmLabel="Újragenerálás"
        busy={busy}
        onCancel={() => setConfirming(null)}
        onConfirm={() => run("regenerate")}
      >
        <p>Az összevont PDF és a meghatalmazások újragenerálódnak a jelenlegi adatokkal; a rekord az új fájlokra fog mutatni (a régi fájlok a tárolóban megmaradnak).</p>
        <p>A meghatalmazáson a lezáráskor rögzített tanúk maradnak (a későbbi tanúmódosítások nem hatnak rájuk).</p>
        <p className="font-medium">{emailSummary}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirming === "retry"}
        title="Véglegesítés újrapróbálása"
        confirmLabel="Újrapróbálás"
        busy={busy}
        onCancel={() => setConfirming(null)}
        onConfirm={() => run("retry")}
      >
        <p>A rendszer újra legenerálja a PDF-eket. Siker esetén a kitöltés LEZÁRT lesz, és a végleges dokumentumok e-mailben kimennek az ügyfélnek ({customerEmail}) és a műhelynek is.</p>
        <p>Ha a tanúk száma nem pontosan 2 aktív, a művelet hibával leáll.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirming === "technician"}
        title="Új technikusi link küldése"
        confirmLabel="Link küldése"
        busy={busy}
        onCancel={() => setConfirming(null)}
        onConfirm={() => run("technician")}
      >
        <p>Új, 30 napig érvényes munkalap-link készül, és e-mailben elmegy a műhely címére.</p>
        <p className="font-medium">A korábban kiküldött technikusi link azonnal érvénytelen lesz.</p>
      </ConfirmDialog>
    </Card>
  )
}
