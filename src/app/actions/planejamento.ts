'use server'

import { revalidatePath } from 'next/cache'
import { PrioridadePlanejamento, StatusPlanejamento } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { sendMail } from '@/lib/mail'
import { audit } from '@/lib/audit'

export async function getPlanejamentos(tecnicoId?: string, startDate?: Date, endDate?: Date) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const userTecnicoId = (session.user as any).tecnicoId

    let finalTecnicoId = tecnicoId
    
    if (role === 'TST') {
      if (!userTecnicoId) return { success: false, error: 'Técnico não vinculado.' }
      finalTecnicoId = userTecnicoId
    }

    const where: any = {}
    if (finalTecnicoId) where.tecnicoId = finalTecnicoId
    if (startDate && endDate) {
      where.dataAtividade = { gte: startDate, lte: endDate }
    }

    const planejamentos = await prisma.planejamento.findMany({
      where,
      orderBy: [{ dataAtividade: 'asc' }, { hora: 'asc' }],
      include: { tecnico: { select: { nome: true, fotoUrl: true } } }
    })

    return { success: true, data: planejamentos }
  } catch (error: any) {
    console.error('Error in getPlanejamentos:', error)
    return { success: false, error: error.message }
  }
}

function getGoogleCalendarUrl(plan: {
  dataAtividade: Date;
  hora?: string | null;
  titulo?: string | null;
  categoria: string;
  descricaoOriginal: string;
  local?: string | null;
  cidade?: string | null;
  estado?: string | null;
}) {
  const dateStr = plan.dataAtividade.toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD
  let startHour = plan.hora || '08:00'
  if (startHour.length === 5) {
    startHour = startHour.replace(':', '') + '00' // HHMMSS
  } else if (startHour.length === 8) {
    startHour = startHour.replace(/:/g, '') // HHMMSS
  } else {
    startHour = '080000'
  }
  
  // Default to 1 hour event
  let endHour = String(parseInt(startHour.substring(0, 2)) + 1).padStart(2, '0') + startHour.substring(2)
  if (parseInt(endHour.substring(0, 2)) >= 24) {
    endHour = '235900'
  }

  const dateParam = `${dateStr}T${startHour}/${dateStr}T${endHour}`
  
  const text = plan.titulo || plan.categoria
  const details = `${plan.categoria} - ${plan.descricaoOriginal}\n\nGerado automaticamente via SG4.`
  const location = `${plan.local || ''} ${plan.cidade ? '(' + plan.cidade + '-' + plan.estado + ')' : ''}`.trim()
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${dateParam}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`
}

async function notifyTecnicoPlan(
  newPlan: any,
  creatorTecnicoId: string | null | undefined,
  sessionUserEmail?: string
) {
  if (newPlan.tecnico?.email && creatorTecnicoId !== newPlan.tecnicoId) {
    const dataFormatada = newPlan.dataAtividade.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    const googleCalendarUrl = getGoogleCalendarUrl(newPlan)

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
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="${googleCalendarUrl}" target="_blank" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">
              📅 Adicionar à Agenda do Google
            </a>
          </div>

          <p>Por favor, acesse o sistema SG4 para visualizar os detalhes completos.</p>
          <br/>
          <p style="margin: 0;">Atenciosamente,</p>
          <p style="margin: 0; font-weight: bold;">Equipe SG4</p>
        </div>
      </div>
    `
    const cc = sessionUserEmail || undefined
    await sendMail({ to: newPlan.tecnico.email, cc, subject: 'SG4 - Nova Atividade Planejada', html })
      .catch(err => console.error('Erro ao notificar TST por e-mail:', err))
  }
}

