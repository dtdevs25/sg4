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

// Proteção em memória contra cliques/requisições duplicadas em curto intervalo
const recentRequestIds = new Map<string, number>()

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
      // Fallback to NextAuth session
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
    // Ignore
  }

  return null
}

function getDiaSemanaPtBr(date: Date): string {
  const dias = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ]
  return dias[date.getDay()] || 'Segunda-feira'
}

export async function POST(req: Request) {
  try {
    const authUser = await resolveMobileUser(req)
    if (!authUser) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login novamente.' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const body = await req.json()
    const { actionType, payload, clientRequestId } = body

    if (!actionType) {
      return NextResponse.json(
        { error: 'Tipo de ação (actionType) é obrigatório.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Idempotência para evitar duplicação por duplo clique ou reenvio de fila offline
    if (clientRequestId) {
      const nowMs = Date.now()
      const lastSeen = recentRequestIds.get(clientRequestId)
      if (lastSeen && nowMs - lastSeen < 60_000) {
        return NextResponse.json(
          { success: true, deduplicated: true, message: 'Ação já processada.' },
          { headers: CORS_HEADERS }
        )
      }
      recentRequestIds.set(clientRequestId, nowMs)
      if (recentRequestIds.size > 500) {
        const cutoff = nowMs - 120_000
        for (const [k, v] of recentRequestIds.entries()) {
          if (v < cutoff) recentRequestIds.delete(k)
        }
      }
    }

    // Determinar o tecnicoId alvo
    let tecnicoId: string | null = payload?.tecnicoId || authUser.tecnicoId || null
    if (!tecnicoId) {
      const firstTec = await prisma.tecnico.findFirst({
        where: { ativo: true },
        orderBy: { nome: 'asc' },
      })
      tecnicoId = firstTec?.id || null
    }

    if (!tecnicoId) {
      return NextResponse.json(
        { error: 'Nenhum técnico vinculado encontrado para registrar a ação.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    let resultData: any = null

    switch (actionType) {
      case 'CRIAR_ATIVIDADE': {
        const dataAtv = payload?.dataAtividade ? new Date(payload.dataAtividade) : new Date()
        const categoria = payload?.categoria || 'Visita Técnica'
        const descricao = payload?.descricaoOriginal || payload?.descricao || categoria
        const local = payload?.local || 'Em Campo'
        const cidade = payload?.cidade || 'São Paulo'
        const estado = payload?.estado || 'SP'
        const prioridade =
          payload?.prioridade === 'ALTA' || payload?.prioridade === 'BAIXA'
            ? payload.prioridade
            : 'MEDIA'

        resultData = await prisma.planejamento.create({
          data: {
            tecnicoId,
            dataAtividade: dataAtv,
            hora: payload?.hora || '08:00',
            titulo: payload?.titulo || categoria,
            categoria,
            descricaoOriginal: descricao,
            equipe: payload?.equipe || 'Individual',
            local,
            cidade,
            estado,
            prioridade,
            status: 'PENDENTE',
            checklist: [
              {
                id: `item-${Date.now()}`,
                hora: payload?.hora || '08:00',
                titulo: payload?.titulo || categoria,
                texto: descricao,
                categoria,
                equipe: payload?.equipe || 'Individual',
                local,
                cidade,
                estado,
                concluido: false,
              },
            ],
          },
        })
        break
      }

      case 'CONCLUIR_ATIVIDADE': {
        const planId = payload?.id
        if (!planId) {
          return NextResponse.json(
            { error: 'ID da atividade é obrigatório.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const existing = await prisma.planejamento.findUnique({ where: { id: planId } })
        if (!existing) {
          return NextResponse.json(
            { error: 'Atividade não encontrada.' },
            { status: 404, headers: CORS_HEADERS }
          )
        }

        const descExec = payload?.descricaoExecutada || existing.descricaoOriginal
        const fotoUrl = payload?.fotoUrl || null

        const updatedChecklist = Array.isArray(existing.checklist)
          ? (existing.checklist as any[]).map((item) => ({
              ...item,
              concluido: true,
              concluidoEm: new Date().toISOString(),
              descricaoExecutada: descExec,
              fotoUrl: fotoUrl || item.fotoUrl,
            }))
          : []

        resultData = await prisma.planejamento.update({
          where: { id: planId },
          data: {
            status: 'CONCLUIDO',
            descricaoExecutada: descExec,
            checklist: updatedChecklist,
          },
        })

        // Se solicitou envio automático para Relatório de Atividades de Campo
        if (payload?.gerarRelatorioCampo !== false) {
          await prisma.relatorioAtividade.create({
            data: {
              tecnicoId: existing.tecnicoId,
              data: existing.dataAtividade,
              empresa: 'TELEFÔNICA BRASIL S.A (VIVO)',
              projeto: existing.categoria || 'SST Campo',
              local: existing.local || 'Unidade Operacional',
              cidadeUf: `${existing.cidade || 'São Paulo'}/${existing.estado || 'SP'}`,
              descricao: descExec,
              fotoUrl,
            },
          })
        }
        break
      }

      case 'CRIAR_DSS_ALIADO': {
        const tema = payload?.tema || 'Diálogo de Segurança com Aliado'
        const dataDss = payload?.data ? new Date(payload.data) : new Date()
        resultData = await prisma.dssAliado.create({
          data: {
            tecnicoId,
            data: dataDss,
            tema,
            fotoUrl: payload?.fotoUrl || null,
          },
        })
        break
      }

      case 'INICIAR_KM': {
        const kmInicial = Number(payload?.kmInicial)
        if (isNaN(kmInicial) || kmInicial < 0) {
          return NextResponse.json(
            { error: 'Informe um KM inicial válido.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const dataIni = payload?.dataInicial ? new Date(payload.dataInicial) : new Date()
        resultData = await prisma.quilometragem.create({
          data: {
            tecnicoId,
            diaSemana: getDiaSemanaPtBr(dataIni),
            dataInicial: dataIni,
            kmInicial,
            fotoInicial: payload?.fotoInicial || null,
          },
        })
        break
      }

      case 'FINALIZAR_KM': {
        const kmId = payload?.id
        const kmFinal = Number(payload?.kmFinal)
        if (!kmId || isNaN(kmFinal)) {
          return NextResponse.json(
            { error: 'ID do registro e KM Final são obrigatórios.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const registroKm = await prisma.quilometragem.findUnique({ where: { id: kmId } })
        if (!registroKm) {
          return NextResponse.json(
            { error: 'Registro de KM não encontrado.' },
            { status: 404, headers: CORS_HEADERS }
          )
        }
        if (kmFinal < registroKm.kmInicial) {
          return NextResponse.json(
            { error: `O KM final (${kmFinal}) não pode ser menor que o KM inicial (${registroKm.kmInicial}).` },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const diferenca = Number((kmFinal - registroKm.kmInicial).toFixed(1))
        resultData = await prisma.quilometragem.update({
          where: { id: kmId },
          data: {
            dataFinal: payload?.dataFinal ? new Date(payload.dataFinal) : new Date(),
            kmFinal,
            diferenca,
            fotoFinal: payload?.fotoFinal || null,
          },
        })
        break
      }

      case 'CRIAR_ABASTECIMENTO': {
        const valor = Number(payload?.valor)
        if (isNaN(valor) || valor <= 0) {
          return NextResponse.json(
            { error: 'Informe um valor de abastecimento válido.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        resultData = await prisma.abastecimento.create({
          data: {
            tecnicoId,
            data: payload?.data ? new Date(payload.data) : new Date(),
            valor,
            tipo: payload?.tipo || 'ABASTECIMENTO',
            fotoCupom: payload?.fotoCupom || null,
          },
        })
        break
      }

      case 'CRIAR_MANUTENCAO': {
        const kmManutencao = Number(payload?.kmManutencao)
        if (isNaN(kmManutencao) || kmManutencao <= 0) {
          return NextResponse.json(
            { error: 'Informe o KM da manutenção.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        resultData = await prisma.manutencaoVeiculo.create({
          data: {
            tecnicoId,
            kmManutencao: Math.round(kmManutencao),
            dataManutencao: payload?.dataManutencao ? new Date(payload.dataManutencao) : new Date(),
            comprovanteUrl: payload?.comprovanteUrl || null,
          },
        })
        break
      }

      case 'CRIAR_RELATORIO_CAMPO': {
        const descricao = (payload?.descricao || '').trim()
        if (!descricao) {
          return NextResponse.json(
            { error: 'A descrição da atividade é obrigatória.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        resultData = await prisma.relatorioAtividade.create({
          data: {
            tecnicoId,
            data: payload?.data ? new Date(payload.data) : new Date(),
            empresa: payload?.empresa || 'TELEFÔNICA BRASIL S.A (VIVO)',
            projeto: payload?.projeto || 'SST Operacional',
            local: payload?.local || 'Unidade Vivo',
            cidadeUf: payload?.cidadeUf || 'São Paulo/SP',
            descricao,
            fotoUrl: payload?.fotoUrl || null,
          },
        })
        break
      }

      case 'TRATAR_NC': {
        const ncId = payload?.id
        const texto = (payload?.texto || '').trim()
        if (!ncId || !texto) {
          return NextResponse.json(
            { error: 'ID da Não Conformidade e descrição da tratativa são obrigatórios.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const nc = await prisma.naoConformidade.findUnique({ where: { id: ncId } })
        if (!nc) {
          return NextResponse.json(
            { error: 'Não Conformidade não encontrada.' },
            { status: 404, headers: CORS_HEADERS }
          )
        }
        const currentUpdates = Array.isArray(nc.updates) ? (nc.updates as any[]) : []
        const newUpdate = {
          date: new Date().toISOString(),
          actionDate: payload?.actionDate || new Date().toISOString().split('T')[0],
          text: texto,
          author: authUser.name || authUser.email || 'App Mobile SG4',
          fotoUrl: payload?.fotoUrl || null,
          fotoUrls: payload?.fotoUrl ? [payload.fotoUrl] : [],
        }
        const novoStatus = payload?.status || 'EM_ANDAMENTO'
        resultData = await prisma.naoConformidade.update({
          where: { id: ncId },
          data: {
            status: novoStatus,
            updates: [...currentUpdates, newUpdate],
          },
        })
        break
      }

      default:
        return NextResponse.json(
          { error: `Ação desconhecida: ${actionType}` },
          { status: 400, headers: CORS_HEADERS }
        )
    }

    return NextResponse.json(
      {
        success: true,
        actionType,
        data: resultData,
      },
      { headers: CORS_HEADERS }
    )
  } catch (error: any) {
    console.error('Erro em POST /api/mobile/action:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao processar ação mobile.' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

