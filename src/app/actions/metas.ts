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

function getSaudacao() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export async function checkAndTriggerMetaNotification(
  tecnicoId: string,
  tipo: 'DSS' | 'INSPECAO',
  mesAno: string,
  realizado: number,
  meta: number
) {
  try {
    // Se não bateu a meta, não faz nada
    if (realizado < meta) return { success: true, triggered: false }

    const tecnico = await prisma.tecnico.findUnique({
      where: { id: tecnicoId }
    })
    
    // Se o técnico não existe, não conta para metas, OU está inativo → sai
    if (!tecnico || tecnico.contaMeta === false || tecnico.ativo === false) {
      return { success: true, triggered: false, reason: tecnico?.ativo === false ? 'Tecnico inativo' : 'Nao conta meta' }
    }

    // Verifica se já notificou
    const jaNotificou = await prisma.notificacaoMeta.findUnique({
      where: {
        tecnicoId_tipo_mesAno: {
          tecnicoId,
          tipo,
          mesAno
        }
      }
    })

    if (jaNotificou) return { success: true, triggered: false, reason: 'Already notified' }

    // Verifica horário comercial do Brasil (UTC-3): 08:00 às 17:00
    const agora = new Date()
    const horaBrasil = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const hora = horaBrasil.getHours()
    const isHorarioComercial = hora >= 8 && hora < 17

    if (!isHorarioComercial) {
      // Fora do horário comercial: NÃO dispara webhook, NÃO registra no BD
      // Assim a próxima vez que alguém acessar dentro do horário, o disparo será feito
      return { success: true, triggered: false, reason: `Fora do horario comercial (${hora}h Brasil)` }
    }

    // Dispara webhook
    const webhookUrl = process.env.N8N_WEBHOOK_METAS
    if (webhookUrl) {
      try {
        const payload = {
          tecnicoId: tecnico.id,
          nome: tecnico.nome.split(' ')[0], // Envia só o primeiro nome como na sua mensagem
          NumeroDestino: formatWhatsAppNumber(tecnico.telefone),
          saudacao: getSaudacao(),
          tipoMeta: tipo,
          mesAno,
          realizado,
          meta,
          percentual: (realizado / meta * 100).toFixed(0) + '%'
        }
        
        // Timeout de segurança
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
      } catch (err) {
        console.error(`Falha ao disparar N8N Meta para ${tecnico.nome}:`, err)
        // Optamos por registrar a notificação no BD igual, 
        // para não ficar retentando em loop na mesma sincronização
      }
    }

    // Registra que a notificação foi enviada (ou processada)
    await prisma.notificacaoMeta.create({
      data: {
        tecnicoId,
        tipo,
        mesAno
      }
    })

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

    let tec;
    if (tecnicoId) {
      tec = await prisma.tecnico.findUnique({
        where: { id: tecnicoId },
        select: { id: true, nome: true, telefone: true }
      })
    }

    // Se não encontrou ou não foi passado, busca o primeiro técnico ativo
    if (!tec) {
      tec = await prisma.tecnico.findFirst({
        where: { ativo: true },
        select: { id: true, nome: true, telefone: true }
      })
    }

    const nomeTecnico = tec?.nome || 'Técnico Teste'
    const telefoneFinal = telefoneDestino || tec?.telefone || '11999999999'

    const payload = {
      tecnicoId: tec?.id || 'teste-metas-123',
      nome: nomeTecnico.split(' ')[0], // Envia só o primeiro nome
      NumeroDestino: formatWhatsAppNumber(telefoneFinal),
      saudacao: getSaudacao(),
      tipoMeta: 'DSS',
      mesAno: '08/2026',
      realizado: 8,
      meta: 8,
      percentual: '100%'
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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

