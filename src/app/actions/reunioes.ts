'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function getReunioes() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const tecnicoId = (session.user as any).tecnicoId

    if (role === 'TST' && !tecnicoId) {
      return { success: false, error: 'Perfil de técnico não vinculado a este usuário.' }
    }

    const where = role === 'TST' ? { tecnicoId } : {}

    const data = await prisma.reuniao.findMany({
      where,
      include: {
        tecnico: { select: { id: true, nome: true, fotoUrl: true } }
      },
      orderBy: { data: 'desc' }
    })
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao buscar reunioes:', error)
    return { success: false, error: 'Erro ao buscar reunioes' }
  }
}

export async function createReuniaoLote(dataIso: string, assunto: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão para criar reuniões' }
    }

    const dateObj = new Date(dataIso + "T12:00:00Z")
    
    // Busca tecnicos ativos
    const tecnicos = await prisma.tecnico.findMany({
      where: { ativo: true },
      select: { id: true }
    })
    
    if (tecnicos.length === 0) {
      return { success: false, error: 'Nenhum técnico ativo encontrado' }
    }
    
    const reunioesData = tecnicos.map(t => ({
      tecnicoId: t.id,
      data: dateObj,
      assunto: assunto || 'Reunião',
      presenca: 'PRESENTE' as any,
      pontualidade: 'PONTUAL' as any,
      justificada: 'NAO_SE_APLICA' as any,
      motivo: '',
      observacao: ''
    }))
    
    await prisma.reuniao.createMany({
      data: reunioesData
    })
    
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

    const updated = await prisma.reuniao.update({
      where: { id },
      data
    })
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

    await prisma.reuniao.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir reunião:', error)
    return { success: false, error: 'Falha ao excluir' }
  }
}
