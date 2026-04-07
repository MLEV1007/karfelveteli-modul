"use client"

import { z } from "zod"
import Input from "@/components/ui/Input"
import RadioGroup from "@/components/ui/RadioGroup"

export const step2Schema = z.object({
  vehiclePlate: z.string().min(3, "Érvénytelen rendszám"),
  vehicleMake: z.string().min(1, "Kötelező mező"),
  vehicleModel: z.string().min(1, "Kötelező mező"),
  vehicleYear: z.coerce.number().min(1970).max(2026).optional(),
  vehicleVin: z.string().optional(),
  hasCasco: z.boolean(),
  cascoInsurer: z.string().optional(),
  liabilityInsurer: z.string().optional(),
  relevantInsurer: z.string().optional(),
})

export type Step2Data = z.infer<typeof step2Schema>

interface Step2Props {
  data: Step2Data
  onChange: (field: keyof Step2Data, value: string | boolean | number | undefined) => void
  errors: Partial<Record<keyof Step2Data, string>>
}

export default function Step2VehicleInsurance({ data, onChange, errors }: Step2Props) {
  const handleInput =
    (field: keyof Step2Data) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      if (field === "vehiclePlate") {
        onChange(field, val.toUpperCase())
      } else {
        onChange(field, val)
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
            placeholder="17 karakter"
          />
        </div>
      </section>

      {/* Biztosítási adatok */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Biztosítási adatok
        </h2>
        <RadioGroup
          label="Van CASCO biztosítása?"
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
          <Input
            label="CASCO biztosító neve"
            name="cascoInsurer"
            value={data.cascoInsurer ?? ""}
            onChange={handleInput("cascoInsurer")}
            error={errors.cascoInsurer}
            placeholder="pl. Allianz, Generali..."
          />
        )}
        <Input
          label="Felelősségbiztosító neve"
          name="liabilityInsurer"
          value={data.liabilityInsurer ?? ""}
          onChange={handleInput("liabilityInsurer")}
          error={errors.liabilityInsurer}
          placeholder="pl. UNIQA, K&H..."
        />
        <Input
          label="Illetékes biztosító"
          name="relevantInsurer"
          value={data.relevantInsurer ?? ""}
          onChange={handleInput("relevantInsurer")}
          error={errors.relevantInsurer}
          placeholder="A kárrendezést végző biztosító neve"
        />
      </section>
    </div>
  )
}
