"use client"

import { z } from "zod"
import Checkbox from "@/components/ui/Checkbox"
import { getInsuranceCompanyLabel, type InsuranceCompanyValue } from "@/lib/validation"
import { WORKSHOP_LEGAL_ENTITIES } from "@/lib/workshop"

export const authorizationSchema = z.object({
  accept8DayPayment: z.literal(true, {
    errorMap: () => ({ message: "A 8 napos fizetési záradék elfogadása kötelező" }),
  }),
  knowsCascoTerms: z.literal(true, {
    errorMap: () => ({ message: "A CASCO feltételek tudomásul vétele kötelező" }),
  }),
})

export type AuthorizationData = {
  accept8DayPayment: boolean
  knowsCascoTerms: boolean
}

interface AuthorizationSummary {
  ownerName: string
  ownerAddress: string
  idOrTaxNumber: string
  vehiclePlate: string
  vehicleVin: string
  insuranceCompany: InsuranceCompanyValue | ""
  insuranceCompanyOther: string
}

interface Props {
  data: AuthorizationData
  summary: AuthorizationSummary
  onChange: (field: keyof AuthorizationData, value: boolean) => void
  errors: Record<string, string>
}

export default function Step6Authorization({ data, summary, onChange, errors }: Props) {
  const insurerLabel = getInsuranceCompanyLabel(summary.insuranceCompany || null, summary.insuranceCompanyOther)

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Meghatalmazás</h2>

      {/* Korábban megadott adatok — automatikusan betöltve, nincs újra beírás (DRY) */}
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 space-y-1">
        <p><strong>Meghatalmazó neve:</strong> {summary.ownerName || "—"}</p>
        <p><strong>Lakcím:</strong> {summary.ownerAddress || "—"}</p>
        <p><strong>Igazolvány- / adószám:</strong> {summary.idOrTaxNumber || "—"}</p>
        <p><strong>Rendszám:</strong> {summary.vehiclePlate ? summary.vehiclePlate.toUpperCase() : "—"}</p>
        <p><strong>Alvázszám (VIN):</strong> {summary.vehicleVin || "—"}</p>
        <p><strong>Illetékes biztosító:</strong> {insurerLabel}</p>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Az aláírás előtt kérjük, olvassa el mind a 3, egymástól független meghatalmazás szövegét — az Ön
        egyetlen aláírása mindhárom külön dokumentumra felkerül.
      </p>

      {/* Mindhárom jogi entitáshoz (M1 / Autóüveg / Bodrogi Róbert) önálló, teljes szövegű
          meghatalmazás jelenik meg — ezek egymástól függetlenek, egyik sem hivatkozik a
          másik két cégre (lásd lib/pdf/AuthorizationPage.tsx, ugyanez a szöveg PDF-en). */}
      <div className="space-y-4">
        {WORKSHOP_LEGAL_ENTITIES.map((entity) => (
          <div
            key={entity.key}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Meghatalmazás — {entity.companyName}
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              A fent megnevezett gépjármű tulajdonosaként/üzembentartójaként meghatalmazom a{" "}
              <strong>{entity.companyName}</strong>-t (adószám: {entity.taxNumber}), hogy a megjelölt
              biztosítónál a kárügyemet teljes körűen képviselje, a szükséges nyilatkozatokat nevemben
              aláírja, a javítás díját a biztosító felé közvetlenül benyújtsa, és a kárrendezés
              eredményeként megítélt összeget — kifejezett hozzájárulásommal — közvetlenül a
              Meghatalmazott bankszámlájára (számlaszám: {entity.bankAccount}) kérje folyósítani.
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <Checkbox
            label={
              <span>
                <strong>8 napos fizetési záradék:</strong> Tudomásul veszem és elfogadom, hogy ha a
                biztosító a kárt nem vagy csak részben téríti meg, a javítás díját a gépjármű
                visszaadásától számított 8 napon belül megfizetem.
              </span>
            }
            name="accept8DayPayment"
            checked={data.accept8DayPayment}
            onChange={(e) => onChange("accept8DayPayment", e.target.checked)}
            error={errors.accept8DayPayment}
          />
        </div>

        <div>
          <Checkbox
            label={
              <span>
                <strong>CASCO feltételek:</strong> Kijelentem, hogy a kárrendezés alapjául szolgáló
                CASCO (vagy egyéb vonatkozó) biztosítási szerződés feltételeit, önrészét és kizárásait
                ismerem és tudomásul veszem.
              </span>
            }
            name="knowsCascoTerms"
            checked={data.knowsCascoTerms}
            onChange={(e) => onChange("knowsCascoTerms", e.target.checked)}
            error={errors.knowsCascoTerms}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        A fenti mindhárom meghatalmazást és a nyilatkozatokat az aláírás lépésben rögzített egyetlen
        aláírásával erősíti meg.
      </p>
    </div>
  )
}
