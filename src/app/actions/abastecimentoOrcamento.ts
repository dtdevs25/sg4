'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { getBusinessDaysInMonth, getBusinessDaysPassedInMonth, getValidMonthsCount, isPenultimoDiaUtil } from '@/lib/businessDays'

export async function getResumoOrcamentoMes(ano: number, meses: number[]) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const tecnicos = await prisma.tecnico.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, fotoUrl: true, orcamentoAbastecimento: true, admissao: true, veiculo: true }
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
    veiculo?: string | null
  }
  periodo: {
    dataInicio: string
    dataFim: string
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

// Utilitários de fuso horário do Brasil (America/Sao_Paulo: UTC-3)
function getInicioDiaBrasil(dataStr: string): Date {
  const [ano, mes, dia] = dataStr.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia, 3, 0, 0, 0))
}

function getFimDiaBrasil(dataStr: string): Date {
  const [ano, mes, dia] = dataStr.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia + 1, 2, 59, 59, 999))
}

// Retorna a data do 1º dia útil do mês às 08:00 Horário de Brasília (11:00 UTC)
function getPrimeiroDiaUtilMes(ano: number, mes1Indexed: number): { ano: number, mes: number, dia: number, data: Date } {
  const feriadosFixos = [
    '01-01', // Ano Novo / Confraternização Universal
    '04-21', // Tiradentes
    '05-01', // Dia do Trabalho
    '09-07', // Independência
    '10-12', // Nsa Sra Aparecida
    '11-02', // Finados
    '11-15', // Proclamação da República
    '11-20', // Consciência Negra
    '12-25', // Natal
  ]

  for (let dia = 1; dia <= 10; dia++) {
    // 08:00 no Brasil (BRT = UTC-3) corresponde a 11:00:00 UTC
    const d = new Date(Date.UTC(ano, mes1Indexed - 1, dia, 11, 0, 0, 0))
    const dow = d.getUTCDay() // 0 = Domingo, 6 = Sábado
    if (dow === 0 || dow === 6) continue

    const mm = String(mes1Indexed).padStart(2, '0')
    const dd = String(dia).padStart(2, '0')
    if (feriadosFixos.includes(`${mm}-${dd}`)) continue

    return { ano, mes: mes1Indexed, dia, data: d }
  }

  const fallback = new Date(Date.UTC(ano, mes1Indexed - 1, 1, 11, 0, 0, 0))
  return { ano, mes: mes1Indexed, dia: 1, data: fallback }
}

