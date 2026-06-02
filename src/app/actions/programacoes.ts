'use server'

import { prisma } from '@/lib/db'

export async function getProgramacoes() {
  try {
    const data = await prisma.programacao.findMany({
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
