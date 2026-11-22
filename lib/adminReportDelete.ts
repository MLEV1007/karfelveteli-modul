// Kárfelvétel végleges törlése (admin). A sorrend szándékos:
// 1) DB tranzakció: a rekord audit-bejegyzései és maga a DamageReport sor törlődik. Ha ez hibázik,
//    semmi nem törlődött, és a fájlok sem.
// 2) Fájlok (fotók R2-ben; aláírások és PDF-ek Supabase Storage-ben) törlése utólag, best-effort.
//    Ha valamelyik fájl törlése elbukik, a DB már nincs rá hivatkozva, így csak árva fájl marad:
//    ezt a hívó figyelmeztetésként kapja vissza (storageWarning), nem hiba.
import type { DamageReport } from "@prisma/client"
import { prisma } from "./db"
import { deleteR2ObjectByUrl } from "./r2"
import { deleteStorageObjectByUrl } from "./storage"

export type DeleteReportOutcome =
  | { ok: true; storageFailures: number; storageWarning?: string }
  | { ok: false; reason: "not_found" | "reference_mismatch" }

function stringUrls(values: unknown[]): string[] {
  return values.filter((v): v is string => typeof v === "string" && v.length > 0)
}

function authorizationUrls(json: unknown): string[] {
  if (!json || typeof json !== "object" || Array.isArray(json)) return []
  return stringUrls(Object.values(json as Record<string, unknown>))
}

export async function deleteReportPermanently(
  id: string,
  referenceNumber: string
): Promise<DeleteReportOutcome> {
  const report: DamageReport | null = await prisma.damageReport.findUnique({ where: { id } })
  if (!report) return { ok: false, reason: "not_found" }
  if (report.referenceNumber !== referenceNumber) return { ok: false, reason: "reference_mismatch" }

  // Fájl-URL-ek a törlés előtt (a sor törlése után már nincs honnan olvasni)
  const photoUrls = stringUrls(report.photoUrls)
  const signatureUrls = stringUrls([report.ownerSignatureUrl, report.driverSignatureUrl, report.technicianSignatureUrl])
  const pdfUrls = stringUrls([report.finalPdfUrl, ...authorizationUrls(report.authorizationPdfUrls)])

  // Audit-bejegyzések: a korábbi mezőértékeket (személyes adat) tartalmazó diffek is törlődnek,
  // ugyanebben a tranzakcióban, mint maga a rekord.
  await prisma.$transaction([
    prisma.adminAuditLog.deleteMany({ where: { reportId: id } }),
    prisma.damageReport.delete({ where: { id } }),
  ])

  let storageFailures = 0
  for (const url of photoUrls) {
    if (!(await deleteR2ObjectByUrl(url))) storageFailures++
  }
  for (const url of signatureUrls) {
    if (!(await deleteStorageObjectByUrl("signatures", url))) storageFailures++
  }
  for (const url of pdfUrls) {
    if (!(await deleteStorageObjectByUrl("reports", url))) storageFailures++
  }

  return {
    ok: true,
    storageFailures,
    storageWarning:
      storageFailures > 0
        ? `A kárfelvétel törölve, de ${storageFailures} fájl törlése nem sikerült (árva fájlok maradhatnak a tárolóban).`
        : undefined,
  }
}
