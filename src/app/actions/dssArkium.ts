'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'

export type DssArkiumPayload = {
  numeroDialogo: string
  assunto: string
  lider?: string
  base?: string
  uf?: string
  localidade?: string
  dataFechamento?: string
  matricula: string
  nome: string
  tipo?: string
  statusDSS?: string
  assinado?: string
  justificativa?: string
  estado: 'ABERTO' | 'FECHADO'
}

export async function upsertDssArkiumBatch(items: DssArkiumPayload[]) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const userId = (session.user as any).id

    let inseridos = 0
    let ignorados = 0

    const itemsValidos = items.filter(item => item.numeroDialogo && item.numeroDialogo.trim() !== '')

    for (const item of itemsValidos) {
      try {
        await prisma.dssArkium.upsert({
          where: {
            numeroDialogo_matricula: {
              numeroDialogo: item.numeroDialogo,
              matricula: item.matricula,
            },
          },
          update: {
            assunto: item.assunto || null,
            lider: item.lider || null,
            base: item.base || null,
            uf: item.uf || null,
            localidade: item.localidade || null,
            dataFechamento: item.dataFechamento || null,
            nome: item.nome || null,
            tipo: item.tipo || null,
            statusDSS: item.statusDSS || null,
            assinado: item.assinado || null,
            justificativa: item.justificativa || null,
            estado: item.estado,
          },
          create: {
            numeroDialogo: item.numeroDialogo,
            assunto: item.assunto || null,
            lider: item.lider || null,
            base: item.base || null,
            uf: item.uf || null,
            localidade: item.localidade || null,
            dataFechamento: item.dataFechamento || null,
            matricula: item.matricula,
            nome: item.nome || null,
            tipo: item.tipo || null,
            statusDSS: item.statusDSS || null,
            assinado: item.assinado || null,
            justificativa: item.justificativa || null,
            estado: item.estado,
            importadoPor: userId || null,
          },
        })
        inseridos++
      } catch {
        ignorados++
      }
    }

    await audit({ userId, action: 'IMPORTAR_DSS', entity: 'DSS Arkium', details: { inseridos, ignorados, total: itemsValidos.length } })
    return { success: true, inseridos, ignorados }
  } catch (error) {
    console.error('Erro ao salvar DSS Arkium:', error)
    return { success: false, error: 'Erro ao salvar registros no banco.' }
  }
}

export async function getDssArkium() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const tecnicoId = (session.user as any).tecnicoId

    let registros = await prisma.dssArkium.findMany({
      orderBy: { importadoEm: 'desc' },
    })

    if (role === 'TST' && tecnicoId) {
      const tecnico = await prisma.tecnico.findUnique({ where: { id: tecnicoId } })
      if (tecnico) {
        const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        const nomeDb = removeAccents(tecnico.nome.toLowerCase().trim())
        const dbTokens = nomeDb.split(' ')

        registros = registros.filter((r: any) => {
          if (!r.nome) return false
          const nomePlanilha = removeAccents(r.nome.toLowerCase().trim())
          if (nomePlanilha === nomeDb) return true
          
          const planTokens = nomePlanilha.split(' ')
          if (planTokens[0] === dbTokens[0]) {
            if (planTokens.length === 1 || dbTokens.length === 1) return true
            for (let i = 1; i < planTokens.length; i++) {
              for (let j = 1; j < dbTokens.length; j++) {
                if (planTokens[i] === dbTokens[j] || (planTokens[i] === 'jr' && dbTokens[j] === 'junior') || (planTokens[i] === 'junior' && dbTokens[j] === 'jr')) {
                  return true
                }
              }
            }
          }
          return false
        })
      } else {
        registros = []
      }
    }

    return { success: true, data: registros }
  } catch (error) {
    console.error('Erro ao buscar DSS Arkium:', error)
    return { success: false, error: 'Erro ao buscar registros.' }
  }
}

export async function updateEstadoDssArkium(id: string, assinado: string, justificativa: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const isFechado =
      assinado.toLowerCase() === 'sim' || assinado.toLowerCase() === 'yes' || justificativa.length > 0

    await prisma.dssArkium.update({
      where: { id },
      data: { assinado, justificativa, estado: isFechado ? 'FECHADO' : 'ABERTO' },
    })
    await audit({ userId, action: 'ATUALIZAR_DSS', entity: 'DSS Arkium', entityId: id, details: { estado: isFechado ? 'FECHADO' : 'ABERTO' } })

    return { success: true }
  } catch (error) {
    console.error('Erro ao atualizar estado DSS:', error)
    return { success: false, error: 'Erro ao atualizar registro.' }
  }
}

export async function limparDssArkiumInvalidos() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const result = await prisma.dssArkium.deleteMany({ where: { numeroDialogo: '' } })
    await audit({ userId, action: 'LIMPAR_DSS_INVALIDOS', entity: 'DSS Arkium', details: { removidos: result.count } })

    return { success: true, removidos: result.count }
  } catch (error) {
    console.error('Erro ao limpar registros inválidos:', error)
    return { success: false, error: 'Erro ao limpar registros.' }
  }
}

export async function deleteDssArkium(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    await prisma.dssArkium.delete({ where: { id } })
    await audit({ userId, action: 'EXCLUIR_DSS', entity: 'DSS Arkium', entityId: id })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir DSS Arkium:', error)
    return { success: false, error: 'Erro ao excluir registro.' }
  }
}
