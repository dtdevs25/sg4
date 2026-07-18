'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

// ── tipos compartilhados ─────────────────────────────────────────────────────

export type FiltrosRelatorio = {
  tecnicoId?: string          // undefined = todos
  dataInicio?: string         // ISO yyyy-mm-dd
  dataFim?: string
  ano?: number
  meses?: number[]            // 1-12
}

// ── 1. Agenda / Planejamento ────────────────────────────────────────────────

export async function getRelatorioAgenda(f: FiltrosRelatorio) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado', data: [] }

  const where: any = {}
  if (f.tecnicoId === 'ativos') {
    where.tecnico = { ativo: true }
  } else if (f.tecnicoId) {
    where.tecnicoId = f.tecnicoId
  }
  if (f.dataInicio && f.dataFim) {
    where.dataAtividade = {
      gte: new Date(f.dataInicio + 'T00:00:00Z'),
      lte: new Date(f.dataFim   + 'T23:59:59Z'),
    }
  }

  const rows = await prisma.planejamento.findMany({
    where,
    orderBy: [{ dataAtividade: 'asc' }],
    include: {
      tecnico: { select: { nome: true, cargo: true, email: true } }
    }
  })

  // "quem criou" vem do audit log
  const ids = rows.map(r => r.id)
  const logs = await prisma.auditLog.findMany({
    where: {
      entity: 'Planejamento',
      entityId: { in: ids },
      action: { in: ['CRIAR_PLANEJAMENTO', 'CONCLUIR_PLANEJAMENTO', 'CANCELAR_PLANEJAMENTO'] }
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'asc' }
  })

  const logsByEntity = new Map<string, typeof logs>()
  for (const l of logs) {
    if (!l.entityId) continue
    if (!logsByEntity.has(l.entityId)) logsByEntity.set(l.entityId, [])
    logsByEntity.get(l.entityId)!.push(l)
  }

  return {
    success: true,
    data: rows.map(r => {
      const eLogs = logsByEntity.get(r.id) ?? []
      const criacao    = eLogs.find(l => l.action === 'CRIAR_PLANEJAMENTO')
      const conclusao  = eLogs.find(l => l.action === 'CONCLUIR_PLANEJAMENTO')
      return {
        id:                r.id,
        tecnico:           r.tecnico.nome,
        dataAtividade:     r.dataAtividade.toISOString(),
        categoria:         r.categoria,
        descricaoOriginal: r.descricaoOriginal,
        descricaoExecutada:r.descricaoExecutada ?? '',
        observacoes:       r.observacoes ?? '',
        status:            r.status,
        prioridade:        r.prioridade,
        local:             r.local ?? '',
        cidade:            r.cidade ?? '',
        estado:            r.estado ?? '',
        criadoPor:         criacao?.user?.name ?? '—',
        criadoEm:          criacao?.createdAt?.toISOString() ?? '',
        fechadoPor:        conclusao?.user?.name ?? '—',
        fechadoEm:         conclusao?.createdAt?.toISOString() ?? '',
      }
    })
  }
}

// ── 2. DSS ──────────────────────────────────────────────────────────────────

