"use client"

import { z } from "zod"
import Checkbox from "@/components/ui/Checkbox"
import Input from "@/components/ui/Input"

export const step5Schema = z.object({
  underInfluence: z.boolean(),
  licenseValid: z.boolean(),
  vatReclaimEligible: z.boolean(),
  taxNumber: z.string().optional(),
  consentToPhotocopy: z.boolean(),
  cascoClaimRequest: z.boolean(),
  vehicleEncumbrance: z.boolean(),
  encumbranceFinancier: z.string().optional(),
})

export type Step5Data = {
  underInfluence: boolean
  licenseValid: boolean
  vatReclaimEligible: boolean
  taxNumber: string
  consentToPhotocopy: boolean
  cascoClaimRequest: boolean
  vehicleEncumbrance: boolean
  encumbranceFinancier: string
}

type Props = {
  data: Step5Data
  onChange: (field: string, value: unknown) => void
  errors: Record<string, string>
}

export default function Step5Declarations({ data, onChange, errors }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Nyilatkozatok
      </h2>

      {/* Nyilatkozatok */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Nyilatkozatok
        </p>
        <div className="space-y-4">
          <div>
            <Checkbox
              label="A káresemény időpontjában kábítószer, alkohol vagy a gépjárművezetést befolyásoló szer hatása alatt álltam."
              name="underInfluence"
              checked={data.underInfluence}
              onChange={(e) => onChange("underInfluence", e.target.checked)}
              error={errors.underInfluence}
            />
            {data.underInfluence && (
              <p className="text-sm text-red-600 mt-1 ml-7">
                Figyelem: ez befolyásolhatja a kárrendezést.
              </p>
            )}
          </div>

          <Checkbox
            label="A gépjárművet a káresemény időpontjában vezető személy jogosítványa érvényes volt."
            name="licenseValid"
            checked={data.licenseValid}
            onChange={(e) => onChange("licenseValid", e.target.checked)}
            error={errors.licenseValid}
          />

          <Checkbox
            label="Hozzájárulok ahhoz, hogy a szükséges iratokról, igazolványokról fénymásolatot készítsenek."
            name="consentToPhotocopy"
            checked={data.consentToPhotocopy}
            onChange={(e) => onChange("consentToPhotocopy", e.target.checked)}
            error={errors.consentToPhotocopy}
          />

          <div>
            <Checkbox
              label="A hatályos szabályok értelmében a bejelentett jármű vonatkozásában ÁFA visszaigénylésre jogosult vagyok."
              name="vatReclaimEligible"
              checked={data.vatReclaimEligible}
              onChange={(e) => onChange("vatReclaimEligible", e.target.checked)}
              error={errors.vatReclaimEligible}
            />
            {data.vatReclaimEligible && (
              <div className="mt-2 ml-7">
                <Input
                  label="Adószám"
                  name="taxNumber"
                  value={data.taxNumber}
                  onChange={(e) => onChange("taxNumber", e.target.value)}
                  error={errors.taxNumber}
                  placeholder="12345678-1-12"
                />
              </div>
            )}
          </div>

          <Checkbox
            label="Kérem a kárrendezést saját CASCO biztosítás alapján."
            name="cascoClaimRequest"
            checked={data.cascoClaimRequest}
            onChange={(e) => onChange("cascoClaimRequest", e.target.checked)}
            error={errors.cascoClaimRequest}
          />

          <div>
            <Checkbox
              label="A jármű tulajdonjogát korlátozó teher (hitel, lízing, zálog) áll fenn."
              name="vehicleEncumbrance"
              checked={data.vehicleEncumbrance}
              onChange={(e) => onChange("vehicleEncumbrance", e.target.checked)}
              error={errors.vehicleEncumbrance}
            />
            {data.vehicleEncumbrance && (
              <div className="mt-2 ml-7">
                <Input
                  label="Finanszírozó neve"
                  name="encumbranceFinancier"
                  value={data.encumbranceFinancier}
                  onChange={(e) => onChange("encumbranceFinancier", e.target.value)}
                  error={errors.encumbranceFinancier}
                  placeholder="pl. OTP Bank Zrt., Erste Leasing..."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
