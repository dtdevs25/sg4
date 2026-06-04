'use server'

import { prisma } from '@/lib/db'
import { sendMail } from '@/lib/mail'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function forgotPassword(email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    
    if (!user) {
      return { success: false, error: 'E-mail não cadastrado. Por favor, contate o administrador do sistema.' }
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hora de validade

    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry
      }
    })

    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #660099;">SG4 Dashboard - Recuperação de Senha</h2>
        <p>Olá, <b>${user.name}</b>!</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Para criar uma nova senha, clique no botão abaixo:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #660099; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Redefinir Senha</a>
        </div>
        <p style="font-size: 14px; color: #666;">Se você não solicitou a redefinição de senha, apenas ignore este e-mail.</p>
        <p style="font-size: 14px; color: #666;">Este link é válido por 1 hora.</p>
      </div>
    `

    const mailRes = await sendMail({
      to: email,
      subject: 'SG4 Dashboard - Recuperação de Senha',
      html
    })

    if (!mailRes.success) {
      console.error('Erro de e-mail:', mailRes.error)
      return { success: false, error: 'Erro ao enviar e-mail. Tente novamente mais tarde.' }
    }

    return { success: true }
  } catch (error) {
    console.error('Erro no forgotPassword:', error)
    return { success: false, error: 'Ocorreu um erro inesperado.' }
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    if (!token || !newPassword) {
      return { success: false, error: 'Dados inválidos.' }
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date() // verifica se ainda não expirou
        }
      }
    })

    if (!user) {
      return { success: false, error: 'Token inválido ou expirado. Por favor, solicite a recuperação de senha novamente.' }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Erro no resetPassword:', error)
    return { success: false, error: 'Ocorreu um erro inesperado.' }
  }
}
