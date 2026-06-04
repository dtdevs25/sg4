'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function getProgramacoes() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const tecnicoId = (session.user as any).tecnicoId

    if (role === 'TST' && !tecnicoId) {
      return { success: false, error: 'Perfil de técnico não vinculado a este usuário.' }
    }

    const where = role === 'TST' ? { tecnicoId } : {}

    const data = await prisma.programacao.findMany({
      where,
      include: {
        tecnico: { select: { nome: true } }
      },
      orderBy: { data: 'asc' }
    })
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao buscar programacoes:', error)
    return { success: false, error: 'Erro ao buscar programacoes' }
  }
}
