'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { getBusinessDaysInMonth, getBusinessDaysPassedInMonth, getValidMonthsCount } from '@/lib/businessDays'

export async function getResumoOrcamentoMes(ano: number, mes: number) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    // Busca todos os técnicos ativos
    const tecnicos = await prisma.tecnico.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, fotoUrl: true, orcamentoAbastecimento: true, admissao: true }
    })

    const isConsolidado = ano === 0;

    // Se for consolidado, o alvo é o mês atual. Senão, é o mês selecionado.
    const targetAno = isConsolidado ? new Date().getFullYear() : ano;
    const targetMes = isConsolidado ? new Date().getMonth() + 1 : mes;

    const startDate = new Date(2026, 6, 1) // Marco zero global: Julho 2026
    const endDate = new Date(targetAno, targetMes, 0, 23, 59, 59)
    const mesAnoStr = `${String(targetMes).padStart(2, '0')}/${targetAno}`

    const resumos = []

    for (const tec of tecnicos) {
      // Pega soma de TODOS os abastecimentos desde o marco zero até o fim do mês alvo
      const abastecimentos = await prisma.abastecimento.findMany({
        where: {
          tecnicoId: tec.id,
          data: { gte: startDate, lte: endDate }
        }
      })
      const gastoTotalAcumulado = abastecimentos.reduce((acc, curr) => acc + curr.valor, 0)

      // Busca recargas extras do período (a partir do marco zero Julho 2026)
      const recargas = await prisma.recargaAbastecimento.findMany({
        where: {
          tecnicoId: tec.id,
          data: { gte: startDate, lte: endDate }
        }
      })
      const recargasTotalAcumulado = recargas.reduce((acc, curr) => acc + curr.valor, 0)

      // Calcula os meses válidos de orçamento para esse TST
      const mesesValidos = getValidMonthsCount(tec.admissao, targetAno, targetMes);
      
      // O orcamento acumulado agora inclui as recargas extras
      const orcamentoAcumulado = (tec.orcamentoAbastecimento * mesesValidos) + recargasTotalAcumulado;
      
      const saldoAcumulado = orcamentoAcumulado - gastoTotalAcumulado
      
      let status = 'ADEQUADO'
      let alerta = null;
      let valorExtraDinamico = 0;

      // Vamos calcular também o gasto só desse mês isolado para exibição, caso o usuário queira saber
      const inicioMesAtual = new Date(targetAno, targetMes - 1, 1)
      const gastoApenasMesSelecionado = abastecimentos
        .filter(a => a.data >= inicioMesAtual && a.data <= endDate)
        .reduce((acc, curr) => acc + curr.valor, 0)

      if (saldoAcumulado <= 100) {
        const diasUteisTotais = getBusinessDaysInMonth(targetAno, targetMes - 1)
        const diaAtual = new Date().getDate()
        const mesAtualReal = new Date().getMonth() + 1
        
        let diasUteisPassados = getBusinessDaysPassedInMonth(targetAno, targetMes - 1, mesAtualReal === targetMes ? diaAtual : 31)
        if (diasUteisPassados === 0) diasUteisPassados = 1 
        
        const mediaDiaria = gastoApenasMesSelecionado / diasUteisPassados
        const diasRestantes = diasUteisTotais - diasUteisPassados
        
        valorExtraDinamico = (mediaDiaria * diasRestantes) - saldoAcumulado
        if (valorExtraDinamico < 0) valorExtraDinamico = 0
        valorExtraDinamico = Number(valorExtraDinamico.toFixed(2))
      }

      if (!isConsolidado) {
        alerta = await prisma.alertaAbastecimento.findUnique({
          where: {
            tecnicoId_mesAno: {
              tecnicoId: tec.id,
              mesAno: mesAnoStr
            }
          }
        })

        // Se por acaso excluíram o abastecimento e o saldo voltou a ficar positivo, a gente limpa o alerta falso do banco
        if (saldoAcumulado > 100 && alerta) {
          await prisma.alertaAbastecimento.delete({ where: { id: alerta.id } })
          alerta = null;
        }

        if (saldoAcumulado <= 100) {
          status = alerta ? 'ALERTA_ENVIADO' : 'ALERTA_PENDENTE'
        }
      }

      const recargasApenasMesSelecionado = recargas
        .filter(a => a.data >= inicioMesAtual && a.data <= endDate)
        .reduce((acc, curr) => acc + curr.valor, 0)

      // Não filtra no backend para permitir que a interface tenha um botão de "Exibir ocultos"
      // para restaurar técnicos zerados.

      resumos.push({
        tecnico: tec,
        orcamento: tec.orcamentoAbastecimento,
        orcamentoAcumulado,
        recargasTotalAcumulado,
        recargasMesSelecionado: recargasApenasMesSelecionado,
        mesesValidos,
        gastoTotalAcumulado,
        gastoMesSelecionado: gastoApenasMesSelecionado,
        saldo: saldoAcumulado,
        status,
        alertaEnviadoEm: alerta?.enviadoEm || null,
        valorExtraCalculado: valorExtraDinamico
      })
    }

    // Ordena de forma que quem está em ALERTA apareça primeiro, depois pelo nome
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

export async function createRecargaExtra(tecnicoId: string, valor: number, observacao: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const userId = (session.user as any).id

    await prisma.recargaAbastecimento.create({
      data: {
        tecnicoId,
        valor,
        observacao
      }
    })

    await audit({
      userId,
      action: 'CRIAR_RECARGA_ABASTECIMENTO',
      entity: 'RecargaAbastecimento',
      entityId: tecnicoId,
      details: { valor, observacao }
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao registrar recarga:', error)
    return { success: false, error: 'Falha ao registrar a recarga extra.' }
  }
}
