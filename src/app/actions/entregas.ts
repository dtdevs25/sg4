'use server'

import { prisma } from '@/lib/db'

export async function getEntregas() {
  try {
    const data = await prisma.entrega.findMany({
      include: {
        tecnico: { select: { nome: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao buscar entregas:', error)
    return { success: false, error: 'Erro ao buscar entregas' }
  }
}
