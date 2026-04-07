"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { DamageReport } from "@prisma/client"
import FormSection from "./ui/FormSection"
import Input from "./ui/Input"
import Textarea from "./ui/Textarea"
import Checkbox from "./ui/Checkbox"
import Card from "./ui/Card"
import Button from "./ui/Button"

interface EditFormProps {
  report: DamageReport
  token: string
}

export default function EditForm({ report, token }: EditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form state inicializálása a report adatokkal
  const [formData, setFormData] = useState({
    // Step 1
    ownerName: report.ownerName,
    ownerAddress: report.ownerAddress ?? "",
    driverName: report.driverName ?? "",
    driverAddress: report.driverAddress ?? "",
    driverPhone: report.driverPhone ?? "",
    customerEmail: report.customerEmail,
    customerPhone: report.customerPhone ?? "",

    // Step 2
    vehiclePlate: report.vehiclePlate,
    vehicleMake: report.vehicleMake,
    vehicleModel: report.vehicleModel,
    vehicleYear: report.vehicleYear ?? undefined,
    vehicleVin: report.vehicleVin ?? "",
    hasCasco: report.hasCasco,
    cascoInsurer: report.cascoInsurer ?? "",
    liabilityInsurer: report.liabilityInsurer ?? "",
    relevantInsurer: report.relevantInsurer ?? "",

    // Step 3
    accidentDate: report.accidentDate?.toISOString().split("T")[0] ?? "",
    accidentCountry: report.accidentCountry ?? "",
    accidentCity: report.accidentCity ?? "",
    accidentStreet: report.accidentStreet ?? "",
    outsideSettlement: report.outsideSettlement,
    roadNumber: report.roadNumber ?? "",
    kilometerMark: report.kilometerMark ?? "",
    policeInvolved: report.policeInvolved,
    policeReportNo: report.policeReportNo ?? "",
    policeStation: report.policeStation ?? "",
    otherVehiclePlate: report.otherVehiclePlate ?? "",
    otherVehicleType: report.otherVehicleType ?? "",
    otherVehicleColor: report.otherVehicleColor ?? "",
    additionalParties: report.additionalParties ?? "",
    vehicleInspectionLocation: report.vehicleInspectionLocation ?? "",

    // Step 4
    damageDescription: report.damageDescription ?? "",
    damagePoints: report.damagePoints as any[] ?? [],

    // Step 5
    liableParty: (report.liableParty ?? "") as "own" | "other" | "both" | "",
    underInfluence: report.underInfluence,
    licenseValid: report.licenseValid,
    taxNumber: report.taxNumber ?? "",
    consentToPhotocopy: report.consentToPhotocopy,
    cascoClaimRequest: report.cascoClaimRequest,
    vehicleEncumbrance: report.vehicleEncumbrance,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      const response = await fetch("/api/edit", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: report.id,
          token,
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("A szerkesztési link lejárt vagy érvénytelen.")
        }
        throw new Error(data.error || "Sikertelen mentés")
      }

      // Sikeres mentés
      setSubmitSuccess(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      console.error("Szerkesztési hiba:", error)
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Hiba történt a mentés során. Kérjük próbálja újra."
      )
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        {/* Hibaüzenet */}
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{submitError}</p>
          </div>
        )}

        {/* Sikerüzenet */}
        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-sm font-medium">
              ✓ A módosítások sikeresen mentve!
            </p>
          </div>
        )}

        {/* 1. Személyes adatok */}
        <FormSection
          title="1. Személyes adatok"
          description="Tulajdonos és vezető adatai"
        >
          <Input
            label="Tulajdonos neve"
            name="ownerName"
            value={formData.ownerName}
            onChange={(e) => updateField("ownerName", e.target.value)}
            error={errors.ownerName}
            required
          />
          <Input
            label="Tulajdonos címe"
            name="ownerAddress"
            value={formData.ownerAddress}
            onChange={(e) => updateField("ownerAddress", e.target.value)}
            error={errors.ownerAddress}
          />
          <Input
            label="Vezető neve"
            name="driverName"
            value={formData.driverName}
            onChange={(e) => updateField("driverName", e.target.value)}
            error={errors.driverName}
          />
          <Input
            label="Vezető címe"
            name="driverAddress"
            value={formData.driverAddress}
            onChange={(e) => updateField("driverAddress", e.target.value)}
            error={errors.driverAddress}
          />
          <Input
            label="Vezető telefonszáma"
            name="driverPhone"
            type="tel"
            value={formData.driverPhone}
            onChange={(e) => updateField("driverPhone", e.target.value)}
            error={errors.driverPhone}
          />
          <Input
            label="E-mail cím"
            name="customerEmail"
            type="email"
            value={formData.customerEmail}
            onChange={(e) => updateField("customerEmail", e.target.value)}
            error={errors.customerEmail}
            required
          />
          <Input
            label="Telefonszám"
            name="customerPhone"
            type="tel"
            value={formData.customerPhone}
            onChange={(e) => updateField("customerPhone", e.target.value)}
            error={errors.customerPhone}
          />
        </FormSection>

        {/* 2. Jármű és biztosítás */}
        <FormSection
          title="2. Jármű és biztosítási adatok"
          description="Gépjármű azonosítása és biztosítás"
        >
          <Input
            label="Rendszám"
            name="vehiclePlate"
            value={formData.vehiclePlate}
            onChange={(e) => updateField("vehiclePlate", e.target.value.toUpperCase())}
            error={errors.vehiclePlate}
            required
          />
          <Input
            label="Gyártmány"
            name="vehicleMake"
            value={formData.vehicleMake}
            onChange={(e) => updateField("vehicleMake", e.target.value)}
            error={errors.vehicleMake}
            required
          />
          <Input
            label="Típus"
            name="vehicleModel"
            value={formData.vehicleModel}
            onChange={(e) => updateField("vehicleModel", e.target.value)}
            error={errors.vehicleModel}
            required
          />
          <Input
            label="Évjárat"
            name="vehicleYear"
            type="number"
            value={formData.vehicleYear?.toString() ?? ""}
            onChange={(e) =>
              updateField("vehicleYear", e.target.value ? parseInt(e.target.value) : undefined)
            }
            error={errors.vehicleYear}
          />
          <Input
            label="Alvázszám"
            name="vehicleVin"
            value={formData.vehicleVin}
            onChange={(e) => updateField("vehicleVin", e.target.value.toUpperCase())}
            error={errors.vehicleVin}
          />
          <Checkbox
            label="Van CASCO biztosítás"
            name="hasCasco"
            checked={formData.hasCasco}
            onChange={(e) => updateField("hasCasco", e.target.checked)}
          />
          {formData.hasCasco && (
            <Input
              label="CASCO biztosító neve"
              name="cascoInsurer"
              value={formData.cascoInsurer}
              onChange={(e) => updateField("cascoInsurer", e.target.value)}
              error={errors.cascoInsurer}
            />
          )}
          <Input
            label="Kötelező biztosító neve"
            name="liabilityInsurer"
            value={formData.liabilityInsurer}
            onChange={(e) => updateField("liabilityInsurer", e.target.value)}
            error={errors.liabilityInsurer}
          />
          <Input
            label="Releváns biztosító"
            name="relevantInsurer"
            value={formData.relevantInsurer}
            onChange={(e) => updateField("relevantInsurer", e.target.value)}
            error={errors.relevantInsurer}
          />
        </FormSection>

        {/* 3. Baleset körülményei */}
        <FormSection
          title="3. Baleset körülményei"
          description="Hol, mikor, hogyan történt a baleset"
        >
          <Input
            label="Baleset dátuma"
            name="accidentDate"
            type="date"
            value={formData.accidentDate}
            onChange={(e) => updateField("accidentDate", e.target.value)}
            error={errors.accidentDate}
          />
          <Input
            label="Ország"
            name="accidentCountry"
            value={formData.accidentCountry}
            onChange={(e) => updateField("accidentCountry", e.target.value)}
            error={errors.accidentCountry}
          />
          <Input
            label="Város"
            name="accidentCity"
            value={formData.accidentCity}
            onChange={(e) => updateField("accidentCity", e.target.value)}
            error={errors.accidentCity}
          />
          <Input
            label="Utca, házszám"
            name="accidentStreet"
            value={formData.accidentStreet}
            onChange={(e) => updateField("accidentStreet", e.target.value)}
            error={errors.accidentStreet}
          />
          <Checkbox
            label="Településen kívül történt"
            name="outsideSettlement"
            checked={formData.outsideSettlement}
            onChange={(e) => updateField("outsideSettlement", e.target.checked)}
          />
          {formData.outsideSettlement && (
            <>
              <Input
                label="Útszám"
                name="roadNumber"
                value={formData.roadNumber}
                onChange={(e) => updateField("roadNumber", e.target.value)}
                error={errors.roadNumber}
              />
              <Input
                label="Kilométer-szelvény"
                name="kilometerMark"
                value={formData.kilometerMark}
                onChange={(e) => updateField("kilometerMark", e.target.value)}
                error={errors.kilometerMark}
              />
            </>
          )}
          <Checkbox
            label="Rendőrség részvétele"
            name="policeInvolved"
            checked={formData.policeInvolved}
            onChange={(e) => updateField("policeInvolved", e.target.checked)}
          />
          {formData.policeInvolved && (
            <>
              <Input
                label="Jegyzőkönyv száma"
                name="policeReportNo"
                value={formData.policeReportNo}
                onChange={(e) => updateField("policeReportNo", e.target.value)}
                error={errors.policeReportNo}
              />
              <Input
                label="Rendőrség megnevezése"
                name="policeStation"
                value={formData.policeStation}
                onChange={(e) => updateField("policeStation", e.target.value)}
                error={errors.policeStation}
              />
            </>
          )}
          <Input
            label="Másik jármű rendszáma"
            name="otherVehiclePlate"
            value={formData.otherVehiclePlate}
            onChange={(e) => updateField("otherVehiclePlate", e.target.value.toUpperCase())}
            error={errors.otherVehiclePlate}
          />
          <Input
            label="Másik jármű típusa"
            name="otherVehicleType"
            value={formData.otherVehicleType}
            onChange={(e) => updateField("otherVehicleType", e.target.value)}
            error={errors.otherVehicleType}
          />
          <Input
            label="Másik jármű színe"
            name="otherVehicleColor"
            value={formData.otherVehicleColor}
            onChange={(e) => updateField("otherVehicleColor", e.target.value)}
            error={errors.otherVehicleColor}
          />
          <Textarea
            label="További érintettek"
            name="additionalParties"
            value={formData.additionalParties}
            onChange={(e) => updateField("additionalParties", e.target.value)}
            error={errors.additionalParties}
            rows={3}
          />
          <Input
            label="Szemle helyszíne"
            name="vehicleInspectionLocation"
            value={formData.vehicleInspectionLocation}
            onChange={(e) => updateField("vehicleInspectionLocation", e.target.value)}
            error={errors.vehicleInspectionLocation}
          />
        </FormSection>

        {/* 4. Kár leírása */}
        <FormSection
          title="4. Kár leírása"
          description="A sérülések és károk részletes leírása"
        >
          <Textarea
            label="Kár leírása"
            name="damageDescription"
            value={formData.damageDescription}
            onChange={(e) => updateField("damageDescription", e.target.value)}
            error={errors.damageDescription}
            required
            rows={6}
          />

          {/* Readonly mezők jelzése */}
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <strong>Csak olvasható mezők:</strong>
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-500 space-y-1 list-disc list-inside">
              <li>Feltöltött fotók ({report.photoUrls?.length ?? 0} db)</li>
              <li>Kárvázlat pontok ({(report.damagePoints as any[])?.length ?? 0} db)</li>
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
              A fotók és a kárvázlat nem szerkeszthetők. Ha módosítani szeretné őket, lépjen
              kapcsolatba munkatársunkkal.
            </p>
          </div>
        </FormSection>

        {/* 5. Nyilatkozatok */}
        <FormSection
          title="5. Nyilatkozatok és felelősség"
          description="Jogi és biztosítási adatok"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Felelős fél <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="liableParty"
                  value="own"
                  checked={formData.liableParty === "own"}
                  onChange={(e) => updateField("liableParty", e.target.value)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Saját felelősség
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="liableParty"
                  value="other"
                  checked={formData.liableParty === "other"}
                  onChange={(e) => updateField("liableParty", e.target.value)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Másik fél felelőssége
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="liableParty"
                  value="both"
                  checked={formData.liableParty === "both"}
                  onChange={(e) => updateField("liableParty", e.target.value)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Mindkét fél felelőssége
                </span>
              </label>
            </div>
            {errors.liableParty && (
              <p className="text-xs text-red-500">{errors.liableParty}</p>
            )}
          </div>

          <Checkbox
            label="A baleset alkohol vagy kábítószer befolyása alatt történt"
            name="underInfluence"
            checked={formData.underInfluence}
            onChange={(e) => updateField("underInfluence", e.target.checked)}
          />
          <Checkbox
            label="A vezető jogosítványa érvényes volt"
            name="licenseValid"
            checked={formData.licenseValid}
            onChange={(e) => updateField("licenseValid", e.target.checked)}
          />
          <Input
            label="Adószám (ha van)"
            name="taxNumber"
            value={formData.taxNumber}
            onChange={(e) => updateField("taxNumber", e.target.value)}
            error={errors.taxNumber}
          />
          <Checkbox
            label="Hozzájárulok a dokumentumok fotómásolásához"
            name="consentToPhotocopy"
            checked={formData.consentToPhotocopy}
            onChange={(e) => updateField("consentToPhotocopy", e.target.checked)}
          />
          <Checkbox
            label="CASCO kárigényt kérek"
            name="cascoClaimRequest"
            checked={formData.cascoClaimRequest}
            onChange={(e) => updateField("cascoClaimRequest", e.target.checked)}
          />
          <Checkbox
            label="A jármű terhekkel (lízing, zálog) terhelt"
            name="vehicleEncumbrance"
            checked={formData.vehicleEncumbrance}
            onChange={(e) => updateField("vehicleEncumbrance", e.target.checked)}
          />
        </FormSection>

        {/* 6. Aláírások (readonly) */}
        <FormSection
          title="6. Aláírások és adatkezelés"
          description="Az eredeti beküldéskor rögzített adatok"
        >
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <strong>Csak olvasható mezők:</strong>
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-500 space-y-1 list-disc list-inside">
              <li>
                Tulajdonos aláírása:{" "}
                {report.ownerSignatureUrl ? "Rögzítve ✓" : "Nincs"}
              </li>
              <li>
                Vezető aláírása:{" "}
                {report.driverSignatureUrl ? "Rögzítve ✓" : "Nincs"}
              </li>
              <li>GDPR hozzájárulás: {report.gdprConsent ? "Igen ✓" : "Nem"}</li>
              <li>
                Beküldés időpontja:{" "}
                {new Intl.DateTimeFormat("hu-HU", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(report.createdAt))}
              </li>
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
              Az aláírások és a GDPR hozzájárulás nem módosítható.
            </p>
          </div>
        </FormSection>

        {/* Submit gomb */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/")}
          >
            Mégse
          </Button>

          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Mentés..." : "Módosítások mentése"}
          </Button>
        </div>
      </Card>
    </form>
  )
}