export async function getRelatorioDss(f: FiltrosRelatorio) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado', data: [] }

  // 1. Buscar todos os técnicos para fazer o batimento de nomes/IDs
  const tecnicos = await prisma.tecnico.findMany({
    include: { baseFixa: true }
  })

  // 2. Buscar diálogos do Arkium
  const dssArkium = await prisma.dssArkium.findMany({
    orderBy: { importadoEm: 'desc' }
  })

  // 3. Buscar diálogos de Aliados
  const dssAliado = await prisma.dssAliado.findMany({
    include: { tecnico: { include: { baseFixa: true } } },
    orderBy: { data: 'desc' }
  })

  const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  function matchTecnico(nomePlanilha: string | null | undefined, nomeBd: string) {
    if (!nomePlanilha || !nomeBd) return false
    const nP = removeAccents(nomePlanilha.toLowerCase().trim())
    const nB = removeAccents(nomeBd.toLowerCase().trim())
    if (nP === nB) return true
    const planTokens = nP.split(' ').filter(Boolean)
    const dbTokens = nB.split(' ').filter(Boolean)
    
    if (planTokens.length === 0 || dbTokens.length === 0) return false
    
    if (planTokens[0] === dbTokens[0]) {
       if (planTokens.length === 1 || dbTokens.length === 1) return true
       
       const ignoreList = ['de', 'da', 'do', 'dos', 'das', 'e']
       const planSurnames = planTokens.slice(1).filter(t => !ignoreList.includes(t))
       const dbSurnames = dbTokens.slice(1).filter(t => !ignoreList.includes(t))
       
       for (let i = 0; i < planSurnames.length; i++) {
          for (let j = 0; j < dbSurnames.length; j++) {
             if (planSurnames[i] === dbSurnames[j] || (planSurnames[i] === 'jr' && dbSurnames[j] === 'junior') || (planSurnames[i] === 'junior' && dbSurnames[j] === 'jr')) {
                return true
             }
          }
       }
    }
    return false
  }

  function isDssAssinado(assinadoStr?: string | null) {
    if (!assinadoStr) return false
    const s = assinadoStr.toLowerCase().trim()
    if (s !== 'sim' && s !== 'yes' && !s.includes('sim')) return false
    return true
  }

  function parseDate(d: string | null): Date | null {
    if (!d) return null
    const datePart = d.split(' ')[0]
    if (datePart.includes('/')) {
      const parts = datePart.split('/')
      if (parts.length >= 3) {
        let day = parseInt(parts[0], 10)
        let month = parseInt(parts[1], 10)
        let year = parseInt(parts[2], 10)
        if (parts[2].length === 2) year += 2000
        return new Date(year, month - 1, day)
      }
    } else if (datePart.includes('-')) {
      const parts = datePart.split('-')
      if (parts.length >= 3) {
        let year = parseInt(parts[0], 10)
        let month = parseInt(parts[1], 10)
        let day = parseInt(parts[2], 10)
        return new Date(year, month - 1, day)
      }
    }
    return null
  }

  // 4. Filtrar Arkium (Somente assinados e dentro da data selecionada)
  let arkiumValidos = dssArkium.filter(r => isDssAssinado(r.assinado))

  if (f.dataInicio && f.dataFim) {
    const start = new Date(f.dataInicio + 'T00:00:00')
    const end = new Date(f.dataFim + 'T23:59:59')
    arkiumValidos = arkiumValidos.filter(r => {
      const parsed = parseDate(r.dataFechamento)
      if (!parsed) return false
      return parsed >= start && parsed <= end
    })
  }

  // Mapear cada registro do Arkium ao seu técnico SG4 correspondente
  let mappedArkium = arkiumValidos.map(r => {
    let matchedTecnico = tecnicos.find(t => t.id === r.tecnicoId)
    if (!matchedTecnico && r.nome) {
      matchedTecnico = tecnicos.find(t => matchTecnico(r.nome, t.nome))
    }
    return {
      id: r.id,
      numeroDialogo: r.numeroDialogo,
      assunto: r.assunto ?? '—',
      lider: r.lider ?? '—',
      base: r.base ?? '—',
      matricula: r.matricula,
      nome: r.nome ?? '—',
      estado: r.estado,
      dataFechamento: r.dataFechamento ?? '—',
      tecnico: matchedTecnico ?? null,
      isAliado: false
    }
  })

  // Filtrar técnicos ativos ou técnico específico para Arkium
  if (f.tecnicoId === 'ativos') {
    mappedArkium = mappedArkium.filter(r => r.tecnico && r.tecnico.ativo !== false)
  } else if (f.tecnicoId) {
    mappedArkium = mappedArkium.filter(r => r.tecnico?.id === f.tecnicoId)
  }

  // 5. Filtrar Aliados (Dentro da data selecionada)
  let aliadoValidos = dssAliado
  if (f.dataInicio && f.dataFim) {
    const start = new Date(f.dataInicio + 'T00:00:00')
    const end = new Date(f.dataFim + 'T23:59:59')
    aliadoValidos = dssAliado.filter(r => {
      const d = new Date(r.data)
      return d >= start && d <= end
    })
  }

  let mappedAliado = aliadoValidos.map(r => {
    const jsDate = new Date(r.data)
    const dateStr = `${jsDate.getUTCDate().toString().padStart(2, '0')}/${(jsDate.getUTCMonth()+1).toString().padStart(2, '0')}/${jsDate.getUTCFullYear()}`
    
    return {
      id: r.id,
      numeroDialogo: '—',
      assunto: r.tema,
      lider: '—',
      base: r.tecnico?.baseFixa?.nome ?? '—',
      matricula: r.tecnico?.matriculaArkium ?? '—',
      nome: r.tecnico?.nome ?? '—',
      estado: 'FECHADO',
      dataFechamento: dateStr,
      tecnico: r.tecnico ?? null,
      isAliado: true
    }
  })

  // Filtrar técnicos ativos ou técnico específico para Aliados
  if (f.tecnicoId === 'ativos') {
    mappedAliado = mappedAliado.filter(r => r.tecnico && r.tecnico.ativo !== false)
  } else if (f.tecnicoId) {
    mappedAliado = mappedAliado.filter(r => r.tecnico?.id === f.tecnicoId)
  }

  // 6. Combinar listas
  const combined = [...mappedArkium, ...mappedAliado]

  // 7. Agrupar por nome do técnico para montar o resumo correto
  const byTecnico = new Map<string, typeof combined>()
  for (const r of combined) {
    const key = r.tecnico?.nome ?? 'Não identificado'
    if (!byTecnico.has(key)) byTecnico.set(key, [])
    byTecnico.get(key)!.push(r)
  }

  const resumo = Array.from(byTecnico.entries()).map(([tecnicoNome, itens]) => ({
    lider: tecnicoNome, // Nomeado "lider" para manter compatibilidade com front
    total:    itens.length,
    fechados: itens.filter(i => i.estado === 'FECHADO').length,
    abertos:  itens.filter(i => i.estado === 'ABERTO').length,
    pct:      Math.round((itens.filter(i => i.estado === 'FECHADO').length / itens.length) * 100),
  })).sort((a, b) => b.total - a.total)

  return {
    success: true,
    data: combined,
    resumo
  }
}

// ── 3. Inspeções ─────────────────────────────────────────────────────────────

