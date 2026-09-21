"use client"

import { z } from "zod"
import Input from "@/components/ui/Input"
import RadioGroup from "@/components/ui/RadioGroup"
import {
  OWNER_TYPE_OPTIONS,
  OWNER_TYPE_VALUES,
  TAX_NUMBER_REGEX,
  getOwnerLabels,
  type OwnerTypeValue,
} from "@/lib/ownerType"

const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/

export const step1Schema = z.object({
  ownerType: z.enum(OWNER_TYPE_VALUES, {
    errorMap: () => ({ message: "Válassza ki, hogy magánszemély vagy cég a tulajdonos" }),
  }),
  ownerName: z.string().min(2, "Legalább 2 karakter szükséges"),
  ownerAddress: z.string().min(2, "A lakcím megadása kötelező"),
  idOrTaxNumber: z.string().min(5, "Adja meg a személyazonosító okmány számát / az adószámot"),
  driverName: z.string().optional(),
  driverAddress: z.string().optional(),
  driverPhone: z.string().optional(),
  driverBirthDate: z.string().optional(),
  driverLicenseNumber: z.string().optional(),
  driverLicenseValidUntil: z.string().optional(),
  customerEmail: z.string().email("Érvénytelen e-mail cím"),
  customerPhone: z.string().regex(PHONE_REGEX, "Érvénytelen telefonszám formátum (pl. +36 30 123 4567)"),
  driverSameAsOwner: z.boolean(),
}).refine((d) => d.driverSameAsOwner || (d.driverName ?? "").trim().length >= 2, {
  // Eltérő személy esetén a vezető nevét meg kell adni (különben a PDF vezetői blokkja üres lenne)
  message: "Adja meg a vezető nevét, vagy jelölje, hogy megegyezik a tulajdonossal",
  path: ["driverName"],
}).refine((d) => d.ownerType !== "CEG" || TAX_NUMBER_REGEX.test(d.idOrTaxNumber.trim()), {
  message: "Érvénytelen adószám (formátum: 12345678-1-12)",
  path: ["idOrTaxNumber"],
})

// Az űrlap-állapotban a típus kezdetben üres (nincs alapértelmezett választás)
export type Step1Data = Omit<z.infer<typeof step1Schema>, "ownerType"> & {
  ownerType: OwnerTypeValue | ""
}

interface Step1Props {
  data: Step1Data
  onChange: (field: keyof Step1Data, value: string | boolean) => void
  errors: Partial<Record<keyof Step1Data, string>>
}

export default function Step1PersonalData({ data, onChange, errors }: Step1Props) {
  const isCompany = data.ownerType === "CEG"
  const labels = getOwnerLabels(data.ownerType || "MAGANSZEMELY")

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
    } else {
      // Eltérő személy: a tulajdonostól átmásolt értékeket töröljük, hogy a vezető
      // adatait ténylegesen megadják (és ne a tulajdonos adatai szerepeljenek kétszer).
      onChange("driverName", "")
      onChange("driverAddress", "")
      onChange("driverPhone", "")
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Tulajdonos adatai */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Tulajdonos (üzembentartó) adatai
        </h2>
        <RadioGroup
          label="A tulajdonos"
          name="ownerType"
          required
          value={data.ownerType}
          onChange={(val) => onChange("ownerType", val)}
          options={[...OWNER_TYPE_OPTIONS]}
          error={errors.ownerType}
        />
        <Input
          label={isCompany ? "Cégnév" : "Tulajdonos neve"}
          name="ownerName"
          value={data.ownerName}
          onChange={handleOwnerField("ownerName", "driverName")}
          error={errors.ownerName}
          required
          placeholder={isCompany ? "pl. Példa Kft." : "Teljes név"}
        />
        <Input
          label={isCompany ? "Székhely" : "Tulajdonos lakcíme"}
          name="ownerAddress"
          value={data.ownerAddress ?? ""}
          onChange={handleOwnerField("ownerAddress", "driverAddress")}
          error={errors.ownerAddress}
          required
          placeholder="Irányítószám, város, utca, házszám"
        />
        <Input
          label={labels.id}
          name="idOrTaxNumber"
          value={data.idOrTaxNumber ?? ""}
          onChange={handle("idOrTaxNumber")}
          error={errors.idOrTaxNumber}
          required
          placeholder={isCompany ? "12345678-1-12" : "pl. 123456AB"}
        />
      </section>

      {/* Vezető adatai */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Vezető adatai
        </h2>
        <label
          className={`flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-xl border-2 cursor-pointer select-none ${
            data.driverSameAsOwner
              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400"
              : "border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600"
          }`}
        >
          <input
            type="checkbox"
            checked={data.driverSameAsOwner}
            onChange={(e) => handleSameAsOwner(e.target.checked)}
            className="h-5 w-5 shrink-0 rounded"
          />
          <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
            A vezető személye és a tulajdonos személye megegyezik.
          </span>
        </label>

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
