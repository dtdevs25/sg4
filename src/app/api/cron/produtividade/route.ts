import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isQuintoDiaUtil } from '@/lib/businessDays'
import { getRelatorioProdutividadeDssInspecoes } from '@/app/actions/relatoriosGerais'
import { sendMail } from '@/lib/mail'

// Essa rota deve ser acionada por um CRON Job externo todos os dias úteis (ex: 08:00 AM)
// O próprio script verifica se hoje é o 5º dia útil do mês.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    // Se quiser adicionar uma chave de segurança:
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse('Unauthorized', { status: 401 })

    const hoje = new Date()
    
    // Verifica se hoje é o quinto dia útil
    if (!isQuintoDiaUtil(hoje)) {
      return NextResponse.json({ success: true, message: 'Hoje não é o 5º dia útil. Nenhuma ação realizada.' })
    }

    // Pega o mês passado para o relatório
    const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0)

    const filtros = {
      dataInicio: mesAnterior.toISOString().slice(0, 10),
      dataFim: ultimoDiaMesAnterior.toISOString().slice(0, 10),
    }

    // 1. Encontra qual técnico deve receber
    const tecnicos = await prisma.tecnico.findMany({
      where: { recebeRelatorioProdutividade: true, ativo: true },
      select: { nome: true, email: true }
    })

    if (tecnicos.length === 0) {
      return NextResponse.json({ success: false, message: 'Nenhum técnico configurado para receber o relatório.' })
    }

    // 2. Coleta os dados de produtividade
    // Para manter alinhamento, usaremos o filtro exato do Dashboard (importadoEm)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const [dssFull, inspecoesFull, todosTecnicos] = await Promise.all([
      prisma.dssArkium.findMany({ 
        select: { numeroDialogo: true, lider: true, nome: true, dataFechamento: true } 
      }),
      prisma.inspecoesArkium.findMany({ 
        select: { tecnico: { select: { nome: true } }, nomeAuditor: true, dataAbertura: true } 
      }),
      prisma.tecnico.findMany({ 
        where: { ativo: true }, 
        select: { nome: true, admissao: true, demissao: true } 
      })
    ])

    function parseDate(d: string | null): Date | null {
      if (!d) return null
      const datePart = d.split(' ')[0]
      const [dia, mes, ano] = datePart.split('/')
      if (!dia || !mes || !ano) return null
      return new Date(Number(ano), Number(mes) - 1, Number(dia))
    }

    const dss = dssFull.filter(d => {
      const parsed = parseDate(d.dataFechamento)
      if (!parsed) return false
      return parsed >= startOfMonth && parsed <= endOfMonth
    })

    const inspecoes = inspecoesFull.filter(i => {
      const parsed = parseDate(i.dataAbertura)
      if (!parsed) return false
      return parsed >= startOfMonth && parsed <= endOfMonth
    })

    function normalize(s?: string | null) {
      if (!s) return ''
      return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
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
      
      const firstNameMatch = firstDb === firstArk || firstArk.includes(firstDb) || firstDb.includes(firstArk)
      if (!firstNameMatch) return false
      
      if (dbTokens.length === 1 || arkTokens.length === 1) return true
      
      for (let i = 1; i < dbTokens.length; i++) {
        if (arkTokens.includes(dbTokens[i])) return true
      }
      
      return false
    }

    const stats = new Map<string, { dss: Set<string>; inspecoes: number; norm: string }>()
    for (const t of todosTecnicos) {
      const isAtivoNoPeriodo = t.admissao <= endOfMonth && (!t.demissao || t.demissao >= startOfMonth)
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

    const rows = Array.from(stats.entries()).map(([tecnico, val]) => ({
      tecnico,
      dss: val.dss.size,
      inspecoes: val.inspecoes,
      total: val.dss.size + val.inspecoes
    })).sort((a, b) => a.tecnico.localeCompare(b.tecnico, 'pt-BR'))

    let rowsHtml = rows.map(r => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${r.tecnico}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${r.dss}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${r.inspecoes}</td>
      </tr>
    `).join('')

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

    const mesFormatado = mesAnterior.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #660099; color: #fff; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Relatório de Produtividade</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Referência: ${mesFormatado}</p>
        </div>
        
        <div style="padding: 20px;">
          <p>Olá,</p>
          <p>Segue abaixo o consolidado mensal de <strong>DSS</strong> e <strong>Inspeções</strong> referente a <strong>${mesFormatado}</strong>.</p>
          
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
          <p style="font-size: 12px; color: #888;">Este é um e-mail automático gerado pelo sistema SG4.</p>
        </div>
      </div>
    `

    // 4. Enviar para todos os recebedores configurados
    let enviados = 0
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

    for (const tec of tecnicos) {
      if (tec.email) {
        await transporter.sendMail({
          from: `"SG4 - Gestão de Segurança do Trabalho" <${process.env.SMTP_USER || 'sg4@ehspro.com.br'}>`,
          to: tec.email,
          subject: `Relatório de Produtividade Mensal - ${mesFormatado}`,
          html: htmlEmail
        })
        enviados++
      }
    }

    return NextResponse.json({ success: true, message: `Relatório enviado com sucesso para ${enviados} técnico(s).` })

  } catch (error: any) {
    console.error('Erro no CRON de Produtividade:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
