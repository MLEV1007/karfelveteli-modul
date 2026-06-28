"use client"

import { z } from "zod"
import Input from "@/components/ui/Input"
import RadioGroup from "@/components/ui/RadioGroup"
import SelectWithOther from "@/components/ui/SelectWithOther"
import { INSURANCE_COMPANIES, INSURANCE_COMPANY_LABELS, type InsuranceCompanyValue } from "@/lib/validation"

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/ // I, O, Q kizárva (ISO 3779)

export const step2Schema = z
  .object({
    vehiclePlate: z.string().min(3, "Érvénytelen rendszám"),
    vehicleMake: z.string().min(1, "Kötelező mező"),
    vehicleModel: z.string().min(1, "Kötelező mező"),
    vehicleYear: z.coerce.number().min(1970).max(2026).optional(),
    vehicleVin: z
      .string()
      .length(17, "A VIN szám pontosan 17 karakter hosszú")
      .regex(VIN_REGEX, "A VIN szám nem tartalmazhat I, O vagy Q betűt"),
    liableParty: z.enum(["own", "other", "both"], {
      errorMap: () => ({ message: "Válasszon felelős felet" }),
    }),
    hasCasco: z.boolean(),
    cascoInsurer: z.string().optional(),
    liabilityInsurer: z.string().optional(),
    relevantInsurer: z.string().optional(),
    insuranceCompany: z.enum(INSURANCE_COMPANIES, {
      errorMap: () => ({ message: "Válasszon biztosítót" }),
    }),
    insuranceCompanyOther: z.string().optional(),
  })
  .refine((data) => data.insuranceCompany !== "EGYEB" || !!data.insuranceCompanyOther?.trim(), {
    message: "Adja meg az egyéb biztosító nevét",
    path: ["insuranceCompanyOther"],
  })

const INSURANCE_COMPANY_OPTIONS = INSURANCE_COMPANIES.map((value) => ({
  value,
  label: INSURANCE_COMPANY_LABELS[value],
}))

// A "Saját kötelező biztosító" / "Károkozó fél biztosítója" mezők szabad szöveget tárolnak
// (mint a baleset országánál) — a választható nevek innen jönnek, "Egyéb biztosító" nélkül,
// mert azt a SelectWithOther maga teszi hozzá "Egyéb..." opcióként.
const INSURER_NAME_OPTIONS = (Object.entries(INSURANCE_COMPANY_LABELS) as [InsuranceCompanyValue, string][])
  .filter(([key]) => key !== "EGYEB")
  .map(([, label]) => ({ value: label, label }))

function findInsuranceCompanyMatch(name: string): InsuranceCompanyValue | null {
  const trimmed = name.trim().toLowerCase()
  const match = (Object.entries(INSURANCE_COMPANY_LABELS) as [InsuranceCompanyValue, string][]).find(
    ([key, label]) => key !== "EGYEB" && label.toLowerCase() === trimmed
  )
  return match ? match[0] : null
}

// A komponens állapotában az insuranceCompany/liableParty kezdetben "" (még nincs kiválasztva) —
// a Select/RadioGroup erre vár; a Zod séma (z.infer) a beküldéshez a szigorú enumot követeli meg.
export type Step2Data = Omit<z.infer<typeof step2Schema>, "insuranceCompany" | "liableParty"> & {
  insuranceCompany: InsuranceCompanyValue | ""
  liableParty: "own" | "other" | "both" | ""
}

interface Step2Props {
  data: Step2Data
  onChange: (field: keyof Step2Data, value: string | boolean | number | undefined) => void
  errors: Partial<Record<keyof Step2Data, string>>
}

const liablePartyOptions = [
  { value: "own", label: "Én okoztam a kárt (saját felelősség)" },
  { value: "other", label: "A másik fél okozta (én vagyok a sértett)" },
  { value: "both", label: "Megosztott a felelősség (mindkét fél)" },
]