export async function getRelatorioInspecoes(f: FiltrosRelatorio) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado', data: [] }

  const tecnicos = await prisma.tecnico.findMany({
    include: { baseFixa: true }
  })

  const rows = await prisma.inspecoesArkium.findMany({
    orderBy: { importadoEm: 'desc' }
  })

  const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  function matchTecnico(nomePlanilha: string | null | undefined, nomeBd: string) {
    if (!nomePlanilha || !nomeBd) return false
    const nP = removeAccents(nomePlanilha.toLowerCase().trim())
    const nB = removeAccents(nomeBd.toLowerCase().trim())
    if (nP === nB) return true
    const planTokens = nP.split(' ').filter(Boolean)
    const dbTokens = nB.split(' ').filter(Boolean)
    
    if (planTokens.length === 0 || dbTokens.length === 0) return false
    
    if (planTokens[0] === dbTokens[0]) {
       if (planTokens.length === 1 || dbTokens.length === 1) return true
       
       const ignoreList = ['de', 'da', 'do', 'dos', 'das', 'e']
       const planSurnames = planTokens.slice(1).filter(t => !ignoreList.includes(t))
       const dbSurnames = dbTokens.slice(1).filter(t => !ignoreList.includes(t))
       
       for (let i = 0; i < planSurnames.length; i++) {
          for (let j = 0; j < dbSurnames.length; j++) {
             if (planSurnames[i] === dbSurnames[j] || (planSurnames[i] === 'jr' && dbSurnames[j] === 'junior') || (planSurnames[i] === 'junior' && dbSurnames[j] === 'jr')) {
                return true
             }
          }
       }
    }
    return false
  }

  function parseDate(d: string | null): Date | null {
    if (!d) return null
    const datePart = d.split(' ')[0]
    if (datePart.includes('/')) {
      const parts = datePart.split('/')
      if (parts.length >= 3) {
        let day = parseInt(parts[0], 10)
        let month = parseInt(parts[1], 10)
        let year = parseInt(parts[2], 10)
        if (parts[2].length === 2) year += 2000
        return new Date(year, month - 1, day)
      }
    } else if (datePart.includes('-')) {
      const parts = datePart.split('-')
      if (parts.length >= 3) {
        let year = parseInt(parts[0], 10)
        let month = parseInt(parts[1], 10)
        let day = parseInt(parts[2], 10)
        return new Date(year, month - 1, day)
      }
    }
    return null
  }

  let mapped = rows.map(r => {
    let matchedTecnico = tecnicos.find(t => t.id === r.tecnicoId)
    if (!matchedTecnico && r.nomeAuditor) {
      matchedTecnico = tecnicos.find(t => matchTecnico(r.nomeAuditor, t.nome))
    }
    return {
      ...r,
      tecnico: matchedTecnico ?? null
    }
  })

  if (f.dataInicio && f.dataFim) {
    const start = new Date(f.dataInicio + 'T00:00:00')
    const end = new Date(f.dataFim + 'T23:59:59')
    mapped = mapped.filter(r => {
      const parsed = parseDate(r.dataAbertura || r.dataFechamento)
      if (!parsed) return false
      return parsed >= start && parsed <= end
    })
  }

  if (f.tecnicoId === 'ativos') {
    mapped = mapped.filter(r => r.tecnico && r.tecnico.ativo !== false)
  } else if (f.tecnicoId) {
    mapped = mapped.filter(r => r.tecnico?.id === f.tecnicoId)
  }

  const byTecnico = new Map<string, typeof mapped>()
  for (const r of mapped) {
    const key = r.tecnico?.nome ?? r.nomeAuditor ?? 'Não identificado'
    if (!byTecnico.has(key)) byTecnico.set(key, [])
    byTecnico.get(key)!.push(r)
  }

  return {
    success: true,
    data: mapped,
    resumo: Array.from(byTecnico.entries()).map(([tecnico, itens]) => ({
      tecnico,
      total:     itens.length,
      conformes: itens.filter(i => (i.resultado ?? '').toUpperCase().includes('CONFORME') && !((i.resultado ?? '').toUpperCase().includes('NÃO'))).length,
      naoConformes: itens.filter(i => (i.resultado ?? '').toUpperCase().includes('NÃO')).length,
      pct: Math.round((itens.filter(i => (i.resultado ?? '').toUpperCase().includes('CONFORME') && !((i.resultado ?? '').toUpperCase().includes('NÃO'))).length / itens.length) * 100),
    })).sort((a, b) => b.total - a.total)
  }
}

// ── 4. Itens Não Conformes ───────────────────────────────────────────────────

