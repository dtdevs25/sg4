import nodemailer from 'nodemailer'

export type MailAttachment = {
  filename: string
  content?: Buffer | string
  path?: string
  contentType?: string
  encoding?: string
}

function createSmtpTransport() {
  const port = Number(process.env.SMTP_PORT) || 587
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'srv-captain--mailserver',
    port,
    secure: port === 465, // true para 465, false para 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER || 'sg4@ehspro.com.br',
      pass: process.env.SMTP_PASS || 'nova@2026',
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    pool: false, // Conexão fresca a cada envio para evitar "Connection closed unexpectedly"
  } as any)
}

export async function sendMail({
  to,
  cc,
  bcc,
  subject,
  html,
  attachments,
}: {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html: string
  attachments?: MailAttachment[]
}) {
  const from = `"SG4 - Gestão de Segurança do Trabalho" <${process.env.SMTP_USER || 'sg4@ehspro.com.br'}>`

  // Tentativa 1 com nova conexão SMTP
  try {
    const transporter = createSmtpTransport()
    const info = await transporter.sendMail({
      from,
      to,
      cc,
      bcc,
      subject,
      html,
      attachments,
    })
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('Erro ao enviar e-mail (tentativa 1):', error?.message || error)

    // Tentativa 2 após 2 segundos de respiro
    try {
      await new Promise(res => setTimeout(res, 2000))
      const retryTransporter = createSmtpTransport()
      const retryInfo = await retryTransporter.sendMail({
        from,
        to,
        cc,
        bcc,
        subject,
        html,
        attachments,
      })
      console.log('E-mail enviado com sucesso na tentativa 2:', retryInfo.messageId)
      return { success: true, messageId: retryInfo.messageId }
    } catch (retryError: any) {
      console.error('Erro ao enviar e-mail (tentativa 2):', retryError?.message || retryError)
      return { success: false, error: retryError }
    }
  }
}
