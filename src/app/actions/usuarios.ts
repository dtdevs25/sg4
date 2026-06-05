'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { sendMail } from '@/lib/mail'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function getUsuarios() {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role

    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Acesso negado' }
    }

    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastLogin: true,
        createdAt: true,
        tecnico: { select: { id: true, nome: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return { success: true, data: usuarios }
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return { success: false, error: 'Erro ao buscar usuários' }
  }
}

export async function toggleUserStatus(id: string) {
  try {
    const session = await auth()
    const currentRole = (session?.user as any)?.role
    const currentUserId = session?.user?.id

    if (currentRole !== 'MASTER' && currentRole !== 'ADMIN') {
      return { success: false, error: 'Acesso negado' }
    }

    if (id === currentUserId) {
      return { success: false, error: 'Você não pode desativar o próprio usuário logado.' }
    }

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) return { success: false, error: 'Usuário não encontrado' }

    if (currentRole === 'ADMIN' && targetUser.role === 'MASTER') {
      return { success: false, error: 'Admin não pode alterar o status de um Master.' }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { active: !targetUser.active }
    })

    return { success: true, active: updated.active }
  } catch (error) {
    console.error('Erro ao alterar status:', error)
    return { success: false, error: 'Erro ao alterar status' }
  }
}

export async function createUsuario(data: { name: string, email: string, role: any, tecnicoId?: string }) {
  try {
    const session = await auth()
    const currentRole = (session?.user as any)?.role

    if (currentRole !== 'MASTER' && currentRole !== 'ADMIN') {
      return { success: false, error: 'Acesso negado' }
    }

    if (currentRole === 'ADMIN' && data.role === 'MASTER') {
      return { success: false, error: 'Administradores não podem criar usuários MASTER.' }
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return { success: false, error: 'Email já cadastrado' }
    }

    // Gerar uma senha aleatória para ficar no banco (o usuário redefinirá depois)
    const randomTempPwd = crypto.randomBytes(32).toString('hex')
    const hashedPassword = await bcrypt.hash(randomTempPwd, 10)

    // Token de 48h para primeiro acesso
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 48 * 3600000)

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        resetToken,
        resetTokenExpiry
      }
    })

    // Ligar ao Técnico, se aplicável
    if (data.tecnicoId) {
      await prisma.tecnico.update({
        where: { id: data.tecnicoId },
        data: { userId: user.id }
      })
    }

    // Enviar e-mail de convite
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #e53935;">SG4 - Gestão de Segurança do Trabalho</h2>
        <p>Olá, <b>${user.name}</b>!</p>
        <p>Uma nova conta foi criada para você no sistema SG4.</p>
        <p>Para ativar sua conta e criar sua senha de acesso, clique no botão abaixo:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #e53935; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Criar minha senha</a>
        </div>
        <p style="font-size: 14px; color: #666;">Este link é válido por 48 horas.</p>
        <p style="font-size: 14px; color: #666;">Se você não esperava este e-mail, por favor ignore.</p>
      </div>
    `

    await sendMail({
      to: data.email,
      subject: 'SG4 - Convite de Acesso',
      html
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return { success: false, error: 'Erro ao criar usuário' }
  }
}

export async function resendInvitation(id: string) {
  try {
    const session = await auth()
    const currentRole = (session?.user as any)?.role

    if (currentRole !== 'MASTER' && currentRole !== 'ADMIN') {
      return { success: false, error: 'Acesso negado' }
    }

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) return { success: false, error: 'Usuário não encontrado' }

    if (currentRole === 'ADMIN' && targetUser.role === 'MASTER') {
      return { success: false, error: 'Admin não pode gerenciar um Master.' }
    }

    // Gerar novo token de 48h
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 48 * 3600000)

    await prisma.user.update({
      where: { id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    })

    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #e53935;">SG4 - Gestão de Segurança do Trabalho</h2>
        <p>Olá, <b>${targetUser.name}</b>!</p>
        <p>Foi solicitado um novo link para definição da sua senha de acesso ao sistema SG4.</p>
        <p>Para criar sua senha, clique no botão abaixo:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #e53935; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Criar/Redefinir Senha</a>
        </div>
        <p style="font-size: 14px; color: #666;">Este link é válido por 48 horas.</p>
        <p style="font-size: 14px; color: #666;">Se você não esperava este e-mail, por favor ignore.</p>
      </div>
    `

    await sendMail({
      to: targetUser.email,
      subject: 'SG4 - Redefinição de Senha',
      html
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao reenviar convite:', error)
    return { success: false, error: 'Erro ao reenviar e-mail de redefinição' }
  }
}

export async function deleteUsuario(id: string) {
  try {
    const session = await auth()
    const currentRole = (session?.user as any)?.role
    const currentUserId = session?.user?.id

    if (currentRole !== 'MASTER' && currentRole !== 'ADMIN') {
      return { success: false, error: 'Acesso negado' }
    }

    if (id === currentUserId) {
      return { success: false, error: 'Você não pode excluir o próprio usuário logado.' }
    }

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) return { success: false, error: 'Usuário não encontrado' }

    if (currentRole === 'ADMIN' && (targetUser.role === 'MASTER' || targetUser.role === 'ADMIN')) {
      return { success: false, error: 'Administradores não podem excluir outros administradores ou Masters.' }
    }

    // Desvincular de técnicos antes de deletar
    await prisma.tecnico.updateMany({
      where: { userId: id },
      data: { userId: null }
    })

    await prisma.user.delete({ where: { id } })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return { success: false, error: 'Erro ao excluir usuário' }
  }
}
