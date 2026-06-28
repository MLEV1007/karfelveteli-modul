"use client"

import { useState } from "react"

interface Option {
  value: string
  label: string
}

interface SelectWithOtherProps {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  error?: string
  required?: boolean
  helperText?: string
  /** "inline": a szabadszöveg egyenesen a value-ba kerül (pl. a baleset országánál is ez a minta).
   *  "companion": a value egy rögzített "egyéb" jelölőértéken marad, a szabadszöveg egy külön mezőbe kerül. */
  mode?: "inline" | "companion"
  /** A "companion" módhoz tartozó szabadszöveg-mező értéke és módosítója. */
  otherValue?: string
  onOtherChange?: (value: string) => void
  otherError?: string
  /** A választósorban az "egyéb" opciót jelölő érték. Companion módban ennek már szerepelnie kell az options listában. */
  otherTriggerValue?: string
  otherPlaceholder?: string
}

export default function SelectWithOther({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required,
  helperText,
  mode = "inline",
  otherValue,
  onOtherChange,
  otherError,
  otherTriggerValue = "__EGYEB__",
  otherPlaceholder = "Írja be a biztosító nevét",
}: SelectWithOtherProps) {
  const knownValues = options.map((opt) => opt.value)
  const isCustomInline = mode === "inline" && !!value && !knownValues.includes(value)
  const [showOther, setShowOther] = useState(
    mode === "companion" ? value === otherTriggerValue : isCustomInline
  )

  const selectValue = mode === "companion" ? value : showOther ? otherTriggerValue : value

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value
    if (next === otherTriggerValue) {
      setShowOther(true)
      onChange(mode === "inline" ? "" : next)
    } else {
      setShowOther(false)
      onChange(next)
      if (mode === "companion") onOtherChange?.("")
    }
  }

  const inputClass = (hasError?: string) =>
    `min-h-[48px] w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 outline-none transition-colors focus:ring-2 focus:ring-blue-500 ${
      hasError ? "border-red-500 focus:ring-red-400" : "border-gray-300 dark:border-gray-600"
    }`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {helperText && <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>}
      <select id={name} name={name} value={selectValue} onChange={handleSelectChange} className={inputClass(error)}>
        <option value="">— Válasszon —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {mode === "inline" && <option value={otherTriggerValue}>Egyéb...</option>}
      </select>
      {showOther && (
        <input
          type="text"
          autoFocus
          placeholder={otherPlaceholder}
          value={mode === "companion" ? otherValue ?? "" : value}
          onChange={(e) =>
            mode === "companion" ? onOtherChange?.(e.target.value) : onChange(e.target.value)
          }
          className={inputClass(mode === "companion" ? otherError : error)}
        />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {mode === "companion" && otherError && <p className="text-xs text-red-500">{otherError}</p>}
    </div>
  )
}
