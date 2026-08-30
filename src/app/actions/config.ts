'use server'

import { prisma } from '@/lib/db'

export async function getConfiguracaoGlobal() {
  try {
    const config = await prisma.configuracaoGlobal.upsert({
      where: { id: 'GLOBAL' },
      update: {},
      create: { id: 'GLOBAL', permitirUploadFotoKm: true }
    })
    return { success: true, data: config }
  } catch (error: any) {
    console.error('Erro ao buscar configuração global:', error)
    return { success: false, error: error.message }
  }
}

export async function updateConfiguracaoGlobal(data: { permitirUploadFotoKm: boolean }) {
  try {
    await prisma.configuracaoGlobal.upsert({
      where: { id: 'GLOBAL' },
      update: data,
      create: { id: 'GLOBAL', ...data }
    })
    return { success: true }
  } catch (error: any) {
    console.error('Erro ao atualizar configuração global:', error)
    return { success: false, error: error.message }
  }
}
