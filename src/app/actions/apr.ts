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

const REGIAO_MAP: Record<string, string[]> = {
  'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
  'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
  'Sul': ['PR', 'RS', 'SC']
}

function parseLocalidade(localidade: string | null | undefined): { uf: string; cidade: string } {
  if (!localidade) return { uf: 'Outros', cidade: 'Outros' }
  const trimmed = localidade.trim()
  const spaceIdx = trimmed.indexOf(' ')
  if (spaceIdx === -1) {
    if (trimmed.length === 2) {
      return { uf: trimmed.toUpperCase(), cidade: 'Outros' }
    }
    return { uf: 'Outros', cidade: trimmed }
  }
  const ufPart = trimmed.substring(0, spaceIdx).replace(/[^a-zA-Z]/g, '').toUpperCase()
  const cityPart = trimmed.substring(spaceIdx + 1).replace(/^-\s*/, '').trim()
  if (ufPart.length === 2) {
    return { uf: ufPart, cidade: cityPart || 'Outros' }
  }
  return { uf: 'Outros', cidade: trimmed }
}

function parseDateToJsDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const str = String(dateStr).trim()
  if (!str) return null

  const num = Number(str)
  if (!isNaN(num) && num > 20000) {
    return new Date(Math.round((num - 25569) * 86400 * 1000))
  }

  const partsDmy = str.split('/')
  if (partsDmy.length === 3) {
    const day = parseInt(partsDmy[0], 10)
    const month = parseInt(partsDmy[1], 10) - 1
    const yearPart = partsDmy[2].trim()
    const spaceIdx = yearPart.indexOf(' ')
    let yearStr = yearPart
    let hour = 0
    let minute = 0
    let second = 0
    if (spaceIdx !== -1) {
      yearStr = yearPart.substring(0, spaceIdx)
      const timePart = yearPart.substring(spaceIdx + 1).trim()
      const timeParts = timePart.split(':')
      if (timeParts.length >= 2) {
        hour = parseInt(timeParts[0], 10)
        minute = parseInt(timeParts[1], 10)
        if (timeParts.length >= 3) {
          second = parseInt(timeParts[2], 10)
        }
      }
    }
    const year = parseInt(yearStr, 10)
    const finalYear = year < 100 ? year + 2000 : year
    if (!isNaN(day) && !isNaN(month) && !isNaN(finalYear) && !isNaN(hour) && !isNaN(minute)) {
      return new Date(finalYear, month, day, hour, minute, second)
    }
  }

  const partsYmd = str.split('-')
  if (partsYmd.length >= 3) {
    const year = parseInt(partsYmd[0], 10)
    const month = parseInt(partsYmd[1], 10) - 1
    const dayPart = partsYmd[2].trim()
    const spaceIdx = dayPart.indexOf(' ')
    let dayStr = dayPart
    let hour = 0
    let minute = 0
    let second = 0
    if (spaceIdx !== -1) {
      dayStr = dayPart.substring(0, spaceIdx)
      const timePart = dayPart.substring(spaceIdx + 1).trim()
      const timeParts = timePart.split(':')
      if (timeParts.length >= 2) {
        hour = parseInt(timeParts[0], 10)
        minute = parseInt(timeParts[1], 10)
        if (timeParts.length >= 3) {
          second = parseInt(timeParts[2], 10)
        }
      }
    }
    const day = parseInt(dayStr, 10)
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && !isNaN(hour) && !isNaN(minute)) {
      return new Date(year, month, day, hour, minute, second)
    }
  }

  const d = new Date(str)
  if (!isNaN(d.getTime())) return d
  return null
}

/**
 * Returns the distinct years present in the APR data.
 * Extracts the year from the string field `data_abertura` using PostgreSQL's SUBSTRING.
 * Supports both DD/MM/YYYY and YYYY-MM-DD formats.
 * Falls back to the indexed `ano_abertura` integer column when populated.
 */
