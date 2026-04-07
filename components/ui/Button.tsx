import { ReactNode } from "react"

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: "button" | "submit" | "reset"
  variant?: "primary" | "secondary"
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
}

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  loading,
  fullWidth,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center min-h-[48px] px-6 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary:
      "border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-gray-400 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800",
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""}`}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Kérjük várjon...
        </>
      ) : (
        children
      )}
    </button>
  )
}
