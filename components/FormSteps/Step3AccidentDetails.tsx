"use client"

import { z } from "zod"
import { useState } from "react"
import Input from "@/components/ui/Input"
import Textarea from "@/components/ui/Textarea"
import RadioGroup from "@/components/ui/RadioGroup"

export const step3Schema = z.object({
  accidentDate: z.string().optional(),
  accidentCountry: z.string().optional(),
  accidentCity: z.string().optional(),
  accidentStreet: z.string().optional(),
  outsideSettlement: z.boolean(),
  roadNumber: z.string().optional(),
  kilometerMark: z.string().optional(),
  policeInvolved: z.boolean(),
  policeReportNo: z.string().optional(),
  policeStation: z.string().optional(),
  otherVehiclePlate: z.string().optional(),
  otherVehicleType: z.string().optional(),
  otherVehicleColor: z.string().optional(),
  additionalParties: z.string().optional(),
  vehicleInspectionLocation: z.string().optional(),
})

export type Step3Data = z.infer<typeof step3Schema>

interface Step3Props {
  data: Step3Data
  onChange: (field: keyof Step3Data, value: string | boolean) => void
  errors: Partial<Record<keyof Step3Data, string>>
}

const WORKSHOP_ADDRESS = "M1 Szerviz Tata, 2890 Tata, Ipartelep utca 1."

const COUNTRIES = [
  "Magyarország",
  "Ausztria",
  "Szlovákia",
  "Ukrajna",
  "Románia",
  "Szerbia",
  "Horvátország",
  "Szlovénia",
  "Csehország",
  "Lengyelország",
  "Németország",
  "Olaszország",
  "Svájc",
  "Bulgária",
  "Görögország",
]

