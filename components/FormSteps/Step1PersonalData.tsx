"use client"

import { useState } from "react"
import { z } from "zod"
import Input from "@/components/ui/Input"

export const step1Schema = z.object({
  ownerName: z.string().min(2, "Legalább 2 karakter szükséges"),
  ownerAddress: z.string().optional(),
  driverName: z.string().optional(),
  driverAddress: z.string().optional(),
  driverPhone: z.string().optional(),
  customerEmail: z.string().email("Érvénytelen e-mail cím"),
  customerPhone: z.string().optional(),
})

export type Step1Data = z.infer<typeof step1Schema>

interface Step1Props {
  data: Step1Data
  onChange: (field: keyof Step1Data, value: string) => void
  errors: Partial<Record<keyof Step1Data, string>>
}

export default function Step1PersonalData({ data, onChange, errors }: Step1Props) {
  const [sameAsOwner, setSameAsOwner] = useState(false)

  const handle = (field: keyof Step1Data) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(field, e.target.value)

  const handleSameAsOwner = (checked: boolean) => {
    setSameAsOwner(checked)
    if (checked) {
      onChange("driverName", data.ownerName ?? "")
      onChange("driverAddress", data.ownerAddress ?? "")
      onChange("driverPhone", data.customerPhone ?? "")
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Tulajdonos adatai */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Tulajdonos (üzembentartó) adatai
        </h2>
        <Input
          label="Tulajdonos neve"
          name="ownerName"
          value={data.ownerName}
          onChange={handle("ownerName")}
          error={errors.ownerName}
          required
          placeholder="Teljes név"
        />
        <Input
          label="Tulajdonos lakcíme"
          name="ownerAddress"
          value={data.ownerAddress ?? ""}
          onChange={handle("ownerAddress")}
          error={errors.ownerAddress}
          placeholder="Irányítószám, város, utca, házszám"
        />
      </section>

      {/* Vezető adatai */}
      <section className="flex flex-col gap-4">
        <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-700 pb-2 gap-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Vezető adatai
          </h2>
          <label className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={sameAsOwner}
              onChange={(e) => handleSameAsOwner(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            Megegyezik a tulajdonossal
          </label>
        </div>

        <Input
          label="Vezető neve"
          name="driverName"
          value={sameAsOwner ? (data.ownerName ?? "") : (data.driverName ?? "")}
          onChange={handle("driverName")}
          error={errors.driverName}
          disabled={sameAsOwner}
          placeholder="Teljes név"
        />
        <Input
          label="Vezető lakcíme"
          name="driverAddress"
          value={sameAsOwner ? (data.ownerAddress ?? "") : (data.driverAddress ?? "")}
          onChange={handle("driverAddress")}
          error={errors.driverAddress}
          disabled={sameAsOwner}
          placeholder="Irányítószám, város, utca, házszám"
        />
        <Input
          label="Vezető telefonszáma"
          name="driverPhone"
          type="tel"
          value={sameAsOwner ? (data.customerPhone ?? "") : (data.driverPhone ?? "")}
          onChange={handle("driverPhone")}
          error={errors.driverPhone}
          disabled={sameAsOwner}
          placeholder="+36 30 123 4567"
        />
      </section>

      {/* Kapcsolattartási adatok */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Kapcsolattartási adatok
        </h2>
        <Input
          label="E-mail cím"
          name="customerEmail"
          type="email"
          value={data.customerEmail}
          onChange={handle("customerEmail")}
          error={errors.customerEmail}
          required
          placeholder="pelda@email.hu"
        />
        <Input
          label="Telefonszám"
          name="customerPhone"
          type="tel"
          value={data.customerPhone ?? ""}
          onChange={handle("customerPhone")}
          error={errors.customerPhone}
          placeholder="+36 30 123 4567"
        />
      </section>
    </div>
  )
}
