'use server'

import { prisma } from '@/lib/db'
import { TipoAtividade } from '@prisma/client'
import { auth } from '@/lib/auth'

export async function getAtividades(tipo?: TipoAtividade) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const tecnicoId = (session.user as any).tecnicoId

    if (role === 'TST' && !tecnicoId) {
      return { success: false, error: 'Perfil de técnico não vinculado a este usuário.' }
    }

    const where: any = {}
    if (tipo) where.tipo = tipo
    if (role === 'TST') where.tecnicoId = tecnicoId

    const atividades = await prisma.atividade.findMany({
      where,
      include: {
        tecnico: { select: { nome: true } }
      },
      orderBy: [
        { ano: 'desc' },
        { mes: 'desc' },
        { semana: 'desc' }
      ]
    })
    return { success: true, data: atividades }
  } catch (error) {
    console.error('Erro ao buscar atividades:', error)
    return { success: false, error: 'Erro ao buscar atividades' }
  }
}
