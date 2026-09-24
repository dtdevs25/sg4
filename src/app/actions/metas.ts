'use server'

import { prisma } from '@/lib/db'

/**
 * Função para checar e disparar webhook do N8N caso o TST tenha batido a meta.
 * @param tecnicoId ID do Técnico
 * @param tipo "DSS" ou "INSPECAO"
 * @param mesAno "MM/YYYY"
 * @param realizado Quantidade já feita no mês
 * @param meta Quantidade alvo
 */
function formatWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  const numbersOnly = phone.replace(/\D/g, '')
  if (numbersOnly.length < 10) return null // Inválido se for muito curto
  if (numbersOnly.startsWith('55')) return numbersOnly
  return `55${numbersOnly}`
}

function getMetaMessage(nome: string, tipo: string, mesAno: string, realizado: number, meta: number) {
  const primeiroNome = nome.split(' ')[0]
  const emoji = tipo === 'DSS' ? '🗣️' : '📋'
  return `Olá *${primeiroNome}*! 🎉\n\nPassando para parabenizar você: sua meta de *${tipo}* do mês de ${mesAno} foi atingida com sucesso!\n\nVocê realizou *${realizado}* ${emoji} (a meta era ${meta}).\n\nContinue com o excelente trabalho! 🚀`
}

/**
 * Retorna o horário de Brasília (UTC-3) independente do fuso do servidor/Docker.
 * Garante verificação de dia útil (Segunda a Sexta), horário comercial (08h às 17h) e saudação exata.
 */
function getHorarioBrasilia() {
  const agora = new Date()
  // Fuso horário oficial de Brasília: UTC - 3 horas (-180 minutos)
  const brasiliaOffsetMs = -3 * 60 * 60 * 1000
  const utcMs = agora.getTime() + agora.getTimezoneOffset() * 60 * 1000
  const dataBrasil = new Date(utcMs + brasiliaOffsetMs)

  const diaSemana = dataBrasil.getDay() // 0 = Domingo, 1 = Segunda, ..., 5 = Sexta, 6 = Sábado
  const hora = dataBrasil.getHours()

  const isDiaUtil = diaSemana >= 1 && diaSemana <= 5 // Apenas de Segunda a Sexta
  const isHorarioComercial = isDiaUtil && hora >= 8 && hora < 17

  // Saudação calculada com base na hora real de Brasília no momento exato do disparo:
  let saudacao = 'Bom dia'
  if (hora >= 12 && hora < 18) {
    saudacao = 'Boa tarde'
  } else if (hora >= 18 || hora < 5) {
    saudacao = 'Boa noite'
  }

  return {
    diaSemana,
    hora,
    isDiaUtil,
    isHorarioComercial,
    saudacao,
  }
}

