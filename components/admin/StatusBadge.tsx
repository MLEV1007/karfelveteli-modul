import { STATUS_BADGE_CLASSES, STATUS_LABELS, type ReportStatusValue } from "@/lib/adminReportList"

export default function StatusBadge({ status }: { status: string }) {
  const known = status in STATUS_LABELS
  const cls = known
    ? STATUS_BADGE_CLASSES[status as ReportStatusValue]
    : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {known ? STATUS_LABELS[status as ReportStatusValue] : status}
    </span>
  )
}
