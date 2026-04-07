"use client"

import { z } from "zod"
import RadioGroup from "@/components/ui/RadioGroup"
import Checkbox from "@/components/ui/Checkbox"
import Input from "@/components/ui/Input"

export const step5Schema = z.object({
  liableParty: z.enum(["own", "other", "both"], {
    errorMap: () => ({ message: "Kérjük válasszon" }),
  }),
  underInfluence: z.boolean(),
  licenseValid: z.boolean(),
  taxNumber: z.string().optional(),
  consentToPhotocopy: z.boolean(),
  cascoClaimRequest: z.boolean(),
  vehicleEncumbrance: z.boolean(),
})

export type Step5Data = {
  liableParty: "own" | "other" | "both" | ""
  underInfluence: boolean
  licenseValid: boolean
  taxNumber: string
  consentToPhotocopy: boolean
  cascoClaimRequest: boolean
  vehicleEncumbrance: boolean
}

type Props = {
  data: Step5Data
  onChange: (field: string, value: unknown) => void
  errors: Record<string, string>
}

const liablePartyOptions = [
  { value: "own", label: "Én / saját gépjárművem vezetője" },
  { value: "other", label: "A másik fél" },
  { value: "both", label: "Mindkét résztvevő" },
]

export default function Step5Declarations({ data, onChange, errors }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Nyilatkozatok
      </h2>

      {/* Felelősség */}
      <div>
        <RadioGroup
          label="Ön szerint ki a felelős a kárért?"
          name="liableParty"
          value={data.liableParty}
          onChange={(val) => onChange("liableParty", val)}
          options={liablePartyOptions}
          error={errors.liableParty}
        />
      </div>

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
            label="A hatályos szabályok értelmében a bejelentett jármű vonatkozásában ÁFA visszaigénylésre jogosult vagyok."
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

          <Checkbox
            label="Kérem a kárrendezést saját CASCO biztosítás alapján."
            name="cascoClaimRequest"
            checked={data.cascoClaimRequest}
            onChange={(e) => onChange("cascoClaimRequest", e.target.checked)}
            error={errors.cascoClaimRequest}
          />

          <Checkbox
            label="A jármű tulajdonjogát korlátozó teher (hitel, lízing, zálog) áll fenn."
            name="vehicleEncumbrance"
            checked={data.vehicleEncumbrance}
            onChange={(e) => onChange("vehicleEncumbrance", e.target.checked)}
            error={errors.vehicleEncumbrance}
          />
        </div>
      </div>

      {/* Adószám */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Jogosultság esetén
        </p>
        <Input
          label="Adószám (jogosultság esetén)"
          name="taxNumber"
          value={data.taxNumber}
          onChange={(e) => onChange("taxNumber", e.target.value)}
          error={errors.taxNumber}
          placeholder="12345678-1-12"
        />
      </div>
    </div>
  )
}
