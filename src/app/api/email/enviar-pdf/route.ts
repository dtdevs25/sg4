import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { tecnicoEmail, base64Pdf, fileName } = body

    if (!tecnicoEmail) {
      return NextResponse.json({ success: false, error: 'E-mail do destinatário não informado.' }, { status: 400 })
    }

    if (!base64Pdf) {
      return NextResponse.json({ success: false, error: 'PDF não informado.' }, { status: 400 })
    }

    const base64Data = base64Pdf.includes('base64,') ? base64Pdf.split('base64,')[1] : base64Pdf

    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'srv-captain--mailserver',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'sg4@ehspro.com.br',
        pass: process.env.SMTP_PASS || 'nova@2026',
      },
      tls: { rejectUnauthorized: false }
    })

    await transporter.sendMail({
      from: `"SG4 - Gestão de Segurança do Trabalho" <${process.env.SMTP_USER || 'sg4@ehspro.com.br'}>`,
      to: tecnicoEmail,
      subject: `Relatório Consolidado de Produtividade - SG4`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px;">
          <h2 style="color: #660099;">Relatório de Produtividade</h2>
          <p>Olá,</p>
          <p>Segue em anexo o relatório de Produtividade (DSS e Inspeções) gerado no sistema SG4.</p>
          <br/>
          <p style="font-size: 12px; color: #888;">Este é um e-mail automático enviado pelo painel executivo SG4.</p>
        </div>
      `,
      attachments: [
        {
          filename: fileName || 'relatorio.pdf',
          content: base64Data,
          encoding: 'base64'
        }
      ]
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao enviar email com PDF:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Erro ao enviar e-mail' }, { status: 500 })
  }
}
