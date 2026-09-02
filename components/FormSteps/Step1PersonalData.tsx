"use client"

import { z } from "zod"
import Input from "@/components/ui/Input"

const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/

export const step1Schema = z.object({
  ownerName: z.string().min(2, "Legalább 2 karakter szükséges"),
  ownerAddress: z.string().min(2, "A lakcím megadása kötelező"),
  idOrTaxNumber: z.string().min(5, "Adjon meg érvényes személyi igazolvány- vagy adószámot"),
  driverName: z.string().optional(),
  driverAddress: z.string().optional(),
  driverPhone: z.string().optional(),
  driverBirthDate: z.string().optional(),
  driverLicenseNumber: z.string().optional(),
  driverLicenseValidUntil: z.string().optional(),
  customerEmail: z.string().email("Érvénytelen e-mail cím"),
  customerPhone: z.string().regex(PHONE_REGEX, "Érvénytelen telefonszám formátum (pl. +36 30 123 4567)"),
})

export type Step1Data = z.infer<typeof step1Schema> & {
  driverSameAsOwner: boolean
}

interface Step1Props {
  data: Step1Data
  onChange: (field: keyof Step1Data, value: string | boolean) => void
  errors: Partial<Record<keyof Step1Data, string>>
}

export default function Step1PersonalData({ data, onChange, errors }: Step1Props) {
  const handle = (field: keyof Step1Data) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(field, e.target.value)

  // Az "owner" mezők szerkesztésekor, ha a vezető megegyezik a tulajdonossal, a vezetői
  // mezőket is élőben szinkronban tartjuk — így azok rejtve is mindig naprakészek maradnak.
  const handleOwnerField =
    (ownerField: keyof Step1Data, driverField: keyof Step1Data) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(ownerField, e.target.value)
      if (data.driverSameAsOwner) onChange(driverField, e.target.value)
    }

  const handleSameAsOwner = (checked: boolean) => {
    onChange("driverSameAsOwner", checked)
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
          onChange={handleOwnerField("ownerName", "driverName")}
          error={errors.ownerName}
          required
          placeholder="Teljes név"
        />
        <Input
          label="Tulajdonos lakcíme"
          name="ownerAddress"
          value={data.ownerAddress ?? ""}
          onChange={handleOwnerField("ownerAddress", "driverAddress")}
          error={errors.ownerAddress}
          required
          placeholder="Irányítószám, város, utca, házszám"
        />
        <Input
          label="Személyi igazolvány- vagy adószám"
          name="idOrTaxNumber"
          value={data.idOrTaxNumber ?? ""}
          onChange={handle("idOrTaxNumber")}
          error={errors.idOrTaxNumber}
          required
          placeholder="pl. 123456AB vagy 12345678-1-12"
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
              checked={data.driverSameAsOwner}
              onChange={(e) => handleSameAsOwner(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            Megegyezik a tulajdonossal
          </label>
        </div>

        {data.driverSameAsOwner ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            A vezető neve, címe és telefonszáma megegyezik a tulajdonossal.
          </p>
        ) : (
          <>
            <Input
              label="Vezető neve"
              name="driverName"
              value={data.driverName ?? ""}
              onChange={handle("driverName")}
              error={errors.driverName}
              placeholder="Teljes név"
            />
            <Input
              label="Vezető lakcíme"
              name="driverAddress"
              value={data.driverAddress ?? ""}
              onChange={handle("driverAddress")}
              error={errors.driverAddress}
              placeholder="Irányítószám, város, utca, házszám"
            />
            <Input
              label="Vezető telefonszáma"
              name="driverPhone"
              type="tel"
              value={data.driverPhone ?? ""}
              onChange={handle("driverPhone")}
              error={errors.driverPhone}
              placeholder="+36 30 123 4567"
            />
          </>
        )}

        {/* Ezek a mezők a "Megegyezik a tulajdonossal" jelölőtől függetlenül mindig
            láthatók — a tulajdonos adatai között nincs születési idő / jogosítvány. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Vezető születési ideje"
            name="driverBirthDate"
            type="date"
            value={data.driverBirthDate ?? ""}
            onChange={handle("driverBirthDate")}
            error={errors.driverBirthDate}
          />
          <Input
            label="Vezetői engedély száma"
            name="driverLicenseNumber"
            value={data.driverLicenseNumber ?? ""}
            onChange={handle("driverLicenseNumber")}
            error={errors.driverLicenseNumber}
            placeholder="pl. AB123456"
          />
        </div>
        <Input
          label="Vezetői engedély érvényességi ideje"
          name="driverLicenseValidUntil"
          type="date"
          value={data.driverLicenseValidUntil ?? ""}
          onChange={handle("driverLicenseValidUntil")}
          error={errors.driverLicenseValidUntil}
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
          onChange={handleOwnerField("customerPhone", "driverPhone")}
          error={errors.customerPhone}
          required
          placeholder="+36 30 123 4567"
        />
      </section>
    </div>
  )
}