export async function getRelatorioNaoConformes(f: FiltrosRelatorio) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado', data: [] }

  const tecnicos = await prisma.tecnico.findMany({
    include: { baseFixa: true }
  })

  const rows = await prisma.inspecoesArkium.findMany({
    where: {
      resultado: { contains: 'NÃO', mode: 'insensitive' }
    },
    orderBy: { importadoEm: 'desc' }
  })

  const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  function matchTecnico(nomePlanilha: string | null | undefined, nomeBd: string) {
    if (!nomePlanilha || !nomeBd) return false
    const nP = removeAccents(nomePlanilha.toLowerCase().trim())
    const nB = removeAccents(nomeBd.toLowerCase().trim())
    if (nP === nB) return true
    const planTokens = nP.split(' ').filter(Boolean)
    const dbTokens = nB.split(' ').filter(Boolean)
    
    if (planTokens.length === 0 || dbTokens.length === 0) return false
    
    if (planTokens[0] === dbTokens[0]) {
       if (planTokens.length === 1 || dbTokens.length === 1) return true
       
       const ignoreList = ['de', 'da', 'do', 'dos', 'das', 'e']
       const planSurnames = planTokens.slice(1).filter(t => !ignoreList.includes(t))
       const dbSurnames = dbTokens.slice(1).filter(t => !ignoreList.includes(t))
       
       for (let i = 0; i < planSurnames.length; i++) {
          for (let j = 0; j < dbSurnames.length; j++) {
             if (planSurnames[i] === dbSurnames[j] || (planSurnames[i] === 'jr' && dbSurnames[j] === 'junior') || (planSurnames[i] === 'junior' && dbSurnames[j] === 'jr')) {
                return true
             }
          }
       }
    }
    return false
  }

  function parseDate(d: string | null): Date | null {
    if (!d) return null
    const datePart = d.split(' ')[0]
    if (datePart.includes('/')) {
      const parts = datePart.split('/')
      if (parts.length >= 3) {
        let day = parseInt(parts[0], 10)
        let month = parseInt(parts[1], 10)
        let year = parseInt(parts[2], 10)
        if (parts[2].length === 2) year += 2000
        return new Date(year, month - 1, day)
      }
    } else if (datePart.includes('-')) {
      const parts = datePart.split('-')
      if (parts.length >= 3) {
        let year = parseInt(parts[0], 10)
        let month = parseInt(parts[1], 10)
        let day = parseInt(parts[2], 10)
        return new Date(year, month - 1, day)
      }
    }
    return null
  }

  let mapped = rows.map(r => {
    let matchedTecnico = tecnicos.find(t => t.id === r.tecnicoId)
    if (!matchedTecnico && r.nomeAuditor) {
      matchedTecnico = tecnicos.find(t => matchTecnico(r.nomeAuditor, t.nome))
    }
    return {
      ...r,
      tecnico: matchedTecnico ?? null
    }
  })

  if (f.dataInicio && f.dataFim) {
    const start = new Date(f.dataInicio + 'T00:00:00')
    const end = new Date(f.dataFim + 'T23:59:59')
    mapped = mapped.filter(r => {
      const parsed = parseDate(r.dataAbertura || r.dataFechamento)
      if (!parsed) return false
      return parsed >= start && parsed <= end
    })
  }

  if (f.tecnicoId === 'ativos') {
    mapped = mapped.filter(r => r.tecnico && r.tecnico.ativo !== false)
  } else if (f.tecnicoId) {
    mapped = mapped.filter(r => r.tecnico?.id === f.tecnicoId)
  }

  return {
    success: true,
    data: mapped.map(r => ({
      numero:       r.numero,
      tecnico:      r.tecnico?.nome ?? r.nomeAuditor ?? '—',
      resultado:    r.resultado ?? '—',
      dataAbertura: r.dataAbertura ?? '—',
      dataFechamento: r.dataFechamento ?? '—',
      local:        r.localidadeObjeto ?? '—',
      questionario: r.nomeQuestionario ?? '—',
      observacao:   r.observacao ?? '—',
    }))
  }
}

// ── 5. Gerenciamento de Custos de Abastecimento Mês a Mês ─────────────────────

export async function getRelatorioCustoAbastecimento(f: FiltrosRelatorio) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado', data: [] }

  const tecnicos = await prisma.tecnico.findMany({
    where: f.tecnicoId === 'ativos' ? { ativo: true } : f.tecnicoId ? { id: f.tecnicoId } : undefined,
    orderBy: { nome: 'asc' }
  })

  const start = f.dataInicio ? new Date(f.dataInicio + 'T12:00:00') : new Date()
  const end = f.dataFim ? new Date(f.dataFim + 'T12:00:00') : new Date()

  const globalStart = new Date(2026, 6, 1) // Julho 2026 (mês 6)

  let startYear = start.getFullYear()
  let startMonth = start.getMonth()
  if (new Date(startYear, startMonth, 1) < globalStart) {
    startYear = 2026
    startMonth = 6
  }

  const monthsList: { year: number, month: number }[] = []
  let current = new Date(startYear, startMonth, 1)
  const targetEnd = new Date(end.getFullYear(), end.getMonth(), 1)

  while (current <= targetEnd) {
    monthsList.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1
    })
    current.setMonth(current.getMonth() + 1)
  }

  const result: any[] = []

  const getValidMonthsCount = (admissao: Date, targetAno: number, targetMes: number) => {
    let validMonths = 0
    let currDate = new Date(2026, 6, 1)
    const endDate = new Date(targetAno, targetMes - 1, 1)
    const admissaoDate = new Date(admissao)
    admissaoDate.setHours(0,0,0,0)

    while (currDate <= endDate) {
      const ano = currDate.getFullYear()
      const mes = currDate.getMonth()
      let firstBusinessDay = new Date(ano, mes, 1)
      for(let i=1; i<=7; i++) {
          let d = new Date(ano, mes, i)
          if(d.getDay() !== 0 && d.getDay() !== 6) {
             firstBusinessDay = d
             break
          }
      }
      if (admissaoDate <= firstBusinessDay) {
          validMonths++
      }
      currDate.setMonth(currDate.getMonth() + 1)
    }
    return validMonths
  }

  for (const tec of tecnicos) {
    for (const m of monthsList) {
      const endOfMonth = new Date(m.year, m.month, 0, 23, 59, 59)
      const startOfMonth = new Date(m.year, m.month - 1, 1)

      const recargasTotalAcumulado = await prisma.recargaAbastecimento.aggregate({
        where: {
          tecnicoId: tec.id,
          data: { gte: globalStart, lte: endOfMonth }
        },
        _sum: { valor: true }
      }).then(r => r._sum.valor || 0)

      const recargasMes = await prisma.recargaAbastecimento.aggregate({
        where: {
          tecnicoId: tec.id,
          data: { gte: startOfMonth, lte: endOfMonth }
        },
        _sum: { valor: true }
      }).then(r => r._sum.valor || 0)

      const gastoTotalAcumulado = await prisma.abastecimento.aggregate({
        where: {
          tecnicoId: tec.id,
          data: { gte: globalStart, lte: endOfMonth }
        },
        _sum: { valor: true }
      }).then(r => r._sum.valor || 0)

      const gastoMes = await prisma.abastecimento.aggregate({
        where: {
          tecnicoId: tec.id,
          data: { gte: startOfMonth, lte: endOfMonth }
        },
        _sum: { valor: true }
      }).then(r => r._sum.valor || 0)

      const mesesValidos = getValidMonthsCount(tec.admissao, m.year, m.month)
      const orcamentoAcumulado = (tec.orcamentoAbastecimento * mesesValidos) + recargasTotalAcumulado
      const saldoAcumulado = orcamentoAcumulado - gastoTotalAcumulado

      result.push({
        tecnico: tec.nome,
        mesAno: `${String(m.month).padStart(2, '0')}/${m.year}`,
        orcamentoBase: tec.orcamentoAbastecimento,
        recargasMes,
        gastoMes,
        saldoAcumulado
      })
    }
  }

  return {
    success: true,
    data: result
  }
}

