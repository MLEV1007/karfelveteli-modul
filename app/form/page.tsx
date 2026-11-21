"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
import Step6Authorization, {
  authorizationSchema,
  type AuthorizationData,
} from "@/components/FormSteps/Step6Authorization"
import dynamic from "next/dynamic"
import {
  step6Schema as signatureSchema,
  type Step6Data as SignatureData,
} from "@/components/FormSteps/Step6Signature"
const Step7Signature = dynamic(
  () => import("@/components/FormSteps/Step6Signature"),
  { ssr: false }
)
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import { logClientEvent } from "@/lib/clientLog"
import { clearDraft, generateClientRequestId, loadDraft, saveDraft, type DraftState } from "@/lib/draft"

// A beküldés időkorlátja: ennyi után megszakítjuk a kérést, és "Újrapróbálás" gombot mutatunk.
// Az újrapróbálás ugyanazzal a clientRequestId-val megy, így nem jön létre duplikátum.
const SUBMIT_TIMEOUT_MS = 60_000
const DRAFT_SAVE_DEBOUNCE_MS = 250

const STEP_LABELS = [
  "Személyes adatok",
  "Jármű és biztosítás",
  "Baleset körülményei",
  "Kár és sérülés",
  "Nyilatkozatok",
  "Meghatalmazás",
  "Aláírás",
]

const TOTAL_STEPS = STEP_LABELS.length

type FormData = Step1Data &
  Step2Data &
  Step3Data &
  Step4Data &
  Step5Data &
  AuthorizationData &
  SignatureData

