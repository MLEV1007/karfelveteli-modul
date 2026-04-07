import { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 ${className}`}
    >
      {children}
    </div>
  )
}
