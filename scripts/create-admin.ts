// Admin felhasználó létrehozása (egyszer) vagy 2FA újragenerálása (--reset-2fa).
// Futtatás: npx tsx --env-file=.env.local scripts/create-admin.ts [--reset-2fa]
// Interaktív: az e-mailt és a jelszót a terminálon kéri (jelszó rejtve, NEM parancssori argumentum).
// Titkos adat nem kerül fájlba/logba; a TOTP-titok és a helyreállító kódok csak egyszer, a képernyőre íródnak.
import { createInterface } from "node:readline"
import { prisma } from "../lib/db"
import { getTotpEncKey } from "../lib/adminCrypto"
import { runAdminSetup, type AdminStore, type SetupIo } from "../lib/adminSetup"

function askVisible(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin
    process.stdout.write(question)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding("utf8")
    let value = ""
    const onData = (chunk: string) => {
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i]
        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.off("data", onData)
          process.stdout.write("\n")
          resolve(value)
          return
        }
        if (ch === "\u0003") {
          stdin.setRawMode(false)
          stdin.off("data", onData)
          process.stdout.write("\n")
          reject(new Error("Megszakítva"))
          return
        }
        if (ch === "\u007f" || ch === "\b") value = Array.from(value).slice(0, -1).join("")
        else value += ch
      }
    }
    stdin.on("data", onData)
  })
}

const store: AdminStore = {
  countAdmins: () => prisma.adminUser.count(),
  findByEmail: (email) =>
    prisma.adminUser.findUnique({ where: { email }, select: { id: true, email: true, name: true } }),
  async createAdmin(data) {
    await prisma.adminUser.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        totpSecretEnc: data.totpSecretEnc,
        totpEnabledAt: data.totpEnabledAt,
        lastTotpStep: data.lastTotpStep,
        recoveryCodes: { create: data.recoveryCodeHashes.map((codeHash) => ({ codeHash })) },
      },
    })
  },
  async replaceTotp(adminId, data) {
    await prisma.$transaction([
      prisma.adminRecoveryCode.deleteMany({ where: { adminUserId: adminId } }),
      prisma.adminUser.update({
        where: { id: adminId },
        data: {
          totpSecretEnc: data.totpSecretEnc,
          totpEnabledAt: data.totpEnabledAt,
          lastTotpStep: data.lastTotpStep,
          failedLoginCount: 0,
          lockedUntil: null,
          recoveryCodes: { create: data.recoveryCodeHashes.map((codeHash) => ({ codeHash })) },
        },
      }),
    ])
  },
}

async function main(): Promise<number> {
  if (!process.stdin.isTTY) {
    console.error("Interaktív terminál szükséges (a jelszó nem adható át csővezetéken vagy argumentumként).")
    return 1
  }
  try {
    getTotpEncKey() // fail-closed: hiányzó/hibás ADMIN_TOTP_ENC_KEY esetén érthető hiba, DB-hívás előtt
  } catch (error) {
    console.error((error as Error).message)
    console.error("Töltsd ki a .env.local-ban, majd futtasd újra.")
    return 1
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL hiányzik (futtatás: npx tsx --env-file=.env.local scripts/create-admin.ts).")
    return 1
  }

  const io: SetupIo = { ask: askVisible, askHidden, print: (line) => console.log(line) }
  const resetTotp = process.argv.slice(2).includes("--reset-2fa")
  const unknown = process.argv.slice(2).filter((a) => a !== "--reset-2fa")
  if (unknown.length > 0) {
    console.error("Ismeretlen argumentum. Egyetlen támogatott kapcsoló: --reset-2fa")
    return 1
  }
  try {
    return await runAdminSetup(io, store, { resetTotp })
  } catch (error) {
    console.error("Hiba:", error instanceof Error ? error.message : "ismeretlen")
    return 1
  } finally {
    await prisma.$disconnect()
  }
}

main().then((code) => process.exit(code))
