"use client"

import Button from "@/components/ui/Button"

const PenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mr-2 shrink-0">
    <path
      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      fill="currentColor"
    />
  </svg>
)

interface SignatureFieldProps {
  label: string
  required?: boolean
  value: string
  error?: string
  onOpen: () => void
  onClear: () => void
}

// Egy aláírás-mező előnézettel: ha nincs még aláírás, egy nagy "Aláírás"
// gomb nyitja meg a SignatureModal-t; ha már van, a mentett kép látszik és
// "Aláírás módosítása" gombbal újranyitható. Ugyanezt a komponenst használja
// az ügyfél-oldali kárfelvételi űrlap (Step6Signature) és a műhelyes
// Jegyzőkönyv-lezáró űrlap (JegyzokonyvForm) is.
export default function SignatureField({
  label,
  required,
  value,
  error,
  onOpen,
  onClear,
}: SignatureFieldProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </p>

      {value ? (
        <div className="rounded-lg border overflow-hidden bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`${label} - aláírás`}
            className="h-[140px] w-full object-contain"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="flex h-[140px] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:bg-blue-950/40"
        >
          <span className="flex items-center text-sm font-medium">
            <PenIcon />
            Aláírás
          </span>
          <span className="text-xs">Koppintson vagy kattintson az aláíráshoz</span>
        </button>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={onOpen} type="button">
          {value ? "Aláírás módosítása" : "Aláírás megnyitása"}
        </Button>
        {value && (
          <Button variant="secondary" onClick={onClear} type="button">
            Törlés
          </Button>
        )}
      </div>
    </div>
  )
}
