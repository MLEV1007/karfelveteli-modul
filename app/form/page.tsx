"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import StepIndicator from "@/components/FormSteps/StepIndicator"
import Step1PersonalData, {
  step1Schema,
  type Step1Data,
} from "@/components/FormSteps/Step1PersonalData"
import Step2VehicleInsurance, {
  step2Schema,
  type Step2Data,
} from "@/components/FormSteps/Step2VehicleInsurance"
import Step3AccidentDetails, {
  step3Schema,
  type Step3Data,
} from "@/components/FormSteps/Step3AccidentDetails"
import Step4DamageAndPhotos, {
  step4Schema,
  type Step4Data,
} from "@/components/FormSteps/Step4DamageAndPhotos"
import Step5Declarations, {
  step5Schema,
  type Step5Data,
} from "@/components/FormSteps/Step5Declarations"
import dynamic from "next/dynamic"
import {
  step6Schema,
  type Step6Data,
} from "@/components/FormSteps/Step6Signature"
const Step6Signature = dynamic(
  () => import("@/components/FormSteps/Step6Signature"),
  { ssr: false }
)
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"

const STEP_LABELS = [
  "Személyes adatok",
  "Jármű és biztosítás",
  "Baleset körülményei",
  "Kár és sérülés",
  "Nyilatkozatok",
  "Aláírás",
]

type FormData = Step1Data & Step2Data & Step3Data & Step4Data & Step5Data & Step6Data

const initialData: FormData = {
  // Step 1
  ownerName: "",
  ownerAddress: "",
  driverName: "",
  driverAddress: "",
  driverPhone: "",
  customerEmail: "",
  customerPhone: "",
  // Step 2
  vehiclePlate: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: undefined,
  vehicleVin: "",
  hasCasco: false,
  cascoInsurer: "",
  liabilityInsurer: "",
  relevantInsurer: "",
  // Step 3
  accidentDate: "",
  accidentCountry: "Magyarország",
  accidentCity: "",
  accidentStreet: "",
  outsideSettlement: false,
  roadNumber: "",
  kilometerMark: "",
  policeInvolved: false,
  policeReportNo: "",
  policeStation: "",
  otherVehiclePlate: "",
  otherVehicleType: "",
  otherVehicleColor: "",
  additionalParties: "",
  vehicleInspectionLocation: "",
  // Step 4
  damageDescription: "",
  damagePoints: [],
  photoUrls: [],
  // Step 5
  liableParty: "",
  underInfluence: false,
  licenseValid: true,
  taxNumber: "",
  consentToPhotocopy: false,
  cascoClaimRequest: false,
  vehicleEncumbrance: false,
  // Step 6
  ownerSignatureUrl: "",
  driverSignatureUrl: "",
  gdprConsent: false,
}