// ── 7. Ausências em Reuniões ─────────────────────────────────────────────────

export async function getRelatorioAusencias(f: FiltrosRelatorio) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado', data: [] }

  const where: any = { presenca: 'AUSENTE' }
  if (f.tecnicoId === 'ativos') {
    where.tecnico = { ativo: true }
  } else if (f.tecnicoId) {
    where.tecnicoId = f.tecnicoId
  }
  if (f.dataInicio && f.dataFim) {
    where.data = {
      gte: new Date(f.dataInicio + 'T00:00:00Z'),
      lte: new Date(f.dataFim   + 'T23:59:59Z'),
    }
  }

  const rows = await prisma.reuniao.findMany({
    where,
    include: { tecnico: { select: { nome: true } } },
    orderBy: { data: 'desc' }
  })

  return {
    success: true,
    data: rows.map(r => ({
      tecnico:     r.tecnico.nome,
      data:        r.data.toISOString(),
      assunto:     r.assunto ?? '—',
      justificada: r.justificada,
      motivo:      r.motivo  ?? '—',
      observacao:  r.observacao ?? '—',
    }))
  }
}

// ── 8. Reuniões (sumário) ─────────────────────────────────────────────────────

export async function getRelatorioReunioes(f: FiltrosRelatorio) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado', data: [] }

  const where: any = {}
  if (f.tecnicoId === 'ativos') {
    where.tecnico = { ativo: true }
  } else if (f.tecnicoId) {
    where.tecnicoId = f.tecnicoId
  }
  if (f.dataInicio && f.dataFim) {
    where.data = {
      gte: new Date(f.dataInicio + 'T00:00:00Z'),
      lte: new Date(f.dataFim   + 'T23:59:59Z'),
    }
  }

  const rows = await prisma.reuniao.findMany({
    where,
    include: { tecnico: { select: { nome: true } } },
    orderBy: { data: 'desc' }
  })

  // resumo por técnico
  const byTecnico = new Map<string, typeof rows>()
  for (const r of rows) {
    if (!byTecnico.has(r.tecnico.nome)) byTecnico.set(r.tecnico.nome, [])
    byTecnico.get(r.tecnico.nome)!.push(r)
  }

  return {
    success: true,
    data: rows,
    resumo: Array.from(byTecnico.entries()).map(([tecnico, itens]) => ({
      tecnico,
      total:     itens.length,
      presentes: itens.filter(i => i.presenca === 'PRESENTE').length,
      ausentes:  itens.filter(i => i.presenca === 'AUSENTE').length,
      pontual:   itens.filter(i => i.pontualidade === 'PONTUAL').length,
      atrasados: itens.filter(i => i.pontualidade === 'ATRASADO').length,
      pctPresenca: Math.round((itens.filter(i => i.presenca === 'PRESENTE').length / itens.length) * 100),
    })).sort((a, b) => b.pctPresenca - a.pctPresenca)
  }
}

// ── 9. Quilometragem ─────────────────────────────────────────────────────────

export async function getRelatorioKm(f: FiltrosRelatorio) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado', data: [] }

  const where: any = {}
  if (f.tecnicoId === 'ativos') {
    where.tecnico = { ativo: true }
  } else if (f.tecnicoId) {
    where.tecnicoId = f.tecnicoId
  }
  if (f.dataInicio && f.dataFim) {
    where.dataInicial = {
      gte: new Date(f.dataInicio + 'T00:00:00Z'),
      lte: new Date(f.dataFim   + 'T23:59:59Z'),
    }
  }

  const [kms, abastecimentos] = await Promise.all([
    prisma.quilometragem.findMany({
      where,
      include: { tecnico: { select: { nome: true } } },
      orderBy: { dataInicial: 'desc' }
    }),
    prisma.abastecimento.findMany({
      where: {
        ...(f.tecnicoId === 'ativos' ? { tecnico: { ativo: true } } : (f.tecnicoId ? { tecnicoId: f.tecnicoId } : {})),
        ...(f.dataInicio && f.dataFim ? {
          data: {
            gte: new Date(f.dataInicio + 'T00:00:00Z'),
            lte: new Date(f.dataFim   + 'T23:59:59Z'),
          }
        } : {})
      },
      include: { tecnico: { select: { nome: true } } },
    })
  ])

  // resumo por técnico
  const byTecnico = new Map<string, { km: typeof kms, ab: typeof abastecimentos }>()
  for (const k of kms) {
    const nome = k.tecnico.nome
    if (!byTecnico.has(nome)) byTecnico.set(nome, { km: [], ab: [] })
    byTecnico.get(nome)!.km.push(k)
  }
  for (const a of abastecimentos) {
    const nome = a.tecnico.nome
    if (!byTecnico.has(nome)) byTecnico.set(nome, { km: [], ab: [] })
    byTecnico.get(nome)!.ab.push(a)
  }

  return {
    success: true,
    data: kms,
    abastecimentos,
    resumo: Array.from(byTecnico.entries()).map(([tecnico, d]) => ({
      tecnico,
      totalKm:          d.km.reduce((s, k) => s + (k.diferenca ?? 0), 0),
      totalAbastecimento: d.ab.reduce((s, a) => s + a.valor, 0),
      registros:        d.km.length,
    })).sort((a, b) => b.totalKm - a.totalKm)
  }
}

