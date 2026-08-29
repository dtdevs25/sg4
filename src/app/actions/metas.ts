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
    
    // Se o técnico não existe ou não conta para metas, sai
    if (!tecnico || tecnico.contaMeta === false) return { success: true, triggered: false }

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

    // Dispara webhook
    const webhookUrl = process.env.N8N_WEBHOOK_METAS
    if (webhookUrl) {
      try {
        const payload = {
          tecnicoId: tecnico.id,
          nome: tecnico.nome,
          telefone: tecnico.telefone,
          tipo,
          mesAno,
          realizado,
          meta
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

export async function testN8NMetasWebhook() {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_METAS
    if (!webhookUrl) {
      return { success: false, error: 'A variável de ambiente N8N_WEBHOOK_METAS não está configurada no servidor.' }
    }

    const payload = {
      tecnicoId: 'teste-metas-123',
      nome: 'Técnico Teste (DSS/Inspeções)',
      telefone: '11999999999',
      tipo: 'DSS',
      mesAno: '08/2026',
      realizado: 8,
      meta: 8
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