export default function Step3AccidentDetails({ data, onChange, errors }: Step3Props) {
  const isCustomCountry = !!data.accidentCountry && !COUNTRIES.includes(data.accidentCountry)
  const [showCustom, setShowCustom] = useState(isCustomCountry)

  const handleInput =
    (field: keyof Step3Data) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(field, e.target.value)

  const handleTextarea =
    (field: keyof Step3Data) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      onChange(field, e.target.value)

  return (
    <div className="flex flex-col gap-8">
      {/* Baleset ideje és helyszíne */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          A baleset ideje és helyszíne
        </h2>
        <Input
          label="Baleset időpontja"
          name="accidentDate"
          type="datetime-local"
          value={data.accidentDate ?? ""}
          onChange={handleInput("accidentDate")}
          error={errors.accidentDate}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="accidentCountry" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Ország
          </label>
          <select
            id="accidentCountry"
            name="accidentCountry"
            value={showCustom ? "__egyeb__" : (data.accidentCountry ?? "Magyarország")}
            onChange={(e) => {
              if (e.target.value === "__egyeb__") {
                setShowCustom(true)
                onChange("accidentCountry", "")
              } else {
                setShowCustom(false)
                onChange("accidentCountry", e.target.value)
              }
            }}
            className={`min-h-[48px] w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 outline-none transition-colors focus:ring-2 focus:ring-blue-500 ${
              errors.accidentCountry
                ? "border-red-500 focus:ring-red-400"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__egyeb__">Egyéb...</option>
          </select>
          {showCustom && (
            <input
              type="text"
              placeholder="Írd be az ország nevét"
              value={data.accidentCountry ?? ""}
              onChange={(e) => onChange("accidentCountry", e.target.value)}
              autoFocus
              className={`min-h-[48px] w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 outline-none transition-colors focus:ring-2 focus:ring-blue-500 ${
                errors.accidentCountry
                  ? "border-red-500 focus:ring-red-400"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
          )}
          {errors.accidentCountry && (
            <p className="text-xs text-red-500">{errors.accidentCountry}</p>
          )}
        </div>
        <Input
          label="Város"
          name="accidentCity"
          value={data.accidentCity ?? ""}
          onChange={handleInput("accidentCity")}
          error={errors.accidentCity}
          placeholder="pl. Tata"
        />
        <Input
          label="Utca, házszám"
          name="accidentStreet"
          value={data.accidentStreet ?? ""}
          onChange={handleInput("accidentStreet")}
          error={errors.accidentStreet}
          placeholder="pl. Kossuth u. 12."
        />
        <RadioGroup
          label="Lakott területen kívül történt?"
          name="outsideSettlement"
          value={data.outsideSettlement ? "true" : "false"}
          onChange={(val) => onChange("outsideSettlement", val === "true")}
          options={[
            { value: "false", label: "Nem (lakott terület)" },
            { value: "true", label: "Igen (lakott területen kívül)" },
          ]}
          error={errors.outsideSettlement}
        />
        {data.outsideSettlement && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Út száma"
              name="roadNumber"
              value={data.roadNumber ?? ""}
              onChange={handleInput("roadNumber")}
              error={errors.roadNumber}
              placeholder="pl. M1, 1-es főút"
            />
            <Input
              label="Kilométer-szelvény"
              name="kilometerMark"
              value={data.kilometerMark ?? ""}
              onChange={handleInput("kilometerMark")}
              error={errors.kilometerMark}
              placeholder="pl. 72+400"
            />
          </div>
        )}
      </section>

      {/* Rendőri intézkedés */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Rendőri intézkedés
        </h2>
        <RadioGroup
          label="Volt rendőri intézkedés?"
          name="policeInvolved"
          value={data.policeInvolved ? "true" : "false"}
          onChange={(val) => onChange("policeInvolved", val === "true")}
          options={[
            { value: "false", label: "Nem" },
            { value: "true", label: "Igen" },
          ]}
          error={errors.policeInvolved}
        />
        {data.policeInvolved && (
          <>
            <Input
              label="R-kap. száma"
              name="policeReportNo"
              value={data.policeReportNo ?? ""}
              onChange={handleInput("policeReportNo")}
              error={errors.policeReportNo}
              placeholder="Rendőrségi kapásszám"
            />
            <Input
              label="Intézkedő kapitányság"
              name="policeStation"
              value={data.policeStation ?? ""}
              onChange={handleInput("policeStation")}
              error={errors.policeStation}
              placeholder="pl. Tatai Rendőrkapitányság"
            />
          </>
        )}
      </section>

      {/* Másik jármű adatai */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
            Másik jármű adatai
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Ha nem volt másik érintett jármű, hagyja üresen
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Rendszám"
            name="otherVehiclePlate"
            value={data.otherVehiclePlate ?? ""}
            onChange={handleInput("otherVehiclePlate")}
            error={errors.otherVehiclePlate}
            placeholder="pl. XYZ-456"
          />
          <Input
            label="Típus"
            name="otherVehicleType"
            value={data.otherVehicleType ?? ""}
            onChange={handleInput("otherVehicleType")}
            error={errors.otherVehicleType}
            placeholder="pl. személyautó"
          />
          <Input
            label="Szín"
            name="otherVehicleColor"
            value={data.otherVehicleColor ?? ""}
            onChange={handleInput("otherVehicleColor")}
            error={errors.otherVehicleColor}
            placeholder="pl. fehér"
          />
        </div>
      </section>

      {/* További résztvevők */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          További résztvevők
        </h2>
        <Textarea
          label="További járművek, személyek adatai"
          name="additionalParties"
          value={data.additionalParties ?? ""}
          onChange={handleTextarea("additionalParties")}
          error={errors.additionalParties}
          placeholder="Rendszám, típus, szín..."
          rows={4}
        />
      </section>

      {/* Szemle adatai */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Szemle adatai
        </h2>
        <label className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={data.vehicleInspectionLocation === WORKSHOP_ADDRESS}
            onChange={(e) =>
              onChange(
                "vehicleInspectionLocation",
                e.target.checked ? WORKSHOP_ADDRESS : ""
              )
            }
            className="w-4 h-4 rounded"
          />
          A jármű az M1 Szerviz Tatánál tekinthető meg
        </label>
        <Input
          label="Hol tekinthető meg a jármű szemlére?"
          name="vehicleInspectionLocation"
          value={data.vehicleInspectionLocation ?? ""}
          onChange={handleInput("vehicleInspectionLocation")}
          error={errors.vehicleInspectionLocation}
          disabled={data.vehicleInspectionLocation === WORKSHOP_ADDRESS}
          placeholder="pl. M1 Szerviz Tata, 2890 Tata, Ipartelep u. 1."
        />
      </section>
    </div>
  )
}