export async function savePlanejamentoBatch(base: {
  tecnicoId: string;
  tecnicoIds?: string[];
  equipe?: string;
  local?: string;
  cidade?: string;
  estado?: string;
}, items: Array<{
  dataAtividade: Date;
  hora: string;
  titulo: string;
  categoria: string;
  descricaoOriginal: string;
  prioridade: PrioridadePlanejamento;
  local?: string;
  cidade?: string;
  estado?: string;
}>) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id
    const creatorTecnicoId = (session.user as any).tecnicoId

    const targetTecnicoIds = base.tecnicoIds && base.tecnicoIds.length > 0 ? base.tecnicoIds : [base.tecnicoId]

    for (const tId of targetTecnicoIds) {
      for (const item of items) {
        const newPlan = await prisma.planejamento.create({
          data: {
            tecnicoId: tId,
            dataAtividade: item.dataAtividade,
            equipe: base.equipe,
            local: item.local || base.local,
            cidade: item.cidade || base.cidade,
            estado: item.estado || base.estado,
            hora: item.hora,
            titulo: item.titulo,
            categoria: item.categoria,
            descricaoOriginal: item.descricaoOriginal,
            prioridade: item.prioridade,
            status: 'PENDENTE',
            alteradaOriginal: false,
            checklist: []
          },
          include: { tecnico: true }
        })

        await audit({ userId, action: 'CRIAR_PLANEJAMENTO', entity: 'Planejamento', entityId: newPlan.id, details: { categoria: item.categoria, tecnicoId: tId } })

        await notifyTecnicoPlan(newPlan, creatorTecnicoId, session.user.email || undefined)
      }
    }

    revalidatePath('/dashboard/atividades')
    return { success: true }
  } catch (error: any) {
    console.error('Error in savePlanejamentoBatch:', error)
    return { success: false, error: error.message }
  }
}

export async function savePlanejamento(data: {
  id?: string;
  tecnicoId: string;
  tecnicoIds?: string[];
  dataAtividade: Date;
  hora?: string;
  titulo?: string;
  categoria: string;
  descricaoOriginal: string;
  checklist?: any;
  equipe?: string;
  local?: string;
  cidade?: string;
  estado?: string;
  prioridade?: PrioridadePlanejamento;
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const { id, tecnicoIds, ...payload } = data

    if (id) {
      const targetIds = tecnicoIds && tecnicoIds.length > 0 ? tecnicoIds : [data.tecnicoId]
      const mainTecnicoId = targetIds[0]

      await prisma.planejamento.update({
        where: { id },
        data: {
          ...payload,
          tecnicoId: mainTecnicoId
        }
      })
      await audit({ userId, action: 'EDITAR_PLANEJAMENTO', entity: 'Planejamento', entityId: id, details: { categoria: data.categoria } })

      const otherTecnicoIds = targetIds.slice(1)
      const creatorTecnicoId = (session.user as any).tecnicoId

      for (const tId of otherTecnicoIds) {
        const newPlan = await prisma.planejamento.create({
          data: {
            tecnicoId: tId,
            dataAtividade: data.dataAtividade,
            hora: data.hora,
            titulo: data.titulo,
            categoria: data.categoria,
            descricaoOriginal: data.descricaoOriginal,
            checklist: data.checklist || [],
            equipe: data.equipe,
            local: data.local,
            cidade: data.cidade,
            estado: data.estado,
            prioridade: data.prioridade || 'MEDIA',
            status: 'PENDENTE',
            alteradaOriginal: false
          },
          include: { tecnico: true }
        })

        await audit({ userId, action: 'CRIAR_PLANEJAMENTO', entity: 'Planejamento', entityId: newPlan.id, details: { categoria: data.categoria, tecnicoId: tId } })

        await notifyTecnicoPlan(newPlan, creatorTecnicoId, session.user.email || undefined)
      }
    } else {
      const targetIds = tecnicoIds && tecnicoIds.length > 0 ? tecnicoIds : [data.tecnicoId]

      for (const tId of targetIds) {
        const newPlan = await prisma.planejamento.create({
          data: {
            ...payload,
            tecnicoId: tId,
            status: 'PENDENTE',
            alteradaOriginal: false
          },
          include: { tecnico: true }
        })

        await audit({ userId, action: 'CRIAR_PLANEJAMENTO', entity: 'Planejamento', entityId: newPlan.id, details: { categoria: data.categoria, tecnicoId: tId } })

        const creatorTecnicoId = (session.user as any).tecnicoId
        await notifyTecnicoPlan(newPlan, creatorTecnicoId, session.user.email || undefined)
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
    const userId = (session.user as any).id

    const plan = await prisma.planejamento.findUnique({ where: { id } })
    if (!plan) return { success: false, error: 'Planejamento não encontrado' }

    const alteradaOriginal = descricaoExecutada.trim() !== plan.descricaoOriginal.trim()

    await prisma.planejamento.update({
      where: { id },
      data: { descricaoExecutada, observacoes, alteradaOriginal, status: 'CONCLUIDO' }
    })

    await audit({ userId, action: 'CONCLUIR_PLANEJAMENTO', entity: 'Planejamento', entityId: id, details: { alterada: alteradaOriginal } })

    revalidatePath('/dashboard/planejamento')
    return { success: true }
  } catch (error: any) {
    console.error('Error in modificarExecucao:', error)
    return { success: false, error: error.message }
  }
}

export async function concluirETransferirPendencias(id: string, novaData: Date, checklistConcluido: any[], checklistPendente: any[], descricaoConcluida: string, descricaoPendente: string, observacoes?: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const plan = await prisma.planejamento.findUnique({ where: { id } })
    if (!plan) return { success: false, error: 'Planejamento não encontrado' }

    // 1. Conclui a tarefa atual com as concluídas
    await prisma.planejamento.update({
      where: { id },
      data: { 
        status: 'CONCLUIDO', 
        checklist: checklistConcluido, 
        descricaoExecutada: descricaoConcluida,
        observacoes,
        alteradaOriginal: true
      }
    })

    // 2. Cria nova tarefa para as pendências
    const newPlan = await prisma.planejamento.create({
      data: {
        tecnicoId: plan.tecnicoId,
        hora: plan.hora,
        titulo: plan.titulo,
        categoria: plan.categoria,
        prioridade: plan.prioridade,
        local: plan.local,
        cidade: plan.cidade,
        estado: plan.estado,
        equipe: plan.equipe,
        dataAtividade: novaData,
        status: 'PENDENTE',
        checklist: checklistPendente,
        descricaoOriginal: descricaoPendente
      }
    })

    await audit({ userId, action: 'CONCLUIR_E_TRANSFERIR', entity: 'Planejamento', entityId: id, details: { novoPlanejamentoId: newPlan.id } })

    revalidatePath('/dashboard/planejamento')
    return { success: true }
  } catch (error: any) {
    console.error('Error in concluirETransferirPendencias:', error)
    return { success: false, error: error.message }
  }
}

export async function togglePlanejamentoChecklist(id: string, checklist: any[]) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const allChecked = checklist.length > 0 && checklist.every(i => i.concluido)
    const status = allChecked ? 'CONCLUIDO' : 'PENDENTE'

    await prisma.planejamento.update({
      where: { id },
      data: { checklist, status }
    })

    revalidatePath('/dashboard/planejamento')
    return { success: true, status }
  } catch (error: any) {
    console.error('Error in togglePlanejamentoChecklist:', error)
    return { success: false, error: error.message }
  }
}