const initialData: FormData = {
  // Step 1
  ownerType: "",
  ownerName: "",
  ownerAddress: "",
  idOrTaxNumber: "",
  driverName: "",
  driverAddress: "",
  driverPhone: "",
  driverBirthDate: "",
  driverLicenseNumber: "",
  driverLicenseValidUntil: "",
  driverSameAsOwner: false,
  customerEmail: "",
  customerPhone: "",
  // Step 2
  vehiclePlate: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: undefined,
  vehicleVin: "",
  vehicleRegistrationDate: "",
  vehicleInspectionValidUntil: "",
  vehicleEngineCapacity: undefined,
  vehiclePowerKw: undefined,
  vehicleColor: "",
  liableParty: "",
  hasCasco: false,
  cascoInsurer: "",
  liabilityInsurer: "",
  relevantInsurer: "",
  insuranceCompany: "",
  insuranceCompanyOther: "",
  // Step 3
  accidentDate: "",
  accidentCountry: "Magyarország",
  accidentCity: "",
  accidentStreet: "",
  outsideSettlement: false,
  roadNumber: "",
  kilometerMark: "",
  policeInvolved: false,
  policeStation: "",
  otherVehiclePlate: "",
  otherVehicleType: "",
  otherVehicleColor: "",
  additionalParties: "",
  vehicleInspectionLocation: "",
  // Step 4
  damageType: "",
  windshieldCause: "",
  windshieldCauseOther: "",
  damageDescription: "",
  damagePoints: [],
  photoUrls: [],
  // Step 5
  underInfluence: false,
  licenseValid: true,
  vatReclaimEligible: null,
  taxNumber: "",
  consentToPhotocopy: false,
  cascoClaimRequest: false,
  vehicleEncumbrance: false,
  encumbranceFinancier: "",
  // Step 6 — Meghatalmazás
  accept8DayPayment: false,
  knowsCascoTerms: false,
  // Step 7 — Aláírás
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
  const [canRetry, setCanRetry] = useState(false)
  // A piszkozat betöltése után (hydration-hibák elkerülésére csak kliensen, effectben) true
  const [draftLoaded, setDraftLoaded] = useState(false)
  // Talált, még érvényes piszkozat: a felhasználó dönt, hogy folytatja-e (közös eszközön
  // ne töltődjön be automatikusan az előző ügyfél adata)
  const [pendingDraft, setPendingDraft] = useState<DraftState | null>(null)
  // Idempotencia-kulcs: egyszer generáljuk, a piszkozattal együtt megmarad, és minden
  // újrapróbálásnál ugyanazt küldjük.
  const clientRequestIdRef = useRef("")
  const submittingRef = useRef(false)
  const submittedRef = useRef(false)
  const latestDraftRef = useRef({ step: 1, formData: initialData })
  const storageErrorLoggedRef = useRef(false)

  // Piszkozat keresése (sessionStorage) — egyszer, mountkor. Ha van érvényes, megkérdezzük.
  useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      setPendingDraft(draft)
      return
    }
    clientRequestIdRef.current = generateClientRequestId()
    setDraftLoaded(true)
  }, [])

  const resumeDraft = () => {
    if (!pendingDraft) return
    setFormData({ ...initialData, ...(pendingDraft.formData as Partial<FormData>) })
    setCurrentStep(Math.min(Math.max(pendingDraft.step, 1), TOTAL_STEPS))
    clientRequestIdRef.current = pendingDraft.clientRequestId || generateClientRequestId()
    setPendingDraft(null)
    setDraftLoaded(true)
  }

  const discardDraft = () => {
    clearDraft()
    clientRequestIdRef.current = generateClientRequestId()
    setPendingDraft(null)
    setDraftLoaded(true)
  }

  // Piszkozat mentése a sikeres beküldésig (kis késleltetéssel, és oldalelhagyáskor azonnal)
  const persistDraft = useCallback(() => {
    if (submittedRef.current || !clientRequestIdRef.current) return
    const result = saveDraft({
      step: latestDraftRef.current.step,
      clientRequestId: clientRequestIdRef.current,
      formData: latestDraftRef.current.formData as unknown as Record<string, unknown>,
    })
    if (result !== "ok" && !storageErrorLoggedRef.current) {
      storageErrorLoggedRef.current = true
      logClientEvent("draft_storage_error", { errorCode: result.toUpperCase() })
    }
  }, [])

  useEffect(() => {
    if (!draftLoaded) return
    latestDraftRef.current = { step: currentStep, formData }
    const timer = setTimeout(persistDraft, DRAFT_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [formData, currentStep, draftLoaded, persistDraft])

  useEffect(() => {
    if (!draftLoaded) return
    const flush = () => persistDraft()
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", flush)
    return () => {
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", flush)
    }
  }, [draftLoaded, persistDraft])

  // Lépésváltás után görgetünk a lap tetejére — useEffect-ben, a currentStep-re
  // kulcsolva, hogy a görgetés a következő lépés TÉNYLEGES (már kirenderelt és
  // lemért magasságú) tartalmára fusson, ne a még előző lépést mutató DOM-ra.
  // (Ha ezt a handleNext/handleBack-ben azonnal a setCurrentStep után hívnánk,
  // a görgetés a régi, rövidebb tartalomhoz képest indulna el, és — főleg
  // mobilon, a virtuális billentyűzet bezáródásával egy időben — a lap alján
  // landolhat a 4. lépésnél, ami jóval magasabb a többinél.)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentStep])

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
        ownerType: formData.ownerType,
        ownerName: formData.ownerName,
        ownerAddress: formData.ownerAddress,
        idOrTaxNumber: formData.idOrTaxNumber,
        driverName: formData.driverName,
        driverAddress: formData.driverAddress,
        driverPhone: formData.driverPhone,
        driverBirthDate: formData.driverBirthDate,
        driverLicenseNumber: formData.driverLicenseNumber,
        driverLicenseValidUntil: formData.driverLicenseValidUntil,
        driverSameAsOwner: formData.driverSameAsOwner,
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
        vehicleRegistrationDate: formData.vehicleRegistrationDate,
        vehicleInspectionValidUntil: formData.vehicleInspectionValidUntil,
        vehicleEngineCapacity: formData.vehicleEngineCapacity,
        vehiclePowerKw: formData.vehiclePowerKw,
        vehicleColor: formData.vehicleColor,
        liableParty: formData.liableParty,
        hasCasco: formData.hasCasco,
        cascoInsurer: formData.cascoInsurer,
        liabilityInsurer: formData.liabilityInsurer,
        relevantInsurer: formData.relevantInsurer,
        insuranceCompany: formData.insuranceCompany,
        insuranceCompanyOther: formData.insuranceCompanyOther,
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
        damageType: formData.damageType,
        windshieldCause: formData.windshieldCause,
        windshieldCauseOther: formData.windshieldCauseOther,
        damageDescription: formData.damageDescription,
        damagePoints: formData.damagePoints,
        photoUrls: formData.photoUrls,
      }
    } else if (currentStep === 5) {
      schema = step5Schema
      data = {
        underInfluence: formData.underInfluence,
        licenseValid: formData.licenseValid,
        vatReclaimEligible: formData.vatReclaimEligible,
        taxNumber: formData.taxNumber,
        consentToPhotocopy: formData.consentToPhotocopy,
        cascoClaimRequest: formData.cascoClaimRequest,
        vehicleEncumbrance: formData.vehicleEncumbrance,
        encumbranceFinancier: formData.encumbranceFinancier,
      }
    } else if (currentStep === 6) {
      schema = authorizationSchema
      data = {
        accept8DayPayment: formData.accept8DayPayment,
        knowsCascoTerms: formData.knowsCascoTerms,
      }
    } else if (currentStep === 7) {
      schema = signatureSchema
      data = {
        ownerSignatureUrl: formData.ownerSignatureUrl,
        driverSignatureUrl: formData.driverSignatureUrl || undefined,
        driverSameAsOwner: formData.driverSameAsOwner,
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
      setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS))
    }
  }

  const handleBack = () => {
    setErrors({})
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  const handleSubmit = async () => {
    if (submittingRef.current) return
    if (!validateStep()) return

    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitError(null)
    setCanRetry(false)

    if (!clientRequestIdRef.current) clientRequestIdRef.current = generateClientRequestId()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS)
    logClientEvent("submit_attempt")

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, clientRequestId: clientRequestIdRef.current }),
        signal: controller.signal,
      })

      if (!response.ok) {
        let serverMessage: string | undefined
        try {
          const errorData = await response.json()
          if (typeof errorData?.error === "string") serverMessage = errorData.error
        } catch {
          // nem JSON válasz — az alapértelmezett üzenetet használjuk
        }
        // Átmeneti hibáknál (5xx, időtúllépés, feldolgozás alatt, túl sok kérés) újrapróbálható
        const retryable =
          response.status >= 500 ||
          response.status === 408 ||
          response.status === 409 ||
          response.status === 429
        logClientEvent("submit_server_error", { errorCode: `HTTP_${response.status}` })
        setSubmitError(
          serverMessage ??
            (retryable
              ? "A beküldés most nem sikerült. Az adatai és az aláírása megmaradtak, kérjük próbálja újra."
              : "Sikertelen beküldés")
        )
        setCanRetry(retryable)
        return
      }

      // Sikeres beküldés: a piszkozatot töröljük, és nem mentünk újra
      submittedRef.current = true
      clearDraft()
      logClientEvent("submit_success")
      router.push("/success")
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === "AbortError"
      logClientEvent(aborted ? "submit_timeout" : "submit_network_error", {
        errorCode: aborted ? "ABORT" : "FETCH_FAILED",
      })
      setSubmitError(
        aborted
          ? "A szerver nem válaszolt időben. Az adatai és az aláírása megmaradtak, kérjük próbálja újra."
          : "Nem sikerült kapcsolódni a szerverhez. Ellenőrizze az internetkapcsolatot — az adatai és az aláírása megmaradtak, kérjük próbálja újra."
      )
      setCanRetry(true)
    } finally {
      clearTimeout(timeoutId)
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1PersonalData
            data={{
              ownerType: formData.ownerType,
              ownerName: formData.ownerName,
              ownerAddress: formData.ownerAddress,
              idOrTaxNumber: formData.idOrTaxNumber,
              driverName: formData.driverName,
              driverAddress: formData.driverAddress,
              driverPhone: formData.driverPhone,
              driverBirthDate: formData.driverBirthDate,
              driverLicenseNumber: formData.driverLicenseNumber,
              driverLicenseValidUntil: formData.driverLicenseValidUntil,
              driverSameAsOwner: formData.driverSameAsOwner,
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
              vehicleRegistrationDate: formData.vehicleRegistrationDate,
              vehicleInspectionValidUntil: formData.vehicleInspectionValidUntil,
              vehicleEngineCapacity: formData.vehicleEngineCapacity,
              vehiclePowerKw: formData.vehiclePowerKw,
              vehicleColor: formData.vehicleColor,
              liableParty: formData.liableParty,
              hasCasco: formData.hasCasco,
              cascoInsurer: formData.cascoInsurer,
              liabilityInsurer: formData.liabilityInsurer,
              relevantInsurer: formData.relevantInsurer,
              insuranceCompany: formData.insuranceCompany,
              insuranceCompanyOther: formData.insuranceCompanyOther,
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
              damageType: formData.damageType,
              windshieldCause: formData.windshieldCause,
              windshieldCauseOther: formData.windshieldCauseOther,
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
              underInfluence: formData.underInfluence,
              licenseValid: formData.licenseValid,
              vatReclaimEligible: formData.vatReclaimEligible,
              taxNumber: formData.taxNumber,
              consentToPhotocopy: formData.consentToPhotocopy,
              cascoClaimRequest: formData.cascoClaimRequest,
              vehicleEncumbrance: formData.vehicleEncumbrance,
              encumbranceFinancier: formData.encumbranceFinancier,
            }}
            onChange={(field, value) => updateField(field, value)}
            errors={errors}
            companyTaxNumber={formData.ownerType === "CEG" ? formData.idOrTaxNumber : undefined}
          />
        )
      case 6:
        return (
          <Step6Authorization
            data={{
              accept8DayPayment: formData.accept8DayPayment,
              knowsCascoTerms: formData.knowsCascoTerms,
            }}
            summary={{
              ownerType: formData.ownerType,
              ownerName: formData.ownerName,
              ownerAddress: formData.ownerAddress,
              idOrTaxNumber: formData.idOrTaxNumber,
              vehiclePlate: formData.vehiclePlate,
              vehicleVin: formData.vehicleVin,
              insuranceCompany: formData.insuranceCompany,
              insuranceCompanyOther: formData.insuranceCompanyOther ?? "",
            }}
            onChange={(field, value) => updateField(field, value)}
            errors={errors}
          />
        )
      case 7:
        return (
          <Step7Signature
            data={{
              ownerSignatureUrl: formData.ownerSignatureUrl,
              driverSignatureUrl: formData.driverSignatureUrl,
              gdprConsent: formData.gdprConsent,
            }}
            onChange={(field, value) => updateField(field, value)}
            errors={errors}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            driverSameAsOwner={formData.driverSameAsOwner}
          />
        )
    }
  }

  if (pendingDraft) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Félbehagyott kitöltés található
            </h1>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              Ezen az eszközön egy korábban megkezdett kárfelvétel adatai maradtak meg. Folytatja a
              kitöltést, vagy új, üres űrlapot kezd? Új kitöltésnél a korábbi adatok törlődnek.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={resumeDraft}>Folytatás</Button>
              <Button variant="secondary" onClick={discardDraft}>
                Új kitöltés
              </Button>
            </div>
          </Card>
        </div>
      </main>
    )
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
              <p className="text-red-800 dark:text-red-200 text-sm" role="alert">
                {submitError}
              </p>
              {canRetry && (
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Újrapróbálás
                  </Button>
                </div>
              )}
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

            {currentStep < TOTAL_STEPS && (
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
