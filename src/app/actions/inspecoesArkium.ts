'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'

function normalize(str: string | null | undefined): string {
  if (!str) return ''
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
}

function nameMatches(arkiumName: string, dbName: string): boolean {
  if (!arkiumName || !dbName) return false
  if (arkiumName === dbName) return true
  if (arkiumName.includes(dbName) || dbName.includes(arkiumName)) return true
  
  const arkTokens = arkiumName.split(' ').filter(t => t.length > 2)
  const dbTokens = dbName.split(' ').filter(t => t.length > 2)
  
  const firstDb = dbTokens[0]
  const firstArk = arkTokens[0]
  if (!firstDb || !firstArk) return false
  
  const firstNameMatch = firstDb === firstArk || firstArk.includes(firstDb) || firstDb.includes(firstArk)
  if (!firstNameMatch) return false
  
  if (dbTokens.length === 1 || arkTokens.length === 1) return true
  
  for (let i = 1; i < dbTokens.length; i++) {
    if (arkTokens.includes(dbTokens[i])) return true
  }
  
  return false
}

export async function getInspecoesArkium() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const tecnicoId = (session.user as any).tecnicoId

    let data = await prisma.inspecoesArkium.findMany({
      orderBy: { dataFechamento: 'desc' }
    })

    if (role === 'TST' && tecnicoId) {
      const tecnico = await prisma.tecnico.findUnique({ where: { id: tecnicoId } })
      if (tecnico) {
        const nomeDb = normalize(tecnico.nome)

        data = data.filter((r: any) => {
          if (!r.nomeAuditor) return false
          const nomePlanilha = normalize(r.nomeAuditor)
          return nameMatches(nomePlanilha, nomeDb)
        })
      } else {
        data = []
      }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao buscar inspeções arkium:', error)
    return { success: false, error: 'Erro ao buscar dados' }
  }
}

export async function upsertInspecoesArkiumBatch(items: any[]) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id ?? null

    let inseridos = 0
    let atualizados = 0

    const tecnicos = await prisma.tecnico.findMany({ select: { id: true, nome: true } })

    for (const item of items) {
      let tecnicoId = null
      if (item.nomeAuditor) {
        const itemNomeLimpo = normalize(item.nomeAuditor)

        for (const t of tecnicos) {
          const tNomeLimpo = normalize(t.nome)
          if (nameMatches(itemNomeLimpo, tNomeLimpo)) { 
            tecnicoId = t.id; 
            break 
          }
        }
      }

      const existing = await prisma.inspecoesArkium.findFirst({ where: { numero: item.numero } })

      if (existing) {
        await prisma.inspecoesArkium.update({
          where: { id: existing.id },
          data: {
            resultado: item.resultado,
            dataAbertura: item.dataAbertura,
            dataFechamento: item.dataFechamento,
            matriculaAuditor: item.matriculaAuditor,
            nomeAuditor: item.nomeAuditor,
            identificadorObjeto: item.identificadorObjeto,
            nomeQuestionario: item.nomeQuestionario,
            clienteObjeto: item.clienteObjeto,
            localidadeObjeto: item.localidadeObjeto,
            autocheck: item.autocheck,
            observacao: item.observacao,
            status: item.status,
            tecnicoId: tecnicoId || existing.tecnicoId
          }
        })
        atualizados++
      } else {
        await prisma.inspecoesArkium.create({
          data: {
            numero: item.numero,
            resultado: item.resultado,
            dataAbertura: item.dataAbertura,
            dataFechamento: item.dataFechamento,
            matriculaAuditor: item.matriculaAuditor,
            nomeAuditor: item.nomeAuditor,
            identificadorObjeto: item.identificadorObjeto,
            nomeQuestionario: item.nomeQuestionario,
            clienteObjeto: item.clienteObjeto,
            localidadeObjeto: item.localidadeObjeto,
            autocheck: item.autocheck,
            observacao: item.observacao,
            status: item.status,
            tecnicoId: tecnicoId
          }
        })
        inseridos++
      }
    }

    await audit({ userId, action: 'IMPORTAR_INSPECOES', entity: 'Inspeções Arkium', details: { inseridos, atualizados, total: items.length } })
    return { success: true, inseridos, atualizados }
  } catch (error) {
    console.error('Erro no upsert em lote inspeções arkium:', error)
    return { success: false, error: 'Falha ao sincronizar lote' }
  }
}

export async function updateInspecoesArkiumItem(id: string, data: any) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id ?? null

    const updated = await prisma.inspecoesArkium.update({ where: { id }, data })
    await audit({ userId, action: 'EDITAR_INSPECAO', entity: 'Inspeções Arkium', entityId: id })

    return { success: true, data: updated }
  } catch (error) {
    console.error('Erro ao atualizar inspeção:', error)
    return { success: false, error: 'Falha ao atualizar' }
  }
}

export async function deleteInspecoesArkiumItem(id: string) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Sem permissão' }
    const userId = (session?.user as any)?.id ?? null

    await prisma.inspecoesArkium.delete({ where: { id } })
    await audit({ userId, action: 'EXCLUIR_INSPECAO', entity: 'Inspeções Arkium', entityId: id })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir inspeção:', error)
    return { success: false, error: 'Falha ao excluir' }
  }
}

export async function limparInspecoesArkiumInvalidos() {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Sem permissão' }
    const userId = (session?.user as any)?.id ?? null

    const result = await prisma.inspecoesArkium.deleteMany({ where: { numero: '' } })
    await audit({ userId, action: 'LIMPAR_INSPECOES_INVALIDAS', entity: 'Inspeções Arkium', details: { removidos: result.count } })

    return { success: true }
  } catch (error) {
    return { success: false }
  }
}