export async function getAprYears(): Promise<{ success: boolean; years?: number[]; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    // Try to get years from the string field first (always works, even before backfill)
    const rows = await prisma.$queryRaw<{ ano: number | null }[]>`
      SELECT DISTINCT
        CASE
          WHEN data_abertura ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}'
            THEN CAST(SUBSTRING(data_abertura, 7, 4) AS INTEGER)
          WHEN data_abertura ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            THEN CAST(SUBSTRING(data_abertura, 1, 4) AS INTEGER)
          ELSE NULL
        END AS ano
      FROM arkium_aprs
      WHERE data_abertura IS NOT NULL
    `
    const years = rows
      .map(r => r.ano != null ? Number(r.ano) : null)
      .filter((n): n is number => n !== null && !isNaN(n) && n > 2000 && n <= new Date().getFullYear() + 1)
      .sort((a, b) => b - a)

    // Deduplicate
    const uniqueYears = [...new Set(years)]
    return { success: true, years: uniqueYears }
  } catch (error) {
    console.error('Erro ao buscar anos de APR:', error)
    return { success: false, error: 'Erro ao buscar anos' }
  }
}

/**
 * Backfills the `ano_abertura` integer column from the `data_abertura` string field.
 * Run once after the new column was added — extremely fast (index-write only, no data loaded).
 */
export async function backfillAprAnoAbertura(): Promise<{ success: boolean; updated?: number; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    // Update DD/MM/YYYY format
    const r1 = await prisma.$executeRaw`
      UPDATE arkium_aprs
      SET ano_abertura = CAST(SUBSTRING(data_abertura, 7, 4) AS INTEGER)
      WHERE data_abertura ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}'
        AND ano_abertura IS NULL
    `

    // Update YYYY-MM-DD format
    const r2 = await prisma.$executeRaw`
      UPDATE arkium_aprs
      SET ano_abertura = CAST(SUBSTRING(data_abertura, 1, 4) AS INTEGER)
      WHERE data_abertura ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
        AND ano_abertura IS NULL
    `

    return { success: true, updated: r1 + r2 }
  } catch (error) {
    console.error('Erro no backfill de ano_abertura:', error)
    return { success: false, error: 'Falha no backfill' }
  }
}

