import React from "react"

interface FormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

export default function FormSection({
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
