"use client"

import { useState } from "react"
import { z } from "zod"
import Button from "@/components/ui/Button"
import Checkbox from "@/components/ui/Checkbox"
import SignatureField from "@/components/ui/SignatureField"
import SignatureModal from "@/components/ui/SignatureModal"

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
  driverSameAsOwner?: boolean
}

type SignatureTarget = "owner" | "driver" | null

export default function Step6Signature({
  data,
  onChange,
  errors,
  onSubmit,
  isSubmitting,
  driverSameAsOwner,
}: Props) {
  const [activeTarget, setActiveTarget] = useState<SignatureTarget>(null)
  const penColor = "#1e293b"

  const targetLabel =
    activeTarget === "owner"
      ? "Tulajdonos aláírása"
      : activeTarget === "driver"
        ? "Vezető aláírása"
        : ""

  const handleConfirm = (dataUrl: string) => {
    if (activeTarget === "owner") onChange("ownerSignatureUrl", dataUrl)
    if (activeTarget === "driver") onChange("driverSignatureUrl", dataUrl)
    setActiveTarget(null)
  }

  const canSubmit =
    data.ownerSignatureUrl.length > 0 && data.gdprConsent && !isSubmitting

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Aláírás és beküldés
      </h2>

      {/* Tulajdonos aláírása */}
      <SignatureField
        label="Tulajdonos aláírása"
        required
        value={data.ownerSignatureUrl}
        error={errors.ownerSignatureUrl}
        onOpen={() => setActiveTarget("owner")}
        onClear={() => onChange("ownerSignatureUrl", "")}
      />

      {/* Vezető aláírása — csak akkor kell, ha a vezető nem azonos a tulajdonossal */}
      {!driverSameAsOwner && (
        <SignatureField
          label="Vezető aláírása"
          value={data.driverSignatureUrl}
          onOpen={() => setActiveTarget("driver")}
          onClear={() => onChange("driverSignatureUrl", "")}
        />
      )}

      <SignatureModal
        open={activeTarget !== null}
        title={targetLabel}
        penColor={penColor}
        onCancel={() => setActiveTarget(null)}
        onConfirm={handleConfirm}
      />

      {/* GDPR */}
      <Checkbox
        label={
          <span>
            Hozzájárulok, hogy a megadott személyes adataimat (név, e-mail,
            rendszám, jármű adatai) a szerviz szervizdokumentációs célból
            kezelje. Az adatkezelés a dokumentáció elkészítése és a biztosítási
            ügyintézés céljából történik.{" "}
            <a
              href="https://www.m1szerviztata.hu/adatkezeles/"
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
