'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'

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
        const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        const nomeDb = removeAccents(tecnico.nome.toLowerCase().trim())
        const dbTokens = nomeDb.split(' ')

        data = data.filter((r: any) => {
          if (!r.nomeAuditor) return false
          const nomePlanilha = removeAccents(r.nomeAuditor.toLowerCase().trim())
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

    const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    for (const item of items) {
      let tecnicoId = null
      if (item.nomeAuditor) {
        const itemNomeLimpo = removeAccents(item.nomeAuditor.toLowerCase().trim())
        const itemTokens = itemNomeLimpo.split(' ')

        for (const t of tecnicos) {
          const tNomeLimpo = removeAccents(t.nome.toLowerCase().trim())
          if (itemNomeLimpo === tNomeLimpo) { tecnicoId = t.id; break }
          const tTokens = tNomeLimpo.split(' ')
          if (itemTokens[0] === tTokens[0]) {
            if (itemTokens.length === 1 || tTokens.length === 1) { tecnicoId = t.id; break }
            let matched = false
            for (let i = 1; i < itemTokens.length; i++) {
              for (let j = 1; j < tTokens.length; j++) {
                if (itemTokens[i] === tTokens[j] || (itemTokens[i] === 'jr' && tTokens[j] === 'junior') || (itemTokens[i] === 'junior' && tTokens[j] === 'jr')) {
                  tecnicoId = t.id; matched = true; break
                }
              }
              if (matched) break
            }
            if (matched) break
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
    const userId = (session?.user as any)?.id ?? null

    const result = await prisma.inspecoesArkium.deleteMany({ where: { numero: '' } })
    await audit({ userId, action: 'LIMPAR_INSPECOES_INVALIDAS', entity: 'Inspeções Arkium', details: { removidos: result.count } })

    return { success: true }
  } catch (error) {
    return { success: false }
  }
}
