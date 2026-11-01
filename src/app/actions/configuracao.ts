'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

let tableChecked = false

async function ensureConfigTable() {
  if (tableChecked) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "configuracoes_sistema" (
        "chave" TEXT PRIMARY KEY,
        "valor" TEXT NOT NULL,
        "descricao" TEXT,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    tableChecked = true
  } catch (err) {
    console.warn('ensureConfigTable notice:', err)
  }
}

export async function getConfiguracao(chave: string, valorPadrao: string = ''): Promise<string> {
  try {
    await ensureConfigTable()
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT "valor" FROM "configuracoes_sistema" WHERE "chave" = $1 LIMIT 1`,
      chave
    )
    if (rows && rows.length > 0 && rows[0].valor !== undefined) {
      return String(rows[0].valor)
    }
    return valorPadrao
  } catch (err) {
    console.error(`Erro ao buscar configuracao ${chave}:`, err)
    return valorPadrao
  }
}

export async function setConfiguracao(
  chave: string,
  valor: string,
  descricao?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: 'Não autorizado' }
    }
    const role = (session.user as any).role
    if (role === 'TST') {
      return { success: false, error: 'Apenas administradores podem alterar configurações do sistema.' }
    }

    await ensureConfigTable()
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "configuracoes_sistema" ("chave", "valor", "descricao", "updatedAt")
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT ("chave")
      DO UPDATE SET "valor" = EXCLUDED."valor", "descricao" = COALESCE(EXCLUDED."descricao", "configuracoes_sistema"."descricao"), "updatedAt" = CURRENT_TIMESTAMP;
      `,
      chave,
      valor,
      descricao || null
    )
    return { success: true }
  } catch (err: any) {
    console.error(`Erro ao salvar configuracao ${chave}:`, err)
    return { success: false, error: err?.message || 'Erro ao salvar configuração' }
  }
}

export const CHAVE_BLOQUEIO_ABASTECIMENTO_WEB = 'BLOQUEAR_ABASTECIMENTO_WEB_TECNICOS'

export async function isAbastecimentoWebBloqueadoParaTecnicos(): Promise<boolean> {
  const valor = await getConfiguracao(CHAVE_BLOQUEIO_ABASTECIMENTO_WEB, 'false')
  return valor === 'true'
}

export async function setAbastecimentoWebBloqueadoParaTecnicos(
  bloqueado: boolean
): Promise<{ success: boolean; error?: string }> {
  return setConfiguracao(
    CHAVE_BLOQUEIO_ABASTECIMENTO_WEB,
    bloqueado ? 'true' : 'false',
    'Quando ativado, oculta a aba e bloqueia lançamentos de abastecimento no sistema web para técnicos (TST), exigindo o uso exclusivo do SG4 Mobile com geolocalização.'
  )
}

