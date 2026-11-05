import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { sendMail } from '@/lib/mail'
import {
  getDataBrasilParts,
  isJanelaPrimeiroDiaUtil,
  isPrimeiroDiaUtil,
} from '@/lib/businessDays'

let enviandoProdutividadeEmAndamento = false

function getInicioDiaBrasil(dataStr: string): Date {
  const [ano, mes, dia] = dataStr.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia, 3, 0, 0, 0))
}

function parseDate(d: string | null): Date | null {
  if (!d) return null
  const datePart = d.split(' ')[0]
  if (datePart.includes('/')) {
    const parts = datePart.split('/')
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10)
      let year = parseInt(parts[2], 10)
      if (parts[2].length === 2) year += 2000
      return new Date(year, month - 1, day)
    }
  } else if (datePart.includes('-')) {
    const parts = datePart.split('-')
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10)
      const day = parseInt(parts[2], 10)
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

function normalize(s?: string | null) {
  if (!s) return ''
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function nameMatches(arkiumName: string, dbName: string): boolean {
  if (!arkiumName || !dbName) return false
  if (arkiumName === dbName) return true
  if (arkiumName.includes(dbName) || dbName.includes(arkiumName)) return true

  const arkTokens = arkiumName.split(' ').filter(t => t.length > 2)
  const dbTokens = dbName.split(' ').filter(t => t.length > 2)

  const firstDb = dbTokens[0]
  const firstArk = arkTokens[0]
  if (!firstDb || !firstArk) return false

  const firstNameMatch =
    firstDb === firstArk || firstArk.includes(firstDb) || firstDb.includes(firstArk)
  if (!firstNameMatch) return false

  if (dbTokens.length === 1 || arkTokens.length === 1) return true

  for (let i = 1; i < dbTokens.length; i++) {
    if (arkTokens.includes(dbTokens[i])) return true
  }

  return false
}

export async function dispararRelatorioProdutividadeMensal(
  forcarEnvio: boolean = false,
  permitirJanelaRecuperacao: boolean = false
) {
  if (enviandoProdutividadeEmAndamento && !forcarEnvio) {
    return {
      success: true,
      jaEnviado: true,
      emailEnviado: false,
      message: 'Envio do relatório de produtividade já está em processamento.',
    }
  }

  enviandoProdutividadeEmAndamento = true
  try {
    const hoje = new Date()
    const ehPrimeiroDiaUtil = isPrimeiroDiaUtil(hoje)
    const ehDentroJanela = permitirJanelaRecuperacao && isJanelaPrimeiroDiaUtil(hoje)

    if (!ehPrimeiroDiaUtil && !ehDentroJanela && !forcarEnvio) {
      return {
        success: true,
        executado: false,
        message: 'Hoje não é o 1º dia útil do mês. Nenhuma ação realizada.',
      }
    }

    const { ano: anoAtual, mes1: mesAtual } = getDataBrasilParts(hoje)
    const anoRef = mesAtual === 1 ? anoAtual - 1 : anoAtual
    const mesRef = mesAtual === 1 ? 12 : mesAtual - 1 // 1..12

    const MESES_NOME = [
      'janeiro',
      'fevereiro',
      'março',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ]
    const mesFormatado = `${MESES_NOME[mesRef - 1]} de ${anoRef}`
    const chaveReferencia = `${String(mesRef).padStart(2, '0')}/${anoRef}`

    // Verificação de idempotência para execuções automáticas no mês corrente
    if (!forcarEnvio) {
      const inicioMesAtual = getInicioDiaBrasil(
        `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`
      )
      const logsRecentes = await prisma.auditLog.findMany({
        where: {
          action: 'CRON_RELATORIO_PRODUTIVIDADE',
          createdAt: { gte: inicioMesAtual },
        },
        select: { details: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      })

      const jaEnviado = logsRecentes.some(log => {
        if (!log.details) return false
        try {
          const parsed =
            typeof log.details === 'string'
              ? JSON.parse(log.details)
              : (log.details as Record<string, any>)
          return parsed?.emailEnviado === true && parsed?.mesReferencia === chaveReferencia
        } catch {
          return false
        }
      })

      if (jaEnviado) {
        return {
          success: true,
          executado: false,
          jaEnviado: true,
          mesReferencia: chaveReferencia,
          message: `Relatório de produtividade referente a ${mesFormatado} já foi enviado neste mês.`,
        }
      }
    }

    // 1. Destinatários: técnicos configurados + gestores MASTER/ADMIN como cópia/fallback
    const [tecnicosRecebedores, gestores] = await Promise.all([
      prisma.tecnico.findMany({
        where: { recebeRelatorioProdutividade: true, ativo: true },
        select: { nome: true, email: true },
      }),
      prisma.user.findMany({
        where: { role: { in: ['MASTER', 'ADMIN'] }, active: true },
        select: { name: true, email: true, role: true },
      }),
    ])

    const emailsTecnicos = Array.from(
      new Set(tecnicosRecebedores.map(t => t.email?.trim()).filter(Boolean))
    ) as string[]

    const emailsGestores = Array.from(
      new Set(gestores.map(g => g.email?.trim()).filter(Boolean))
    ) as string[]

    const destinatariosPrincipais =
      emailsTecnicos.length > 0 ? emailsTecnicos : emailsGestores
    const destinatariosBcc =
      emailsTecnicos.length > 0
        ? emailsGestores.filter(e => !emailsTecnicos.includes(e))
        : []

    if (destinatariosPrincipais.length === 0) {
      return {
        success: false,
        executado: false,
        message:
          'Nenhum técnico recebedor ou administrador ativo com e-mail cadastrado foi encontrado.',
      }
    }

    // 2. Coleta os dados de produtividade do mês anterior (alinhado com getRelatorioProdutividadeDssInspecoes)
    const startOfMonth = new Date(anoRef, mesRef - 1, 1, 0, 0, 0)
    const endOfMonth = new Date(anoRef, mesRef, 0, 23, 59, 59)

    const [dssFull, inspecoesFull, aliadosFull, todosTecnicos] = await Promise.all([
      prisma.dssArkium.findMany({
        select: {
          numeroDialogo: true,
          lider: true,
          nome: true,
          dataFechamento: true,
          assinado: true,
        },
      }),
      prisma.inspecoesArkium.findMany({
        select: {
          tecnico: { select: { nome: true } },
          nomeAuditor: true,
          dataAbertura: true,
          dataFechamento: true,
        },
      }),
      prisma.dssAliado.findMany({
        select: { id: true, data: true, tecnico: { select: { nome: true } } },
      }),
      prisma.tecnico.findMany({
        where: { ativo: true },
        select: { nome: true, admissao: true, demissao: true },
      }),
    ])

    const dss = dssFull.filter(d => {
      const parsed = parseDate(d.dataFechamento)
      if (!parsed) return false

      const assinadoStr = (d.assinado || '').toLowerCase().trim()
      const isAssinado = assinadoStr === 'sim' || assinadoStr === 'yes'
      if (!isAssinado) return false

      return parsed >= startOfMonth && parsed <= endOfMonth
    })

    const inspecoes = inspecoesFull.filter(i => {
      const parsed = parseDate(i.dataAbertura || i.dataFechamento)
      if (!parsed) return false
      return parsed >= startOfMonth && parsed <= endOfMonth
    })

    const aliados = aliadosFull.filter(a => {
      const jsDate = new Date(a.data)
      const parsed = new Date(
        jsDate.getUTCFullYear(),
        jsDate.getUTCMonth(),
        jsDate.getUTCDate()
      )
      return parsed >= startOfMonth && parsed <= endOfMonth
    })

    const stats = new Map<string, { dss: Set<string>; inspecoes: number; norm: string }>()
    for (const t of todosTecnicos) {
      const isAtivoNoPeriodo =
        t.admissao <= endOfMonth && (!t.demissao || t.demissao >= startOfMonth)
      if (isAtivoNoPeriodo) {
        stats.set(t.nome, { dss: new Set(), inspecoes: 0, norm: normalize(t.nome) })
      }
    }

    for (const d of dss) {
      const liderNorm = normalize(d.lider)
      const participanteNorm = normalize(d.nome)
      for (const [, val] of stats.entries()) {
        const isLider = !!liderNorm && nameMatches(liderNorm, val.norm)
        const isParticipante = !!participanteNorm && nameMatches(participanteNorm, val.norm)
        if (isLider || isParticipante) {
          val.dss.add(d.numeroDialogo)
          break
        }
      }
    }

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
        total: val.dss.size + val.inspecoes,
      }))
      .sort((a, b) => a.tecnico.localeCompare(b.tecnico, 'pt-BR'))

    let rowsHtml = rows
      .map(
        r => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${r.tecnico}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${r.dss}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${r.inspecoes}</td>
      </tr>
    `
      )
      .join('')

    const sumDss = rows.reduce((acc, r) => acc + r.dss, 0)
    const sumInsp = rows.reduce((acc, r) => acc + r.inspecoes, 0)
    if (rows.length > 0) {
      rowsHtml += `
        <tr style="background-color: #f1f5f9; font-weight: bold; color: #660099;">
          <td style="padding: 10px; border-bottom: 1px solid #eee;">TOTAL GERAL</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${sumDss}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${sumInsp}</td>
        </tr>
      `
    }

    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #660099; color: #fff; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Relatório de Produtividade</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Referência: ${mesFormatado}</p>
        </div>
        
        <div style="padding: 20px;">
          <p>Olá,</p>
          <p>Segue abaixo o consolidado mensal de <strong>DSS</strong> e <strong>Inspeções</strong> referente a <strong>${mesFormatado}</strong> (enviado no 1º dia útil do mês).</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 12px 10px; border-bottom: 2px solid #cbd5e1; text-align: left;">Técnico (SG4)</th>
                <th style="padding: 12px 10px; border-bottom: 2px solid #cbd5e1; text-align: center;">DSS Realizados</th>
                <th style="padding: 12px 10px; border-bottom: 2px solid #cbd5e1; text-align: center;">Inspeções Realizadas</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <br/>
          <p style="font-size: 12px; color: #888;">Este é um e-mail automático gerado pelo sistema SG4 no 1º dia útil do mês.</p>
        </div>
      </div>
    `

    const mailRes = await sendMail({
      to: destinatariosPrincipais.join(', '),
      bcc: destinatariosBcc.length > 0 ? destinatariosBcc : undefined,
      subject: `Relatório de Produtividade Mensal - ${mesFormatado}`,
      html: htmlEmail,
    })

    const emailEnviado = mailRes.success

    await audit({
      userId: null,
      action: 'CRON_RELATORIO_PRODUTIVIDADE',
      entity: 'RelatorioProdutividade',
      details: {
        executor: 'CRON_SYSTEM',
        mesReferencia: chaveReferencia,
        mesFormatado,
        emailEnviado,
        destinatarios: destinatariosPrincipais,
        bcc: destinatariosBcc,
        totalDss: sumDss,
        totalInspecoes: sumInsp,
        forcarEnvio,
      },
    })

    if (!emailEnviado) {
      return {
        success: false,
        executado: true,
        emailEnviado: false,
        message: 'Falha ao enviar o e-mail de produtividade via servidor SMTP.',
      }
    }

    return {
      success: true,
      executado: true,
      emailEnviado: true,
      mesReferencia: chaveReferencia,
      destinatarios: destinatariosPrincipais,
      bcc: destinatariosBcc,
      message: `Relatório enviado com sucesso para ${destinatariosPrincipais.length} destinatário(s).`,
    }
  } finally {
    enviandoProdutividadeEmAndamento = false
  }
}

