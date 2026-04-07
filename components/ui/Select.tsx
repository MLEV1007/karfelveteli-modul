interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: SelectOption[]
  error?: string
  required?: boolean
}

export default function Select({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required,
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`min-h-[48px] w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 outline-none transition-colors focus:ring-2 focus:ring-blue-500 ${
          error
            ? "border-red-500 focus:ring-red-400"
            : "border-gray-300 dark:border-gray-600"
        }`}
      >
        <option value="">— Válasszon —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
