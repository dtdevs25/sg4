'use server'

import { prisma } from '@/lib/db'

export async function getTecnicos() {
  try {
    const tecnicos = await prisma.tecnico.findMany({
      orderBy: { nome: 'asc' }
    })
    return { success: true, data: tecnicos }
  } catch (error) {
    console.error('Erro ao buscar técnicos:', error)
    return { success: false, error: 'Erro ao buscar técnicos' }
  }
}