export async function getAprs(filters?: {
  year?: number | 'ALL'
  months?: number[]   // 1..12 — use numbers instead of abbreviation strings
  region?: string
  state?: string
  city?: string
  tecnico?: string
  atividade?: string
  search?: string
  page?: number
  pageSize?: number
  exportAll?: boolean
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const year = filters?.year ?? new Date().getFullYear()
    const months = filters?.months ?? []  // empty = all months
    const region = filters?.region || ''
    const state = filters?.state || ''
    const city = filters?.city || ''
    const tecnico = filters?.tecnico || ''
    const atividade = filters?.atividade || ''
    const search = filters?.search || ''
    const page = filters?.page ?? 1
    const pageSize = filters?.pageSize ?? 20
    const exportAll = filters?.exportAll ?? false

    // Build WHERE clause — using indexed fields whenever possible
    const where: any = {}
    const andConditions: any[] = []

    // Year filter — use the indexed integer column when available,
    // AND fallback to string matching for records where ano_abertura is still NULL
    if (year !== 'ALL') {
      const yr = Number(year)
      const yrStr2 = `/${yr}/`   // DD/MM/YYYY pattern
      const yrStr4 = `-${yr}-`   // rare ISO pattern
      andConditions.push({
        OR: [
          { anoAbertura: yr },  // fast index path (after backfill)
          // fallback: string matching for rows not yet backfilled
          {
            AND: [
              { anoAbertura: null },
              {
                OR: [
                  { dataAbertura: { contains: String(yr), mode: 'insensitive' } },
                  { dataChecklist: { contains: String(yr), mode: 'insensitive' } }
                ]
              }
            ]
          }
        ]
      })
    }

    // Month filter: use raw SQL via prisma.$queryRaw is complex with Prisma where,
    // so we build an OR on string patterns but ONLY when year is also filtered
    // (year index reduces the working set to ~50k-100k rows first)
    if (months.length > 0 && months.length < 12) {
      const monthConditions: any[] = []
      for (const m of months) {
        const mm = String(m).padStart(2, '0')
        monthConditions.push({ dataAbertura: { contains: `/${mm}/` } })
        monthConditions.push({ dataAbertura: { contains: `-${mm}-` } })
        monthConditions.push({ dataChecklist: { contains: `/${mm}/` } })
        monthConditions.push({ dataChecklist: { contains: `-${mm}-` } })
      }
      andConditions.push({ OR: monthConditions })
    }

    if (tecnico.trim()) {
      andConditions.push({ nomeAuditor: { contains: tecnico.trim(), mode: 'insensitive' } })
    }

    if (atividade.trim()) {
      andConditions.push({ nomeQuestionario: { contains: atividade.trim(), mode: 'insensitive' } })
    }

    if (state.trim()) {
      andConditions.push({ localidadeObjeto: { startsWith: state.trim(), mode: 'insensitive' } })
    } else if (region.trim()) {
      const regStates = REGIAO_MAP[region] || []
      if (regStates.length > 0) {
        andConditions.push({
          OR: regStates.map(st => ({ localidadeObjeto: { startsWith: st, mode: 'insensitive' } }))
        })
      }
    }

    if (city.trim()) {
      andConditions.push({ localidadeObjeto: { contains: city.trim(), mode: 'insensitive' } })
    }

    if (search.trim()) {
      andConditions.push({
        OR: [
          { numero: { contains: search.trim(), mode: 'insensitive' } },
          { nomeAuditor: { contains: search.trim(), mode: 'insensitive' } },
          { localidadeObjeto: { contains: search.trim(), mode: 'insensitive' } },
          { nomeQuestionario: { contains: search.trim(), mode: 'insensitive' } }
        ]
      })
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    const limit = exportAll ? 50000 : pageSize
    const skip = exportAll ? 0 : (page - 1) * pageSize

    // Run all queries in parallel; groupBy on `resultado` replaces 3 separate COUNTs
    const [
      resultadoGroups,
      rawAbertFech,
      rankingTecData,
      rankingAtividadesData,
      aprs
    ] = await Promise.all([
      prisma.aprArkium.groupBy({
        by: ['resultado'],
        where,
        _count: { _all: true }
      }),
      // Sample more rows to ensure we find ones with valid dates
      prisma.aprArkium.findMany({
        where: {
          AND: [
            where,
            { dataAbertura: { not: null, not: '-' } },
            { dataFechamento: { not: null, not: '-' } }
          ]
        },
        select: { dataAbertura: true, dataFechamento: true },
        orderBy: { importadoEm: 'desc' },
        take: 5000
      }),
      prisma.aprArkium.groupBy({
        by: ['nomeAuditor'],
        where,
        _count: { _all: true },
        orderBy: { _count: { nomeAuditor: 'desc' } },
        take: 10
      }),
      prisma.aprArkium.groupBy({
        by: ['nomeQuestionario'],
        where,
        _count: { _all: true },
        orderBy: { _count: { nomeQuestionario: 'desc' } },
        take: 10
      }),
      prisma.aprArkium.findMany({
        where,
        orderBy: { dataAbertura: 'desc' },
        skip,
        take: limit,
        include: {
          tecnico: { select: { id: true, nome: true, ativo: true } }
        }
      })
    ])

    // Compute totals from groupBy
    let totalCount = 0
    let conformeCount = 0
    let naoConformeCount = 0
    for (const g of resultadoGroups) {
      const count = g._count?._all || 0
      totalCount += count
      const resText = (g.resultado || '').toUpperCase().trim()
      const isNaoConforme = resText.includes('NÃO CONFORME') || resText.includes('NAO CONFORME')
      const isConforme = resText.includes('CONFORME') && !isNaoConforme
      if (isConforme) conformeCount += count
      else if (isNaoConforme) naoConformeCount += count
    }

    // Average delay from sample
    let sumDelayMs = 0
    let delayCount = 0
    for (const apr of rawAbertFech) {
      const abert = parseDateToJsDate(apr.dataAbertura)
      const fech = parseDateToJsDate(apr.dataFechamento)
      if (abert && fech) {
        const diffMs = fech.getTime() - abert.getTime()
        // Ignora outliers (mais de 3 horas = 10800000 ms)
        if (diffMs >= 0 && diffMs <= 10800000) { 
          sumDelayMs += diffMs; 
          delayCount++ 
        }
      }
    }
    const avgDelayMs = delayCount > 0 ? sumDelayMs / delayCount : 0

    // Rankings
    const rankingTecnicos = rankingTecData
      .filter(item => item.nomeAuditor)
      .map(item => ({ nome: item.nomeAuditor!, count: item._count._all, active: true }))

    const rankingAtividades = rankingAtividadesData.map(item => {
      let n = item.nomeQuestionario || 'Outra Atividade'
      n = n.replace(/APR\s*-\s*Analise preliminar de Risco\s*-\s*/i, 'APR - ')
      return {
        nome: n,
        count: item._count._all
      }
    })

    // Cities: only when a state is selected (avoids full-table groupBy)
    let availableCities: { name: string; count: number }[] = []
    if (state.trim()) {
      const groupLocalidades = await prisma.aprArkium.groupBy({
        by: ['localidadeObjeto'],
        where,
        _count: { _all: true },
        orderBy: { _count: { localidadeObjeto: 'desc' } },
        take: 200
      })
      const citiesMap: Record<string, number> = {}
      for (const loc of groupLocalidades) {
        const { cidade } = parseLocalidade(loc.localidadeObjeto)
        citiesMap[cidade] = (citiesMap[cidade] || 0) + loc._count._all
      }
      availableCities = Object.entries(citiesMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    }

    return {
      success: true,
      data: {
        aprs,
        totalCount,
        stats: { total: totalCount, conforme: conformeCount, naoConforme: naoConformeCount, avgDelayMs },
        rankingTecnicos,
        rankingAtividades,
        availableCities
      }
    }
  } catch (error) {
    console.error('Erro ao buscar APRs:', error)
    return { success: false, error: 'Erro ao buscar dados' }
  }
}

/**
 * Extract the year from a date string like "DD/MM/YYYY HH:MM" or "YYYY-MM-DD".
 * Returns null if parsing fails.
 */
function extractYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const str = String(dateStr).trim()

  // Excel serial number
  const num = Number(str)
  if (!isNaN(num) && num > 20000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000))
    return d.getUTCFullYear()
  }

  // DD/MM/YYYY
  const dmy = str.split('/')
  if (dmy.length >= 3) {
    const y = parseInt(dmy[2], 10)
    if (!isNaN(y) && y > 2000) return y
  }

  // YYYY-MM-DD
  const ymd = str.split('-')
  if (ymd.length >= 3 && ymd[0].length === 4) {
    const y = parseInt(ymd[0], 10)
    if (!isNaN(y) && y > 2000) return y
  }

  return null
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

    const creates: any[] = []
    const updates: any[] = []

    for (const item of items) {
      if (!item.numero) continue

      let tecnicoId = null

      if (item.matriculaAuditor) {
        const match = tecnicos.find(t => t.matriculaArkium && t.matriculaArkium.toUpperCase().trim() === item.matriculaAuditor.toUpperCase().trim())
        if (match) tecnicoId = match.id
      }

      if (!tecnicoId && item.nomeAuditor) {
        const itemNomeLimpo = normalize(item.nomeAuditor)
        for (const t of tecnicos) {
          if (nameMatches(itemNomeLimpo, normalize(t.nome))) {
            tecnicoId = t.id
            break
          }
        }
      }

      // Populate the indexed integer year for fast filtering
      const anoAbertura = extractYear(item.dataAbertura) ?? extractYear(item.dataChecklist) ?? null

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
        anoAbertura,
        tecnicoId: tecnicoId || (existingRecord ? existingRecord.tecnicoId : null),
        importadoPor: item.importadoPor
      }

      if (existingRecord) {
        updates.push({ where: { id: existingRecord.id }, data: dataPayload })
      } else {
        creates.push({ numero: item.numero, ...dataPayload })
      }
    }

    if (creates.length > 0) {
      await prisma.aprArkium.createMany({ data: creates, skipDuplicates: true })
      inseridos += creates.length
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates.map(up => prisma.aprArkium.update(up)))
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
