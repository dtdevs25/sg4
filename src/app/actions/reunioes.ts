'use server'

import { prisma } from '@/lib/db'

export async function getReunioes() {
  try {
    const data = await prisma.reuniao.findMany({
      include: {
        tecnico: { select: { nome: true } }
      },
      orderBy: { data: 'desc' }
    })
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao buscar reunioes:', error)
    return { success: false, error: 'Erro ao buscar reunioes' }
  }
}
