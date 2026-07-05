'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { getBusinessDaysInMonth, getBusinessDaysPassedInMonth } from '@/lib/businessDays'

export async function getResumoOrcamentoMes(ano: number, mes: number) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    // Busca todos os técnicos ativos
    const tecnicos = await prisma.tecnico.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, fotoUrl: true, orcamentoAbastecimento: true }
    })

    const startDate = new Date(ano, mes - 1, 1)
    const endDate = new Date(ano, mes, 0, 23, 59, 59)
    const mesAnoStr = `${String(mes).padStart(2, '0')}/${ano}`

    const resumos = []

    for (const tec of tecnicos) {
      // Pega soma de abastecimentos
      const abastecimentos = await prisma.abastecimento.findMany({
        where: {
          tecnicoId: tec.id,
          data: { gte: startDate, lte: endDate }
        }
      })
      const gastoTotal = abastecimentos.reduce((acc, curr) => acc + curr.valor, 0)
      
      // Pega se o alerta foi enviado
      const alerta = await prisma.alertaAbastecimento.findUnique({
        where: {
          tecnicoId_mesAno: {
            tecnicoId: tec.id,
            mesAno: mesAnoStr
          }
        }
      })

      const saldo = tec.orcamentoAbastecimento - gastoTotal
      
      let status = 'ADEQUADO'
      if (saldo <= 100) {
        status = alerta ? 'ALERTA_ENVIADO' : 'ALERTA_PENDENTE'
      }

      resumos.push({
        tecnico: tec,
        orcamento: tec.orcamentoAbastecimento,
        gastoTotal,
        saldo,
        status,
        alertaEnviadoEm: alerta?.enviadoEm || null,
        valorExtraCalculado: alerta?.valorExtra || 0
      })
    }

    return { success: true, data: resumos }
  } catch (error) {
    console.error('Erro ao buscar resumo de orçamentos:', error)
    return { success: false, error: 'Erro ao buscar dados' }
  }
}

export async function updateOrcamentoTecnico(tecnicoId: string, novoOrcamento: number) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const userId = (session.user as any).id

    await prisma.tecnico.update({
      where: { id: tecnicoId },
      data: { orcamentoAbastecimento: novoOrcamento }
    })

    await audit({
      userId,
      action: 'ATUALIZAR_ORCAMENTO_ABASTECIMENTO',
      entity: 'Tecnico',
      entityId: tecnicoId,
      details: { novoOrcamento }
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao atualizar orçamento:', error)
    return { success: false, error: 'Erro ao atualizar' }
  }
}

export async function triggerN8NAlertCheck(tecnicoId: string, dataAbastecimento: Date) {
  try {
    const ano = dataAbastecimento.getFullYear()
    const mes = dataAbastecimento.getMonth() + 1 // 1-12
    const mesAnoStr = `${String(mes).padStart(2, '0')}/${ano}`

    const tec = await prisma.tecnico.findUnique({
      where: { id: tecnicoId }
    })
    if (!tec) return

    const startDate = new Date(ano, mes - 1, 1)
    const endDate = new Date(ano, mes, 0, 23, 59, 59)

    const abastecimentos = await prisma.abastecimento.findMany({
      where: {
        tecnicoId: tec.id,
        data: { gte: startDate, lte: endDate }
      }
    })
    const gastoTotal = abastecimentos.reduce((acc, curr) => acc + curr.valor, 0)
    const saldo = tec.orcamentoAbastecimento - gastoTotal

    if (saldo <= 100) {
      // Checa se ja tem alerta
      const alertaExists = await prisma.alertaAbastecimento.findUnique({
        where: {
          tecnicoId_mesAno: {
            tecnicoId: tec.id,
            mesAno: mesAnoStr
          }
        }
      })

      if (!alertaExists) {
        // Calcula valor
        const diasUteisTotais = getBusinessDaysInMonth(ano, mes - 1)
        const diaAtual = new Date().getDate() // consideramos os dias uteis até hj, mesmo se o abastecimento for retroativo
        let diasUteisPassados = getBusinessDaysPassedInMonth(ano, mes - 1, diaAtual)
        if (diasUteisPassados === 0) diasUteisPassados = 1 // evitar divisao por 0
        
        const mediaDiaria = gastoTotal / diasUteisPassados
        const diasRestantes = diasUteisTotais - diasUteisPassados
        
        // Quanto a mais ele precisa ate o fim do mes (descontando o saldo atual que ele ainda tem)
        let valorExtra = (mediaDiaria * diasRestantes) - saldo
        if (valorExtra < 0) valorExtra = 0
        
        valorExtra = Number(valorExtra.toFixed(2))

        // Trigger webhook if variable is set
        const webhookUrl = process.env.N8N_WEBHOOK_ABASTECIMENTO
        if (webhookUrl) {
          try {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tecnicoId: tec.id,
                nome: tec.nome,
                mesAno: mesAnoStr,
                orcamentoBase: tec.orcamentoAbastecimento,
                gastoAteAgora: gastoTotal,
                saldoAtual: saldo,
                diasUteisTotais,
                diasUteisPassados,
                mediaDiariaGasto: Number(mediaDiaria.toFixed(2)),
                valorComplementarSugerido: valorExtra
              })
            })
          } catch(err) {
            console.error('Falha ao acionar webhook n8n:', err)
          }
        }

        // Registrar no banco mesmo se o webhook falhar ou nao existir, para nao ficar tentando infinitamente
        await prisma.alertaAbastecimento.create({
          data: {
            tecnicoId: tec.id,
            mesAno: mesAnoStr,
            valorExtra
          }
        })
      }
    }
  } catch (error) {
    console.error('Erro na trigger de alerta de abastecimento:', error)
  }
}

export async function testN8NWebhook() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const webhookUrl = process.env.N8N_WEBHOOK_ABASTECIMENTO
    if (!webhookUrl) {
      return { success: false, error: 'Variável de ambiente N8N_WEBHOOK_ABASTECIMENTO não está configurada no servidor.' }
    }

    const payload = {
      tecnicoId: 'teste-1234',
      nome: 'João da Silva (TESTE)',
      mesAno: '07/2026',
      orcamentoBase: 800,
      gastoAteAgora: 750,
      saldoAtual: 50,
      diasUteisTotais: 22,
      diasUteisPassados: 15,
      mediaDiariaGasto: 50.00,
      valorComplementarSugerido: 300.00
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      return { success: false, error: `O N8N retornou erro de status: ${res.status}` }
    }

    return { success: true }
  } catch (error) {
    console.error('Erro ao testar webhook n8n:', error)
    return { success: false, error: 'Falha ao fazer a requisição para o N8N. Verifique a URL.' }
  }
}
