"use client"

import { useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { DamageReport } from "@prisma/client"
import {
  WORK_TYPES,
  WORK_TYPE_LABELS,
  MATERIALS_USED,
  MATERIAL_USED_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  INSURANCE_COMPANY_LABELS,
} from "@/lib/validation"
import type { SignaturePadHandle } from "@/components/ui/SignaturePad"
import FormSection from "./ui/FormSection"
import Input from "./ui/Input"
import Textarea from "./ui/Textarea"
import Checkbox from "./ui/Checkbox"
import RadioGroup from "./ui/RadioGroup"
import Card from "./ui/Card"
import Button from "./ui/Button"

const SignaturePad = dynamic(() => import("@/components/ui/SignaturePad"), { ssr: false })

interface MunkalapFormProps {
  report: DamageReport
  token: string
}

function toLocalDateTimeInput(value: Date | null): string {
  if (!value) return ""
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function MunkalapForm({ report, token }: MunkalapFormProps) {
  const sigRef = useRef<SignaturePadHandle>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(report.status === "COMPLETED")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    vehicleCheckIn: toLocalDateTimeInput(report.vehicleCheckIn),
    vehicleCheckOut: toLocalDateTimeInput(report.vehicleCheckOut),
    mileage: report.mileage?.toString() ?? "",
    workType: report.workType as string[],
    eurocode: report.eurocode ?? "",
    materialsUsed: report.materialsUsed as string[],
    materialCost: report.materialCost?.toString() ?? "",
    laborCost: report.laborCost?.toString() ?? "",
    paymentMethod: report.paymentMethod ?? "",
    damageNotes: report.damageNotes ?? "",
    technicianName: report.technicianName ?? "",
    technicianSignatureUrl: "",
  })

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const toggleListValue = (field: "workType" | "materialsUsed", value: string) => {
    setFormData((prev) => {
      const current = prev[field]
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [field]: next }
    })
  }

  const handleSignatureEnd = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return
    updateField("technicianSignatureUrl", sigRef.current.toDataURL("image/png"))
  }

  const clearSignature = () => {
    sigRef.current?.clear()
    updateField("technicianSignatureUrl", "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)
    setErrors({})

    try {
      const response = await fetch(`/api/munkalap/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...formData }),
      })

      const result = await response.json()

      if (response.status === 401) {
        throw new Error("A munkalap link lejárt vagy érvénytelen.")
      }
      if (response.status === 409) {
        throw new Error(result.error || "A munkalap már le van zárva.")
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
        // Munkalap adatok elmentve, de a PDF/email pipeline elhasalt — újrapróbálható
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
            ✓ A munkalap lezárva, a végleges dokumentumok (Kárbejelentő, Meghatalmazás,
            Iratösszesítő, Munkalap) kiküldve az ügyfélnek és a szerviznek.
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
            {report.status === "FAILED_PDF" && (
              <Button type="button" variant="secondary" onClick={handleRetry} loading={isRetrying}>
                Újrapróbálás
              </Button>
            )}
          </div>
        )}

        {/* Ügyfél által már megadott adatok — csak olvasható összefoglaló (DRY) */}
        <FormSection
          title="Ügyfél és jármű adatai"
          description="Az ügyfél által korábban megadott, már rögzített adatok"
        >
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <p><strong>Tulajdonos:</strong> {report.ownerName}</p>
            <p><strong>Rendszám:</strong> {report.vehiclePlate.toUpperCase()}</p>
            <p><strong>Jármű:</strong> {report.vehicleMake} {report.vehicleModel}</p>
            <p><strong>VIN:</strong> {report.vehicleVin}</p>
            <p>
              <strong>Illetékes biztosító:</strong>{" "}
              {report.insuranceCompany ? INSURANCE_COMPANY_LABELS[report.insuranceCompany] : "—"}
            </p>
            <p><strong>Kár leírása:</strong> {report.damageDescription}</p>
          </div>
        </FormSection>

        <FormSection title="Átvétel / visszaadás" description="A gépjármű szervizben tartózkodásának ideje">
          <Input
            label="Átvétel időpontja"
            name="vehicleCheckIn"
            type="datetime-local"
            value={formData.vehicleCheckIn}
            onChange={(e) => updateField("vehicleCheckIn", e.target.value)}
            error={errors.vehicleCheckIn}
            required
          />
          <Input
            label="Visszaadás időpontja"
            name="vehicleCheckOut"
            type="datetime-local"
            value={formData.vehicleCheckOut}
            onChange={(e) => updateField("vehicleCheckOut", e.target.value)}
            error={errors.vehicleCheckOut}
            required
          />
          <Input
            label="Km óraállás"
            name="mileage"
            type="number"
            value={formData.mileage}
            onChange={(e) => updateField("mileage", e.target.value)}
            error={errors.mileage}
            required
            placeholder="pl. 84210"
          />
        </FormSection>

        <FormSection title="Elvégzett munka" description="Munkatípus, eurocode és felhasznált anyagok">
          <Input
            label="Eurocode"
            name="eurocode"
            value={formData.eurocode}
            onChange={(e) => updateField("eurocode", e.target.value)}
            error={errors.eurocode}
            required
            placeholder="pl. 2286AGNFRP6M"
          />

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Munkatípus(ok) <span className="text-red-500">*</span>
            </p>
            <div className="space-y-1">
              {WORK_TYPES.map((wt) => (
                <Checkbox
                  key={wt}
                  label={WORK_TYPE_LABELS[wt]}
                  name={`workType-${wt}`}
                  checked={formData.workType.includes(wt)}
                  onChange={() => toggleListValue("workType", wt)}
                />
              ))}
            </div>
            {errors.workType && <p className="text-xs text-red-500 mt-1">{errors.workType}</p>}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Felhasznált anyagok</p>
            <div className="space-y-1">
              {MATERIALS_USED.map((m) => (
                <Checkbox
                  key={m}
                  label={MATERIAL_USED_LABELS[m]}
                  name={`material-${m}`}
                  checked={formData.materialsUsed.includes(m)}
                  onChange={() => toggleListValue("materialsUsed", m)}
                />
              ))}
            </div>
          </div>

          <Textarea
            label="Átvételkori állapot / megjegyzések"
            name="damageNotes"
            value={formData.damageNotes}
            onChange={(e) => updateField("damageNotes", e.target.value)}
            error={errors.damageNotes}
            required
            placeholder="A gépjármű átvételkori állapotának rögzítése..."
            rows={4}
          />
        </FormSection>

        <FormSection title="Költségek és fizetés">
          <Input
            label="Anyagköltség (Ft)"
            name="materialCost"
            type="number"
            value={formData.materialCost}
            onChange={(e) => updateField("materialCost", e.target.value)}
            error={errors.materialCost}
            required
          />
          <Input
            label="Munkadíj (Ft)"
            name="laborCost"
            type="number"
            value={formData.laborCost}
            onChange={(e) => updateField("laborCost", e.target.value)}
            error={errors.laborCost}
            required
          />
          <RadioGroup
            label="Fizetési mód"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={(val) => updateField("paymentMethod", val)}
            options={PAYMENT_METHODS.map((pm) => ({ value: pm, label: PAYMENT_METHOD_LABELS[pm] }))}
            error={errors.paymentMethod}
          />
        </FormSection>

        <FormSection title="Lezárás és aláírások">
          <Input
            label="Technikus (átvevő) neve"
            name="technicianName"
            value={formData.technicianName}
            onChange={(e) => updateField("technicianName", e.target.value)}
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
            Munkalap lezárása és dokumentumok kiküldése
          </Button>
        </div>
      </Card>
    </form>
  )
}
