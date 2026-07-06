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

    const tecnicos = await prisma.tecnico.findMany({ select: { id: true, nome: true, matriculaArkium: true } })

    for (const item of itemsValidos) {
      try {
        let tecnicoId = null
        if (item.matricula) {
          const match = tecnicos.find(t => t.matriculaArkium && t.matriculaArkium.toUpperCase().trim() === item.matricula.toUpperCase().trim())
          if (match) {
            tecnicoId = match.id
          }
        }

        if (!tecnicoId && item.nome) {
          const itemNomeLimpo = normalize(item.nome)
          for (const t of tecnicos) {
            const tNomeLimpo = normalize(t.nome)
            if (nameMatches(itemNomeLimpo, tNomeLimpo)) {
              tecnicoId = t.id
              break
            }
          }
        }

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
            tecnicoId: tecnicoId
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
            tecnicoId: tecnicoId
          },
        })
        inseridos++
      } catch (err) {
        console.error('Erro no upsert dss:', err)
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
        const nomeDb = normalize(tecnico.nome)

        registros = registros.filter((r: any) => {
          if (!r.nome) return false
          const nomePlanilha = normalize(r.nome)
          return nameMatches(nomePlanilha, nomeDb)
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
    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Sem permissão' }
    const userId = (session.user as any).id

    const resultEmpty = await prisma.dssArkium.deleteMany({ where: { numeroDialogo: '' } })
    const resultNonSg4 = await prisma.dssArkium.deleteMany({
      where: {
        NOT: { matricula: { startsWith: 'SG4', mode: 'insensitive' } }
      }
    })

    const removidos = (resultEmpty.count || 0) + (resultNonSg4.count || 0)
    await audit({ userId, action: 'LIMPAR_DSS_INVALIDOS', entity: 'DSS Arkium', details: { removidos } })

    return { success: true, removidos }
  } catch (error) {
    console.error('Erro ao limpar registros inválidos:', error)
    return { success: false, error: 'Erro ao limpar registros.' }
  }
}

export async function deleteDssArkium(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Sem permissão' }
    const userId = (session.user as any).id

    await prisma.dssArkium.delete({ where: { id } })
    await audit({ userId, action: 'EXCLUIR_DSS', entity: 'DSS Arkium', entityId: id })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir DSS Arkium:', error)
    return { success: false, error: 'Erro ao excluir registro.' }
  }
}