export async function checkAndTriggerMetaNotification(
  tecnicoId: string,
  tipo: 'DSS' | 'INSPECAO',
  mesAno: string,
  realizado: number,
  meta: number
) {
  try {
    // 1. Se não bateu a meta, não faz nada
    if (realizado < meta) return { success: true, triggered: false }

    const tecnico = await prisma.tecnico.findUnique({
      where: { id: tecnicoId },
    })

    // Se o técnico não existe, não conta para metas, OU está inativo → sai
    if (!tecnico || tecnico.contaMeta === false || tecnico.ativo === false) {
      return {
        success: true,
        triggered: false,
        reason: tecnico?.ativo === false ? 'Tecnico inativo' : 'Nao conta meta',
      }
    }

    // Normaliza mesAno para "MM/YYYY" sempre (ex: "9/2026" -> "09/2026")
    const partesMesAno = mesAno.split('/')
    const mesNorm = partesMesAno[0].padStart(2, '0')
    const anoNorm = partesMesAno[1] || String(new Date().getFullYear())
    const mesAnoNorm = `${mesNorm}/${anoNorm}`

    // 2. Validação de Dia Útil e Horário Comercial (Segunda a Sexta, 08:00 às 17:00 em Brasília)
    const { isHorarioComercial, isDiaUtil, hora, saudacao } = getHorarioBrasilia()

    if (!isHorarioComercial) {
      // Fora do horário ou fim de semana: NÃO dispara webhook, NÃO registra no BD.
      // Assim, o envio ocorrerá no próximo dia útil entre 08h e 17h quando o sistema for acessado.
      return {
        success: true,
        triggered: false,
        reason: !isDiaUtil
          ? 'Final de semana (mensagens só são enviadas de segunda a sexta-feira)'
          : `Fora do horário comercial (${hora}h Brasília). Mensagem será enviada no próximo horário útil.`,
      }
    }

    // 3. Prevenção rigorosa de duplicidade (Lock Atômico no PostgreSQL):
    // Tenta registrar a notificação ANTES de disparar o webhook.
    // Como a tabela tem @@unique([tecnicoId, tipo, mesAno]), o PostgreSQL garante
    // que apenas UMA chamada conseguirá inserir. Qualquer requisição concorrente
    // falhará com erro P2002 e será abortada imediatamente sem disparar o webhook.
    try {
      await prisma.notificacaoMeta.create({
        data: {
          tecnicoId,
          tipo,
          mesAno: mesAnoNorm,
        },
      })
    } catch (e: any) {
      // Se já existe (P2002 = Unique constraint violation), significa que já foi notificado
      if (e?.code === 'P2002') {
        return {
          success: true,
          triggered: false,
          reason: `Já notificado para meta de ${tipo} em ${mesAnoNorm}`,
        }
      }
      throw e
    }

    // 4. Dispara webhook para o N8N com a saudação atualizada (sempre 'Bom dia' ou 'Boa tarde')
    const webhookUrl = process.env.N8N_WEBHOOK_METAS
    if (webhookUrl) {
      try {
        const payload = {
          tecnicoId: tecnico.id,
          nome: tecnico.nome.split(' ')[0], // Envia só o primeiro nome
          NumeroDestino: formatWhatsAppNumber(tecnico.telefone),
          saudacao, // Sempre 'Bom dia' (08h-11h59) ou 'Boa tarde' (12h-16h59)
          tipoMeta: tipo,
          mesAno: mesAnoNorm,
          realizado,
          meta,
          percentual: (realizado / meta * 100).toFixed(0) + '%',
        }

        // Timeout de segurança
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
      } catch (err) {
        console.error(`Falha ao disparar N8N Meta para ${tecnico.nome}:`, err)
        // Mantém registrado no banco para não gerar loop de spam se o N8N demorar a responder
      }
    }

    return { success: true, triggered: true }
  } catch (error) {
    console.error('Erro no checkAndTriggerMetaNotification:', error)
    return { success: false, error: 'Falha ao processar alerta de meta' }
  }
}

export async function testN8NMetasWebhook(telefoneDestino?: string, tecnicoId?: string) {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_METAS
    if (!webhookUrl) {
      return { success: false, error: 'A variável de ambiente N8N_WEBHOOK_METAS não está configurada no servidor.' }
    }

    let tec
    if (tecnicoId) {
      tec = await prisma.tecnico.findUnique({
        where: { id: tecnicoId },
        select: { id: true, nome: true, telefone: true },
      })
    }

    // Se não encontrou ou não foi passado, busca o primeiro técnico ativo
    if (!tec) {
      tec = await prisma.tecnico.findFirst({
        where: { ativo: true },
        select: { id: true, nome: true, telefone: true },
      })
    }

    const nomeTecnico = tec?.nome || 'Técnico Teste'
    const telefoneFinal = telefoneDestino || tec?.telefone || '11999999999'
    const { saudacao } = getHorarioBrasilia()

    const payload = {
      tecnicoId: tec?.id || 'teste-metas-123',
      nome: nomeTecnico.split(' ')[0], // Envia só o primeiro nome
      NumeroDestino: formatWhatsAppNumber(telefoneFinal),
      saudacao,
      tipoMeta: 'DSS',
      mesAno: '08/2026',
      realizado: 8,
      meta: 8,
      percentual: '100%',
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      return { success: false, error: `N8N retornou status de erro: ${res.status}` }
    }

    return { success: true }
  } catch (error) {
    console.error('Erro ao testar webhook de metas:', error)
    return { success: false, error: 'Falha ao conectar na URL do webhook.' }
  }
}
