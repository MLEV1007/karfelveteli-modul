import { ReactNode } from "react"

interface CheckboxProps {
  label: ReactNode
  name: string
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
}

export default function Checkbox({ label, name, checked, onChange, error }: CheckboxProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={name}
        className="flex items-start gap-3 min-h-[48px] cursor-pointer"
      >
        <input
          id={name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
