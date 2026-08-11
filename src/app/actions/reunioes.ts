'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function getReunioes(ano?: number) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const tecnicoId = (session.user as any).tecnicoId

    if (role === 'TST' && !tecnicoId) {
      return { success: false, error: 'Perfil de técnico não vinculado a este usuário.' }
    }

    const where: any = role === 'TST' ? { tecnicoId } : {}
    
    if (ano) {
      where.data = {
        gte: new Date(ano, 0, 1),
        lte: new Date(ano, 11, 31, 23, 59, 59)
      }
    }

    const data = await prisma.reuniao.findMany({
      where,
      include: { tecnico: { select: { id: true, nome: true, fotoUrl: true } } },
      orderBy: { data: 'desc' }
    })
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao buscar reunioes:', error)
    return { success: false, error: 'Erro ao buscar reunioes' }
  }
}

export async function createReuniaoLote(dataIso: string, hora: string, horaFim: string, assunto: string, recorrencia: string, dataFimIso: string, includeInativos: boolean = false) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão para criar reuniões' }
    }
    const userId = (session.user as any).id

    const tecnicos = await prisma.tecnico.findMany({
      where: includeInativos ? undefined : { ativo: true },
      select: { id: true }
    })
    
    if (tecnicos.length === 0) {
      return { success: false, error: 'Nenhum técnico ativo encontrado' }
    }

    const reunioesData = []
    
    const startDt = new Date(`${dataIso}T${hora || '12:00'}:00`)
    if (isNaN(startDt.getTime())) return { success: false, error: 'Data/Hora inicial inválida' }

    const endDt = (recorrencia !== 'none' && dataFimIso) ? new Date(`${dataFimIso}T23:59:59`) : new Date(startDt)
    if (isNaN(endDt.getTime())) return { success: false, error: 'Data final inválida' }

    let currentDt = new Date(startDt)

    while (currentDt <= endDt) {
      for (const t of tecnicos) {
        reunioesData.push({
          tecnicoId: t.id,
          data: new Date(currentDt),
          horaFim: horaFim || null,
          assunto: assunto || 'Reunião',
          presenca: 'PRESENTE' as any,
          pontualidade: 'PONTUAL' as any,
          justificada: 'NAO_SE_APLICA' as any,
          motivo: '',
          observacao: ''
        })
      }

      if (recorrencia === 'diaria') {
        currentDt.setDate(currentDt.getDate() + 1)
      } else if (recorrencia === 'semanal') {
        currentDt.setDate(currentDt.getDate() + 7)
      } else if (recorrencia === 'mensal') {
        currentDt.setMonth(currentDt.getMonth() + 1)
      } else {
        break
      }
    }
    
    await prisma.reuniao.createMany({ data: reunioesData })
    await audit({ userId, action: 'CRIAR_REUNIAO_LOTE', entity: 'Reunião', details: { dataInicial: dataIso, dataFinal: dataFimIso, hora, horaFim, assunto, recorrencia, totalTecnicos: tecnicos.length, totalCriadas: reunioesData.length } })
    
    return { success: true }
  } catch (error) {
    console.error('Erro ao criar reunião em lote:', error)
    return { success: false, error: 'Falha ao registrar reunião' }
  }
}

export async function updateReuniaoItem(id: string, data: any) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão para editar reuniões' }
    }
    const userId = (session.user as any).id

    const updated = await prisma.reuniao.update({ where: { id }, data })
    await audit({ userId, action: 'EDITAR_REUNIAO', entity: 'Reunião', entityId: id })

    return { success: true, data: updated }
  } catch (error) {
    console.error('Erro ao atualizar reunião:', error)
    return { success: false, error: 'Falha ao atualizar reunião' }
  }
}

export async function deleteReuniaoItem(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão para excluir reuniões' }
    }
    const userId = (session.user as any).id

    await prisma.reuniao.delete({ where: { id } })
    await audit({ userId, action: 'EXCLUIR_REUNIAO', entity: 'Reunião', entityId: id })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir reunião:', error)
    return { success: false, error: 'Falha ao excluir' }
  }
}

export async function updatePresencasReuniao(updates: { id: string, presenca: string, pontualidade: string, justificada: string, motivo: string, observacao: string }[]) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão para editar reuniões' }
    }
    const userId = (session.user as any).id

    for (const update of updates) {
      await prisma.reuniao.update({
        where: { id: update.id },
        data: {
          presenca: update.presenca as any,
          pontualidade: update.presenca === 'AUSENTE' ? 'NAO_SE_APLICA' : update.pontualidade as any,
          justificada: update.presenca === 'PRESENTE' ? 'NAO_SE_APLICA' : update.justificada as any,
          motivo: update.motivo,
          observacao: update.observacao
        }
      })
    }

    await audit({ userId, action: 'EDITAR_REUNIAO_LOTE', entity: 'Reunião', details: { qtdAtualizados: updates.length } })

    return { success: true }
  } catch (error) {
    console.error('Erro ao atualizar presenças em lote:', error)
    return { success: false, error: 'Falha ao atualizar presenças' }
  }
}

export async function deleteReuniaoLote(dataIso: string, assunto: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão para excluir reuniões' }
    }
    const userId = (session.user as any).id

    // Deletar as presenças
    await prisma.reuniao.deleteMany({
      where: {
        data: new Date(dataIso),
        assunto: assunto
      }
    })

    // Tentar deletar a ata caso exista
    try {
      await prisma.ataReuniao.deleteMany({
        where: {
          data: new Date(dataIso),
          assunto: assunto
        }
      })
    } catch (e) {
      console.log('Nenhuma ata encontrada para excluir, prosseguindo.')
    }

    await audit({ userId, action: 'EXCLUIR_REUNIAO_LOTE', entity: 'Reunião', details: { data: dataIso, assunto } })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir reunião em lote:', error)
    return { success: false, error: 'Falha ao excluir a reunião inteira' }
  }
}
