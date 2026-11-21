import Link from "next/link"
import type { ReactNode } from "react"
import LogoutButton from "@/app/admin/login/LogoutButton"

interface AdminShellProps {
  adminName: string
  active: "kitoltesek" | "tanuk"
  children: ReactNode
}

const NAV = [
  { key: "kitoltesek", href: "/admin", label: "Kitöltések" },
  { key: "tanuk", href: "/admin/tanuk", label: "Tanúk" },
] as const

// Közös admin keret: felső navigáció (Kitöltések, Tanúk) + kijelentkezés. Mobilon a sáv tördelődik.
export default function AdminShell({ adminName, active, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav
        aria-label="Admin navigáció"
        className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
      >
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-2 gap-y-2">
          <div className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active === item.key ? "page" : undefined}
                className={`min-h-[44px] inline-flex items-center px-4 rounded-lg text-sm font-medium transition-colors ${
                  active === item.key
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">{adminName}</span>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
