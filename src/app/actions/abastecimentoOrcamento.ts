'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { getBusinessDaysInMonth, getBusinessDaysPassedInMonth, getValidMonthsCount } from '@/lib/businessDays'

export async function getResumoOrcamentoMes(ano: number, meses: number[]) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const tecnicos = await prisma.tecnico.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, fotoUrl: true, orcamentoAbastecimento: true, admissao: true }
    })

    const isConsolidado = ano === 0 || meses.length === 0
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const targetAno = isConsolidado ? currentYear : ano
    const targetMeses = isConsolidado ? Array.from({ length: currentMonth }, (_, i) => i + 1) : meses

    // Marco zero: julho/2026
    const startDate = new Date(2026, 6, 1)

    const resumos = []

    for (const tec of tecnicos) {
      // ── por mês selecionado ──────────────────────────────────────────────
      const dadosPorMes: Array<{
        mes: number
        orcamento: number
        gastoMes: number
        recargasMes: number
        saldoMes: number           // inclui carry-over do mês anterior
        saldoAcumulado: number
      }> = []

      // Para carry-over precisamos processar em ordem cronológica desde julho/2026
      // até o maior mês selecionado
      const maxMes = Math.max(...targetMeses)
      const endDate = new Date(targetAno, maxMes, 0, 23, 59, 59)

      const [todosAbastecimentos, todasRecargas] = await Promise.all([
        prisma.abastecimento.findMany({
          where: { tecnicoId: tec.id, data: { gte: startDate, lte: endDate } }
        }),
        prisma.recargaAbastecimento.findMany({
          where: { tecnicoId: tec.id, data: { gte: startDate, lte: endDate } },
          orderBy: { data: 'asc' }
        })
      ])

      // Calcula saldo acumulado até o mês anterior ao primeiro selecionado
      // para carry-over correto de saldo negativo
      const minMes = Math.min(...targetMeses)
      const inicioJaneiro = new Date(targetAno, 0, 1)
      const fimMesAnterior = minMes > 1 ? new Date(targetAno, minMes - 2, 31, 23, 59, 59) : new Date(targetAno - 1, 11, 31, 23, 59, 59)

      // Gastos e recargas ANTES do período selecionado (para saldo inicial)
      const gastoAnterior = todosAbastecimentos
        .filter(a => a.data >= startDate && a.data < new Date(targetAno, minMes - 1, 1))
        .reduce((acc, c) => acc + c.valor, 0)
      const recargaAnterior = todasRecargas
        .filter(a => a.data >= startDate && a.data < new Date(targetAno, minMes - 1, 1))
        .reduce((acc, c) => acc + c.valor, 0)
      const mesesValidosAnterior = minMes > 1 ? getValidMonthsCount(tec.admissao, targetAno, minMes - 1) : 0
      let carryOver = (tec.orcamentoAbastecimento * mesesValidosAnterior) + recargaAnterior - gastoAnterior

      // Agora processa os meses selecionados em ordem
      const mesesOrdenados = [...targetMeses].sort((a, b) => a - b)
      for (const m of mesesOrdenados) {
        const inicioMes = new Date(targetAno, m - 1, 1)
        const fimMes = new Date(targetAno, m, 0, 23, 59, 59)
        const mesAnoStr = `${String(m).padStart(2, '0')}/${targetAno}`

        const gastoMes = todosAbastecimentos
          .filter(a => a.data >= inicioMes && a.data <= fimMes)
          .reduce((acc, c) => acc + c.valor, 0)
        const recargasMes = todasRecargas
          .filter(a => a.data >= inicioMes && a.data <= fimMes)
          .reduce((acc, c) => acc + c.valor, 0)

        // Orçamento deste mês (1 mês válido = 1x o valor base)
        const mesesValidos = getValidMonthsCount(tec.admissao, targetAno, m) - getValidMonthsCount(tec.admissao, targetAno, m - 1)
        const orcamentoMes = tec.orcamentoAbastecimento * Math.max(0, mesesValidos)

        // Saldo deste mês: carry-over do anterior + orçamento + recargas - gastos
        const saldoMes = carryOver + orcamentoMes + recargasMes - gastoMes
        carryOver = saldoMes // saldo negativo é levado para o próximo mês

        dadosPorMes.push({ mes: m, orcamento: orcamentoMes, gastoMes, recargasMes, saldoMes, saldoAcumulado: saldoMes })
      }

      // Totais agregados dos meses selecionados
      const gastoTotalPeriodo = dadosPorMes.reduce((acc, d) => acc + d.gastoMes, 0)
      const recargasTotalPeriodo = dadosPorMes.reduce((acc, d) => acc + d.recargasMes, 0)
      const orcamentoTotalPeriodo = dadosPorMes.reduce((acc, d) => acc + d.orcamento, 0)
      const saldoFinal = dadosPorMes.length > 0 ? dadosPorMes[dadosPorMes.length - 1].saldoMes : 0

      // Totais acumulados gerais (desde marco zero até o fim do período)
      const gastoTotalAcumulado = todosAbastecimentos.reduce((acc, c) => acc + c.valor, 0)
      const recargasTotalAcumulado = todasRecargas.reduce((acc, c) => acc + c.valor, 0)
      const mesesValidosTotal = getValidMonthsCount(tec.admissao, targetAno, maxMes)
      const orcamentoAcumulado = (tec.orcamentoAbastecimento * mesesValidosTotal) + recargasTotalAcumulado
      const saldoAcumuladoTotal = orcamentoAcumulado - gastoTotalAcumulado

      let status = 'ADEQUADO'
      let alerta = null
      let valorExtraDinamico = 0

      if (saldoFinal <= 100 && !isConsolidado) {
        const diasUteisTotais = getBusinessDaysInMonth(targetAno, maxMes - 1)
        const diaAtual = new Date().getDate()
        const mesAtualReal = new Date().getMonth() + 1
        let diasUteisPassados = getBusinessDaysPassedInMonth(targetAno, maxMes - 1, mesAtualReal === maxMes ? diaAtual : 31)
        if (diasUteisPassados === 0) diasUteisPassados = 1
        const gastoUltimoMes = dadosPorMes[dadosPorMes.length - 1]?.gastoMes || 0
        const mediaDiaria = gastoUltimoMes / diasUteisPassados
        const diasRestantes = diasUteisTotais - diasUteisPassados
        valorExtraDinamico = Math.max(0, Number(((mediaDiaria * diasRestantes) - saldoFinal).toFixed(2)))
      }

      if (!isConsolidado) {
        const mesAnoStr = `${String(maxMes).padStart(2, '0')}/${targetAno}`
        alerta = await prisma.alertaAbastecimento.findUnique({
          where: { tecnicoId_mesAno: { tecnicoId: tec.id, mesAno: mesAnoStr } }
        })
        if (saldoFinal > 100 && alerta) {
          await prisma.alertaAbastecimento.delete({ where: { id: alerta.id } })
          alerta = null
        }
        if (saldoFinal <= 100) {
          status = alerta ? 'ALERTA_ENVIADO' : 'ALERTA_PENDENTE'
        }
      }

      // Histórico de recargas com info do usuário para exibição
      const recargasHistorico = todasRecargas.map(r => ({
        id: r.id,
        data: r.data,
        valor: r.valor,
        observacao: r.observacao,
        userName: (r as any).userName || null,
      }))

      resumos.push({
        tecnico: tec,
        orcamento: tec.orcamentoAbastecimento,
        orcamentoAcumulado,
        orcamentoTotalPeriodo,
        recargasTotalAcumulado,
        recargasTotalPeriodo,
        mesesValidos: mesesValidosTotal,
        gastoTotalAcumulado,
        gastoTotalPeriodo,
        saldo: saldoFinal,
        saldoAcumuladoTotal,
        dadosPorMes,
        status,
        alertaEnviadoEm: alerta?.enviadoEm || null,
        valorExtraCalculado: valorExtraDinamico,
        recargasHistorico,
      })
    }

    resumos.sort((a, b) => {
      const isAlertaA = a.status === 'ALERTA_PENDENTE' || a.status === 'ALERTA_ENVIADO'
      const isAlertaB = b.status === 'ALERTA_PENDENTE' || b.status === 'ALERTA_ENVIADO'
      if (isAlertaA && !isAlertaB) return -1
      if (!isAlertaA && isAlertaB) return 1
      return a.tecnico.nome.localeCompare(b.tecnico.nome)
    })

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

    // O marco zero é sempre julho de 2026
    const startDate = new Date(2026, 6, 1)
    const endDate = new Date(ano, mes, 0, 23, 59, 59)

    const abastecimentos = await prisma.abastecimento.findMany({
      where: {
        tecnicoId: tec.id,
        data: { gte: startDate, lte: endDate }
      }
    })
    
    const gastoTotalAcumulado = abastecimentos.reduce((acc, curr) => acc + curr.valor, 0)
    const recargas = await prisma.recargaAbastecimento.findMany({
      where: {
        tecnicoId: tec.id,
        data: { gte: startDate, lte: endDate }
      }
    })
    const recargasTotalAcumulado = recargas.reduce((acc, curr) => acc + curr.valor, 0)

    const mesesValidos = getValidMonthsCount(tec.admissao, ano, mes);
    const orcamentoAcumulado = (tec.orcamentoAbastecimento * mesesValidos) + recargasTotalAcumulado;
    
    // Se não há nenhum orçamento base e nenhuma recarga, ele não participa da regra de alertas
    if (orcamentoAcumulado === 0) return;
    
    const saldoAcumulado = orcamentoAcumulado - gastoTotalAcumulado

    if (saldoAcumulado <= 100) {
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
        // Para calcular a média diária, usamos apenas os gastos do MÊS ATUAL
        const inicioMesAtual = new Date(ano, mes - 1, 1);
        const gastoMesAtual = abastecimentos
          .filter(a => a.data >= inicioMesAtual && a.data <= endDate)
          .reduce((acc, curr) => acc + curr.valor, 0)

        // Calcula valor baseado no mês atual
        const diasUteisTotais = getBusinessDaysInMonth(ano, mes - 1)
        const diaAtual = new Date().getDate()
        let diasUteisPassados = getBusinessDaysPassedInMonth(ano, mes - 1, diaAtual)
        if (diasUteisPassados === 0) diasUteisPassados = 1 
        
        const mediaDiaria = gastoMesAtual / diasUteisPassados
        const diasRestantes = diasUteisTotais - diasUteisPassados
        
        // Quanto a mais ele precisa ate o fim do mes (descontando o saldo acumulado total)
        let valorExtra = (mediaDiaria * diasRestantes) - saldoAcumulado
        if (valorExtra < 0) valorExtra = 0
        
        valorExtra = Number(valorExtra.toFixed(2))

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
                orcamentoAcumulado,
                gastoTotalAcumulado,
                gastoMesAtual,
                saldoAtual: saldoAcumulado,
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
      orcamentoAcumulado: 1600,
      gastoTotalAcumulado: 1550,
      gastoMesAtual: 750,
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

export async function createRecargaExtra(tecnicoId: string, valor: number, observacao: string, dataCustomizada?: Date) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const userId = (session.user as any).id
    const userName = (session.user as any).name || (session.user as any).email || 'Usuário'

    await prisma.recargaAbastecimento.create({
      data: {
        tecnicoId,
        valor,
        observacao,
        userId,
        userName,
        ...(dataCustomizada ? { data: dataCustomizada } : {})
      }
    })

    await audit({
      userId,
      action: 'CRIAR_RECARGA_ABASTECIMENTO',
      entity: 'RecargaAbastecimento',
      entityId: tecnicoId,
      details: { valor, observacao, userName, dataCustomizada }
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao registrar recarga:', error)
    return { success: false, error: 'Falha ao registrar a recarga extra.' }
  }
}
