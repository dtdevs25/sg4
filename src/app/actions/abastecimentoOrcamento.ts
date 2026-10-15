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

      const minMes = Math.min(...targetMeses)
      let carryOver = 0
      let saldoAcumuladoTotal = 0
      
      let curYear = 2026
      let curMonth = 7 // Marco zero
      
      while (curYear < targetAno || (curYear === targetAno && curMonth <= maxMes)) {
        const inicioMes = new Date(curYear, curMonth - 1, 1)
        const fimMes = new Date(curYear, curMonth, 0, 23, 59, 59)

        const gastoMes = todosAbastecimentos
          .filter(a => a.data >= inicioMes && a.data <= fimMes)
          .reduce((acc, c) => acc + c.valor, 0)
          
        const recargasMes = todasRecargas
          .filter(a => !a.isOverride && a.data >= inicioMes && a.data <= fimMes)
          .reduce((acc, c) => acc + c.valor, 0)

        const overridesMes = todasRecargas
          .filter(a => a.isOverride && a.data >= inicioMes && a.data <= fimMes)
          
        let orcamentoMes = 0
        
        const mesesValidos = getValidMonthsCount(tec.admissao, curYear, curMonth) - getValidMonthsCount(tec.admissao, curYear, curMonth - 1)
        
        if (overridesMes.length > 0) {
          // Se teve override, pega o mais recente no mês
          orcamentoMes = overridesMes[overridesMes.length - 1].valor
        } else {
          orcamentoMes = tec.orcamentoAbastecimento * Math.max(0, mesesValidos)
        }

        const saldoMes = carryOver + orcamentoMes + recargasMes - gastoMes
        carryOver = saldoMes 
        saldoAcumuladoTotal = saldoMes

        // Só empurra para dadosPorMes se estiver no targetAno e dentro dos meses selecionados
        if (curYear === targetAno && targetMeses.includes(curMonth)) {
          dadosPorMes.push({ mes: curMonth, orcamento: orcamentoMes, gastoMes, recargasMes, saldoMes, saldoAcumulado: saldoMes })
        }
        
        curMonth++
        if (curMonth > 12) {
          curMonth = 1
          curYear++
        }
      }

      // Totais agregados dos meses selecionados
      const gastoTotalPeriodo = dadosPorMes.reduce((acc, d) => acc + d.gastoMes, 0)
      const recargasTotalPeriodo = dadosPorMes.reduce((acc, d) => acc + d.recargasMes, 0)
      const orcamentoTotalPeriodo = dadosPorMes.reduce((acc, d) => acc + d.orcamento, 0)
      const saldoFinal = dadosPorMes.length > 0 ? dadosPorMes[dadosPorMes.length - 1].saldoMes : 0

      // Totais acumulados gerais (desde marco zero até o fim do período)
      const gastoTotalAcumulado = todosAbastecimentos.reduce((acc, c) => acc + c.valor, 0)
      const recargasTotalAcumulado = todasRecargas.filter(a => !a.isOverride).reduce((acc, c) => acc + c.valor, 0)
      
      let orcamentoAcumulado = 0
      let cy = 2026, cm = 7
      while (cy < targetAno || (cy === targetAno && cm <= maxMes)) {
        const ini = new Date(cy, cm - 1, 1)
        const fim = new Date(cy, cm, 0, 23, 59, 59)
        const over = todasRecargas.filter(a => a.isOverride && a.data >= ini && a.data <= fim)
        if (over.length > 0) {
          orcamentoAcumulado += over[over.length - 1].valor
        } else {
          const mvs = getValidMonthsCount(tec.admissao, cy, cm) - getValidMonthsCount(tec.admissao, cy, cm - 1)
          orcamentoAcumulado += tec.orcamentoAbastecimento * Math.max(0, mvs)
        }
        cm++
        if (cm > 12) { cm = 1; cy++ }
      }
      
      const mesesValidosTotal = getValidMonthsCount(tec.admissao, targetAno, maxMes)

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

      // Histórico de recargas com info do usuário para exibição (apenas as normais, ou inclui override mas com texto claro)
      const recargasHistorico = todasRecargas.map(r => ({
        id: r.id,
        data: r.data,
        valor: r.valor,
        observacao: r.isOverride ? `OVERRIDE MENSAL: ${r.observacao}` : r.observacao,
        userName: (r as any).userName || null,
        isOverride: r.isOverride
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

export async function createRecargaExtra(tecnicoId: string, valor: number, observacao: string, dataCustomizada?: Date, isOverride: boolean = false) {
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
        isOverride,
        ...(dataCustomizada ? { data: dataCustomizada } : {})
      }
    })

    await audit({
      userId,
      action: isOverride ? 'OVERRIDE_ORCAMENTO_MENSAL' : 'CRIAR_RECARGA_ABASTECIMENTO',
      entity: 'RecargaAbastecimento',
      entityId: tecnicoId,
      details: { valor, observacao, userName, dataCustomizada, isOverride }
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao registrar recarga:', error)
    return { success: false, error: 'Falha ao registrar a recarga extra.' }
  }
}

// ─── EXTRATO BANCÁRIO DETALHADO DO COLABORADOR ─────────────────────────────

export type ItemExtratoBancario = {
  id: string
  data: string
  tipo: 'ENTRADA_PADRAO' | 'ENTRADA_ADITIVO' | 'ENTRADA_AJUSTE' | 'SAIDA_ABASTECIMENTO'
  titulo: string
  descricao: string
  valor: number
  saldoApos: number
  fotoCupom?: string | null
  userName?: string | null
  isOverride?: boolean
}

export type ExtratoBancarioData = {
  tecnico: {
    id: string
    nome: string
    fotoUrl: string | null
    orcamentoBase: number
    admissao: string | Date | null
  }
  periodo: {
    ano: number
    mes: number | 'todos'
    rotulo: string
  }
  resumo: {
    saldoAnterior: number
    totalPadrao: number
    totalAditivos: number
    totalEntradas: number
    totalSaidas: number
    saldoPeriodo: number
    saldoFinal: number
    qtdAbastecimentos: number
    qtdAditivos: number
    status: 'SUPERAVIT' | 'DEFICIT' | 'EQUILIBRADO'
    diagnostico: string
  }
  transacoes: ItemExtratoBancario[]
}

export async function getExtratoBancarioTecnico(
  tecnicoId: string,
  ano: number,
  mes: number | 'todos' = 'todos'
) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const tec = await prisma.tecnico.findUnique({
      where: { id: tecnicoId },
      select: {
        id: true,
        nome: true,
        fotoUrl: true,
        orcamentoAbastecimento: true,
        admissao: true,
      },
    })

    if (!tec) return { success: false, error: 'Técnico não encontrado' }

    const marcoZero = new Date(2026, 6, 1) // 01/07/2026
    const MESES_NOME = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]

    // Determina datas de início e fim do período solicitado
    let dataInicioPeriodo: Date
    let dataFimPeriodo: Date
    let rotuloPeriodo = ''

    if (mes === 'todos') {
      const inicioAno = new Date(ano, 0, 1, 0, 0, 0)
      dataInicioPeriodo = inicioAno < marcoZero ? marcoZero : inicioAno
      dataFimPeriodo = new Date(ano, 11, 31, 23, 59, 59)
      rotuloPeriodo = `Ano de ${ano} (Completo)`
    } else {
      dataInicioPeriodo = new Date(ano, mes - 1, 1, 0, 0, 0)
      dataFimPeriodo = new Date(ano, mes, 0, 23, 59, 59)
      rotuloPeriodo = `${MESES_NOME[mes - 1]} / ${ano}`
    }

    // Busca todos os abastecimentos e recargas desde o marco zero até o fim do período selecionado
    const [abastecimentos, recargas] = await Promise.all([
      prisma.abastecimento.findMany({
        where: {
          tecnicoId: tec.id,
          data: { gte: marcoZero, lte: dataFimPeriodo },
        },
        orderBy: { data: 'asc' },
      }),
      prisma.recargaAbastecimento.findMany({
        where: {
          tecnicoId: tec.id,
          data: { gte: marcoZero, lte: dataFimPeriodo },
        },
        orderBy: { data: 'asc' },
      }),
    ])

    // 1. Calcula o Saldo Anterior (tudo o que ocorreu antes de dataInicioPeriodo)
    let saldoAnterior = 0
    let cy = 2026
    let cm = 7 // marco zero julho/2026

    while (
      cy < dataInicioPeriodo.getFullYear() ||
      (cy === dataInicioPeriodo.getFullYear() && cm < dataInicioPeriodo.getMonth() + 1)
    ) {
      const inicioM = new Date(cy, cm - 1, 1)
      const fimM = new Date(cy, cm, 0, 23, 59, 59)

      const gastoM = abastecimentos
        .filter((a) => a.data >= inicioM && a.data <= fimM)
        .reduce((acc, c) => acc + c.valor, 0)

      const recargasM = recargas
        .filter((r) => !r.isOverride && r.data >= inicioM && r.data <= fimM)
        .reduce((acc, c) => acc + c.valor, 0)

      const overridesM = recargas.filter((r) => r.isOverride && r.data >= inicioM && r.data <= fimM)

      let orcamentoM = 0
      const mvs = getValidMonthsCount(tec.admissao, cy, cm) - getValidMonthsCount(tec.admissao, cy, cm - 1)

      if (overridesM.length > 0) {
        orcamentoM = overridesM[overridesM.length - 1].valor
      } else {
        orcamentoM = tec.orcamentoAbastecimento * Math.max(0, mvs)
      }

      saldoAnterior += orcamentoM + recargasM - gastoM

      cm++
      if (cm > 12) {
        cm = 1
        cy++
      }
    }

    // 2. Monta as transações que pertencem estritamente ao período selecionado
    const transacoes: Array<Omit<ItemExtratoBancario, 'saldoApos'>> = []

    // A) Créditos do Orçamento Padrão do Mês
    const mesInicio = mes === 'todos' ? (ano === 2026 ? 7 : 1) : mes
    const mesFim = mes === 'todos' ? 12 : mes

    for (let m = mesInicio; m <= mesFim; m++) {
      const inicioM = new Date(ano, m - 1, 1, 0, 0, 0)
      const fimM = new Date(ano, m, 0, 23, 59, 59)

      const overridesNoMes = recargas.filter(
        (r) => r.isOverride && r.data >= inicioM && r.data <= fimM
      )

      const mesesValidos =
        getValidMonthsCount(tec.admissao, ano, m) - getValidMonthsCount(tec.admissao, ano, m - 1)

      if (overridesNoMes.length > 0) {
        const ultOverride = overridesNoMes[overridesNoMes.length - 1]
        transacoes.push({
          id: `ajuste_base_${ano}_${m}`,
          data: ultOverride.data.toISOString(),
          tipo: 'ENTRADA_AJUSTE',
          titulo: `Ajuste de Base (${MESES_NOME[m - 1]})`,
          descricao: `Cota base recalculada/ajustada para R$ ${ultOverride.valor.toFixed(2)}${
            ultOverride.observacao ? ` - ${ultOverride.observacao}` : ''
          }`,
          valor: ultOverride.valor,
          userName: ultOverride.userName || 'Administrador',
          isOverride: true,
        })
      } else if (mesesValidos > 0 && tec.orcamentoAbastecimento > 0) {
        transacoes.push({
          id: `padrao_${ano}_${m}`,
          data: inicioM.toISOString(),
          tipo: 'ENTRADA_PADRAO',
          titulo: `Orçamento Padrão (${MESES_NOME[m - 1]})`,
          descricao: `Crédito automático da verba mensal contratual`,
          valor: tec.orcamentoAbastecimento,
          userName: 'Sistema Automático',
        })
      }
    }

    // B) Recargas Extras / Aditivos (não-override) dentro do período
    const recargasPeriodo = recargas.filter(
      (r) => !r.isOverride && r.data >= dataInicioPeriodo && r.data <= dataFimPeriodo
    )
    for (const r of recargasPeriodo) {
      transacoes.push({
        id: r.id,
        data: r.data.toISOString(),
        tipo: 'ENTRADA_ADITIVO',
        titulo: 'Recarga Extra (Aditivo)',
        descricao: r.observacao || 'Recarga complementar autorizada',
        valor: r.valor,
        userName: r.userName || 'Administrador',
      })
    }

    // C) Abastecimentos (Saídas) dentro do período
    const abastecimentosPeriodo = abastecimentos.filter(
      (a) => a.data >= dataInicioPeriodo && a.data <= dataFimPeriodo
    )
    for (const a of abastecimentosPeriodo) {
      transacoes.push({
        id: a.id,
        data: a.data.toISOString(),
        tipo: 'SAIDA_ABASTECIMENTO',
        titulo: 'Abastecimento de Combustível',
        descricao: `Lançamento de combustível registrado no app`,
        valor: -Math.abs(a.valor),
        fotoCupom: a.fotoCupom || null,
        userName: tec.nome,
      })
    }

    // Ordena as transações cronologicamente
    transacoes.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

    // 3. Calcula Saldo Progressivo exatamente como num extrato bancário
    let runningBalance = saldoAnterior
    const transacoesComSaldo: ItemExtratoBancario[] = transacoes.map((t) => {
      runningBalance += t.valor
      return {
        ...t,
        saldoApos: Number(runningBalance.toFixed(2)),
      }
    })

    // 4. Totais e Diagnóstico
    const totalPadrao = transacoes
      .filter((t) => t.tipo === 'ENTRADA_PADRAO' || t.tipo === 'ENTRADA_AJUSTE')
      .reduce((acc, t) => acc + t.valor, 0)

    const totalAditivos = transacoes
      .filter((t) => t.tipo === 'ENTRADA_ADITIVO')
      .reduce((acc, t) => acc + t.valor, 0)

    const totalEntradas = totalPadrao + totalAditivos
    const totalSaidas = transacoes
      .filter((t) => t.tipo === 'SAIDA_ABASTECIMENTO')
      .reduce((acc, t) => acc + Math.abs(t.valor), 0)

    const saldoPeriodo = totalEntradas - totalSaidas
    const saldoFinal = saldoAnterior + saldoPeriodo
    const qtdAbastecimentos = abastecimentosPeriodo.length
    const qtdAditivos = recargasPeriodo.length

    let statusResumo: 'SUPERAVIT' | 'DEFICIT' | 'EQUILIBRADO' = 'EQUILIBRADO'
    if (saldoFinal > 0) statusResumo = 'SUPERAVIT'
    else if (saldoFinal < 0) statusResumo = 'DEFICIT'

    let diagnostico = ''
    if (qtdAbastecimentos === 0 && totalEntradas === 0 && saldoAnterior === 0) {
      diagnostico = `Sem movimentações financeiras de abastecimento no período (${rotuloPeriodo}).`
    } else if (saldoFinal < 0) {
      diagnostico = `Atenção: O colaborador encerrou o período com saldo devedor/estourado de R$ ${Math.abs(
        saldoFinal
      ).toFixed(2)}. Os gastos de abastecimento (R$ ${totalSaidas.toFixed(
        2
      )}) superaram a soma das entradas (R$ ${totalEntradas.toFixed(
        2
      )}) mais o saldo anterior (R$ ${saldoAnterior.toFixed(
        2
      )}). Recomenda-se liberação de aditivo de regularização.`
    } else if (totalAditivos > 0) {
      diagnostico = `Operação atendida com apoio de aditivos: foram concedidos R$ ${totalAditivos.toFixed(
        2
      )} em recarga(s) extra(s) para complementar o orçamento padrão de R$ ${totalPadrao.toFixed(
        2
      )}. Foram realizados ${qtdAbastecimentos} abastecimento(s) totalizando R$ ${totalSaidas.toFixed(
        2
      )}. Saldo disponível atual: R$ ${saldoFinal.toFixed(2)}.`
    } else {
      diagnostico = `Operação 100% dentro da meta: o colaborador consumiu R$ ${totalSaidas.toFixed(
        2
      )} em ${qtdAbastecimentos} abastecimento(s), sem necessidade de nenhum aditivo extra sobre o padrão de R$ ${totalPadrao.toFixed(
        2
      )}. Saldo positivo remanescente: R$ ${saldoFinal.toFixed(2)}.`
    }

    return {
      success: true,
      data: {
        tecnico: {
          id: tec.id,
          nome: tec.nome,
          fotoUrl: tec.fotoUrl,
          orcamentoBase: tec.orcamentoAbastecimento,
          admissao: tec.admissao,
        },
        periodo: {
          ano,
          mes,
          rotulo: rotuloPeriodo,
        },
        resumo: {
          saldoAnterior: Number(saldoAnterior.toFixed(2)),
          totalPadrao: Number(totalPadrao.toFixed(2)),
          totalAditivos: Number(totalAditivos.toFixed(2)),
          totalEntradas: Number(totalEntradas.toFixed(2)),
          totalSaidas: Number(totalSaidas.toFixed(2)),
          saldoPeriodo: Number(saldoPeriodo.toFixed(2)),
          saldoFinal: Number(saldoFinal.toFixed(2)),
          qtdAbastecimentos,
          qtdAditivos,
          status: statusResumo,
          diagnostico,
        },
        transacoes: transacoesComSaldo,
      },
    }
  } catch (error) {
    console.error('Erro ao gerar extrato bancário do técnico:', error)
    return { success: false, error: 'Falha ao processar extrato bancário.' }
  }
}

