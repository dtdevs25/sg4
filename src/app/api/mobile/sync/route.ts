import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_mobile_sg4_2026'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

type MobileAuthPayload = {
  userId: string
  name?: string
  email: string
  role: string
  tecnicoId?: string | null
}

async function resolveMobileUser(req: Request): Promise<MobileAuthPayload | null> {
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as MobileAuthPayload
      if (decoded?.userId) return decoded
    } catch {
      // Fallback to NextAuth session if token invalid
    }
  }

  try {
    const session = await auth()
    if (session?.user) {
      const u = session.user as any
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'TST',
        tecnicoId: u.tecnicoId || null,
      }
    }
  } catch {
    // Ignore session error
  }

  return null
}

function normalizeStr(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function matchTecnicoName(recordName: string | null | undefined, targetFullName: string | null | undefined): boolean {
  const r = normalizeStr(recordName)
  const t = normalizeStr(targetFullName)
  if (!r || !t) return false
  if (r === t || r.includes(t) || t.includes(r)) return true

  const ignore = ['de', 'da', 'do', 'dos', 'das', 'e']
  const rParts = r.split(/\s+/).filter((p) => !ignore.includes(p))
  const tParts = t.split(/\s+/).filter((p) => !ignore.includes(p))

  if (rParts.length >= 2 && tParts.length >= 2) {
    if (rParts[0] === tParts[0] && rParts[rParts.length - 1] === tParts[tParts.length - 1]) return true
    if (rParts[0] === tParts[0] && rParts[1] === tParts[1]) return true
  }
  return false
}

function isDssAssinado(val: string | null | undefined): boolean {
  const s = String(val || '').trim().toLowerCase()
  if (!s) return false
  return (
    s.startsWith('s') ||
    s.startsWith('y') ||
    s === '1' ||
    s === 'true' ||
    s === 'ok' ||
    s === 'assinado' ||
    s.includes('sim')
  )
}

function parseFlexibleMonthYear(dateVal: string | Date | null | undefined): { month: number; year: number } | null {
  if (!dateVal) return null
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null
    return { month: dateVal.getUTCMonth() + 1, year: dateVal.getUTCFullYear() }
  }
  const s = String(dateVal).trim()
  if (!s) return null

  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/')
    if (parts.length >= 3) {
      const m = parseInt(parts[1], 10)
      let y = parseInt(parts[2], 10)
      if (y < 100) y += 2000
      if (!isNaN(m) && !isNaN(y) && m >= 1 && m <= 12) {
        return { month: m, year: y }
      }
    }
  }

  if (s.includes('-')) {
    const parts = s.split('T')[0].split(' ')[0].split('-')
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10)
      if (!isNaN(m) && !isNaN(y) && m >= 1 && m <= 12) {
        return { month: m, year: y }
      }
    }
  }

  const num = Number(s)
  if (!isNaN(num) && num > 20000) {
    const jsDate = new Date(Math.round((num - 25569) * 86400 * 1000))
    if (!isNaN(jsDate.getTime())) {
      return { month: jsDate.getUTCMonth() + 1, year: jsDate.getUTCFullYear() }
    }
  }

  const fallback = new Date(s)
  if (!isNaN(fallback.getTime())) {
    return { month: fallback.getUTCMonth() + 1, year: fallback.getUTCFullYear() }
  }
  return null
}

