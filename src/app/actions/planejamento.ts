'use server'

import { revalidatePath } from 'next/cache'
import { PrioridadePlanejamento, StatusPlanejamento } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function getPlanejamentos(tecnicoId?: string, startDate?: Date, endDate?: Date) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const userTecnicoId = (session.user as any).tecnicoId

    let finalTecnicoId = tecnicoId
    
    // Se for TST, só pode ver seu próprio planejamento
    if (role === 'TST') {
      if (!userTecnicoId) return { success: false, error: 'Técnico não vinculado.' }
      finalTecnicoId = userTecnicoId
    }

    const where: any = {}
    if (finalTecnicoId) where.tecnicoId = finalTecnicoId
    if (startDate && endDate) {
      where.dataAtividade = {
        gte: startDate,
        lte: endDate
      }
    }

    const planejamentos = await prisma.planejamento.findMany({
      where,
      orderBy: { dataAtividade: 'asc' },
      include: {
        tecnico: { select: { nome: true } }
      }
    })

    return { success: true, data: planejamentos }
  } catch (error: any) {
    console.error('Error in getPlanejamentos:', error)
    return { success: false, error: error.message }
  }
}

export async function savePlanejamento(data: {
  id?: string;
  tecnicoId: string;
  dataAtividade: Date;
  categoria: string;
  descricaoOriginal: string;
  equipe?: string;
  local?: string;
  cidade?: string;
  estado?: string;
  prioridade?: PrioridadePlanejamento;
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const { id, ...payload } = data

    if (id) {
      await prisma.planejamento.update({
        where: { id },
        data: payload
      })
    } else {
      await prisma.planejamento.create({
        data: {
          ...payload,
          status: 'PENDENTE',
          alteradaOriginal: false
        }
      })
    }

    revalidatePath('/dashboard/planejamento')
    return { success: true }
  } catch (error: any) {
    console.error('Error in savePlanejamento:', error)
    return { success: false, error: error.message }
  }
}

export async function modificarExecucao(id: string, descricaoExecutada: string, observacoes?: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const plan = await prisma.planejamento.findUnique({ where: { id } })
    if (!plan) return { success: false, error: 'Planejamento não encontrado' }

    // Só marca como alterada se for diferente (simplificado)
    const alteradaOriginal = descricaoExecutada.trim() !== plan.descricaoOriginal.trim()

    await prisma.planejamento.update({
      where: { id },
      data: {
        descricaoExecutada,
        observacoes,
        alteradaOriginal,
        status: 'CONCLUIDO'
      }
    })

    revalidatePath('/dashboard/planejamento')
    return { success: true }
  } catch (error: any) {
    console.error('Error in modificarExecucao:', error)
    return { success: false, error: error.message }
  }
}

export async function concluirPlanejamento(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    await prisma.planejamento.update({
      where: { id },
      data: { status: 'CONCLUIDO' }
    })

    revalidatePath('/dashboard/planejamento')
    return { success: true }
  } catch (error: any) {
    console.error('Error in concluirPlanejamento:', error)
    return { success: false, error: error.message }
  }
}

export async function cancelarPlanejamento(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    await prisma.planejamento.update({
      where: { id },
      data: { status: 'CANCELADO' }
    })

    revalidatePath('/dashboard/planejamento')
    return { success: true }
  } catch (error: any) {
    console.error('Error in cancelarPlanejamento:', error)
    return { success: false, error: error.message }
  }
}

export async function deletePlanejamento(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    await prisma.planejamento.delete({
      where: { id }
    })

    revalidatePath('/dashboard/planejamento')
    return { success: true }
  } catch (error: any) {
    console.error('Error in deletePlanejamento:', error)
    return { success: false, error: error.message }
  }
}
