'use server'

import { prisma } from '@/lib/db'
import { TipoAtividade } from '@prisma/client'
import { auth } from '@/lib/auth'

export async function getAtividades(tipo?: TipoAtividade) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const tecnicoId = (session.user as any).tecnicoId

    if (role === 'TST' && !tecnicoId) {
      return { success: false, error: 'Perfil de técnico não vinculado a este usuário.' }
    }

    const where: any = {}
    if (tipo) where.tipo = tipo
    if (role === 'TST') where.tecnicoId = tecnicoId

    const atividades = await prisma.atividade.findMany({
      where,
      include: {
        tecnico: { select: { nome: true } }
      },
      orderBy: [
        { ano: 'desc' },
        { mes: 'desc' },
        { semana: 'desc' }
      ]
    })
    return { success: true, data: atividades }
  } catch (error) {
    console.error('Erro ao buscar atividades:', error)
    return { success: false, error: 'Erro ao buscar atividades' }
  }
}

export async function upsertAtividadeMes(tecnicoId: string, tipo: TipoAtividade, ano: number, mes: any, realizado: number) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    // TSTs talvez não possam editar livremente, mas vamos permitir por enquanto, ou limitar ao ADMIN.
    
    // Como a UI edita o mês inteiro, vamos salvar o valor na 'S1' (semana 1) como representante do total mensal
    const atividade = await prisma.atividade.upsert({
      where: {
        tecnicoId_tipo_ano_mes_semana: {
          tecnicoId,
          tipo,
          ano,
          mes,
          semana: 'S1'
        }
      },
      update: {
        realizado
      },
      create: {
        tecnicoId,
        tipo,
        ano,
        mes,
        semana: 'S1',
        realizado,
        meta: tipo === 'DSS' ? 8 : 20
      }
    })
    return { success: true, data: atividade }
  } catch (error) {
    console.error('Erro ao salvar atividade mensal:', error)
    return { success: false, error: 'Erro ao salvar atividade' }
  }
}
