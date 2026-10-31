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

function isCurrentMonthAndYear(dateStr: string | null | undefined, month1to12: number, year: number): boolean {
  if (!dateStr) return false
  const s = String(dateStr).trim()
  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/')
    if (parts.length >= 3) {
      const m = parseInt(parts[1], 10)
      let y = parseInt(parts[2], 10)
      if (y < 100) y += 2000
      return m === month1to12 && y === year
    }
  }
  if (s.includes('-')) {
    const parts = s.split('T')[0].split(' ')[0].split('-')
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10)
      return m === month1to12 && y === year
    }
  }
  const num = Number(s)
  if (!isNaN(num) && num > 20000) {
    const jsDate = new Date(Math.round((num - 25569) * 86400 * 1000))
    return jsDate.getUTCMonth() + 1 === month1to12 && jsDate.getUTCFullYear() === year
  }
  return false
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

    const { searchParams } = new URL(req.url)
    const requestedTecnicoId = searchParams.get('tecnicoId')

    const isMasterOrAdmin = authUser.role === 'MASTER' || authUser.role === 'ADMIN'

    // Lista de técnicos ativos (para filtro/seleção ou perfil)
    const tecnicosList = await prisma.tecnico.findMany({
      where: { ativo: true },
      include: { baseFixa: true, unidades: true },
      orderBy: { nome: 'asc' },
    })

    let targetTecnicoId = authUser.tecnicoId || null
    if (isMasterOrAdmin && requestedTecnicoId) {
      targetTecnicoId = requestedTecnicoId === 'ALL' ? null : requestedTecnicoId
    } else if (!targetTecnicoId && tecnicosList.length > 0) {
      targetTecnicoId = tecnicosList[0].id
    }

    const currentTecnico = targetTecnicoId
      ? tecnicosList.find((t) => t.id === targetTecnicoId) || null
      : null

    const whereTecnico = targetTecnicoId ? { tecnicoId: targetTecnicoId } : {}

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1)
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999)

    const [
      planejamentos,
      quilometragens,
      abastecimentos,
      recargas,
      manutencoes,
      relatoriosCampo,
      dssAliados,
      naoConformidades,
      documentos,
      reunioes,
      dssArkiumAll,
      inspecoesArkiumAll,
      unidades,
    ] = await Promise.all([
      prisma.planejamento.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true, fotoUrl: true } } },
        orderBy: [{ dataAtividade: 'desc' }, { createdAt: 'desc' }],
        take: 80,
      }),
      prisma.quilometragem.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { dataInicial: 'desc' },
        take: 40,
      }),
      prisma.abastecimento.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { data: 'desc' },
        take: 40,
      }),
      prisma.recargaAbastecimento.findMany({
        where: whereTecnico,
        orderBy: { data: 'desc' },
        take: 20,
      }),
      prisma.manutencaoVeiculo.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { dataManutencao: 'desc' },
        take: 20,
      }),
      prisma.relatorioAtividade.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { data: 'desc' },
        take: 40,
      }),
      prisma.dssAliado.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { data: 'desc' },
        take: 30,
      }),
      prisma.naoConformidade.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { dataAbertura: 'desc' },
        take: 50,
      }),
      prisma.documentoTecnico.findMany({
        where: whereTecnico,
        include: {
          tipoDocumento: true,
          tecnico: { select: { id: true, nome: true } },
        },
        orderBy: { dataVencimento: 'asc' },
        take: 50,
      }),
      prisma.reuniao.findMany({
        where: whereTecnico,
        include: { tecnico: { select: { id: true, nome: true } } },
        orderBy: { data: 'desc' },
        take: 30,
      }),
      prisma.dssArkium.findMany({
        where: targetTecnicoId && currentTecnico?.matriculaArkium
          ? {
              OR: [
                { tecnicoId: targetTecnicoId },
                { matricula: currentTecnico.matriculaArkium },
              ],
            }
          : targetTecnicoId
            ? { tecnicoId: targetTecnicoId }
            : {},
        take: 300,
      }),
      prisma.inspecoesArkium.findMany({
        where: whereTecnico,
        take: 300,
      }),
      prisma.unidade.findMany({
        orderBy: { nome: 'asc' },
      }),
    ])

    // Cálculo de DSS realizados no mês atual
    const dssArkiumMes = dssArkiumAll.filter((d) => {
      const assinadoOk = (d.assinado || '').toLowerCase().includes('sim')
      return assinadoOk && isCurrentMonthAndYear(d.dataFechamento, currentMonth, currentYear)
    }).length

    const dssAliadosMes = dssAliados.filter((d) => {
      const dt = new Date(d.data)
      return dt >= startOfMonth && dt <= endOfMonth
    }).length

    const dssRealizadosMes = dssArkiumMes + dssAliadosMes
    const dssMetaMes = currentTecnico ? 8 : Math.max(8, tecnicosList.filter((t) => t.contaMeta).length * 8)

    // Cálculo de Inspeções realizadas no mês atual
    const inspecoesRealizadasMes = inspecoesArkiumAll.filter((i) =>
      isCurrentMonthAndYear(i.dataAbertura || i.dataFechamento, currentMonth, currentYear)
    ).length
    const inspecoesMetaMes = currentTecnico ? 20 : Math.max(20, tecnicosList.filter((t) => t.contaMeta).length * 20)

    // Cálculo financeiro de abastecimento no mês
    const orcamentoBase = currentTecnico
      ? currentTecnico.orcamentoAbastecimento
      : tecnicosList.reduce((acc, t) => acc + (t.orcamentoAbastecimento || 800), 0)

    const gastoMes = abastecimentos
      .filter((a) => {
        const dt = new Date(a.data)
        return dt >= startOfMonth && dt <= endOfMonth
      })
      .reduce((acc, a) => acc + a.valor, 0)

    const recargasMes = recargas
      .filter((r) => {
        const dt = new Date(r.data)
        return dt >= startOfMonth && dt <= endOfMonth
      })
      .reduce((acc, r) => acc + r.valor, 0)

    const saldoAbastecimento = Number((orcamentoBase + recargasMes - gastoMes).toFixed(2))

    // KM rodados no mês
    const kmRodadosMes = quilometragens
      .filter((k) => {
        const dt = new Date(k.dataInicial)
        return dt >= startOfMonth && dt <= endOfMonth && k.diferenca != null
      })
      .reduce((acc, k) => acc + (k.diferenca || 0), 0)

    const ncPendentesCount = naoConformidades.filter((nc) => nc.status !== 'RESOLVIDO').length
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
          name: authUser.name || currentTecnico?.nome || 'Usuário SG4',
          email: authUser.email,
          role: authUser.role,
          tecnicoId: targetTecnicoId,
        },
        currentTecnico: currentTecnico
          ? {
              id: currentTecnico.id,
              nome: currentTecnico.nome,
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
            }
          : null,
        tecnicos: tecnicosList.map((t) => ({
          id: t.id,
          nome: t.nome,
          cargo: t.cargo,
          fotoUrl: t.fotoUrl,
          veiculo: t.veiculo,
          baseFixaNome: t.baseFixa?.nome || null,
        })),
        unidades: unidades.map((u) => ({
          id: u.id,
          nome: u.nome,
          cidade: u.cidade || '',
          estado: u.estado || 'SP',
        })),
        summary: {
          mesReferencia: `${String(currentMonth).padStart(2, '0')}/${currentYear}`,
          dssRealizadosMes,
          dssMetaMes,
          inspecoesRealizadasMes,
          inspecoesMetaMes,
          orcamentoBase,
          gastoMes: Number(gastoMes.toFixed(2)),
          recargasMes: Number(recargasMes.toFixed(2)),
          saldoAbastecimento,
          kmRodadosMes: Number(kmRodadosMes.toFixed(1)),
          ncPendentesCount,
          atividadesPendentesCount,
          docsVencidosOuAVencer,
        },
        planejamentos: planejamentos.map((p) => ({
          id: p.id,
          tecnicoId: p.tecnicoId,
          tecnicoNome: p.tecnico?.nome || '',
          dataAtividade: p.dataAtividade.toISOString(),
          hora: p.hora || '08:00',
          titulo: p.titulo || p.categoria,
          categoria: p.categoria,
          descricaoOriginal: p.descricaoOriginal,
          descricaoExecutada: p.descricaoExecutada || '',
          equipe: p.equipe || '',
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
          tecnicoNome: k.tecnico?.nome || '',
          diaSemana: k.diaSemana,
          dataInicial: k.dataInicial.toISOString(),
          kmInicial: k.kmInicial,
          fotoInicial: k.fotoInicial || null,
          dataFinal: k.dataFinal ? k.dataFinal.toISOString() : null,
          kmFinal: k.kmFinal ?? null,
          fotoFinal: k.fotoFinal || null,
          diferenca: k.diferenca ?? null,
        })),
        abastecimentos: abastecimentos.map((a) => ({
          id: a.id,
          tecnicoId: a.tecnicoId,
          tecnicoNome: a.tecnico?.nome || '',
          data: a.data.toISOString(),
          valor: a.valor,
          tipo: a.tipo,
          fotoCupom: a.fotoCupom || null,
        })),
        manutencoes: manutencoes.map((m) => ({
          id: m.id,
          tecnicoId: m.tecnicoId,
          tecnicoNome: m.tecnico?.nome || '',
          kmManutencao: m.kmManutencao,
          dataManutencao: m.dataManutencao.toISOString(),
          comprovanteUrl: m.comprovanteUrl || null,
        })),
        relatoriosCampo: relatoriosCampo.map((r) => ({
          id: r.id,
          tecnicoId: r.tecnicoId,
          tecnicoNome: r.tecnico?.nome || '',
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
          tecnicoNome: d.tecnico?.nome || '',
          data: d.data.toISOString(),
          tema: d.tema,
          fotoUrl: d.fotoUrl || null,
        })),
        naoConformidades: naoConformidades.map((nc) => ({
          id: nc.id,
          originalId: nc.originalId || '',
          executor: nc.executor || nc.tecnico?.nome || '',
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
          tecnicoNome: doc.tecnico?.nome || '',
          tipoNome: doc.tipoDocumento?.nome || doc.titulo || 'Documento',
          titulo: doc.titulo || doc.tipoDocumento?.nome || 'Documento',
          arquivoUrl: doc.arquivoUrl,
          arquivoNome: doc.arquivoNome,
          dataEmissao: doc.dataEmissao.toISOString(),
          dataVencimento: doc.dataVencimento ? doc.dataVencimento.toISOString() : null,
          status: doc.status,
        })),
        reunioes: reunioes.map((r) => ({
          id: r.id,
          tecnicoId: r.tecnicoId,
          tecnicoNome: r.tecnico?.nome || '',
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

