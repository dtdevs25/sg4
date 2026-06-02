'use server'

import { prisma } from '@/lib/db'
import { TipoAtividade } from '@prisma/client'

export async function getAtividades(tipo?: TipoAtividade) {
  try {
    const atividades = await prisma.atividade.findMany({
      where: tipo ? { tipo } : undefined,
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
