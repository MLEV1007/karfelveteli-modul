import { Resend } from "resend"
import CustomerEmail from "@/emails/CustomerEmail"
import WorkshopEmail from "@/emails/WorkshopEmail"
import type { DamageReportInput } from "./validation"

interface EmailData extends DamageReportInput {
  id: string
  createdAt: Date
  editToken?: string
}

export async function sendReportEmails(
  data: EmailData,
  pdfBuffer: Buffer
): Promise<void> {
  // Lazy initialization - csak runtime-ban inicializálunk
  const resend = new Resend(process.env.RESEND_API_KEY)

  const pdfAttachment = {
    filename: `karfelvetel-${data.vehiclePlate}-${data.id.slice(-8)}.pdf`,
    content: pdfBuffer,
  }

  // 1. Email az ügyfélnek
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: data.customerEmail,
    subject: `Kárfelvételi visszaigazolás — ${data.vehiclePlate.toUpperCase()}`,
    react: CustomerEmail({ data }),
    attachments: [pdfAttachment],
  })

  // 2. Email a műhelynek (több cím is megadható WORKSHOP_EMAIL_2, stb.)
  const workshopRecipients = [
    process.env.WORKSHOP_EMAIL!,
    process.env.WORKSHOP_EMAIL_2,
  ].filter(Boolean) as string[]

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: workshopRecipients,
    subject: `Új kárfelvétel — ${data.vehiclePlate.toUpperCase()} — ${new Intl.DateTimeFormat("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(data.createdAt)}`,
    react: WorkshopEmail({ data }),
    attachments: [pdfAttachment],
  })
}
