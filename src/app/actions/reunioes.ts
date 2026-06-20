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

export async function createReuniaoLote(dataIso: string, hora: string, assunto: string, recorrencia: string, vezes: number) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão para criar reuniões' }
    }
    const userId = (session.user as any).id

    const tecnicos = await prisma.tecnico.findMany({
      where: { ativo: true },
      select: { id: true }
    })
    
    if (tecnicos.length === 0) {
      return { success: false, error: 'Nenhum técnico ativo encontrado' }
    }

    const reunioesData = []
    
    const times = vezes && vezes > 0 ? vezes : 1
    
    for (let i = 0; i < times; i++) {
      const dt = new Date(`${dataIso}T${hora || '12:00'}:00`)
      if (isNaN(dt.getTime())) return { success: false, error: 'Data/Hora inválida' }

      if (recorrencia === 'diaria') {
        dt.setDate(dt.getDate() + i)
      } else if (recorrencia === 'semanal') {
        dt.setDate(dt.getDate() + (i * 7))
      } else if (recorrencia === 'mensal') {
        dt.setMonth(dt.getMonth() + i)
      }

      for (const t of tecnicos) {
        reunioesData.push({
          tecnicoId: t.id,
          data: dt,
          assunto: assunto || 'Reunião',
          presenca: 'PRESENTE' as any,
          pontualidade: 'PONTUAL' as any,
          justificada: 'NAO_SE_APLICA' as any,
          motivo: '',
          observacao: ''
        })
      }
    }
    
    await prisma.reuniao.createMany({ data: reunioesData })
    await audit({ userId, action: 'CRIAR_REUNIAO_LOTE', entity: 'Reunião', details: { data: dataIso, hora, assunto, recorrencia, vezes, totalTecnicos: tecnicos.length, totalCriadas: reunioesData.length } })
    
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