export async function getExtratoBancarioTecnico(
  tecnicoId: string,
  dataInicioStr?: string,
  dataFimStr?: string
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
        veiculo: true,
      },
    })

    if (!tec) return { success: false, error: 'Técnico não encontrado' }

    // Marco zero global: 01/07/2026 em Horário de Brasília
    const marcoZero = getInicioDiaBrasil('2026-07-01')
    const MESES_NOME = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]

    // Datas padrão no fuso do Brasil: mês atual
    const hoje = new Date()
    const defAno = hoje.getFullYear()
    const defMes = hoje.getMonth() + 1
    const defUltimoDia = new Date(defAno, defMes, 0).getDate()

    const dInicioStr = dataInicioStr || `${defAno}-${String(defMes).padStart(2, '0')}-01`
    const dFimStr =
      dataFimStr || `${defAno}-${String(defMes).padStart(2, '0')}-${String(defUltimoDia).padStart(2, '0')}`

    let dataInicioPeriodo = getInicioDiaBrasil(dInicioStr)
    let dataFimPeriodo = getFimDiaBrasil(dFimStr)

    if (dataInicioPeriodo > dataFimPeriodo) {
      const temp = dataInicioPeriodo
      dataInicioPeriodo = dataFimPeriodo
      dataFimPeriodo = temp
    }

    const rotuloPeriodo = `${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(
      dataInicioPeriodo
    )} a ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(dataFimPeriodo)}`

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

    // 1. Processa os depósitos da empresa mês a mês garantindo ausência total de duplicidades
    let saldoAnterior = 0
    const transacoes: Array<Omit<ItemExtratoBancario, 'saldoApos'>> = []

    const mesesProcessadosCredito = new Set<string>()

    const anoFimReal = Number(dFimStr.split('-')[0])
    const mesFimReal = Number(dFimStr.split('-')[1])

    let cy = 2026
    let cm = 7 // Marco zero: julho/2026

    while (cy < anoFimReal || (cy === anoFimReal && cm <= mesFimReal)) {
      const chaveMes = `${cy}-${cm}`
      if (mesesProcessadosCredito.has(chaveMes)) {
        cm++
        if (cm > 12) {
          cm = 1
          cy++
        }
        continue
      }
      mesesProcessadosCredito.add(chaveMes)

      // Calcula a data do 1º dia útil do mês (às 08:00 BRT = 11:00 UTC)
      const { data: dataCreditoMes, dia: diaUtil } = getPrimeiroDiaUtilMes(cy, cm)

      // Início e fim do mês no Brasil para verificar overrides
      const inicioMesBr = getInicioDiaBrasil(`${cy}-${String(cm).padStart(2, '0')}-01`)
      const ultimoDiaMes = new Date(cy, cm, 0).getDate()
      const fimMesBr = getFimDiaBrasil(`${cy}-${String(cm).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`)

      const overridesNoMes = recargas.filter(
        (r) => r.isOverride && r.data >= inicioMesBr && r.data <= fimMesBr
      )

      const mesesValidos =
        getValidMonthsCount(tec.admissao, cy, cm) - getValidMonthsCount(tec.admissao, cy, cm - 1)

      const temOverride = overridesNoMes.length > 0
      const ultOverride = temOverride ? overridesNoMes[overridesNoMes.length - 1] : null
      const valorBaseMes = ultOverride
        ? ultOverride.valor
        : mesesValidos > 0
        ? tec.orcamentoAbastecimento
        : 0

      // Se a data de crédito caiu antes do início do período selecionado -> Saldo Anterior
      if (dataCreditoMes < dataInicioPeriodo) {
        saldoAnterior += valorBaseMes
      } else if (dataCreditoMes >= dataInicioPeriodo && dataCreditoMes <= dataFimPeriodo) {
        // Se a data de crédito está dentro do período selecionado -> entra como transação única no extrato
        if (temOverride && ultOverride) {
          transacoes.push({
            id: `deposito_empresa_${cy}_${cm}`,
            data: dataCreditoMes.toISOString(),
            tipo: 'ENTRADA_AJUSTE',
            titulo: `Depósito da Empresa - Cota Ajustada (${MESES_NOME[cm - 1]}/${cy})`,
            descricao: `Depósito mensal no 1º dia útil (${String(diaUtil).padStart(2, '0')}/${String(cm).padStart(2, '0')}) com cota ajustada para R$ ${ultOverride.valor.toFixed(2)}${
              ultOverride.observacao ? ` — ${ultOverride.observacao}` : ''
            }`,
            valor: ultOverride.valor,
            userName: ultOverride.userName || 'Administrador',
            isOverride: true,
          })
        } else if (valorBaseMes > 0) {
          transacoes.push({
            id: `deposito_empresa_${cy}_${cm}`,
            data: dataCreditoMes.toISOString(),
            tipo: 'ENTRADA_PADRAO',
            titulo: `Depósito da Empresa (${MESES_NOME[cm - 1]}/${cy})`,
            descricao: `Depósito regular da cota mensal creditado no 1º dia útil (${String(diaUtil).padStart(2, '0')}/${String(cm).padStart(2, '0')})`,
            valor: valorBaseMes,
            userName: 'Empresa',
          })
        }
      }

      cm++
      if (cm > 12) {
        cm = 1
        cy++
      }
    }

    // Processa recargas extras (cargas complementares pagas, isOverride === false)
    for (const r of recargas.filter((r) => !r.isOverride)) {
      if (r.data < dataInicioPeriodo) {
        saldoAnterior += r.valor
      } else if (r.data >= dataInicioPeriodo && r.data <= dataFimPeriodo) {
        transacoes.push({
          id: r.id,
          data: r.data.toISOString(),
          tipo: 'ENTRADA_ADITIVO',
          titulo: 'Carga Complementar ao Depósito Mensal',
          descricao: r.observacao
            ? `Carga complementar ao valor depositado no mês — ${r.observacao}`
            : 'Carga complementar ao valor depositado no mês',
          valor: r.valor,
          userName: r.userName || 'Administrador',
        })
      }
    }

    // Processa abastecimentos (saídas / despesas de combustível)
    for (const a of abastecimentos) {
      if (a.data < dataInicioPeriodo) {
        saldoAnterior -= a.valor
      } else if (a.data >= dataInicioPeriodo && a.data <= dataFimPeriodo) {
        transacoes.push({
          id: a.id,
          data: a.data.toISOString(),
          tipo: 'SAIDA_ABASTECIMENTO',
          titulo: 'Abastecimento',
          descricao: a.tipo ? `Combustível (${a.tipo})` : 'Abastecimento de veículo',
          valor: -Math.abs(a.valor),
          fotoCupom: a.fotoCupom || null,
          userName: tec.nome,
        })
      }
    }

    // Ordenação estritamente cronológica: do mais antigo para o mais novo
    transacoes.sort((a, b) => {
      const timeA = new Date(a.data).getTime()
      const timeB = new Date(b.data).getTime()
      if (timeA !== timeB) {
        return timeA - timeB // Menor timestamp primeiro (mais antigo -> mais novo)
      }

      // Desempate na mesma data e hora:
      // 1. Depósito da Empresa (ENTRADA_PADRAO / ENTRADA_AJUSTE)
      // 2. Carga Complementar (ENTRADA_ADITIVO)
      // 3. Abastecimentos (SAIDA_ABASTECIMENTO)
      const pesoTipo = (tipo: string) => {
        if (tipo === 'ENTRADA_PADRAO' || tipo === 'ENTRADA_AJUSTE') return 1
        if (tipo === 'ENTRADA_ADITIVO') return 2
        return 3
      }

      const diffPeso = pesoTipo(a.tipo) - pesoTipo(b.tipo)
      if (diffPeso !== 0) return diffPeso

      return a.id.localeCompare(b.id)
    })

    // 2. Calcula Saldo Progressivo exatamente como num extrato bancário
    let runningBalance = saldoAnterior
    const transacoesComSaldo: ItemExtratoBancario[] = transacoes.map((t) => {
      runningBalance += t.valor
      return {
        ...t,
        saldoApos: Number(runningBalance.toFixed(2)),
      }
    })

    // 3. Totais e Diagnóstico
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
    const qtdAbastecimentos = transacoes.filter((t) => t.tipo === 'SAIDA_ABASTECIMENTO').length
    const qtdAditivos = transacoes.filter((t) => t.tipo === 'ENTRADA_ADITIVO').length

    let statusResumo: 'SUPERAVIT' | 'DEFICIT' | 'EQUILIBRADO' = 'EQUILIBRADO'
    if (saldoFinal > 0) statusResumo = 'SUPERAVIT'
    else if (saldoFinal < 0) statusResumo = 'DEFICIT'

    let diagnostico = ''
    if (transacoes.length === 0 && saldoAnterior === 0) {
      diagnostico = `Sem movimentações financeiras de abastecimento no período (${rotuloPeriodo}).`
    } else if (saldoFinal < 0) {
      diagnostico = `Atenção: Saldo devedor de R$ ${Math.abs(saldoFinal).toFixed(
        2
      )}. Os abastecimentos superaram os créditos concedidos.`
    } else if (totalAditivos > 0) {
      diagnostico = `Operação contou com R$ ${totalAditivos.toFixed(
        2
      )} em recarga(s) extra(s) (aditivos). Saldo final disponível: R$ ${saldoFinal.toFixed(2)}.`
    } else {
      diagnostico = `Operação realizada 100% dentro do padrão mensal sem aditivos extras. Saldo final disponível: R$ ${saldoFinal.toFixed(
        2
      )}.`
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
          veiculo: tec.veiculo || null,
        },
        periodo: {
          dataInicio: dInicioStr,
          dataFim: dFimStr,
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

// ─── PREVISÃO INTELIGENTE DE DEPÓSITOS (CONSUMO 3 MESES + SALDO) ────────────

export interface ItemPrevisaoDeposito {
  tecnicoId: string
  nome: string
  fotoUrl: string | null
  veiculo: string | null
  orcamentoBase: number
  admissao: string | Date | null
  rotulosMeses: [string, string, string] // ex: ['Out/26', 'Set/26', 'Ago/26']
  consumoMes1: number // mês atual
  consumoMes2: number // mês anterior
  consumoMes3: number // 2 meses atrás
  consumoEstimado: number
  saldoAtual: number
  depositoSugerido: number
  motivoSugerido: string
}

export interface PrevisaoDepositosResultado {
  mesReferencia: string // ex: "Novembro/2026"
  dataGeracao: string
  totalSugerido: number
  totalCotaFixa: number
  economiaEstimada: number
  qtdTecnicos: number
  isPenultimoDiaUtilHoje: boolean
  itens: ItemPrevisaoDeposito[]
}

export async function getPrevisaoDepositosProximoMes(): Promise<{
  success: boolean
  data?: PrevisaoDepositosResultado
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const hoje = new Date()
    const anoAtual = hoje.getFullYear()
    const mesAtual = hoje.getMonth() + 1 // 1 a 12

    // Mês Alvo (próximo mês a receber o depósito no dia 1º)
    let anoAlvo = anoAtual
    let mesAlvo = mesAtual + 1
    if (mesAlvo > 12) {
      mesAlvo = 1
      anoAlvo++
    }

    const MESES_NOME = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    const mesReferencia = `${MESES_NOME[mesAlvo - 1]}/${anoAlvo}`

    // Função auxiliar para subtrair meses
    function subMeses(a: number, m: number, qtd: number) {
      let anoRes = a
      let mesRes = m - qtd
      while (mesRes < 1) {
        mesRes += 12
        anoRes--
      }
      return { ano: anoRes, mes: mesRes }
    }

    // M1: mês atual, M2: mês anterior, M3: 2 meses atrás
    const m1 = subMeses(anoAtual, mesAtual, 0)
    const m2 = subMeses(anoAtual, mesAtual, 1)
    const m3 = subMeses(anoAtual, mesAtual, 2)

    const rotulosMeses: [string, string, string] = [
      `${MESES_ABREV[m1.mes - 1]}/${String(m1.ano).slice(-2)}`,
      `${MESES_ABREV[m2.mes - 1]}/${String(m2.ano).slice(-2)}`,
      `${MESES_ABREV[m3.mes - 1]}/${String(m3.ano).slice(-2)}`
    ]

    const ultDiaM1 = new Date(m1.ano, m1.mes, 0).getDate()
    const ultDiaM2 = new Date(m2.ano, m2.mes, 0).getDate()
    const ultDiaM3 = new Date(m3.ano, m3.mes, 0).getDate()

    const iniM1 = getInicioDiaBrasil(`${m1.ano}-${String(m1.mes).padStart(2, '0')}-01`)
    const fimM1 = getFimDiaBrasil(`${m1.ano}-${String(m1.mes).padStart(2, '0')}-${String(ultDiaM1).padStart(2, '0')}`)

    const iniM2 = getInicioDiaBrasil(`${m2.ano}-${String(m2.mes).padStart(2, '0')}-01`)
    const fimM2 = getFimDiaBrasil(`${m2.ano}-${String(m2.mes).padStart(2, '0')}-${String(ultDiaM2).padStart(2, '0')}`)

    const iniM3 = getInicioDiaBrasil(`${m3.ano}-${String(m3.mes).padStart(2, '0')}-01`)
    const fimM3 = getFimDiaBrasil(`${m3.ano}-${String(m3.mes).padStart(2, '0')}-${String(ultDiaM3).padStart(2, '0')}`)

    // Consulta todos os técnicos ativos
    const tecnicos = await prisma.tecnico.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        fotoUrl: true,
        veiculo: true,
        orcamentoAbastecimento: true,
        admissao: true,
      },
      orderBy: { nome: 'asc' },
    })

    // Busca abastecimentos dos 3 meses
    const abastecimentos3M = await prisma.abastecimento.findMany({
      where: {
        data: { gte: iniM3, lte: fimM1 }
      },
      select: {
        tecnicoId: true,
        valor: true,
        data: true
      }
    })

    // Busca resumo orçamentário do mês atual para obter os saldos consolidados
    const resumoMesAtual = await getResumoOrcamentoMes(anoAtual, [mesAtual])
    const resumosMap = new Map<string, any>()
    if (resumoMesAtual.success && resumoMesAtual.data) {
      for (const r of resumoMesAtual.data) {
        resumosMap.set(r.tecnico.id, r)
      }
    }

    const itens: ItemPrevisaoDeposito[] = []

    for (const tec of tecnicos) {
      const abasts = abastecimentos3M.filter(a => a.tecnicoId === tec.id)

      const gastoM1 = abasts.filter(a => a.data >= iniM1 && a.data <= fimM1).reduce((acc, c) => acc + c.valor, 0)
      const gastoM2 = abasts.filter(a => a.data >= iniM2 && a.data <= fimM2).reduce((acc, c) => acc + c.valor, 0)
      const gastoM3 = abasts.filter(a => a.data >= iniM3 && a.data <= fimM3).reduce((acc, c) => acc + c.valor, 0)

      const resumoTec = resumosMap.get(tec.id)
      const saldoAtual = resumoTec ? Number(resumoTec.saldo.toFixed(2)) : 0

      const admissao = tec.admissao ? new Date(tec.admissao) : null
      const ehRecemAdmitido = admissao && admissao >= iniM1

      let consumoEstimado = 0
      let motivoSugerido = ''

      if (ehRecemAdmitido) {
        consumoEstimado = tec.orcamentoAbastecimento
        motivoSugerido = 'Admissão recente (Cota base contratual)'
      } else if (admissao && admissao >= iniM2) {
        // Possui 2 meses de histórico
        consumoEstimado = (gastoM1 * 0.6) + (gastoM2 * 0.4)
        motivoSugerido = 'Média ponderada 2M (60% Mês Atual / 40% Anterior)'
      } else {
        // Possui 3 meses de histórico
        consumoEstimado = (gastoM1 * 0.5) + (gastoM2 * 0.3) + (gastoM3 * 0.2)
        motivoSugerido = 'Média ponderada 3M (50% M-1 / 30% M-2 / 20% M-3)'
      }

      // Se o consumo estimado calculado for 0 (técnico não rodou nos 3 meses), o consumo previsto é 0
      consumoEstimado = Number(consumoEstimado.toFixed(2))

      let depositoSugerido = 0

      if (ehRecemAdmitido) {
        depositoSugerido = tec.orcamentoAbastecimento
      } else {
        const diferenca = consumoEstimado - saldoAtual
        if (diferenca <= 0) {
          depositoSugerido = 0
          motivoSugerido = `Saldo em conta (R$ ${saldoAtual.toFixed(2)}) cobre o consumo previsto (R$ ${consumoEstimado.toFixed(2)})`
        } else {
          // Arredonda para múltiplos de R$ 10 para agilizar depósitos
          depositoSugerido = Math.ceil(diferenca / 10) * 10
          motivoSugerido = `Consumo previsto (R$ ${consumoEstimado.toFixed(2)}) - Saldo atual (R$ ${saldoAtual.toFixed(2)})`
        }
      }

      itens.push({
        tecnicoId: tec.id,
        nome: tec.nome,
        fotoUrl: tec.fotoUrl,
        veiculo: tec.veiculo || null,
        orcamentoBase: tec.orcamentoAbastecimento,
        admissao: tec.admissao,
        rotulosMeses,
        consumoMes1: Number(gastoM1.toFixed(2)),
        consumoMes2: Number(gastoM2.toFixed(2)),
        consumoMes3: Number(gastoM3.toFixed(2)),
        consumoEstimado,
        saldoAtual,
        depositoSugerido,
        motivoSugerido,
      })
    }

    const totalSugerido = itens.reduce((acc, i) => acc + i.depositoSugerido, 0)
    const totalCotaFixa = itens.reduce((acc, i) => acc + i.orcamentoBase, 0)
    const economiaEstimada = Math.max(0, totalCotaFixa - totalSugerido)

    const isPenultimoDiaUtilHoje = isPenultimoDiaUtil(hoje)

    return {
      success: true,
      data: {
        mesReferencia,
        dataGeracao: hoje.toISOString(),
        totalSugerido: Number(totalSugerido.toFixed(2)),
        totalCotaFixa: Number(totalCotaFixa.toFixed(2)),
        economiaEstimada: Number(economiaEstimada.toFixed(2)),
        qtdTecnicos: itens.length,
        isPenultimoDiaUtilHoje,
        itens,
      }
    }
  } catch (error) {
    console.error('Erro ao calcular previsão de depósitos:', error)
    return { success: false, error: 'Falha ao calcular previsão de depósitos.' }
  }
}