// ── 10. Atividades de Campo ───────────────────────────────────────────────────

export async function getRelatorioAtividadesCampo(f: FiltrosRelatorio) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado', data: [] }

  const where: any = {}
  if (f.tecnicoId === 'ativos') {
    where.tecnico = { ativo: true }
  } else if (f.tecnicoId) {
    where.tecnicoId = f.tecnicoId
  }
  if (f.dataInicio && f.dataFim) {
    where.data = {
      gte: new Date(f.dataInicio + 'T00:00:00Z'),
      lte: new Date(f.dataFim   + 'T23:59:59Z'),
    }
  }

  const rows = await prisma.relatorioAtividade.findMany({
    where,
    include: { tecnico: { select: { nome: true } } },
    orderBy: { data: 'desc' }
  })

  return {
    success: true,
    data: rows.map(r => ({
      tecnico:   r.tecnico.nome,
      data:      r.data.toISOString(),
      empresa:   r.empresa,
      projeto:   r.projeto,
      local:     r.local,
      cidadeUf:  r.cidadeUf,
      descricao: r.descricao,
    }))
  }
}

// ── 11. Ranking de Desempenho ─────────────────────────────────────────────────

export async function getRelatorioRanking(f: FiltrosRelatorio) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado', data: [] }

  const whereDate = (f.dataInicio && f.dataFim) ? {
    gte: new Date(f.dataInicio + 'T00:00:00Z'),
    lte: new Date(f.dataFim   + 'T23:59:59Z'),
  } : undefined

  const [tecnicos, dss, inspecoes, reunioes] = await Promise.all([
    prisma.tecnico.findMany({ where: { ativo: true }, select: { id: true, nome: true } }),
    prisma.dssArkium.findMany({ where: whereDate ? { importadoEm: whereDate } : {} }),
    prisma.inspecoesArkium.findMany({ where: whereDate ? { importadoEm: whereDate } : {}, include: { tecnico: { select: { nome: true } } } }),
    prisma.reuniao.findMany({ where: { ...(whereDate ? { data: whereDate } : {}), presenca: 'PRESENTE' }, include: { tecnico: { select: { nome: true } } } }),
  ])

  const reunioesByTecnico = new Map<string, number>()
  for (const r of reunioes) reunioesByTecnico.set(r.tecnico.nome, (reunioesByTecnico.get(r.tecnico.nome) ?? 0) + 1)

  const inspecoesByTecnico = new Map<string, number>()
  for (const i of inspecoes) {
    const nome = i.tecnico?.nome ?? i.nomeAuditor ?? ''
    if (nome) inspecoesByTecnico.set(nome, (inspecoesByTecnico.get(nome) ?? 0) + 1)
  }

  const dssByLider = new Map<string, number>()
  for (const d of dss) {
    const nome = d.lider ?? ''
    if (nome) dssByLider.set(nome, (dssByLider.get(nome) ?? 0) + 1)
  }

  const totalReunioes = reunioes.length || 1
  const totalInspecoes = inspecoes.length || 1
  const totalDss = dss.length || 1

  return {
    success: true,
    data: tecnicos.map(t => {
      const pctReunioes  = Math.round(((reunioesByTecnico.get(t.nome) ?? 0) / (totalReunioes / tecnicos.length)) * 100)
      const pctInsp      = Math.round(((inspecoesByTecnico.get(t.nome) ?? 0) / (totalInspecoes / tecnicos.length)) * 100)
      const pctDss       = Math.round(((dssByLider.get(t.nome) ?? 0) / (totalDss / tecnicos.length)) * 100)
      const score        = Math.min(100, Math.round((pctReunioes + pctInsp + pctDss) / 3))
      return {
        tecnico:      t.nome,
        dss:          dssByLider.get(t.nome) ?? 0,
        inspecoes:    inspecoesByTecnico.get(t.nome) ?? 0,
        reunioes:     reunioesByTecnico.get(t.nome) ?? 0,
        pctDss,
        pctInsp,
        pctReunioes,
        score,
      }
    }).sort((a, b) => b.score - a.score)
  }
}

// ── Buscar técnicos para filtros ─────────────────────────────────────────────

export async function getTecnicosParaFiltro() {
  const session = await auth()
  if (!session?.user) return []
  return prisma.tecnico.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, fotoUrl: true, email: true },
    orderBy: { nome: 'asc' }
  })
}

// ── 12. Produtividade (DSS e Inspeções) ──────────────────────────────────────

