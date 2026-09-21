interface RadioOption {
  value: string
  label: string
  description?: string
}

interface RadioGroupProps {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  options: RadioOption[]
  error?: string
  required?: boolean
}

// Kártya-stílusú, kizárólagos választó: az egész kártya kattintható (tableten, ujjal is
// biztosan eltalálható), a kiválasztott opció kék kerettel és háttérrel kiemelve.
export default function RadioGroup({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required,
}: RadioGroupProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <label
              key={opt.value}
              className={`flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-xl border-2 cursor-pointer select-none transition-colors ${
                selected
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400"
                  : error
                    ? "border-red-300 bg-white dark:bg-gray-800 hover:border-red-400"
                    : "border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 hover:border-blue-400"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="h-5 w-5 shrink-0 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex flex-col">
                <span
                  className={`text-base ${
                    selected
                      ? "font-semibold text-blue-900 dark:text-blue-100"
                      : "text-gray-800 dark:text-gray-200"
                  }`}
                >
                  {opt.label}
                </span>
                {opt.description && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</span>
                )}
              </span>
            </label>
          )
        })}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </fieldset>
  )
}
