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

export async function getAprs() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    // No role-based filtering for APRs, display all technicians' data as requested
    const data = await prisma.aprArkium.findMany({
      orderBy: { dataAbertura: 'desc' },
      include: {
        tecnico: {
          select: {
            id: true,
            nome: true,
            ativo: true,
          }
        }
      }
    })

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao buscar APRs:', error)
    return { success: false, error: 'Erro ao buscar dados' }
  }
}

export async function upsertAprBatch(items: any[]) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id ?? null

    let inseridos = 0
    let atualizados = 0

    const tecnicos = await prisma.tecnico.findMany({ select: { id: true, nome: true, matriculaArkium: true } })

    const batchNumeros = items.map(item => String(item.numero)).filter(Boolean)
    const existing = await prisma.aprArkium.findMany({
      where: { numero: { in: batchNumeros } },
      select: { id: true, numero: true, tecnicoId: true }
    })
    const existingMap = new Map(existing.map(e => [e.numero, e]))

    const creates = []
    const updates = []

    for (const item of items) {
      if (!item.numero) continue

      let tecnicoId = null
      
      if (item.matriculaAuditor) {
        const match = tecnicos.find(t => t.matriculaArkium && t.matriculaArkium.toUpperCase().trim() === item.matriculaAuditor.toUpperCase().trim())
        if (match) {
          tecnicoId = match.id
        }
      }

      if (!tecnicoId && item.nomeAuditor) {
        const itemNomeLimpo = normalize(item.nomeAuditor)

        for (const t of tecnicos) {
          const tNomeLimpo = normalize(t.nome)
          if (nameMatches(itemNomeLimpo, tNomeLimpo)) { 
            tecnicoId = t.id
            break 
          }
        }
      }

      const existingRecord = existingMap.get(item.numero)
      const dataPayload = {
        resultado: item.resultado,
        dataAbertura: item.dataAbertura,
        dataFechamento: item.dataFechamento,
        dataChecklist: item.dataChecklist,
        matriculaAuditor: item.matriculaAuditor,
        nomeAuditor: item.nomeAuditor,
        identificadorObjeto: item.identificadorObjeto,
        nomeQuestionario: item.nomeQuestionario,
        clienteObjeto: item.clienteObjeto,
        localidadeObjeto: item.localidadeObjeto,
        autocheck: item.autocheck,
        observacao: item.observacao,
        status: item.status,
        tecnicoId: tecnicoId || (existingRecord ? existingRecord.tecnicoId : null),
        importadoPor: item.importadoPor
      }

      if (existingRecord) {
        updates.push({
          where: { id: existingRecord.id },
          data: dataPayload
        })
      } else {
        creates.push({
          numero: item.numero,
          ...dataPayload
        })
      }
    }

    if (creates.length > 0) {
      await prisma.aprArkium.createMany({ data: creates, skipDuplicates: true })
      inseridos += creates.length
    }

    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map(up => prisma.aprArkium.update(up))
      )
      atualizados += updates.length
    }

    await audit({ userId, action: 'IMPORTAR_APR', entity: 'APR Arkium', details: { inseridos, atualizados, total: items.length } })
    return { success: true, inseridos, atualizados }
  } catch (error) {
    console.error('Erro no upsert em lote APR:', error)
    return { success: false, error: 'Falha ao sincronizar lote' }
  }
}

export async function deleteAprItem(id: string) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Sem permissão' }
    const userId = (session?.user as any)?.id ?? null

    await prisma.aprArkium.delete({ where: { id } })
    await audit({ userId, action: 'EXCLUIR_APR', entity: 'APR Arkium', entityId: id })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir APR:', error)
    return { success: false, error: 'Falha ao excluir' }
  }
}
