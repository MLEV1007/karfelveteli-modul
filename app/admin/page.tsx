// Admin főoldal: a kitöltések listája (szerver oldali szűrés, keresés, lapozás).
import type { Metadata } from "next"
import Link from "next/link"
import { requireAdminPage } from "@/lib/adminSession"
import { prisma } from "@/lib/db"
import {
  PAGE_SIZE,
  REPORT_LIST_ORDER_BY,
  REPORT_STATUS_VALUES,
  STATUS_LABELS,
  buildListHref,
  buildReportWhere,
  pageSkip,
  parseReportListQuery,
  totalPages,
} from "@/lib/adminReportList"
import { DAMAGE_TYPE_OPTIONS } from "@/lib/damageTypes"
import { getInsuranceCompanyLabel, sortedInsuranceOptions, type InsuranceCompanyValue } from "@/lib/validation"
import { formatDateTime } from "@/lib/adminReportView"
import AdminShell from "@/components/admin/AdminShell"
import StatusBadge from "@/components/admin/StatusBadge"
import Card from "@/components/ui/Card"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Kitöltések — Admin", robots: { index: false, follow: false } }

type SearchParams = Record<string, string | string[] | undefined>

const fieldClass =
  "min-h-[44px] w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
const labelClass = "text-xs font-medium text-gray-600 dark:text-gray-400"

function damageTypeLabel(value: string | null): string {
  if (!value) return "—"
  return DAMAGE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export default async function AdminReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdminPage()
  const { filters, page, ignored } = parseReportListQuery(searchParams)

  let rows: {
    id: string
    referenceNumber: string
    createdAt: Date
    ownerName: string
    vehiclePlate: string
    insuranceCompany: string | null
    insuranceCompanyOther: string | null
    damageType: string | null
    status: string
  }[] = []
  let total = 0
  let loadError = false
  try {
    const where = buildReportWhere(filters)
    ;[rows, total] = await Promise.all([
      prisma.damageReport.findMany({
        where,
        orderBy: REPORT_LIST_ORDER_BY,
        skip: pageSkip(page),
        take: PAGE_SIZE,
        select: {
          id: true,
          referenceNumber: true,
          createdAt: true,
          ownerName: true,
          vehiclePlate: true,
          insuranceCompany: true,
          insuranceCompanyOther: true,
          damageType: true,
          status: true,
        },
      }),
      prisma.damageReport.count({ where }),
    ])
  } catch (error) {
    console.error("Admin lista lekérdezési hiba:", error instanceof Error ? error.name : "ismeretlen")
    loadError = true
  }

  const pages = totalPages(total)
  const hasFilters = !!(filters.q || filters.status || filters.insurance || filters.damageType || filters.from || filters.to)

  return (
    <AdminShell adminName={admin.name} active="kitoltesek">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Kitöltések</h1>

      <Card className="mb-4">
        <form method="get" action="/admin" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="sm:col-span-2 lg:col-span-2 flex flex-col gap-1">
            <label htmlFor="q" className={labelClass}>Keresés (rendszám, név, e-mail, BIZT-szám, telefon)</label>
            <input id="q" name="q" type="search" defaultValue={filters.q} maxLength={100} placeholder="pl. ABC-123, Kovács, BIZT0012" className={fieldClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className={labelClass}>Állapot</label>
            <select id="status" name="status" defaultValue={filters.status ?? ""} className={fieldClass}>
              <option value="">Mind</option>
              {REPORT_STATUS_VALUES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}{s === "FAILED_PDF" ? " (FAILED_PDF)" : ""}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="insurance" className={labelClass}>Biztosító</label>
            <select id="insurance" name="insurance" defaultValue={filters.insurance ?? ""} className={fieldClass}>
              <option value="">Mind</option>
              {sortedInsuranceOptions().map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="damageType" className={labelClass}>Kártípus</label>
            <select id="damageType" name="damageType" defaultValue={filters.damageType ?? ""} className={fieldClass}>
              <option value="">Mind</option>
              {DAMAGE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="from" className={labelClass}>Beküldve ettől</label>
            <input id="from" name="from" type="date" defaultValue={filters.from ?? ""} className={fieldClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="to" className={labelClass}>Beküldve eddig</label>
            <input id="to" name="to" type="date" defaultValue={filters.to ?? ""} className={fieldClass} />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
            <button type="submit" className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Szűrés
            </button>
            {hasFilters && (
              <Link href="/admin" className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800">
                Szűrők törlése
              </Link>
            )}
          </div>
        </form>
      </Card>

      {ignored.length > 0 && (
        <p role="status" className="mb-3 text-sm text-amber-700 dark:text-amber-300">
          Néhány szűrőérték érvénytelen volt, ezeket figyelmen kívül hagytuk.
        </p>
      )}

      {loadError ? (
        <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200 text-sm">
          A lista betöltése nem sikerült (adatbázis-hiba). Próbáld újra később.
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {total} találat{pages > 1 ? ` — ${page}. oldal / ${pages}` : ""}
          </p>

          {rows.length === 0 ? (
            <Card>
              <p className="text-sm text-gray-600 dark:text-gray-400">Nincs a feltételeknek megfelelő kitöltés.</p>
            </Card>
          ) : (
            <>
              {/* Asztali nézet: táblázat */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-left text-xs uppercase text-gray-600 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-4 py-3">Dátum</th>
                      <th scope="col" className="px-4 py-3">Azonosító</th>
                      <th scope="col" className="px-4 py-3">Ügyfél</th>
                      <th scope="col" className="px-4 py-3">Rendszám</th>
                      <th scope="col" className="px-4 py-3">Biztosító</th>
                      <th scope="col" className="px-4 py-3">Kártípus</th>
                      <th scope="col" className="px-4 py-3">Állapot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatDateTime(r.createdAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link href={`/admin/kitoltesek/${r.id}`} className="font-medium text-blue-700 dark:text-blue-300 hover:underline">
                            {r.referenceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{r.ownerName}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-900 dark:text-gray-100">{r.vehiclePlate.toUpperCase()}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {getInsuranceCompanyLabel(r.insuranceCompany as InsuranceCompanyValue | null, r.insuranceCompanyOther)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{damageTypeLabel(r.damageType)}</td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobil nézet: kártyák */}
              <ul className="md:hidden space-y-3">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/kitoltesek/${r.id}`}
                      className="block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 active:bg-gray-50 dark:active:bg-gray-800"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-semibold text-blue-700 dark:text-blue-300">{r.referenceNumber}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {r.ownerName} · <span className="font-mono">{r.vehiclePlate.toUpperCase()}</span>
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {formatDateTime(r.createdAt)} · {getInsuranceCompanyLabel(r.insuranceCompany as InsuranceCompanyValue | null, r.insuranceCompanyOther)} · {damageTypeLabel(r.damageType)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {pages > 1 && (
            <nav aria-label="Lapozás" className="mt-4 flex items-center justify-between gap-2">
              {page > 1 ? (
                <Link href={buildListHref(filters, page - 1)} className="inline-flex items-center min-h-[44px] px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  ← Előző
                </Link>
              ) : <span />}
              <span className="text-sm text-gray-600 dark:text-gray-400">{page} / {pages}</span>
              {page < pages ? (
                <Link href={buildListHref(filters, page + 1)} className="inline-flex items-center min-h-[44px] px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Következő →
                </Link>
              ) : <span />}
            </nav>
          )}
        </>
      )}
    </AdminShell>
  )
}
