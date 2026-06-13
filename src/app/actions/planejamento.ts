'use server'

import { revalidatePath } from 'next/cache'
import { PrioridadePlanejamento, StatusPlanejamento } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { sendMail } from '@/lib/mail'

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
        tecnico: { select: { nome: true, fotoUrl: true } }
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
      const newPlan = await prisma.planejamento.create({
        data: {
          ...payload,
          status: 'PENDENTE',
          alteradaOriginal: false
        },
        include: { tecnico: true }
      })

      // Envia notificação por e-mail se foi criado por outra pessoa e o técnico tem e-mail cadastrado
      const creatorTecnicoId = (session.user as any).tecnicoId
      
      if (newPlan.tecnico?.email && creatorTecnicoId !== newPlan.tecnicoId) {
        const dataFormatada = newPlan.dataAtividade.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: #660099; padding: 20px; text-align: center;">
              <h2 style="color: #fff; margin: 0;">Nova Atividade na Agenda</h2>
            </div>
            <div style="padding: 24px; color: #334155;">
              <p>Olá <strong>${newPlan.tecnico.nome}</strong>,</p>
              <p>Uma nova atividade foi incluída no seu planejamento de segurança pelo administrador.</p>
              <div style="background: #f8fafc; padding: 16px; border-left: 4px solid #660099; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Data:</strong> ${dataFormatada}</p>
                <p style="margin: 0 0 8px 0;"><strong>Categoria:</strong> ${newPlan.categoria}</p>
                <p style="margin: 0 0 8px 0;"><strong>Local:</strong> ${newPlan.local || 'Não informado'} ${newPlan.cidade ? '(' + newPlan.cidade + '-' + newPlan.estado + ')' : ''}</p>
                <p style="margin: 0;"><strong>Atividade:</strong> ${newPlan.descricaoOriginal}</p>
              </div>
              <p>Por favor, acesse o sistema SG4 para visualizar os detalhes completos e realizar a execução da atividade.</p>
              <br/>
              <p style="margin: 0;">Atenciosamente,</p>
              <p style="margin: 0; font-weight: bold;">Equipe SG4</p>
            </div>
          </div>
        `
        
        sendMail({
          to: newPlan.tecnico.email,
          subject: 'SG4 - Nova Atividade Planejada',
          html
        }).catch(err => console.error('Erro ao notificar TST:', err))
      }
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

export async function moverPlanejamento(id: string, novaData: Date) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const plan = await prisma.planejamento.findUnique({ where: { id } })
    if (!plan) return { success: false, error: 'Planejamento não encontrado' }

    if (plan.status === 'CONCLUIDO') {
      return { success: false, error: 'Não é possível mover um planejamento concluído' }
    }

    await prisma.planejamento.update({
      where: { id },
      data: { dataAtividade: novaData }
    })

    revalidatePath('/dashboard/planejamento')
    return { success: true }
  } catch (error: any) {
    console.error('Error in moverPlanejamento:', error)
    return { success: false, error: error.message }
  }
}

export async function reverterPlanejamento(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    await prisma.planejamento.update({
      where: { id },
      data: { 
        status: 'PENDENTE',
        descricaoExecutada: null,
        observacoes: null,
        alteradaOriginal: false
      }
    })

    revalidatePath('/dashboard/planejamento')
    return { success: true }
  } catch (error: any) {
    console.error('Error in reverterPlanejamento:', error)
    return { success: false, error: error.message }
  }
}