export async function GET(req: Request) {
  try {
    const authUser = await resolveMobileUser(req)
    if (!authUser) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login no aplicativo.' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const url = new URL(req.url)
    const queryTecnicoId = url.searchParams.get('tecnicoId')
    const isMasterOrAdmin = authUser.role === 'MASTER' || authUser.role === 'ADMIN'

    // Buscar todos os técnicos
    const tecnicosList = await prisma.tecnico.findMany({
      include: { baseFixa: true, unidades: true },
      orderBy: { nome: 'asc' },
    })

    // Cada usuário vê APENAS o seu próprio registro de técnico
    let currentTecnico =
      (authUser.tecnicoId ? tecnicosList.find((t) => t.id === authUser.tecnicoId) : null) ||
      tecnicosList.find((t) => t.userId === authUser.userId) ||
      (authUser.email
        ? tecnicosList.find((t) => (t.email || '').toLowerCase() === authUser.email.toLowerCase())
        : null) ||
      (authUser.name ? tecnicosList.find((t) => matchTecnicoName(t.nome, authUser.name)) : null) ||
      null

    // Fallback seguro apenas caso um usuário de teste não possua vínculo direto na tabela tecnicos
    if (!currentTecnico && tecnicosList.length > 0) {
      currentTecnico = tecnicosList.find((t) => t.ativo) || tecnicosList[0]
    }

    if (!currentTecnico && tecnicosList.length > 0) {
      currentTecnico = tecnicosList[0]
    }

    let targetTecnicoId: string | null = currentTecnico?.id || null
    let isAllTecnicos = false

    if (isMasterOrAdmin && queryTecnicoId) {
      if (queryTecnicoId === 'ALL') {
        isAllTecnicos = true
        targetTecnicoId = null
      } else {
        const found = tecnicosList.find(t => t.id === queryTecnicoId)
        if (found) {
          currentTecnico = found
          targetTecnicoId = found.id
        }
      }
    }

    if (!isAllTecnicos && !targetTecnicoId) {
      return NextResponse.json(
        { error: 'Nenhum perfil de técnico encontrado para este usuário.' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    const whereTecnico = isAllTecnicos ? {} : { tecnicoId: targetTecnicoId! }

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1)
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999)

    // Buscar dados estritamente do usuário logado
    const [
      planejamentos,
      quilometragens,
      abastecimentos,
      recargas,
      manutencoes,
      relatoriosCampo,
      dssAliados,
      naoConformidadesAll,
      documentos,
      reunioes,
      dssArkiumCandidate,
      inspecoesArkiumCandidate,
      unidades,
      relatoriosPdfList,
    ] = await Promise.all([
      prisma.planejamento.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true, fotoUrl: true } } },
        orderBy: [{ dataAtividade: 'asc' }, { hora: 'asc' }],
        take: 400,
      }),
      prisma.quilometragem.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { dataInicial: 'desc' },
        take: 1500,
      }),
      prisma.abastecimento.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { data: 'desc' },
        take: 800,
      }),
      prisma.recargaAbastecimento.findMany({
        where: whereTecnico,
        orderBy: { data: 'desc' },
        take: 300,
      }),
      prisma.manutencaoVeiculo.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { dataManutencao: 'desc' },
        take: 50,
      }),
      prisma.relatorioAtividade.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { data: 'desc' },
        take: 500,
      }),
      prisma.dssAliado.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { data: 'desc' },
        take: 300,
      }),
      prisma.naoConformidade.findMany({
        where: isAllTecnicos ? {} : {
          OR: [
            ...(targetTecnicoId ? [{ tecnicoId: targetTecnicoId }] : []),
            ...(currentTecnico?.nome
              ? [{ executor: { contains: currentTecnico?.nome || 'Técnico'.split(' ')[0], mode: 'insensitive' as const } }]
              : []),
          ],
        },
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { dataAbertura: 'desc' },
        take: 400,
      }),
      prisma.documentoTecnico.findMany({
        where: whereTecnico,
        include: {
          tipoDocumento: true,
          tecnico: { select: { id: true, nome: true } },
        },
        orderBy: { dataVencimento: 'asc' },
        take: 80,
      }),
      prisma.reuniao.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { data: 'desc' },
        take: 60,
      }),
      prisma.dssArkium.findMany({
        where: isAllTecnicos ? {} : {
          OR: [
            ...(targetTecnicoId ? [{ tecnicoId: targetTecnicoId }] : []),
            ...(currentTecnico?.matriculaArkium ? [{ matricula: currentTecnico.matriculaArkium }] : []),
            ...(currentTecnico?.nome
              ? [
                { lider: { contains: currentTecnico?.nome || 'Técnico'.split(' ')[0], mode: 'insensitive' as const } },
                { nome: { contains: currentTecnico?.nome || 'Técnico'.split(' ')[0], mode: 'insensitive' as const } },
              ]
              : []),
          ],
        },
      }),
      prisma.inspecoesArkium.findMany({
        where: isAllTecnicos ? {} : {
          OR: [
            ...(targetTecnicoId ? [{ tecnicoId: targetTecnicoId }] : []),
            ...(currentTecnico?.matriculaArkium ? [{ matriculaAuditor: currentTecnico.matriculaArkium }] : []),
            ...(currentTecnico?.nome
              ? [{ nomeAuditor: { contains: currentTecnico?.nome || 'Técnico'.split(' ')[0], mode: 'insensitive' as const } }]
              : []),
          ],
        },
      }),
      prisma.unidade.findMany({
        orderBy: { nome: 'asc' },
      }),
      prisma.relatorioPdf.findMany({
        where: isAllTecnicos ? {} : (targetTecnicoId ? { OR: [{ tecnicoId: targetTecnicoId }, { tecnicoId: null }] } : {}),
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ])

    // Refinar filtro exato do técnico para DSS Arkium, Inspeções Arkium e NCs (igual ao Dashboard web)
    const dssArkium = isAllTecnicos
      ? dssArkiumCandidate
      : dssArkiumCandidate.filter((d) => {
        if (d.tecnicoId === targetTecnicoId) return true
        if (currentTecnico?.matriculaArkium && d.matricula === currentTecnico.matriculaArkium) return true
        return matchTecnicoName(d.lider || d.nome, currentTecnico?.nome)
      })

    const inspecoesArkium = isAllTecnicos
      ? inspecoesArkiumCandidate
      : inspecoesArkiumCandidate.filter((i) => {
        if (i.tecnicoId === targetTecnicoId) return true
        if (currentTecnico?.matriculaArkium && i.matriculaAuditor === currentTecnico.matriculaArkium) return true
        return matchTecnicoName(i.nomeAuditor, currentTecnico?.nome)
      })

    const naoConformidades = isAllTecnicos
      ? naoConformidadesAll
      : naoConformidadesAll.filter((nc) => {
        if (nc.tecnicoId === targetTecnicoId) return true
        return matchTecnicoName(nc.executor, currentTecnico?.nome)
      })

    // Construir estatísticas mensais por (ano, mes 1..12) para que o filtro de meses do Painel funcione instantaneamente
    const yearsSet = new Set<number>([currentYear, currentYear - 1])
    const tecnicosAtivos = tecnicosList.filter((t) => t.ativo)
    const tecnicosAtivosCount = Math.max(1, tecnicosAtivos.length)
    const multiplicadorTecnicos = isAllTecnicos ? tecnicosAtivosCount : 1

    type MonthBucket = {
      year: number
      month: number // 1..12
      dssCount: number
      dssMeta: number
      inspecoesCount: number
      inspecoesMeta: number
      relatoriosCount: number
      ncTotal: number
      ncAbertas: number
      ncFechadas: number
      kmTotal: number
      gastoAbastecimento: number
      recargasAbastecimento: number
      saldoMes: number
    }

    const bucketMap = new Map<string, MonthBucket>()
    const getBucket = (year: number, month: number): MonthBucket => {
      yearsSet.add(year)
      const key = `${year}-${month}`
      let b = bucketMap.get(key)
      if (!b) {
        b = {
          year,
          month,
          dssCount: 0,
          dssMeta: 8 * multiplicadorTecnicos,
          inspecoesCount: 0,
          inspecoesMeta: 20 * multiplicadorTecnicos,
          relatoriosCount: 0,
          ncTotal: 0,
          ncAbertas: 0,
          ncFechadas: 0,
          kmTotal: 0,
          gastoAbastecimento: 0,
          recargasAbastecimento: 0,
          saldoMes: 0,
        }
        bucketMap.set(key, b)
      }
      return b
    }

    // Inicializar todos os 12 meses do ano atual e anterior
    for (const y of [currentYear, currentYear - 1]) {
      for (let m = 1; m <= 12; m++) {
        getBucket(y, m)
      }
    }

    // 1. Contabilizar DSS Arkium assinados
    for (const d of dssArkium) {
      if (!isDssAssinado(d.assinado)) continue
      const parsed = parseFlexibleMonthYear(d.dataFechamento)
      if (parsed) {
        getBucket(parsed.year, parsed.month).dssCount += 1
      }
    }

    // 2. Contabilizar DSS com Aliado
    for (const d of dssAliados) {
      const parsed = parseFlexibleMonthYear(d.data)
      if (parsed) {
        getBucket(parsed.year, parsed.month).dssCount += 1
      }
    }

    // 3. Contabilizar Inspeções Arkium
    for (const i of inspecoesArkium) {
      const parsed = parseFlexibleMonthYear(i.dataAbertura || i.dataFechamento)
      if (parsed) {
        getBucket(parsed.year, parsed.month).inspecoesCount += 1
      }
    }

    // 4. Contabilizar Itens incluídos no Relatório de Atividades
    for (const r of relatoriosCampo) {
      const parsed = parseFlexibleMonthYear(r.data)
      if (parsed) {
        getBucket(parsed.year, parsed.month).relatoriosCount += 1
      }
    }

    // 5. Contabilizar Não Conformidades (Total, Abertas, Fechadas)
    for (const nc of naoConformidades) {
      const parsed = parseFlexibleMonthYear(nc.dataAbertura || nc.importadoEm)
      if (parsed) {
        const b = getBucket(parsed.year, parsed.month)
        b.ncTotal += 1
        const st = (nc.status || '').toUpperCase()
        if (['RESOLVIDO', 'CERRADA', 'FECHADA'].includes(st)) {
          b.ncFechadas += 1
        } else {
          b.ncAbertas += 1
        }
      }
    }

    const orcamentoPadraoTecnico = (currentTecnico?.orcamentoAbastecimento || 800)
    const orcamentoTotalMensal = isAllTecnicos
      ? tecnicosList.filter(t => t.ativo).reduce((acc, t) => acc + (t.orcamentoAbastecimento || 800), 0)
      : orcamentoPadraoTecnico

    // 6. Contabilizar KM por mês (calcula diferenca real caso k.diferenca seja nulo)
    for (const k of quilometragens) {
      const diff = k.diferenca != null ? k.diferenca : (k.kmFinal != null && k.kmFinal >= k.kmInicial ? (k.kmFinal - k.kmInicial) : 0)
      if (diff <= 0) continue
      const parsed = parseFlexibleMonthYear(k.dataInicial)
      if (parsed) {
        const b = getBucket(parsed.year, parsed.month)
        b.kmTotal = Number((b.kmTotal + diff).toFixed(1))
      }
    }

    // 7. Contabilizar Abastecimentos e Recargas por mês
    for (const a of abastecimentos) {
      const parsed = parseFlexibleMonthYear(a.data)
      if (parsed) {
        const b = getBucket(parsed.year, parsed.month)
        b.gastoAbastecimento = Number((b.gastoAbastecimento + (a.valor || 0)).toFixed(2))
      }
    }

    // Separa recargas extras de depósitos/overrides mensais
    const overridesPorMes = new Map<string, number>()
    for (const r of recargas) {
      const parsed = parseFlexibleMonthYear(r.data)
      if (parsed) {
        const key = `${parsed.year}-${parsed.month}`
        if (r.isOverride) {
          overridesPorMes.set(key, r.valor || 0)
        } else {
          const b = getBucket(parsed.year, parsed.month)
          b.recargasAbastecimento = Number((b.recargasAbastecimento + (r.valor || 0)).toFixed(2))
        }
      }
    }

    // 8. Calcular saldo líquido de cada mês respeitando aprovação/depósito real no mês vigente
    for (const b of bucketMap.values()) {
      const key = `${b.year}-${b.month}`
      const isMesAtualOuFuturo = b.year > currentYear || (b.year === currentYear && b.month >= currentMonth)
      let orcMes = 0
      if (overridesPorMes.has(key)) {
        orcMes = overridesPorMes.get(key)!
      } else if (!isMesAtualOuFuturo) {
        orcMes = orcamentoTotalMensal
      } else {
        orcMes = 0 // Mês vigente ou futuro aguarda lançamento/aprovação manual
      }
      b.saldoMes = Number((orcMes + b.recargasAbastecimento - b.gastoAbastecimento).toFixed(2))
    }

    const monthlyStats = Array.from(bucketMap.values()).sort((a, b) =>
      a.year !== b.year ? b.year - a.year : a.month - b.month
    )

    const currentMonthBucket = getBucket(currentYear, currentMonth)

    // Cálculo financeiro de abastecimento no mês atual
    const gastoMes = abastecimentos
      .filter((a) => {
        const dt = new Date(a.data)
        return dt >= startOfMonth && dt <= endOfMonth
      })
      .reduce((acc, a) => acc + a.valor, 0)

    const recargasExtrasMes = recargas
      .filter((r) => {
        const dt = new Date(r.data)
        return !r.isOverride && dt >= startOfMonth && dt <= endOfMonth
      })
      .reduce((acc, r) => acc + r.valor, 0)

    const overridesMesAtual = recargas.filter((r) => {
      const dt = new Date(r.data)
      return r.isOverride && dt >= startOfMonth && dt <= endOfMonth
    })

    const orcamentoEfetivoMesAtual = overridesMesAtual.length > 0
      ? overridesMesAtual[overridesMesAtual.length - 1].valor
      : 0

    const saldoAbastecimento = Number((orcamentoEfetivoMesAtual + recargasExtrasMes - gastoMes).toFixed(2))

    const ncPendentesCount = naoConformidades.filter(
      (nc) => !['RESOLVIDO', 'CERRADA', 'FECHADA'].includes((nc.status || '').toUpperCase())
    ).length
    const atividadesPendentesCount = planejamentos.filter((p) => p.status === 'PENDENTE').length
    const docsVencidosOuAVencer = documentos.filter(
      (d) => d.status === 'VENCIDO' || d.status === 'A_VENCER'
    ).length

    return NextResponse.json(
      {
        success: true,
        syncedAt: new Date().toISOString(),
        user: {
          id: authUser.userId,
          name: currentTecnico?.nome || authUser.name || 'Usuário SG4',
          email: authUser.email,
          role: authUser.role,
          tecnicoId: targetTecnicoId,
        },
        currentTecnico: currentTecnico ? {
          id: currentTecnico.id,
          nome: currentTecnico?.nome || 'Técnico',
          email: currentTecnico.email,
          telefone: currentTecnico.telefone,
          cargo: currentTecnico.cargo,
          fotoUrl: currentTecnico.fotoUrl,
          veiculo: currentTecnico.veiculo,
          matriculaArkium: currentTecnico.matriculaArkium,
          matriculaVivo: currentTecnico.matriculaVivo,
          orcamentoAbastecimento: currentTecnico.orcamentoAbastecimento,
          baseFixaNome: currentTecnico.baseFixa?.nome || 'Sem Base Fixa',
          unidades: currentTecnico.unidades.map((u) => u.nome),
        } : null,
        tecnicosAtivosCount,
        tecnicos: isMasterOrAdmin
          ? [
            {
              id: 'ALL',
              nome: `Todos os Colaboradores (${tecnicosAtivosCount} ativos)`,
              cargo: 'Equipe Geral',
              fotoUrl: null,
              veiculo: null,
              baseFixaNome: 'Todas as Unidades',
            },
            ...tecnicosList.map(t => ({
              id: t.id,
              nome: t.ativo ? t.nome : `${t.nome} (Inativo)`,
              cargo: t.cargo,
              fotoUrl: t.fotoUrl,
              veiculo: t.veiculo,
              baseFixaNome: t.baseFixa?.nome || null,
            }))
          ]
          : [
            {
              id: currentTecnico?.id || 'TST',
              nome: currentTecnico?.nome || 'Técnico',
              cargo: currentTecnico?.cargo || 'Técnico de Segurança',
              fotoUrl: currentTecnico?.fotoUrl || null,
              veiculo: currentTecnico?.veiculo || null,
              baseFixaNome: currentTecnico?.baseFixa?.nome || null,
            },
          ],
        unidades: unidades.map((u) => ({
          id: u.id,
          nome: u.nome,
          cidade: u.cidade || '',
          estado: u.estado || 'SP',
        })),
        availableYears: Array.from(yearsSet)
          .sort((a, b) => b - a)
          .map(String),
        monthlyStats,
        summary: {
          mesReferencia: `${String(currentMonth).padStart(2, '0')}/${currentYear}`,
          dssRealizadosMes: currentMonthBucket.dssCount,
          dssMetaMes: currentMonthBucket.dssMeta,
          inspecoesRealizadasMes: currentMonthBucket.inspecoesCount,
          inspecoesMetaMes: currentMonthBucket.inspecoesMeta,
          relatoriosMes: currentMonthBucket.relatoriosCount,
          ncAbertasMes: currentMonthBucket.ncAbertas,
          ncFechadasMes: currentMonthBucket.ncFechadas,
          ncTotalMes: currentMonthBucket.ncTotal,
          orcamentoBase: orcamentoEfetivoMesAtual,
          gastoMes: Number(gastoMes.toFixed(2)),
          recargasMes: Number(recargasExtrasMes.toFixed(2)),
          saldoAbastecimento,
          kmRodadosMes: currentMonthBucket.kmTotal,
          ncPendentesCount,
          atividadesPendentesCount,
          docsVencidosOuAVencer,
        },
        planejamentos: planejamentos.map((p) => ({
          id: p.id,
          tecnicoId: p.tecnicoId,
          tecnicoNome: p.tecnico?.nome || currentTecnico?.nome || 'Técnico',
          dataAtividade: p.dataAtividade.toISOString(),
          hora: p.hora || '08:00',
          titulo: p.titulo || p.categoria,
          categoria: p.categoria,
          descricaoOriginal: p.descricaoOriginal,
          descricaoExecutada: p.descricaoExecutada || '',
          observacoes: p.observacoes || '',
          alteradaOriginal: p.alteradaOriginal || false,
          equipe: p.equipe || 'Individual',
          local: p.local || '',
          cidade: p.cidade || '',
          estado: p.estado || 'SP',
          prioridade: p.prioridade,
          status: p.status,
          checklist: Array.isArray(p.checklist) ? p.checklist : [],
        })),
        quilometragens: quilometragens.map((k) => ({
          id: k.id,
          tecnicoId: k.tecnicoId,
          tecnicoNome: k.tecnico?.nome || currentTecnico?.nome || 'Técnico',
          diaSemana: k.diaSemana,
          dataInicial: k.dataInicial.toISOString(),
          kmInicial: k.kmInicial,
          fotoInicial: k.fotoInicial || null,
          dataFinal: k.dataFinal ? k.dataFinal.toISOString() : null,
          kmFinal: k.kmFinal ?? null,
          fotoFinal: k.fotoFinal || null,
          diferenca: k.diferenca ?? null,
          latitudeInicial: k.latitudeInicial ?? null,
          longitudeInicial: k.longitudeInicial ?? null,
          latitudeFinal: k.latitudeFinal ?? null,
          longitudeFinal: k.longitudeFinal ?? null,
        })),
        abastecimentos: abastecimentos.map((a) => ({
          id: a.id,
          tecnicoId: a.tecnicoId,
          tecnicoNome: a.tecnico?.nome || currentTecnico?.nome || 'Técnico',
          data: a.data.toISOString(),
          valor: a.valor,
          tipo: a.tipo,
          fotoCupom: a.fotoCupom || null,
        })),
        manutencoes: manutencoes.map((m) => ({
          id: m.id,
          tecnicoId: m.tecnicoId,
          tecnicoNome: m.tecnico?.nome || currentTecnico?.nome || 'Técnico',
          kmManutencao: m.kmManutencao,
          dataManutencao: m.dataManutencao.toISOString(),
          descricao: m.descricao || null,
          comprovanteUrl: m.comprovanteUrl || null,
        })),
        relatoriosCampo: relatoriosCampo.map((r) => ({
          id: r.id,
          tecnicoId: r.tecnicoId,
          tecnicoNome: r.tecnico?.nome || currentTecnico?.nome || 'Técnico',
          data: r.data.toISOString(),
          empresa: r.empresa,
          projeto: r.projeto,
          local: r.local,
          cidadeUf: r.cidadeUf,
          descricao: r.descricao,
          fotoUrl: r.fotoUrl || null,
        })),
        dssAliados: dssAliados.map((d) => ({
          id: d.id,
          tecnicoId: d.tecnicoId,
          tecnicoNome: d.tecnico?.nome || currentTecnico?.nome || 'Técnico',
          data: d.data.toISOString(),
          tema: d.tema,
          fotoUrl: d.fotoUrl || null,
        })),
        naoConformidades: naoConformidades.map((nc) => ({
          id: nc.id,
          originalId: nc.originalId || '',
          executor: nc.executor || nc.tecnico?.nome || currentTecnico?.nome || 'Técnico',
          tecnicoId: nc.tecnicoId,
          pergunta: nc.pergunta || '',
          resposta: nc.resposta || '',
          classificacao: nc.classificacao || 'Média',
          localidade: nc.localidade || '',
          base: nc.base || '',
          questionario: nc.questionario || '',
          dataAbertura: nc.dataAbertura ? nc.dataAbertura.toISOString() : null,
          status: nc.status,
          updates: Array.isArray(nc.updates) ? nc.updates : [],
        })),
        documentos: documentos.map((doc) => ({
          id: doc.id,
          tecnicoId: doc.tecnicoId,
          tecnicoNome: doc.tecnico?.nome || currentTecnico?.nome || 'Técnico',
          tipoNome: doc.tipoDocumento?.nome || doc.titulo || 'Documento',
          titulo: doc.titulo || doc.tipoDocumento?.nome || 'Documento',
          arquivoUrl: doc.arquivoUrl,
          arquivoNome: doc.arquivoNome,
          dataEmissao: doc.dataEmissao.toISOString(),
          dataVencimento: doc.dataVencimento ? doc.dataVencimento.toISOString() : null,
          status: doc.status,
        })),
        relatoriosPdf: (relatoriosPdfList || []).map((pdf) => ({
          id: pdf.id,
          nomeArquivo: pdf.nomeArquivo,
          url: pdf.url,
          tamanhoBytes: pdf.tamanhoBytes,
          tecnicoId: pdf.tecnicoId,
          mesAno: pdf.mesAno,
          elaborador: pdf.elaborador,
          createdAt: pdf.createdAt.toISOString(),
        })),
        reunioes: reunioes.map((r) => ({
          id: r.id,
          tecnicoId: r.tecnicoId,
          tecnicoNome: r.tecnico?.nome || currentTecnico?.nome || 'Técnico',
          data: r.data.toISOString(),
          horaFim: r.horaFim || '',
          assunto: r.assunto || 'Reunião Geral SST',
          presenca: r.presenca,
          pontualidade: r.pontualidade,
          justificada: r.justificada,
          motivo: r.motivo || '',
        })),
      },
      { headers: CORS_HEADERS }
    )
  } catch (error: any) {
    console.error('Erro em GET /api/mobile/sync:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao sincronizar dados mobile.' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
