interface RadioOption {
  value: string
  label: string
}

interface RadioGroupProps {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  options: RadioOption[]
  error?: string
}

export default function RadioGroup({
  label,
  name,
  value,
  onChange,
  options,
  error,
}: RadioGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex flex-row gap-6">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2 min-h-[48px] cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
