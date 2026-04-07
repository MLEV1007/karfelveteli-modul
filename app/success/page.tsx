import Link from "next/link"

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
        {/* Zöld pipa ikon */}
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Fő üzenet */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Köszönjük!
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-3">
          Kárfelvétele sikeresen beérkezett.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
          Visszaigazolást küldtünk a megadott e-mail címre. Munkatársunk hamarosan
          felveszi Önnel a kapcsolatot.
        </p>

        {/* Vissza gomb */}
        <Link
          href="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
        >
          Vissza a főoldalra
        </Link>
      </div>
    </main>
  )
}