export async function getRelatorioProdutividadeDssInspecoes(f: FiltrosRelatorio) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado', data: [] }

    // Sem 'Z' para respeitar fuso do servidor (UTC-3 Brasil)
    const startOfDay = f.dataInicio ? new Date(f.dataInicio + 'T00:00:00') : new Date('2020-01-01T00:00:00')
    const endOfDay   = f.dataFim   ? new Date(f.dataFim   + 'T23:59:59') : new Date()

    const [dssFull, inspecoesFull, aliadosFull, tecnicos] = await Promise.all([
      prisma.dssArkium.findMany({ 
        select: { numeroDialogo: true, lider: true, nome: true, dataFechamento: true, assinado: true } 
      }),
      prisma.inspecoesArkium.findMany({ 
        select: { tecnico: { select: { nome: true } }, nomeAuditor: true, dataAbertura: true, dataFechamento: true } 
      }),
      prisma.dssAliado.findMany({
        select: { id: true, data: true, tecnico: { select: { nome: true } } }
      }),
      prisma.tecnico.findMany({ 
        where: { ativo: true }, 
        select: { nome: true, admissao: true, demissao: true } 
      })
    ])

    function parseDate(d: string | null): Date | null {
      if (!d) return null
      const datePart = d.split(' ')[0]
      if (datePart.includes('/')) {
        const parts = datePart.split('/')
        if (parts.length >= 3) {
          let day = parseInt(parts[0], 10)
          let month = parseInt(parts[1], 10)
          let year = parseInt(parts[2], 10)
          if (parts[2].length === 2) year += 2000
          return new Date(year, month - 1, day)
        }
      } else if (datePart.includes('-')) {
        const parts = datePart.split('-')
        if (parts.length >= 3) {
          let year = parseInt(parts[0], 10)
          let month = parseInt(parts[1], 10)
          let day = parseInt(parts[2], 10)
          return new Date(year, month - 1, day)
        }
      } else {
        const excelDateNum = Number(datePart)
        if (!isNaN(excelDateNum) && excelDateNum > 20000) {
          const jsDate = new Date(Math.round((excelDateNum - 25569) * 86400 * 1000))
          return new Date(jsDate.getUTCFullYear(), jsDate.getUTCMonth(), jsDate.getUTCDate())
        }
      }
      return null
    }

    const dss = dssFull.filter(d => {
      const parsed = parseDate(d.dataFechamento)
      if (!parsed) return false

      const assinadoStr = (d.assinado || '').toLowerCase().trim()
      const isAssinado = assinadoStr === 'sim' || assinadoStr === 'yes'
      if (!isAssinado) return false

      return parsed >= startOfDay && parsed <= endOfDay
    })

    const inspecoes = inspecoesFull.filter(i => {
      const parsed = parseDate(i.dataAbertura || i.dataFechamento)
      if (!parsed) return false
      return parsed >= startOfDay && parsed <= endOfDay
    })

    const aliados = aliadosFull.filter(a => {
      const jsDate = new Date(a.data)
      const day = jsDate.getUTCDate()
      const month = jsDate.getUTCMonth()
      const year = jsDate.getUTCFullYear()
      const parsed = new Date(year, month, day)
      return parsed >= startOfDay && parsed <= endOfDay
    })

    function normalize(s?: string | null) {
      if (!s) return ''
      return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
    }

    // Matching mais flexível para lidar com nomes Arkium abreviados vs nomes longos no DB (ex: Daniel Gregorio Jr vs Daniel José Gregorio Junior)
    function nameMatches(arkiumName: string, dbName: string): boolean {
      if (!arkiumName || !dbName) return false
      if (arkiumName === dbName) return true
      if (arkiumName.includes(dbName) || dbName.includes(arkiumName)) return true
      
      const arkTokens = arkiumName.split(' ').filter(t => t.length > 2)
      const dbTokens = dbName.split(' ').filter(t => t.length > 2)
      
      const firstDb = dbTokens[0]
      const firstArk = arkTokens[0]
      if (!firstDb || !firstArk) return false
      
      const firstNameMatch = firstDb === firstArk || firstArk.includes(firstDb) || firstDb.includes(firstArk)
      if (!firstNameMatch) return false
      
      // Se um dos nomes só tem 1 palavra, assume que é a mesma pessoa já que o primeiro nome bateu
      if (dbTokens.length === 1 || arkTokens.length === 1) return true
      
      // Verifica se existe pelo menos um sobrenome em comum
      for (let i = 1; i < dbTokens.length; i++) {
        if (arkTokens.includes(dbTokens[i])) return true
      }
      
      return false
    }

    // Inicializa Map: Set<numeroDialogo> para DSS (evita contar o mesmo DSS duas vezes)
    const stats = new Map<string, { dss: Set<string>; inspecoes: number; norm: string }>()
    for (const t of tecnicos) {
      const isAtivoNoPeriodo = t.admissao <= endOfDay && (!t.demissao || t.demissao >= startOfDay)
      if (isAtivoNoPeriodo) {
        stats.set(t.nome, { dss: new Set(), inspecoes: 0, norm: normalize(t.nome) })
      }
    }

    // Conta DSS: o técnico conta se for LÍDER ou PARTICIPANTE (campo nome) no diálogo
    for (const d of dss) {
      const liderNorm = normalize(d.lider)
      const participanteNorm = normalize(d.nome)
      for (const [, val] of stats.entries()) {
        const isLider = !!liderNorm && nameMatches(liderNorm, val.norm)
        const isParticipante = !!participanteNorm && nameMatches(participanteNorm, val.norm)
        if (isLider || isParticipante) {
          val.dss.add(d.numeroDialogo) // Set garante que o mesmo DSS não conta duas vezes
          break
        }
      }
    }

    // Conta DSS de Aliados
    for (const a of aliados) {
      if (!a.tecnico?.nome) continue
      const tecNorm = normalize(a.tecnico.nome)
      for (const [, val] of stats.entries()) {
        if (nameMatches(tecNorm, val.norm)) {
          val.dss.add('ALIADO-' + a.id.substring(0, 6).toUpperCase())
          break
        }
      }
    }

    // Conta Inspeções
    for (const i of inspecoes) {
      const audNorm = normalize(i.tecnico?.nome || i.nomeAuditor)
      if (!audNorm) continue
      for (const [, val] of stats.entries()) {
        if (nameMatches(audNorm, val.norm)) {
          val.inspecoes++
          break
        }
      }
    }

    const rows = Array.from(stats.entries())
      .map(([tecnico, val]) => ({
        tecnico,
        dss: val.dss.size,
        inspecoes: val.inspecoes,
        total: val.dss.size + val.inspecoes
      }))
      .sort((a, b) => a.tecnico.localeCompare(b.tecnico, 'pt-BR'))

    return {
      success: true,
      data: rows
    }
  } catch (error: any) {
    console.error('Erro em getRelatorioProdutividadeDssInspecoes:', error)
    return { success: false, error: 'Erro interno ao consultar banco de dados: ' + error.message, data: [] }
  }
}

