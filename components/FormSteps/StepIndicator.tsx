interface StepIndicatorProps {
  currentStep: number
  steps: string[]
}

export default function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <nav aria-label="Form lépések" className="w-full mb-8">
      <ol className="flex items-center justify-between relative">
        {steps.map((stepLabel, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isActive = stepNumber === currentStep

          return (
            <li key={stepNumber} className="flex flex-col items-center flex-1 relative">
              {/* Összekötő vonal (az első elem előtt nincs) */}
              {index > 0 && (
                <div
                  className={`absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                    isCompleted ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}

              {/* Kör */}
              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>

              {/* Lépés neve */}
              <span
                className={`mt-2 text-xs text-center leading-tight ${
                  isActive ? "text-blue-600 font-medium" : "text-gray-500"
                } ${isActive ? "" : "hidden sm:block"}`}
              >
                {stepLabel}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
