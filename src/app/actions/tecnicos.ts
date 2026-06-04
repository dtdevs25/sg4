'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function getTecnicos() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const tecnicoId = (session.user as any).tecnicoId

    // Se for TST, só pode ver a si mesmo na lista de técnicos
    const where = role === 'TST' ? { id: tecnicoId } : {}

    if (role === 'TST' && !tecnicoId) {
      return { success: false, error: 'Perfil de técnico não vinculado a este usuário.' }
    }

    const tecnicos = await prisma.tecnico.findMany({
      where,
      orderBy: { nome: 'asc' }
    })
    return { success: true, data: tecnicos }
  } catch (error) {
    console.error('Erro ao buscar técnicos:', error)
    return { success: false, error: 'Erro ao buscar técnicos' }
  }
}
