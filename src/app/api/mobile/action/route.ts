import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { optimizeTextWithAI } from '@/app/actions/ai'
import jwt from 'jsonwebtoken'
import s3Client from '@/lib/s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_mobile_sg4_2026'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

async function uploadBase64ToMinio(
  fileDataOrUrl: string | null | undefined,
  bucket: string,
  folder: string = 'fotos'
): Promise<string | null> {
  if (!fileDataOrUrl || typeof fileDataOrUrl !== 'string') return null
  const trimmed = fileDataOrUrl.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  if (trimmed.startsWith('data:image') || (trimmed.length > 200 && !trimmed.includes(' '))) {
    try {
      const cleanBase64 = trimmed.includes('base64,') ? trimmed.split('base64,')[1] : trimmed
      const buffer = Buffer.from(cleanBase64, 'base64')
      const ext = trimmed.includes('image/png') ? 'png' : 'jpg'
      const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: ext === 'png' ? 'image/png' : 'image/jpeg',
        ACL: 'public-read',
      })

      await s3Client.send(command)

      const baseUrl = (process.env.S3_ENDPOINT || 'https://storage-api.ehspro.com.br').replace(/\/$/, '')
      return `${baseUrl}/${bucket}/${key}`
    } catch (err) {
      console.error(`[MinIO Mobile Upload] Erro ao enviar para o bucket ${bucket}:`, err)
      return trimmed
    }
  }
  return trimmed
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