export default function FormPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

  const validateStep = (): boolean => {
    let schema
    let data: unknown

    if (currentStep === 1) {
      schema = step1Schema
      data = {
        ownerName: formData.ownerName,
        ownerAddress: formData.ownerAddress,
        driverName: formData.driverName,
        driverAddress: formData.driverAddress,
        driverPhone: formData.driverPhone,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
      }
    } else if (currentStep === 2) {
      schema = step2Schema
      data = {
        vehiclePlate: formData.vehiclePlate,
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        vehicleYear: formData.vehicleYear,
        vehicleVin: formData.vehicleVin,
        hasCasco: formData.hasCasco,
        cascoInsurer: formData.cascoInsurer,
        liabilityInsurer: formData.liabilityInsurer,
        relevantInsurer: formData.relevantInsurer,
      }
    } else if (currentStep === 3) {
      schema = step3Schema
      data = {
        accidentDate: formData.accidentDate,
        accidentCountry: formData.accidentCountry,
        accidentCity: formData.accidentCity,
        accidentStreet: formData.accidentStreet,
        outsideSettlement: formData.outsideSettlement,
        roadNumber: formData.roadNumber,
        kilometerMark: formData.kilometerMark,
        policeInvolved: formData.policeInvolved,
        policeReportNo: formData.policeReportNo,
        policeStation: formData.policeStation,
        otherVehiclePlate: formData.otherVehiclePlate,
        otherVehicleType: formData.otherVehicleType,
        otherVehicleColor: formData.otherVehicleColor,
        additionalParties: formData.additionalParties,
        vehicleInspectionLocation: formData.vehicleInspectionLocation,
      }
    } else if (currentStep === 4) {
      schema = step4Schema
      data = {
        damageDescription: formData.damageDescription,
        damagePoints: formData.damagePoints,
        photoUrls: formData.photoUrls,
      }
    } else if (currentStep === 5) {
      schema = step5Schema
      data = {
        liableParty: formData.liableParty,
        underInfluence: formData.underInfluence,
        licenseValid: formData.licenseValid,
        taxNumber: formData.taxNumber,
        consentToPhotocopy: formData.consentToPhotocopy,
        cascoClaimRequest: formData.cascoClaimRequest,
        vehicleEncumbrance: formData.vehicleEncumbrance,
      }
    } else if (currentStep === 6) {
      schema = step6Schema
      data = {
        ownerSignatureUrl: formData.ownerSignatureUrl,
        driverSignatureUrl: formData.driverSignatureUrl || undefined,
        gdprConsent: formData.gdprConsent,
      }
    } else {
      return true
    }

    const result = schema.safeParse(data)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        const key = err.path[0] as string
        if (key) fieldErrors[key] = err.message
      })
      setErrors(fieldErrors)
      return false
    }

    setErrors({})
    return true
  }

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((s) => Math.min(s + 1, 6))
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleBack = () => {
    setErrors({})
    setCurrentStep((s) => Math.max(s - 1, 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSubmit = async () => {
    if (!validateStep()) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Sikertelen beküldés")
      }

      // Sikeres beküldés - átirányítás success oldalra
      router.push("/success")
    } catch (error) {
      console.error("Beküldési hiba:", error)
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Hiba történt a beküldés során. Kérjük próbálja újra."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1PersonalData
            data={{
              ownerName: formData.ownerName,
              ownerAddress: formData.ownerAddress,
              driverName: formData.driverName,
              driverAddress: formData.driverAddress,
              driverPhone: formData.driverPhone,
              customerEmail: formData.customerEmail,
              customerPhone: formData.customerPhone,
            }}
            onChange={(field, value) => updateField(field, value)}
            errors={errors}
          />
        )
      case 2:
        return (
          <Step2VehicleInsurance
            data={{
              vehiclePlate: formData.vehiclePlate,
              vehicleMake: formData.vehicleMake,
              vehicleModel: formData.vehicleModel,
              vehicleYear: formData.vehicleYear,
              vehicleVin: formData.vehicleVin,
              hasCasco: formData.hasCasco,
              cascoInsurer: formData.cascoInsurer,
              liabilityInsurer: formData.liabilityInsurer,
              relevantInsurer: formData.relevantInsurer,
            }}
            onChange={(field, value) => updateField(field, value)}
            errors={errors}
          />
        )
      case 3:
        return (
          <Step3AccidentDetails
            data={{
              accidentDate: formData.accidentDate,
              accidentCountry: formData.accidentCountry,
              accidentCity: formData.accidentCity,
              accidentStreet: formData.accidentStreet,
              outsideSettlement: formData.outsideSettlement,
              roadNumber: formData.roadNumber,
              kilometerMark: formData.kilometerMark,
              policeInvolved: formData.policeInvolved,
              policeReportNo: formData.policeReportNo,
              policeStation: formData.policeStation,
              otherVehiclePlate: formData.otherVehiclePlate,
              otherVehicleType: formData.otherVehicleType,
              otherVehicleColor: formData.otherVehicleColor,
              additionalParties: formData.additionalParties,
              vehicleInspectionLocation: formData.vehicleInspectionLocation,
            }}
            onChange={(field, value) => updateField(field, value)}
            errors={errors}
          />
        )
      case 4:
        return (
          <Step4DamageAndPhotos
            data={{
              damageDescription: formData.damageDescription,
              damagePoints: formData.damagePoints,
              photoUrls: formData.photoUrls,
            }}
            onChange={(field, value) => updateField(field, value)}
            errors={errors}
          />
        )
      case 5:
        return (
          <Step5Declarations
            data={{
              liableParty: formData.liableParty,
              underInfluence: formData.underInfluence,
              licenseValid: formData.licenseValid,
              taxNumber: formData.taxNumber,
              consentToPhotocopy: formData.consentToPhotocopy,
              cascoClaimRequest: formData.cascoClaimRequest,
              vehicleEncumbrance: formData.vehicleEncumbrance,
            }}
            onChange={(field, value) => updateField(field, value)}
            errors={errors}
          />
        )
      case 6:
        return (
          <Step6Signature
            data={{
              ownerSignatureUrl: formData.ownerSignatureUrl,
              driverSignatureUrl: formData.driverSignatureUrl,
              gdprConsent: formData.gdprConsent,
            }}
            onChange={(field, value) => updateField(field, value)}
            errors={errors}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
          Digitális Kárfelvételi Űrlap
        </h1>

        <StepIndicator currentStep={currentStep} steps={STEP_LABELS} />

        <Card>
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm">{submitError}</p>
            </div>
          )}

          {renderStep()}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              Vissza
            </Button>

            {currentStep < 6 && (
              <Button variant="primary" onClick={handleNext}>
                Tovább
              </Button>
            )}
          </div>
        </Card>
      </div>
    </main>
  )
}
