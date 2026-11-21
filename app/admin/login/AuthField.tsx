"use client"

// Admin-specifikus beviteli mező: a meglévő Input stílusával, de autoComplete / inputMode / pattern
// támogatással és hozzáférhető hibakezeléssel (a közös components/ui/Input ezeket nem tudja).
import type { ChangeEvent } from "react"

interface AuthFieldProps {
  label: string
  name: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  type?: string
  autoComplete?: string
  inputMode?: "text" | "numeric" | "email"
  pattern?: string
  maxLength?: number
  required?: boolean
  autoFocus?: boolean
  hint?: string
  describedBy?: string
  invalid?: boolean
  spellCheck?: boolean
  autoCapitalize?: string
}

export default function AuthField({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  pattern,
  maxLength,
  required,
  autoFocus,
  hint,
  describedBy,
  invalid,
  spellCheck,
  autoCapitalize,
}: AuthFieldProps) {
  const hintId = hint ? `${name}-hint` : undefined
  const described = [hintId, describedBy].filter(Boolean).join(" ") || undefined
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        maxLength={maxLength}
        required={required}
        autoFocus={autoFocus}
        spellCheck={spellCheck}
        autoCapitalize={autoCapitalize}
        aria-invalid={invalid || undefined}
        aria-describedby={described}
        className={`min-h-[48px] w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 outline-none transition-colors focus:ring-2 focus:ring-blue-500 ${
          invalid ? "border-red-500 focus:ring-red-400" : "border-gray-300 dark:border-gray-600"
        }`}
      />
      {hint && (
        <p id={hintId} className="text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
    </div>
  )
}