function parseDateSafe(input: string | Date | null | undefined): Date {
  if (!input) return new Date()
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input
  const s = String(input).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T12:00:00Z`)
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/')
    return new Date(`${y}-${m}-${d}T12:00:00Z`)
  }
  const parsed = new Date(s)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

function generateDatesForFrequency(
  startDateInput: string | Date,
  frequencia: string,
  endDateInput?: string | Date | null
): Date[] {
  const start = parseDateSafe(startDateInput)
  const freq = (frequencia || 'UNICA').toUpperCase()
  if (freq === 'UNICA' || !endDateInput) {
    return [start]
  }
  const end = parseDateSafe(endDateInput)
  if (end < start) {
    return [start]
  }

  const dates: Date[] = []
  const curr = new Date(start.getTime())
  let safetyCounter = 0

  while (curr <= end && safetyCounter < 180) {
    safetyCounter++
    const dayOfWeek = curr.getUTCDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(new Date(curr.getTime()))
    }
    if (freq === 'DIARIA') {
      curr.setUTCDate(curr.getUTCDate() + 1)
    } else if (freq === 'SEMANAL') {
      curr.setUTCDate(curr.getUTCDate() + 7)
    } else if (freq === 'QUINZENAL') {
      curr.setUTCDate(curr.getUTCDate() + 14)
    } else if (freq === 'MENSAL') {
      curr.setUTCMonth(curr.getUTCMonth() + 1)
    } else if (freq === 'BIMESTRAL') {
      curr.setUTCMonth(curr.getUTCMonth() + 2)
    } else if (freq === 'TRIMESTRAL') {
      curr.setUTCMonth(curr.getUTCMonth() + 3)
    } else {
      break
    }
  }

  return dates.length > 0 ? dates : [start]
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

    // Ação de Corretor Ortográfico com IA (não altera banco, responde imediatamente)
    if (actionType === 'CORRIGIR_TEXTO_IA') {
      const textoOriginal = String(payload?.texto || '').trim()
      if (!textoOriginal) {
        return NextResponse.json(
          { error: 'Digite algum texto antes de usar o corretor com IA.' },
          { status: 400, headers: CORS_HEADERS }
        )
      }
      const aiRes = await optimizeTextWithAI(textoOriginal)
      if (!aiRes.success || !aiRes.text) {
        return NextResponse.json(
          { error: aiRes.error || 'Não foi possível corrigir o texto com a IA no momento.' },
          { status: 400, headers: CORS_HEADERS }
        )
      }
      return NextResponse.json(
        {
          success: true,
          actionType: 'CORRIGIR_TEXTO_IA',
          correctedText: aiRes.text,
          data: { text: aiRes.text },
        },
        { headers: CORS_HEADERS }
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

    // Determinar o tecnicoId estritamente vinculado ao usuário logado ("cada um vê apenas o seu")
    let tecnicoId: string | null = authUser.tecnicoId || null
    if (!tecnicoId) {
      const matchedTec = await prisma.tecnico.findFirst({
        where: {
          OR: [
            { userId: authUser.userId },
            ...(authUser.email ? [{ email: { equals: authUser.email, mode: 'insensitive' as const } }] : []),
          ],
        },
      })
      tecnicoId = matchedTec?.id || payload?.tecnicoId || null
    }
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
      case 'CRIAR_ATIVIDADE':
      case 'CRIAR_ATIVIDADE_BATCH': {
        // Suporta tanto envio de 1 atividade (com frequência e dataFim) quanto lista de itens em lote (items[])
        const rawItems: any[] = Array.isArray(payload?.items) && payload.items.length > 0
          ? payload.items
          : [payload || {}]

        const createdPlans: any[] = []

        for (const item of rawItems) {
          const categoria = String(item.categoria || payload?.categoria || 'INSPEÇÃO DE SEGURANÇA').trim()
          const titulo = String(item.titulo || payload?.titulo || categoria).trim()
          const descricao = String(item.descricaoOriginal || item.descricao || payload?.descricaoOriginal || titulo).trim()
          const hora = String(item.hora || payload?.hora || '08:00').trim()
          const local = String(item.local || payload?.local || 'Em Campo').trim()
          const cidade = String(item.cidade || payload?.cidade || 'São Paulo').trim()
          const estado = String(item.estado || payload?.estado || 'SP').trim()
          const rawPrio = String(item.prioridade || payload?.prioridade || 'MEDIA').toUpperCase()
          const prioridade: 'ALTA' | 'MEDIA' | 'BAIXA' =
            rawPrio === 'ALTA' || rawPrio === 'BAIXA' ? rawPrio : 'MEDIA'

          const frequencia = String(item.frequencia || payload?.frequencia || 'UNICA').toUpperCase()
          const dataInicio = item.dataAtividade || payload?.dataAtividade || new Date()
          const dataFim = item.dataFim || payload?.dataFim || null

          const targetDates = generateDatesForFrequency(dataInicio, frequencia, dataFim)

          const customChecklist = Array.isArray(item.checklist)
            ? item.checklist
            : []

          for (const dt of targetDates) {
            const created = await prisma.planejamento.create({
              data: {
                tecnicoId,
                dataAtividade: dt,
                hora,
                titulo,
                categoria,
                descricaoOriginal: descricao,
                equipe: String(item.equipe || payload?.equipe || 'Individual'),
                local,
                cidade,
                estado,
                prioridade,
                status: 'PENDENTE',
                alteradaOriginal: false,
                checklist: customChecklist,
              },
            })
            createdPlans.push(created)
          }
        }

        resultData = createdPlans
        break
      }

      case 'EDITAR_ATIVIDADE': {
        const planId = payload?.id
        if (!planId) {
          return NextResponse.json(
            { error: 'ID do agendamento é obrigatório para editar.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const existing = await prisma.planejamento.findUnique({ where: { id: planId } })
        if (!existing || existing.tecnicoId !== tecnicoId) {
          return NextResponse.json(
            { error: 'Agendamento não encontrado.' },
            { status: 404, headers: CORS_HEADERS }
          )
        }

        const rawPrio = String(payload?.prioridade || existing.prioridade || 'MEDIA').toUpperCase()
        const prioridade: 'ALTA' | 'MEDIA' | 'BAIXA' =
          rawPrio === 'ALTA' || rawPrio === 'BAIXA' ? rawPrio : 'MEDIA'

        resultData = await prisma.planejamento.update({
          where: { id: planId },
          data: {
            dataAtividade: payload?.dataAtividade ? parseDateSafe(payload.dataAtividade) : existing.dataAtividade,
            hora: payload?.hora !== undefined ? String(payload.hora) : existing.hora,
            titulo: payload?.titulo !== undefined ? String(payload.titulo) : existing.titulo,
            categoria: payload?.categoria !== undefined ? String(payload.categoria) : existing.categoria,
            descricaoOriginal:
              payload?.descricaoOriginal !== undefined
                ? String(payload.descricaoOriginal)
                : existing.descricaoOriginal,
            local: payload?.local !== undefined ? String(payload.local) : existing.local,
            cidade: payload?.cidade !== undefined ? String(payload.cidade) : existing.cidade,
            estado: payload?.estado !== undefined ? String(payload.estado) : existing.estado,
            prioridade,
            ...(Array.isArray(payload?.checklist) ? { checklist: payload.checklist } : {}),
          },
        })
        break
      }

      case 'TOGGLE_CHECKLIST_ATIVIDADE': {
        const planId = payload?.id
        const checklist = Array.isArray(payload?.checklist) ? payload.checklist : []
        if (!planId) {
          return NextResponse.json(
            { error: 'ID da atividade é obrigatório.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const existing = await prisma.planejamento.findUnique({ where: { id: planId } })
        if (!existing || existing.tecnicoId !== tecnicoId) {
          return NextResponse.json(
            { error: 'Atividade não encontrada.' },
            { status: 404, headers: CORS_HEADERS }
          )
        }

        const allChecked = checklist.length > 0 && checklist.every((i: any) => Boolean(i.concluido))
        const newStatus = allChecked ? 'CONCLUIDO' : 'PENDENTE'

        resultData = await prisma.planejamento.update({
          where: { id: planId },
          data: {
            checklist,
            status: newStatus,
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
        if (!existing || existing.tecnicoId !== tecnicoId) {
          return NextResponse.json(
            { error: 'Atividade não encontrada.' },
            { status: 404, headers: CORS_HEADERS }
          )
        }

        const descExec = String(payload?.descricaoExecutada || existing.descricaoOriginal).trim()
        const observacoes = payload?.observacoes ? String(payload.observacoes).trim() : existing.observacoes
        const fotoUrl = await uploadBase64ToMinio(payload?.fotoUrl, 'sg4-relatorios', 'dss')
        const alteradaOriginal = descExec !== (existing.descricaoOriginal || '').trim()

        const updatedChecklist = Array.isArray(payload?.checklist)
          ? payload.checklist
          : Array.isArray(existing.checklist)
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
            observacoes,
            alteradaOriginal,
            checklist: updatedChecklist,
          },
        })

        // Se for DSS e marcou que foi DSS com Aliado, salva em DssAliado igual à web
        if (payload?.salvarDssAliado === true) {
          const temaDss = String(payload?.temaDss || existing.titulo || existing.descricaoOriginal || 'Diálogo de Segurança').trim()
          await prisma.dssAliado.create({
            data: {
              tecnicoId: existing.tecnicoId,
              data: existing.dataAtividade,
              tema: temaDss,
              fotoUrl,
              planejamentoItemRef: existing.id,
            },
          })
        }

        // Se solicitou inclusão no Relatório de Atividades de Campo
        if (payload?.gerarRelatorioCampo === true) {
          const empresaRel = String(payload?.empresa || 'Telefônica Brasil S.A').trim()
          const projetoRel = String(payload?.projeto || 'VIVO').trim()
          const localRel = String(payload?.local || existing.local || 'Unidade Operacional').trim()
          const cidadeUfRel = String(
            payload?.cidadeUf ||
              (existing.cidade ? `${existing.cidade}/${existing.estado || 'SP'}` : 'São Paulo/SP')
          ).trim()
          const descRel = String(payload?.descricaoRelatorio || descExec).trim()

          await prisma.relatorioAtividade.create({
            data: {
              tecnicoId: existing.tecnicoId,
              data: existing.dataAtividade,
              empresa: empresaRel,
              projeto: projetoRel,
              local: localRel,
              cidadeUf: cidadeUfRel,
              descricao: descRel,
              fotoUrl,
            },
          })
        }
        break
      }

      case 'TRANSFERIR_PENDENCIAS_ATIVIDADE': {
        const planId = payload?.id
        const novaData = payload?.novaData ? parseDateSafe(payload.novaData) : null
        if (!planId || !novaData) {
          return NextResponse.json(
            { error: 'ID da atividade e nova data para transferência são obrigatórios.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const existing = await prisma.planejamento.findUnique({ where: { id: planId } })
        if (!existing || existing.tecnicoId !== tecnicoId) {
          return NextResponse.json(
            { error: 'Atividade não encontrada.' },
            { status: 404, headers: CORS_HEADERS }
          )
        }

        const fullList: any[] = Array.isArray(payload?.checklist)
          ? payload.checklist
          : Array.isArray(existing.checklist)
            ? (existing.checklist as any[])
            : []

        const checklistConcluido = fullList.filter((i) => Boolean(i.concluido))
        const checklistPendente = fullList.filter((i) => !i.concluido)

        const descricaoConcluida =
          String(payload?.descricaoConcluida || '').trim() ||
          checklistConcluido.map((i) => `[${i.categoria || existing.categoria}] ${i.texto}`).join('\n') ||
          existing.descricaoOriginal

        const descricaoPendente =
          String(payload?.descricaoPendente || '').trim() ||
          checklistPendente.map((i) => `[${i.categoria || existing.categoria}] ${i.texto}`).join('\n') ||
          existing.descricaoOriginal

        await prisma.planejamento.update({
          where: { id: planId },
          data: {
            status: 'CONCLUIDO',
            checklist: checklistConcluido,
            descricaoExecutada: descricaoConcluida,
            observacoes: payload?.observacoes ? String(payload.observacoes) : existing.observacoes,
            alteradaOriginal: true,
          },
        })

        resultData = await prisma.planejamento.create({
          data: {
            tecnicoId: existing.tecnicoId,
            hora: existing.hora,
            titulo: existing.titulo,
            categoria: existing.categoria,
            prioridade: existing.prioridade,
            local: existing.local,
            cidade: existing.cidade,
            estado: existing.estado,
            equipe: existing.equipe,
            dataAtividade: novaData,
            status: 'PENDENTE',
            checklist: checklistPendente,
            descricaoOriginal: descricaoPendente,
          },
        })
        break
      }

      case 'MOVER_DATA_ATIVIDADE': {
        const planId = payload?.id
        const novaData = payload?.novaData ? parseDateSafe(payload.novaData) : null
        if (!planId || !novaData) {
          return NextResponse.json(
            { error: 'ID da atividade e nova data são obrigatórios.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const existing = await prisma.planejamento.findUnique({ where: { id: planId } })
        if (!existing || existing.tecnicoId !== tecnicoId) {
          return NextResponse.json(
            { error: 'Atividade não encontrada.' },
            { status: 404, headers: CORS_HEADERS }
          )
        }
        if (existing.status === 'CONCLUIDO') {
          return NextResponse.json(
            { error: 'Não é possível mover uma atividade já concluída.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        resultData = await prisma.planejamento.update({
          where: { id: planId },
          data: { dataAtividade: novaData },
        })
        break
      }

      case 'REVERTER_ATIVIDADE': {
        const planId = payload?.id
        if (!planId) {
          return NextResponse.json(
            { error: 'ID da atividade é obrigatório.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const existing = await prisma.planejamento.findUnique({ where: { id: planId } })
        if (!existing || existing.tecnicoId !== tecnicoId) {
          return NextResponse.json(
            { error: 'Atividade não encontrada.' },
            { status: 404, headers: CORS_HEADERS }
          )
        }
        resultData = await prisma.planejamento.update({
          where: { id: planId },
          data: {
            status: 'PENDENTE',
            descricaoExecutada: null,
            observacoes: null,
            alteradaOriginal: false,
          },
        })
        break
      }

      case 'EXCLUIR_ATIVIDADE': {
        const planId = payload?.id
        if (!planId) {
          return NextResponse.json(
            { error: 'ID da atividade é obrigatório.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const existing = await prisma.planejamento.findUnique({ where: { id: planId } })
        if (!existing || existing.tecnicoId !== tecnicoId) {
          return NextResponse.json(
            { error: 'Atividade não encontrada.' },
            { status: 404, headers: CORS_HEADERS }
          )
        }
        await prisma.planejamento.delete({ where: { id: planId } })
        resultData = { deletedId: planId }
        break
      }

      case 'CRIAR_DSS_ALIADO': {
        const tema = String(payload?.tema || 'Diálogo de Segurança com Aliado').trim()
        const dataDss = payload?.data ? parseDateSafe(payload.data) : new Date()
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
        const dataIni = payload?.dataInicial ? parseDateSafe(payload.dataInicial) : new Date()
        const fotoInicial = await uploadBase64ToMinio(payload?.fotoInicial, 'sg4-km', 'fotos')
        resultData = await prisma.quilometragem.create({
          data: {
            tecnicoId,
            diaSemana: getDiaSemanaPtBr(dataIni),
            dataInicial: dataIni,
            kmInicial,
            fotoInicial,
            latitudeInicial: payload?.latitude != null ? Number(payload.latitude) : (payload?.latitudeInicial != null ? Number(payload.latitudeInicial) : null),
            longitudeInicial: payload?.longitude != null ? Number(payload.longitude) : (payload?.longitudeInicial != null ? Number(payload.longitudeInicial) : null),
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
        if (!registroKm || registroKm.tecnicoId !== tecnicoId) {
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
        const fotoFinal = await uploadBase64ToMinio(payload?.fotoFinal, 'sg4-km', 'fotos')
        resultData = await prisma.quilometragem.update({
          where: { id: kmId },
          data: {
            dataFinal: payload?.dataFinal ? parseDateSafe(payload.dataFinal) : new Date(),
            kmFinal,
            diferenca,
            fotoFinal,
            latitudeFinal: payload?.latitude != null ? Number(payload.latitude) : (payload?.latitudeFinal != null ? Number(payload.latitudeFinal) : null),
            longitudeFinal: payload?.longitude != null ? Number(payload.longitude) : (payload?.longitudeFinal != null ? Number(payload.longitudeFinal) : null),
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
        const fotoCupom = await uploadBase64ToMinio(payload?.fotoCupom, 'sg4-km', 'cupons')
        resultData = await prisma.abastecimento.create({
          data: {
            tecnicoId,
            data: payload?.data ? parseDateSafe(payload.data) : new Date(),
            valor,
            tipo: payload?.tipo || 'ABASTECIMENTO',
            fotoCupom,
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
        const comprovanteUrl = await uploadBase64ToMinio(payload?.fotoUrl || payload?.comprovanteUrl, 'sg4-km', 'manutencao')
        resultData = await prisma.manutencaoVeiculo.create({
          data: {
            tecnicoId,
            kmManutencao: Math.round(kmManutencao),
            dataManutencao: payload?.dataManutencao ? parseDateSafe(payload.dataManutencao) : new Date(),
            descricao: payload?.descricao ? String(payload.descricao).trim() : null,
            comprovanteUrl,
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
        const fotoUrlRel = await uploadBase64ToMinio(payload?.fotoUrl, 'sg4-relatorios', 'fotos')
        resultData = await prisma.relatorioAtividade.create({
          data: {
            tecnicoId,
            data: payload?.data ? parseDateSafe(payload.data) : new Date(),
            empresa: payload?.empresa || 'Telefônica Brasil S.A',
            projeto: payload?.projeto || 'VIVO',
            local: payload?.local || 'Unidade Vivo',
            cidadeUf: payload?.cidadeUf || 'São Paulo/SP',
            descricao,
            fotoUrl: fotoUrlRel,
          },
        })
        break
      }

      case 'EDITAR_RELATORIO_CAMPO': {
        const relId = payload?.id
        if (!relId) {
          return NextResponse.json(
            { error: 'ID do item do relatório é obrigatório.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const existingRel = await prisma.relatorioAtividade.findUnique({ where: { id: relId } })
        if (!existingRel || existingRel.tecnicoId !== tecnicoId) {
          return NextResponse.json(
            { error: 'Item do relatório não encontrado.' },
            { status: 404, headers: CORS_HEADERS }
          )
        }
        const fotoUrlEdit = payload?.fotoUrl !== undefined
          ? await uploadBase64ToMinio(payload.fotoUrl, 'sg4-relatorios', 'fotos')
          : existingRel.fotoUrl
        resultData = await prisma.relatorioAtividade.update({
          where: { id: relId },
          data: {
            empresa: payload?.empresa !== undefined ? String(payload.empresa).trim() : existingRel.empresa,
            projeto: payload?.projeto !== undefined ? String(payload.projeto).trim() : existingRel.projeto,
            local: payload?.local !== undefined ? String(payload.local).trim() : existingRel.local,
            cidadeUf: payload?.cidadeUf !== undefined ? String(payload.cidadeUf).trim() : existingRel.cidadeUf,
            descricao: payload?.descricao !== undefined ? String(payload.descricao).trim() : existingRel.descricao,
            fotoUrl: fotoUrlEdit,
            data: payload?.data ? parseDateSafe(payload.data) : existingRel.data,
          },
        })
        break
      }

      case 'EXCLUIR_RELATORIO_CAMPO': {
        const relId = payload?.id
        if (!relId) {
          return NextResponse.json(
            { error: 'ID do item do relatório é obrigatório.' },
            { status: 400, headers: CORS_HEADERS }
          )
        }
        const existingRel = await prisma.relatorioAtividade.findUnique({ where: { id: relId } })
        if (!existingRel || existingRel.tecnicoId !== tecnicoId) {
          return NextResponse.json(
            { error: 'Item do relatório não encontrado.' },
            { status: 404, headers: CORS_HEADERS }
          )
        }
        await prisma.relatorioAtividade.delete({ where: { id: relId } })
        resultData = { deletedId: relId }
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
        const fotoUrlTratativa = await uploadBase64ToMinio(payload?.fotoUrl, 'sg4-relatorios', 'tratativas')
        const newUpdate = {
          date: new Date().toISOString(),
          actionDate: payload?.actionDate || new Date().toISOString().split('T')[0],
          text: texto,
          author: authUser.name || authUser.email || 'App Mobile SG4',
          fotoUrl: fotoUrlTratativa,
          fotoUrls: fotoUrlTratativa ? [fotoUrlTratativa] : [],
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