export async function dispararNotificacaoPrevisaoDepositos(forcarEnvio: boolean = false) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const hoje = new Date()
    const isPenultimo = isPenultimoDiaUtil(hoje)

    if (!isPenultimo && !forcarEnvio) {
      return {
        success: false,
        error: 'Hoje não é o penúltimo dia útil do mês. Para testar ou enviar agora, utilize o envio manual.'
      }
    }

    const resPrevisao = await getPrevisaoDepositosProximoMes()
    if (!resPrevisao.success || !resPrevisao.data) {
      return { success: false, error: resPrevisao.error || 'Erro ao gerar previsão de depósitos.' }
    }

    const data = resPrevisao.data

    // Monta texto formatado profissional para WhatsApp
    let textoWhatsapp = `*⛽ PREVISÃO DE DEPÓSITOS DE ABASTECIMENTO*\n`
    textoWhatsapp += `📅 *Mês de Referência:* ${data.mesReferencia}\n`
    textoWhatsapp += `💰 *Total Sugerido para a Frota:* R$ ${data.totalSugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
    textoWhatsapp += `📉 *Economia Estimada vs Cota Fixa:* R$ ${data.economiaEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
    textoWhatsapp += `👥 *Total de Técnicos Ativos:* ${data.qtdTecnicos}\n\n`
    textoWhatsapp += `*📋 DETALHAMENTO DE VALORES PARA O DIA 1º:*\n`

    for (const item of data.itens) {
      const veic = item.veiculo ? ` (${item.veiculo})` : ''
      textoWhatsapp += `• *${item.nome}*${veic}\n`
      textoWhatsapp += `   Consumo Est.: R$ ${item.consumoEstimado.toFixed(2)} | Saldo Atual: R$ ${item.saldoAtual.toFixed(2)}\n`
      textoWhatsapp += `   👉 *Depósito Sugerido: R$ ${item.depositoSugerido.toFixed(2)}*\n`
      textoWhatsapp += `   _${item.motivoSugerido}_\n\n`
    }

    textoWhatsapp += `ℹ️ _Relatório gerado automaticamente pelo SG4 com base no consumo dos últimos 3 meses._`

    const webhookUrl = process.env.N8N_WEBHOOK_PREVISAO_ABASTECIMENTO || process.env.N8N_WEBHOOK_ABASTECIMENTO

    let webhookEnviado = false
    let webhookMsg = ''

    if (webhookUrl) {
      try {
        const payload = {
          evento: 'PREVISAO_DEPOSITOS_ABASTECIMENTO',
          mesReferencia: data.mesReferencia,
          dataGeracao: data.dataGeracao,
          totalSugerido: data.totalSugerido,
          totalCotaFixa: data.totalCotaFixa,
          economiaEstimada: data.economiaEstimada,
          qtdTecnicos: data.qtdTecnicos,
          textoWhatsapp,
          itens: data.itens
        }

        const resN8n = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (resN8n.ok) {
          webhookEnviado = true
        } else {
          webhookMsg = `N8N retornou status ${resN8n.status}`
        }
      } catch (err: any) {
        console.error('Erro ao acionar webhook N8N de previsão:', err)
        webhookMsg = err.message || 'Falha de conexão com N8N'
      }
    } else {
      webhookMsg = 'Webhook N8N_WEBHOOK_PREVISAO_ABASTECIMENTO não configurado nas variáveis de ambiente'
    }

    const userId = (session.user as any).id
    await audit({
      userId,
      action: 'PREVISAO_PAGAMENTOS_ABASTECIMENTO',
      entity: 'Abastecimento',
      details: {
        mesReferencia: data.mesReferencia,
        totalSugerido: data.totalSugerido,
        economiaEstimada: data.economiaEstimada,
        webhookEnviado,
        forcarEnvio
      }
    })

    return {
      success: true,
      data,
      textoWhatsapp,
      webhookEnviado,
      aviso: !webhookEnviado ? webhookMsg : undefined
    }
  } catch (error: any) {
    console.error('Erro ao disparar notificação de previsão de depósitos:', error)
    return { success: false, error: 'Falha ao processar previsão de pagamentos.' }
  }
}


