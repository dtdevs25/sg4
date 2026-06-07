'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

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

    for (const item of items) {
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

    const registros = await prisma.dssArkium.findMany({
      orderBy: { importadoEm: 'desc' },
    })

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

    const isFechado =
      assinado.toLowerCase() === 'sim' || assinado.toLowerCase() === 'yes' || justificativa.length > 0

    await prisma.dssArkium.update({
      where: { id },
      data: {
        assinado,
        justificativa,
        estado: isFechado ? 'FECHADO' : 'ABERTO',
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao atualizar estado DSS:', error)
    return { success: false, error: 'Erro ao atualizar registro.' }
  }
}