// ── 13. Envio de E-mail com Relatório (PDF) ──────────────────────────────────
// O PDF é enviado via API route /api/email/enviar-pdf para evitar o limite de tamanho das Server Actions

export async function enviarPdfPorEmail(tecnicoEmail: string, base64Pdf: string, fileName: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado' }

  if (!tecnicoEmail) {
    return { success: false, error: 'Técnico selecionado não possui e-mail cadastrado.' }
  }

  try {
    // Remover o prefixo 'data:application/pdf;filename=generated.pdf;base64,' se existir
    const base64Data = base64Pdf.includes('base64,') ? base64Pdf.split('base64,')[1] : base64Pdf
    
    // Anexar o PDF
    const transporter = require('nodemailer').createTransport({
      host: process.env.SMTP_HOST || 'srv-captain--mailserver',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'sg4@ehspro.com.br',
        pass: process.env.SMTP_PASS || 'nova@2026',
      },
      tls: { rejectUnauthorized: false }
    })

    await transporter.sendMail({
      from: `"SG4 - Gestão de Segurança do Trabalho" <${process.env.SMTP_USER || 'sg4@ehspro.com.br'}>`,
      to: tecnicoEmail,
      subject: `Relatório Consolidado de Produtividade - SG4`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px;">
          <h2 style="color: #660099;">Relatório de Produtividade</h2>
          <p>Olá,</p>
          <p>Segue em anexo o relatório de Produtividade (DSS e Inspeções) gerado no sistema SG4.</p>
          <br/>
          <p style="font-size: 12px; color: #888;">Este é um e-mail automático enviado pelo painel executivo SG4.</p>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: base64Data,
          encoding: 'base64'
        }
      ]
    })

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao enviar email com anexo', error)
    return { success: false, error: error?.message || 'Erro interno ao enviar e-mail' }
  }
}

export async function definirRecebedorRelatorioProdutividade(tecnicoId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado' }

  try {
    // 1. Zera todos
    await prisma.tecnico.updateMany({
      data: { recebeRelatorioProdutividade: false }
    })

    // 2. Define o novo se foi passado
    if (tecnicoId) {
      await prisma.tecnico.update({
        where: { id: tecnicoId },
        data: { recebeRelatorioProdutividade: true }
      })
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('Erro ao definir recebedor:', error)
    return { success: false, error: 'Erro interno' }
  }
}

export async function getRelatorioUnidadesTecnico(f: FiltrosRelatorio) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Não autorizado', data: [] }

  const where: any = {}
  if (f.tecnicoId === 'ativos') {
    where.ativo = true
  } else if (f.tecnicoId) {
    where.id = f.tecnicoId
  }

  const tecnicos = await prisma.tecnico.findMany({
    where,
    include: {
      baseFixa: true,
      unidades: {
        orderBy: { nome: 'asc' }
      }
    },
    orderBy: { nome: 'asc' }
  })

  const rows: any[] = []

  for (const tec of tecnicos) {
    // 1. Base Fixa
    if (tec.baseFixa) {
      rows.push({
        tecnico: tec.nome,
        status: tec.ativo ? 'Ativo' : 'Inativo',
        tipoVinculo: 'Base Fixa',
        nomeUnidade: tec.baseFixa.nome,
        responsavel: tec.baseFixa.responsavel ?? '—',
        cidadeUf: `${tec.baseFixa.cidade ?? ''}${tec.baseFixa.cidade && tec.baseFixa.estado ? '/' : ''}${tec.baseFixa.estado ?? ''}`.trim() || '—',
        endereco: tec.baseFixa.endereco ?? '—'
      })
    }

    // 2. Unidades Atendidas
    for (const uni of tec.unidades) {
      if (tec.baseFixaId === uni.id) continue

      rows.push({
        tecnico: tec.nome,
        status: tec.ativo ? 'Ativo' : 'Inativo',
        tipoVinculo: 'Unidade Atendida',
        nomeUnidade: uni.nome,
        responsavel: uni.responsavel ?? '—',
        cidadeUf: `${uni.cidade ?? ''}${uni.cidade && uni.estado ? '/' : ''}${uni.estado ?? ''}`.trim() || '—',
        endereco: uni.endereco ?? '—'
      })
    }

    // Sem Vínculo
    if (!tec.baseFixa && tec.unidades.length === 0) {
      rows.push({
        tecnico: tec.nome,
        status: tec.ativo ? 'Ativo' : 'Inativo',
        tipoVinculo: 'Sem Vínculo',
        nomeUnidade: '—',
        responsavel: '—',
        cidadeUf: '—',
        endereco: '—'
      })
    }
  }

  return {
    success: true,
    data: rows
  }
}



