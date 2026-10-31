import {
  getDataBrasilParts,
  isJanelaAntepenultimoDiaUtil,
  isJanelaPrimeiroDiaUtil,
} from '@/lib/businessDays'
import { dispararRelatorioProdutividadeMensal } from '@/lib/cronProdutividade'
import { dispararNotificacaoPrevisaoDepositos } from '@/app/actions/abastecimentoOrcamento'

declare global {
  // eslint-disable-next-line no-var
  var __sg4CronSchedulerInitialized: boolean | undefined
}

const INTERVALO_VERIFICACAO_MS = 15 * 60 * 1000 // 15 minutos

export async function verificarDisparosAutomaticosMensais() {
  try {
    const agora = new Date()
    const { hora, dataIso } = getDataBrasilParts(agora)

    // Dispara apenas em horário comercial no Brasil (das 08:00 às 21:59 BRT)
    if (hora < 8 || hora > 21) {
      return
    }

    // 1.4 - Relatório Mensal de Produtividade (1º dia útil do mês + janela de segurança)
    if (isJanelaPrimeiroDiaUtil(agora)) {
      try {
        const resProd = await dispararRelatorioProdutividadeMensal(false, true)
        if (resProd.emailEnviado) {
          console.log(
            `[SG4-CRON] (${dataIso}) Relatório de Produtividade enviado automaticamente:`,
            resProd.message
          )
        }
      } catch (err) {
        console.error('[SG4-CRON] Erro ao verificar/enviar Relatório de Produtividade:', err)
      }
    }

    // 1.3 - Previsão Inteligente de Depósitos de Abastecimento (Antepenúltimo dia útil do mês + janela de segurança)
    if (isJanelaAntepenultimoDiaUtil(agora)) {
      try {
        const resPrev = await dispararNotificacaoPrevisaoDepositos(false, true)
        if (resPrev.emailEnviado) {
          console.log(
            `[SG4-CRON] (${dataIso}) Previsão de Abastecimento enviada automaticamente para:`,
            resPrev.destinatarios
          )
        }
      } catch (err) {
        console.error('[SG4-CRON] Erro ao verificar/enviar Previsão de Abastecimento:', err)
      }
    }
  } catch (error) {
    console.error('[SG4-CRON] Erro geral no agendador interno:', error)
  }
}

export function iniciarAgendadorInternoSG4() {
  if (globalThis.__sg4CronSchedulerInitialized) {
    return
  }
  globalThis.__sg4CronSchedulerInitialized = true

  console.log(
    '[SG4-CRON] Agendador interno inicializado (Produtividade: 1º dia útil | Previsão Abastecimento: Antepenúltimo dia útil).'
  )

  // Primeira verificação 25 segundos após o boot do servidor
  const bootTimer = setTimeout(() => {
    verificarDisparosAutomaticosMensais()
  }, 25_000)
  if (typeof bootTimer.unref === 'function') {
    bootTimer.unref()
  }

  // Verificação contínua a cada 15 minutos
  const intervalTimer = setInterval(() => {
    verificarDisparosAutomaticosMensais()
  }, INTERVALO_VERIFICACAO_MS)
  if (typeof intervalTimer.unref === 'function') {
    intervalTimer.unref()
  }
}