export default function Step2VehicleInsurance({ data, onChange, errors }: Step2Props) {
  const handleInput =
    (field: keyof Step2Data) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      if (field === "vehiclePlate" || field === "vehicleVin") {
        onChange(field, val.toUpperCase())
      } else {
        onChange(field, val)
      }
    }

  const isAtFault = data.liableParty === "own"
  const otherIsAtFault = data.liableParty === "other" || data.liableParty === "both"

  // Gyors kitöltés: a meghatalmazáshoz tartozó "Illetékes biztosító" mezőt a kontextus alapján
  // legrelevánsabb, már megadott biztosítóval töltjük ki, hogy ne kelljen kétszer beírni a nevet.
  const applyInsurerFrom = (name: string) => {
    if (!name.trim()) return
    const matched = findInsuranceCompanyMatch(name)
    if (matched) {
      onChange("insuranceCompany", matched)
      onChange("insuranceCompanyOther", "")
    } else {
      onChange("insuranceCompany", "EGYEB")
      onChange("insuranceCompanyOther", name.trim())
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Gépjármű adatok */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          A bejelentett gépjármű adatai
        </h2>
        <Input
          label="Rendszám"
          name="vehiclePlate"
          value={data.vehiclePlate}
          onChange={handleInput("vehiclePlate")}
          error={errors.vehiclePlate}
          required
          placeholder="ABC-123"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Gyártmány (márka)"
            name="vehicleMake"
            value={data.vehicleMake}
            onChange={handleInput("vehicleMake")}
            error={errors.vehicleMake}
            required
            placeholder="pl. Volkswagen"
          />
          <Input
            label="Típus (modell)"
            name="vehicleModel"
            value={data.vehicleModel}
            onChange={handleInput("vehicleModel")}
            error={errors.vehicleModel}
            required
            placeholder="pl. Golf"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Évjárat"
            name="vehicleYear"
            type="number"
            value={data.vehicleYear?.toString() ?? ""}
            onChange={handleInput("vehicleYear")}
            error={errors.vehicleYear}
            placeholder="pl. 2018"
          />
          <Input
            label="Alvázszám (VIN)"
            name="vehicleVin"
            value={data.vehicleVin ?? ""}
            onChange={handleInput("vehicleVin")}
            error={errors.vehicleVin}
            required
            placeholder="Pontosan 17 karakter, I/O/Q nélkül"
            maxLength={17}
          />
        </div>
      </section>

      {/* Felelősség */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Ki okozta a kárt?
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          Ez határozza meg, kinek a biztosítója fedezi elsősorban a kárt — ettől függ, mely
          biztosítói adatokra lesz szükség alább.
        </p>
        <RadioGroup
          label="Felelősség megjelölése"
          name="liableParty"
          value={data.liableParty}
          onChange={(val) => onChange("liableParty", val)}
          options={liablePartyOptions}
          error={errors.liableParty}
        />
      </section>

      {/* Biztosítási adatok */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Biztosítási adatok
        </h2>

        <RadioGroup
          label="Van saját CASCO biztosítása?"
          name="hasCasco"
          value={data.hasCasco ? "true" : "false"}
          onChange={(val) => onChange("hasCasco", val === "true")}
          options={[
            { value: "true", label: "Igen" },
            { value: "false", label: "Nem" },
          ]}
          error={errors.hasCasco}
        />
        {data.hasCasco && (
          <div className="flex flex-col gap-2">
            <SelectWithOther
              label="Saját CASCO biztosítója"
              name="cascoInsurer"
              value={data.cascoInsurer ?? ""}
              onChange={(val) => onChange("cascoInsurer", val)}
              options={INSURER_NAME_OPTIONS}
              error={errors.cascoInsurer}
              helperText="A biztosító, amelynél a CASCO szerződése van."
            />
            {isAtFault && data.cascoInsurer && (
              <button
                type="button"
                onClick={() => applyInsurerFrom(data.cascoInsurer!)}
                className="text-xs text-blue-600 dark:text-blue-400 underline self-start"
              >
                Ugyanezt használom a meghatalmazáshoz lent ↓
              </button>
            )}
          </div>
        )}

        <SelectWithOther
          label="Saját kötelező felelősségbiztosítója"
          name="liabilityInsurer"
          value={data.liabilityInsurer ?? ""}
          onChange={(val) => onChange("liabilityInsurer", val)}
          options={INSURER_NAME_OPTIONS}
          error={errors.liabilityInsurer}
          helperText="Akkor releváns, ha Önt (vagy az Ön gépjárművét vezető személyt) terheli a felelősség."
        />

        <div className="flex flex-col gap-2">
          <SelectWithOther
            label="A károkozó / másik fél felelősségbiztosítója"
            name="relevantInsurer"
            value={data.relevantInsurer ?? ""}
            onChange={(val) => onChange("relevantInsurer", val)}
            options={INSURER_NAME_OPTIONS}
            error={errors.relevantInsurer}
            helperText={
              otherIsAtFault
                ? "Ez a biztosító fogja fedezni a kárt, mivel (részben) a másik felet terheli a felelősség."
                : "Ha ismeri, itt rögzítheti a másik fél biztosítóját is — erre a kárügy nyilvántartásához lehet szükség."
            }
          />
          {otherIsAtFault && data.relevantInsurer && (
            <button
              type="button"
              onClick={() => applyInsurerFrom(data.relevantInsurer!)}
              className="text-xs text-blue-600 dark:text-blue-400 underline self-start"
            >
              Ugyanezt használom a meghatalmazáshoz lent ↓
            </button>
          )}
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <SelectWithOther
            label="Illetékes biztosító a meghatalmazáshoz"
            name="insuranceCompany"
            mode="companion"
            value={data.insuranceCompany ?? ""}
            onChange={(val) => onChange("insuranceCompany", val)}
            otherValue={data.insuranceCompanyOther ?? ""}
            onOtherChange={(val) => onChange("insuranceCompanyOther", val)}
            otherTriggerValue="EGYEB"
            options={INSURANCE_COMPANY_OPTIONS}
            error={errors.insuranceCompany}
            otherError={errors.insuranceCompanyOther}
            required
            helperText={
              isAtFault
                ? "Mivel Ön az okozó, ez jellemzően a saját CASCO biztosítója (ha van) — ő fedezi a saját gépjárműve javítását."
                : otherIsAtFault
                  ? "Mivel a másik fél (részben) okozó, ez jellemzően az ő felelősségbiztosítója — a fent megadott károkozó-biztosítóval egyezik."
                  : "Válassza ki, melyik biztosító illetékes a kárügy intézésében — ez attól függ, ki okozta a kárt (lásd fent)."
            }
          />
        </div>
      </section>
    </div>
  )
}
