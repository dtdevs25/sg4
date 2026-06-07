'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function getAtas(ano: number) {
  try {
    const dataInicial = new Date(ano, 0, 1)
    const dataFinal = new Date(ano, 11, 31, 23, 59, 59)
    
    const atas = await prisma.ataReuniao.findMany({
      where: {
        data: {
          gte: dataInicial,
          lte: dataFinal
        }
      },
      orderBy: { data: 'desc' }
    })
    
    return { success: true, data: atas }
  } catch (error) {
    console.error('Erro ao buscar atas:', error)
    return { success: false, error: 'Falha ao buscar atas' }
  }
}

export async function getAtaUnica(dataIso: string, assunto: string) {
  try {
    // Para simplificar a busca e casar com a Reunião, usamos "começa com a data" ou match exato
    const dateObj = new Date(dataIso)
    
    // Procura uma ata com aquela exata data e assunto. Se não existir retorna null
    const ata = await prisma.ataReuniao.findFirst({
      where: {
        data: dateObj,
        assunto: assunto
      }
    })
    
    return { success: true, data: ata }
  } catch (error) {
    console.error('Erro ao buscar ata única:', error)
    return { success: false, error: 'Falha ao buscar ata' }
  }
}

export async function upsertAta(dataIso: string, assunto: string, conteudo: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão para criar/editar atas' }
    }

    const dateObj = new Date(dataIso)

    // Usa a combinação única de data + assunto
    const ata = await prisma.ataReuniao.upsert({
      where: {
        data_assunto: {
          data: dateObj,
          assunto: assunto
        }
      },
      update: {
        conteudo
      },
      create: {
        data: dateObj,
        assunto: assunto,
        conteudo
      }
    })
    
    return { success: true, data: ata }
  } catch (error) {
    console.error('Erro ao salvar ata:', error)
    return { success: false, error: 'Falha ao salvar ata' }
  }
}

export async function deleteAta(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão para excluir atas' }
    }

    await prisma.ataReuniao.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir ata:', error)
    return { success: false, error: 'Falha ao excluir' }
  }
}
