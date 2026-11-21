// Folyamaton belüli (egy Node-példányra érvényes) zár a hosszú admin műveletekhez
// (dokumentum-újragenerálás, újrapróbálás, link-küldés), hogy a dupla kattintás / párhuzamos
// kérés ne indítson két egyidejű futást ugyanarra a rekordra. Több példányos telepítésnél
// ez nem elég — ott DB-szintű zár kellene (séma-módosítást igényelne).
const globalForLocks = globalThis as unknown as { __adminLocks?: Set<string> }
const locks: Set<string> = (globalForLocks.__adminLocks ??= new Set<string>())

export type LockResult<T> = { busy: true } | { busy: false; value: T }

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<LockResult<T>> {
  if (locks.has(key)) return { busy: true }
  locks.add(key)
  try {
    return { busy: false, value: await fn() }
  } finally {
    locks.delete(key)
  }
}
