interface TextareaProps {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  error?: string
  required?: boolean
  placeholder?: string
  rows?: number
}

export default function Textarea({
  label,
  name,
  value,
  onChange,
  error,
  required,
  placeholder,
  rows = 4,
}: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 outline-none transition-colors focus:ring-2 focus:ring-blue-500 resize-y ${
          error
            ? "border-red-500 focus:ring-red-400"
            : "border-gray-300 dark:border-gray-600"
        }`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
