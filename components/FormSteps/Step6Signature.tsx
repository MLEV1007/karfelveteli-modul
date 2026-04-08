"use client"

import { useRef } from "react"
import SignaturePad, { type SignaturePadHandle } from "@/components/ui/SignaturePad"
import { z } from "zod"
import Button from "@/components/ui/Button"
import Checkbox from "@/components/ui/Checkbox"

export const step6Schema = z.object({
  ownerSignatureUrl: z.string().min(1, "A tulajdonos aláírása kötelező"),
  driverSignatureUrl: z.string().optional(),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Az adatkezelési hozzájárulás kötelező" }),
  }),
})

export type Step6Data = {
  ownerSignatureUrl: string
  driverSignatureUrl: string
  gdprConsent: boolean
}

type Props = {
  data: Step6Data
  onChange: (field: string, value: unknown) => void
  errors: Record<string, string>
  onSubmit: () => void
  isSubmitting: boolean
}

export default function Step6Signature({
  data,
  onChange,
  errors,
  onSubmit,
  isSubmitting,
}: Props) {
  const ownerSigRef = useRef<SignaturePadHandle>(null)
  const driverSigRef = useRef<SignaturePadHandle>(null)
  const penColor = "#1e293b"

  const handleOwnerEnd = () => {
    if (!ownerSigRef.current || ownerSigRef.current.isEmpty()) return
    const dataUrl = ownerSigRef.current.toDataURL("image/png")
    onChange("ownerSignatureUrl", dataUrl)
  }

  const handleDriverEnd = () => {
    if (!driverSigRef.current || driverSigRef.current.isEmpty()) return
    const dataUrl = driverSigRef.current.toDataURL("image/png")
    onChange("driverSignatureUrl", dataUrl)
  }

  const clearOwner = () => {
    ownerSigRef.current?.clear()
    onChange("ownerSignatureUrl", "")
  }

  const clearDriver = () => {
    driverSigRef.current?.clear()
    onChange("driverSignatureUrl", "")
  }

  const canSubmit =
    data.ownerSignatureUrl.length > 0 && data.gdprConsent && !isSubmitting

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Aláírás és beküldés
      </h2>

      {/* Tulajdonos aláírása */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Tulajdonos aláírása <span className="text-red-500">*</span>
        </p>
        <div className="border rounded-lg overflow-hidden bg-white">
          <SignaturePad
            ref={ownerSigRef}
            penColor={penColor}
            backgroundColor="white"
            height={180}
            onEnd={handleOwnerEnd}
          />
        </div>
        {errors.ownerSignatureUrl && (
          <p className="text-xs text-red-500 mt-1">{errors.ownerSignatureUrl}</p>
        )}
        <div className="mt-2">
          <Button variant="secondary" onClick={clearOwner} type="button">
            Törlés
          </Button>
        </div>
      </div>

      {/* Vezető aláírása */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Vezető aláírása
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Ha azonos a tulajdonossal, elegendő csak felül aláírni
        </p>
        <div className="border rounded-lg overflow-hidden bg-white">
          <SignaturePad
            ref={driverSigRef}
            penColor={penColor}
            backgroundColor="white"
            height={180}
            onEnd={handleDriverEnd}
          />
        </div>
        <div className="mt-2">
          <Button variant="secondary" onClick={clearDriver} type="button">
            Törlés
          </Button>
        </div>
      </div>

      {/* GDPR */}
      <Checkbox
        label={
          <span>
            Hozzájárulok, hogy a megadott személyes adataimat (név, e-mail,
            rendszám, jármű adatai) a szerviz szervizdokumentációs célból
            kezelje. Az adatokat harmadik félnek nem adják át.{" "}
            <a
              href="/adatkezeles"
              className="text-blue-600 hover:underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Adatkezelési tájékoztató
            </a>
          </span>
        }
        name="gdprConsent"
        checked={data.gdprConsent}
        onChange={(e) => onChange("gdprConsent", e.target.checked)}
        error={errors.gdprConsent}
      />

      {/* Beküldés gomb */}
      <Button
        variant="primary"
        onClick={onSubmit}
        loading={isSubmitting}
        disabled={!canSubmit}
        fullWidth
        type="button"
      >
        Kárfelvétel beküldése
      </Button>
    </div>
  )
}