export async function concluirPlanejamento(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    await prisma.planejamento.update({ where: { id }, data: { status: 'CONCLUIDO' } })
    await audit({ userId, action: 'CONCLUIR_PLANEJAMENTO', entity: 'Planejamento', entityId: id })

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
    const userId = (session.user as any).id

    await prisma.planejamento.update({ where: { id }, data: { status: 'CANCELADO' } })
    await audit({ userId, action: 'CANCELAR_PLANEJAMENTO', entity: 'Planejamento', entityId: id })

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
    const userId = (session.user as any).id

    const plan = await prisma.planejamento.findUnique({ where: { id } })
    await prisma.planejamento.delete({ where: { id } })
    await audit({
      userId,
      action: 'EXCLUIR_PLANEJAMENTO',
      entity: 'Planejamento',
      entityId: id,
      details: { categoria: plan?.categoria, descricao: plan?.descricaoOriginal }
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
    const userId = (session.user as any).id

    const plan = await prisma.planejamento.findUnique({ where: { id } })
    if (!plan) return { success: false, error: 'Planejamento não encontrado' }
    if (plan.status === 'CONCLUIDO') return { success: false, error: 'Não é possível mover um planejamento concluído' }

    await prisma.planejamento.update({ where: { id }, data: { dataAtividade: novaData } })
    await audit({ userId, action: 'MOVER_PLANEJAMENTO', entity: 'Planejamento', entityId: id, details: { novaData: novaData.toISOString() } })

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
    const userId = (session.user as any).id

    await prisma.planejamento.update({
      where: { id },
      data: { status: 'PENDENTE', descricaoExecutada: null, observacoes: null, alteradaOriginal: false }
    })
    await audit({ userId, action: 'REVERTER_PLANEJAMENTO', entity: 'Planejamento', entityId: id })

    revalidatePath('/dashboard/planejamento')
    return { success: true }
  } catch (error: any) {
    console.error('Error in reverterPlanejamento:', error)
    return { success: false, error: error.message }
  }
}
