import { Resend } from "resend"
import CustomerEmail from "@/emails/CustomerEmail"
import CustomerSubmissionEmail from "@/emails/CustomerSubmissionEmail"
import WorkshopEmail from "@/emails/WorkshopEmail"
import TechnicianNotificationEmail from "@/emails/TechnicianNotificationEmail"
import type { DamageReportInput } from "./validation"

interface EmailData extends DamageReportInput {
  id: string
  referenceNumber: string
  createdAt: Date
  editToken?: string
}

// A WORKSHOP_EMAIL env változóban vesszővel elválasztva több cím is megadható
// (pl. "muhely@example.hu, masik@example.hu") — a műhelynek szóló minden email
// ekkor mindegyik felsorolt címre megy.
function getWorkshopRecipients(): string[] {
  return process.env.WORKSHOP_EMAIL!.split(",")
    .map((email) => email.trim())
    .filter(Boolean)
}

// Teszt mód: ha a TEST_RECIPIENT_EMAIL env változó be van állítva, minden kimenő email
// (ügyfélnek és műhelynek szóló is) ide megy a tényleges címzett helyett — a valós ügyfelek
// és a műhely postafiókja teszteléskor nem kap emailt. Élesben ne legyen beállítva.
function resolveRecipients(actual: string | string[]): string | string[] {
  const testRecipient = process.env.TEST_RECIPIENT_EMAIL
  return testRecipient ? testRecipient : actual
}

// Ügyfél beküldése után — a technikusnak szóló értesítés a jegyzőkönyv linkkel.
// Még NINCS végleges PDF (a technikus jegyzőkönyve hiányzik), ezért melléklet nélkül megy ki.
export async function sendTechnicianNotification(data: {
  vehiclePlate: string
  ownerName: string
  createdAt: Date
  munkalapUrl: string
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: resolveRecipients(getWorkshopRecipients()),
    subject: `Jegyzőkönyv kitöltése szükséges — ${data.vehiclePlate.toUpperCase()}`,
    react: TechnicianNotificationEmail(data),
  })
}

// Ügyfél beküldése után azonnal — visszaigazolás, még a jegyzőkönyv lezárása előtt
// (nincs végleges PDF, nincs szerkesztési link — az ügyfél szándékosan nem szerkeszthet önállóan).
export async function sendCustomerSubmissionEmail(data: {
  customerEmail: string
  ownerName: string
  vehiclePlate: string
  vehicleMake: string
  vehicleModel: string
  referenceNumber: string
  createdAt: Date
  photoUrls?: string[]
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: resolveRecipients(data.customerEmail),
    subject: `Kárfelvétel beérkezett — ${data.vehiclePlate.toUpperCase()}`,
    react: CustomerSubmissionEmail(data),
  })
}

// A technikus lezárása után — a végleges, összevont PDF-fel mindkét fél értesítést kap.
export async function sendFinalReportEmails(
  data: EmailData,
  pdfBuffer: Buffer
): Promise<void> {
  // Lazy initialization - csak runtime-ban inicializálunk
  const resend = new Resend(process.env.RESEND_API_KEY)

  const pdfAttachment = {
    filename: `karfelvetel-${data.vehiclePlate}-${data.referenceNumber}.pdf`,
    content: pdfBuffer,
  }

  // 1. Email az ügyfélnek
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: resolveRecipients(data.customerEmail),
    subject: `Kárfelvételi visszaigazolás — ${data.vehiclePlate.toUpperCase()}`,
    react: CustomerEmail({ data }),
    attachments: [pdfAttachment],
  })

  // 2. Email a műhelynek
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: resolveRecipients(getWorkshopRecipients()),
    subject: `Új kárfelvétel — ${data.vehiclePlate.toUpperCase()} — ${new Intl.DateTimeFormat("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(data.createdAt)}`,
    react: WorkshopEmail({ data }),
    attachments: [pdfAttachment],
  })
}
