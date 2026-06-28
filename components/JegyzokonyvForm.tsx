"use client"

import { useRef, useState } from "react"
import type { DamageReport } from "@prisma/client"
import { getInsuranceCompanyLabel } from "@/lib/validation"
import {
  EQUIPMENT_CHECKLIST_ITEMS,
  getDefaultEquipmentChecklist,
  type EquipmentItemDef,
} from "@/lib/equipment"
import SignaturePad, { type SignaturePadHandle } from "@/components/ui/SignaturePad"
import FormSection from "./ui/FormSection"
import Input from "./ui/Input"
import Textarea from "./ui/Textarea"
import Checkbox from "./ui/Checkbox"
import Card from "./ui/Card"
import Button from "./ui/Button"

interface JegyzokonyvFormProps {
  report: DamageReport
  token: string
}

type DamagePoint = { x: number; y: number; dx: number; dy: number; label: string }

function toLocalDateTimeInput(value: Date | null): string {
  if (!value) return ""
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Az ügyfél által megrajzolt sérülési pontok csak-olvasható, web-natív megjelenítése
function DamageDiagramView({ points }: { points: DamagePoint[] }) {
  if (!points || points.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Nincs jelölt sérülési pont</p>
  }
  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-xs border rounded-lg bg-white">
      <g transform="translate(111, 61) scale(3.8)" fill="#9ca3af" stroke="#6b7280" strokeWidth={0.2}>
        <path
          d="M29.395,0H17.636c-3.117,0-5.643,3.467-5.643,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759
          c3.116,0,5.644-2.527,5.644-5.644V6.584C35.037,3.467,32.511,0,29.395,0z M34.05,14.188v11.665l-2.729,0.351v-4.806
          L34.05,14.188z M32.618,10.773c-1.016,3.9-2.219,8.51-2.219,8.51H16.631l-2.222-8.51
          C14.41,10.773,23.293,7.755,32.618,10.773z M15.741,21.713v4.492l-2.73-0.349V14.502L15.741,21.713z
          M13.011,37.938V27.579l2.73,0.343v8.196L13.011,37.938z M14.568,40.882l2.218-3.336h13.771l2.219,3.336H14.568z
          M31.321,35.805v-7.872l2.729-0.355v10.048L31.321,35.805z"
        />
      </g>
      <text x={200} y={52} fontSize={12} fill="#6b7280" fontWeight="bold" textAnchor="middle">ELÖL</text>
      <text x={200} y={282} fontSize={12} fill="#6b7280" fontWeight="bold" textAnchor="middle">HÁTUL</text>
      {points.map((pt, i) => {
        const hasArrow = pt.dx !== 0 || pt.dy !== 0
        return (
          <g key={i}>
            {hasArrow ? (
              <>
                <line x1={pt.x} y1={pt.y} x2={pt.x + pt.dx} y2={pt.y + pt.dy} stroke="#ef4444" strokeWidth={2.5} />
                <circle cx={pt.x} cy={pt.y} r={5} fill="#ef4444" />
              </>
            ) : (
              <circle cx={pt.x} cy={pt.y} r={8} fill="#ef4444" />
            )}
            <text
              x={hasArrow ? pt.x - 8 : pt.x}
              y={hasArrow ? pt.y - 8 : pt.y + 4}
              textAnchor="middle"
              fontSize={9}
              fill={hasArrow ? "#ef4444" : "white"}
              fontWeight="bold"
            >
              {i + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// Egy felszereltségi tétel sora: checkbox + (típustól függően) db szám / típus szöveg / sebességfok
function EquipmentItemRow({
  def,
  value,
  onChange,
}: {
  def: EquipmentItemDef
  value: unknown
  onChange: (value: unknown) => void
}) {
  if (def.type === "boolean") {
    return (
      <Checkbox
        label={def.label}
        name={def.key}
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
    )
  }

  const v = (value as { checked?: boolean; count?: number; type?: string; value?: number }) ?? {}
  const checked = !!v.checked

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Checkbox
          label={def.label}
          name={def.key}
          checked={checked}
          onChange={(e) => onChange({ ...v, checked: e.target.checked })}
        />
      </div>
      {checked && def.type === "count" && (
        <input
          type="number"
          min={0}
          value={v.count ?? ""}
          onChange={(e) => onChange({ ...v, count: e.target.value })}
          placeholder="db"
          className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
        />
      )}
      {checked && def.type === "text" && (
        <input
          type="text"
          value={v.type ?? ""}
          onChange={(e) => onChange({ ...v, type: e.target.value })}
          placeholder="típus"
          className="w-32 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
        />
      )}
      {checked && def.type === "number" && (
        <input
          type="number"
          min={0}
          value={v.value ?? ""}
          onChange={(e) => onChange({ ...v, value: e.target.value })}
          placeholder={def.numberSuffix}
          className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
        />
      )}
    </div>
  )
}

export default function JegyzokonyvForm({ report, token }: JegyzokonyvFormProps) {
  const sigRef = useRef<SignaturePadHandle>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(report.status === "COMPLETED")
  const [currentStatus, setCurrentStatus] = useState(report.status)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [vehicleCheckIn, setVehicleCheckIn] = useState(toLocalDateTimeInput(report.vehicleCheckIn))
  const [vehicleCheckOut, setVehicleCheckOut] = useState(toLocalDateTimeInput(report.vehicleCheckOut))
  const [damageNotes, setDamageNotes] = useState(report.damageNotes ?? "")
  const [technicianName, setTechnicianName] = useState(report.technicianName ?? "")
  const [technicianSignatureUrl, setTechnicianSignatureUrl] = useState("")
  const [equipment, setEquipment] = useState<Record<string, unknown>>(
    (report.equipmentChecklist as Record<string, unknown> | null) ?? getDefaultEquipmentChecklist()
  )

  const updateEquipment = (key: string, value: unknown) => {
    setEquipment((prev) => ({ ...prev, [key]: value }))
  }

  const handleSignatureEnd = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return
    setTechnicianSignatureUrl(sigRef.current.toDataURL("image/png"))
  }

  const clearSignature = () => {
    sigRef.current?.clear()
    setTechnicianSignatureUrl("")
  }

  const damagePoints = (report.damagePoints as DamagePoint[] | null) ?? []
  const insurerLabel = getInsuranceCompanyLabel(report.insuranceCompany, report.insuranceCompanyOther)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)
    setErrors({})

    try {
      const response = await fetch(`/api/munkalap/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          vehicleCheckIn,
          vehicleCheckOut,
          equipmentChecklist: equipment,
          damageNotes,
          technicianName,
          technicianSignatureUrl,
        }),
      })

      const result = await response.json()

      if (response.status === 401) {
        throw new Error("A jegyzőkönyv link lejárt vagy érvénytelen.")
      }
      if (response.status === 409) {
        throw new Error(result.error || "A jegyzőkönyv már le van zárva.")
      }
      if (response.status === 400 && result.details) {
        const fieldErrors: Record<string, string> = {}
        for (const [key, messages] of Object.entries(result.details as Record<string, string[]>)) {
          if (messages?.[0]) fieldErrors[key] = messages[0]
        }
        setErrors(fieldErrors)
        throw new Error(result.error || "Érvénytelen adatok")
      }
      if (!response.ok && response.status !== 207) {
        throw new Error(result.error || "Sikertelen mentés")
      }
      if (response.status === 207) {
        setCurrentStatus("FAILED_PDF")
        throw new Error(result.error || "A dokumentumok kiküldése sikertelen volt.")
      }

      setSubmitSuccess(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Hiba történt a mentés során.")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = async () => {
    setIsRetrying(true)
    setSubmitError(null)

    try {
      const response = await fetch(`/api/munkalap/${report.id}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Az újrapróbálkozás sikertelen volt.")
      }

      setSubmitSuccess(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Hiba történt az újrapróbálkozás során.")
    } finally {
      setIsRetrying(false)
    }
  }

  if (submitSuccess) {
    return (
      <Card>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200 text-sm font-medium">
            ✓ A jegyzőkönyv lezárva, a végleges dokumentumok (Kárbejelentő, Meghatalmazás,
            Iratösszesítő, Jegyzőkönyv) kiküldve az ügyfélnek és a szerviznek.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start justify-between gap-4">
            <p className="text-red-800 dark:text-red-200 text-sm">{submitError}</p>
            {currentStatus === "FAILED_PDF" && (
              <Button type="button" variant="secondary" onClick={handleRetry} loading={isRetrying}>
                Újrapróbálás
              </Button>
            )}
          </div>
        )}

        {/* Ügyfél, baleset és kár adatai — csak olvasható, korábban rögzítve (DRY) */}
        <FormSection
          title="Ügyfél, baleset és kár adatai"
          description="Az ügyfél által korábban megadott, már rögzített adatok"
        >
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <p><strong>Tulajdonos:</strong> {report.ownerName}</p>
            <p><strong>Lakcím:</strong> {report.ownerAddress || "—"}</p>
            <p><strong>Rendszám:</strong> {report.vehiclePlate.toUpperCase()}</p>
            <p><strong>Jármű:</strong> {report.vehicleMake} {report.vehicleModel}</p>
            <p><strong>VIN:</strong> {report.vehicleVin}</p>
            <p><strong>Illetékes biztosító:</strong> {insurerLabel}</p>
            <p>
              <strong>Baleset időpontja:</strong>{" "}
              {report.accidentDate
                ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium" }).format(new Date(report.accidentDate))
                : "—"}
            </p>
            <p>
              <strong>Baleset helyszíne:</strong>{" "}
              {[report.accidentCountry, report.accidentCity, report.accidentStreet].filter(Boolean).join(", ") || "—"}
            </p>
            <p><strong>Rendőrség intézkedett:</strong> {report.policeInvolved ? "Igen" : "Nem"}</p>
            <p><strong>Kár leírása:</strong> {report.damageDescription}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sérülés helye és iránya</p>
            <DamageDiagramView points={damagePoints} />
          </div>
        </FormSection>

        <FormSection title="Átvétel / visszaadás" description="A gépjármű szervizben tartózkodásának ideje">
          <Input
            label="Átvétel időpontja"
            name="vehicleCheckIn"
            type="datetime-local"
            value={vehicleCheckIn}
            onChange={(e) => setVehicleCheckIn(e.target.value)}
            error={errors.vehicleCheckIn}
            required
          />
          <Input
            label="Visszaadás időpontja"
            name="vehicleCheckOut"
            type="datetime-local"
            value={vehicleCheckOut}
            onChange={(e) => setVehicleCheckOut(e.target.value)}
            error={errors.vehicleCheckOut}
            required
          />
        </FormSection>

        <FormSection title="A gépjármű felszereltsége" description="Jelölje be a gépjárműn található felszereléseket">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
            {EQUIPMENT_CHECKLIST_ITEMS.map((def) => (
              <EquipmentItemRow
                key={def.key}
                def={def}
                value={equipment[def.key]}
                onChange={(value) => updateEquipment(def.key, value)}
              />
            ))}
          </div>
        </FormSection>

        <FormSection title="Átvételkori állapot és lezárás">
          <Textarea
            label="Átvételkori állapot / megjegyzések"
            name="damageNotes"
            value={damageNotes}
            onChange={(e) => setDamageNotes(e.target.value)}
            error={errors.damageNotes}
            required
            placeholder="A gépjármű átvételkori állapotának rögzítése..."
            rows={4}
          />

          <Input
            label="Technikus (átvevő) neve"
            name="technicianName"
            value={technicianName}
            onChange={(e) => setTechnicianName(e.target.value)}
            error={errors.technicianName}
            required
          />

          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Technikus (átvevő) aláírása <span className="text-red-500">*</span>
            </p>
            <div className="border rounded-lg overflow-hidden bg-white">
              <SignaturePad ref={sigRef} height={160} onEnd={handleSignatureEnd} />
            </div>
            {errors.technicianSignatureUrl && (
              <p className="text-xs text-red-500 mt-1">{errors.technicianSignatureUrl}</p>
            )}
            <div className="mt-2">
              <Button variant="secondary" type="button" onClick={clearSignature}>
                Törlés
              </Button>
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={isSubmitting}>
            Jegyzőkönyv lezárása és dokumentumok kiküldése
          </Button>
        </div>
      </Card>
    </form>
  )
}
