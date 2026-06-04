'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

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

export async function createUsuario(data: { name: string, email: string, password?: string, role: any, tecnicoId?: string }) {
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

    if (!data.password || data.password.length < 6) {
      return { success: false, error: 'A senha deve ter pelo menos 6 caracteres' }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
      }
    })

    // Ligar ao Técnico, se aplicável
    if (data.tecnicoId) {
      await prisma.tecnico.update({
        where: { id: data.tecnicoId },
        data: { userId: user.id }
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return { success: false, error: 'Erro ao criar usuário' }
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
