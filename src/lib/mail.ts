import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'srv-captain--mailserver',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'sg4@ehspro.com.br',
    pass: process.env.SMTP_PASS || 'nova@2026',
  },
  tls: {
    rejectUnauthorized: false
  }
})

export type MailAttachment = {
  filename: string
  content?: Buffer | string
  path?: string
  contentType?: string
}

export async function sendMail({
  to,
  cc,
  subject,
  html,
  attachments,
}: {
  to: string
  cc?: string
  subject: string
  html: string
  attachments?: MailAttachment[]
}) {
  try {
    const info = await transporter.sendMail({
      from: `"SG4 - Gestão de Segurança do Trabalho" <${process.env.SMTP_USER || 'sg4@ehspro.com.br'}>`,
      to,
      cc,
      subject,
      html,
      attachments,
    })
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error)
    return { success: false, error }
  }
}
