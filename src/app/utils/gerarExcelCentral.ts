import * as XLSX from 'xlsx'
import { fmtDate, fmtDateTime } from './gerarPdfCentral'

function download(wb: XLSX.WorkBook, fileName: string) {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = fileName
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

function createSheet(headers: string[], rows: (string | number)[][], sheetName = 'Dados') {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  // largura automática
  const colWidths = headers.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2
  }))
  ws['!cols'] = colWidths
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

export function exportXlsxAgenda(data: any[], fileName = 'Agenda.xlsx') {
  const wb = createSheet(
    ['Técnico', 'Data', 'Categoria', 'Descrição Original', 'Descrição Executada', 'Observações', 'Status', 'Prioridade', 'Local', 'Cidade', 'Estado', 'Criado por', 'Criado em', 'Fechado por', 'Fechado em'],
    data.map(r => [r.tecnico, fmtDate(r.dataAtividade), r.categoria, r.descricaoOriginal, r.descricaoExecutada || '', r.observacoes || '', r.status, r.prioridade, r.local, r.cidade, r.estado, r.criadoPor, fmtDateTime(r.criadoEm), r.fechadoPor, fmtDateTime(r.fechadoEm)]),
    'Planejamento'
  )
  download(wb, fileName)
}

export function exportXlsxDss(data: any[], resumo: any[], fileName = 'DSS.xlsx') {
  const wb = XLSX.utils.book_new()
  const wsData = XLSX.utils.aoa_to_sheet([
    ['Nº Diálogo', 'Assunto', 'Líder', 'Base', 'UF', 'Localidade', 'Matrícula', 'Nome', 'Tipo', 'Status DSS', 'Assinado', 'Justificativa', 'Estado', 'Data Fechamento'],
    ...data.map(r => [r.numeroDialogo, r.assunto ?? '', r.lider ?? '', r.base ?? '', r.uf ?? '', r.localidade ?? '', r.matricula, r.nome ?? '', r.tipo ?? '', r.statusDSS ?? '', r.assinado ?? '', r.justificativa ?? '', r.estado, r.dataFechamento ?? ''])
  ])
  const wsResumo = XLSX.utils.aoa_to_sheet([
    ['Líder', 'Total', 'Fechados', 'Abertos', '% Fechados'],
    ...resumo.map(r => [r.lider, r.total, r.fechados, r.abertos, `${r.pct}%`])
  ])
  XLSX.utils.book_append_sheet(wb, wsData, 'DSS Detalhado')
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo por Líder')
  download(wb, fileName)
}

export function exportXlsxInspecoes(data: any[], resumo: any[], fileName = 'Inspecoes.xlsx') {
  const wb = XLSX.utils.book_new()
  const wsData = XLSX.utils.aoa_to_sheet([
    ['Nº', 'Técnico', 'Resultado', 'Data Abertura', 'Data Fechamento', 'Matrícula Auditor', 'Local', 'Questionário', 'Observação'],
    ...data.map((r: any) => [r.numero, r.tecnico?.nome ?? r.nomeAuditor ?? '', r.resultado ?? '', r.dataAbertura ?? '', r.dataFechamento ?? '', r.matriculaAuditor ?? '', r.localidadeObjeto ?? '', r.nomeQuestionario ?? '', r.observacao ?? ''])
  ])
  const wsResumo = XLSX.utils.aoa_to_sheet([
    ['Técnico', 'Total', 'Conformes', 'Não Conformes', '% Conformidade'],
    ...resumo.map(r => [r.tecnico, r.total, r.conformes, r.naoConformes, `${r.pct}%`])
  ])
  XLSX.utils.book_append_sheet(wb, wsData, 'Inspeções Detalhado')
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo por Técnico')
  download(wb, fileName)
}

export function exportXlsxNaoConformes(data: any[], fileName = 'Nao_Conformes.xlsx') {
  const wb = createSheet(
    ['Nº Inspeção', 'Técnico', 'Resultado', 'Data Abertura', 'Data Fechamento', 'Local', 'Questionário', 'Observação'],
    data.map(r => [r.numero, r.tecnico, r.resultado, r.dataAbertura, r.dataFechamento, r.local, r.questionario, r.observacao]),
    'Não Conformes'
  )
  download(wb, fileName)
}

export function exportXlsxDssPendentes(data: any[], fileName = 'DSS_Pendentes.xlsx') {
  const wb = createSheet(
    ['Nº Diálogo', 'Assunto', 'Líder', 'Base', 'Matrícula', 'Nome', 'Data Fechamento'],
    data.map(r => [r.numeroDialogo, r.assunto, r.lider, r.base, r.matricula, r.nome, r.dataFechamento]),
    'DSS Pendentes'
  )
  download(wb, fileName)
}

export function exportXlsxAtrasados(data: any[], fileName = 'Planejamentos_Atrasados.xlsx') {
  const wb = createSheet(
    ['Técnico', 'Data Prevista', 'Dias Atraso', 'Categoria', 'Prioridade', 'Local', 'Descrição'],
    data.map(r => [r.tecnico, fmtDate(r.data), r.diasAtraso, r.categoria, r.prioridade, r.local, r.descricao]),
    'Atrasados'
  )
  download(wb, fileName)
}

export function exportXlsxAusencias(data: any[], fileName = 'Ausencias_Reunioes.xlsx') {
  const wb = createSheet(
    ['Técnico', 'Data', 'Assunto', 'Justificada', 'Motivo', 'Observação'],
    data.map(r => [r.tecnico, fmtDate(r.data), r.assunto, r.justificada, r.motivo, r.observacao]),
    'Ausências'
  )
  download(wb, fileName)
}

export function exportXlsxReunioes(data: any[], resumo: any[], fileName = 'Reunioes.xlsx') {
  const wb = XLSX.utils.book_new()
  const wsData = XLSX.utils.aoa_to_sheet([
    ['Técnico', 'Data', 'Assunto', 'Presença', 'Pontualidade', 'Justificada', 'Motivo', 'Observação'],
    ...data.map((r: any) => [r.tecnico?.nome ?? r.tecnico, fmtDate(r.data?.toISOString?.() ?? r.data), r.assunto ?? '', r.presenca, r.pontualidade, r.justificada, r.motivo ?? '', r.observacao ?? ''])
  ])
  const wsRes = XLSX.utils.aoa_to_sheet([
    ['Técnico', 'Total', 'Presentes', 'Ausentes', 'Pontuais', 'Atrasados', '% Presença'],
    ...resumo.map(r => [r.tecnico, r.total, r.presentes, r.ausentes, r.pontual, r.atrasados, `${r.pctPresenca}%`])
  ])
  XLSX.utils.book_append_sheet(wb, wsData, 'Reuniões Detalhado')
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumo')
  download(wb, fileName)
}

export function exportXlsxKm(data: any[], resumo: any[], fileName = 'Quilometragem.xlsx') {
  const wb = XLSX.utils.book_new()
  const wsData = XLSX.utils.aoa_to_sheet([
    ['Técnico', 'Dia', 'Data Inicial', 'KM Inicial', 'Data Final', 'KM Final', 'Diferença'],
    ...data.map((r: any) => [r.tecnico?.nome ?? '', r.diaSemana, fmtDate(r.dataInicial?.toISOString?.() ?? r.dataInicial), r.kmInicial, r.dataFinal ? fmtDate(r.dataFinal?.toISOString?.() ?? r.dataFinal) : '', r.kmFinal ?? '', r.diferenca ?? ''])
  ])
  const wsRes = XLSX.utils.aoa_to_sheet([
    ['Técnico', 'Total KM', 'Total Abastecimento (R$)', 'Registros'],
    ...resumo.map(r => [r.tecnico, r.totalKm.toFixed(1), r.totalAbastecimento.toFixed(2), r.registros])
  ])
  XLSX.utils.book_append_sheet(wb, wsData, 'KM Detalhado')
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumo')
  download(wb, fileName)
}

export function exportXlsxRanking(data: any[], fileName = 'Ranking_Desempenho.xlsx') {
  const wb = createSheet(
    ['Pos.', 'Técnico', 'DSS', '% DSS', 'Inspeções', '% Insp.', 'Reuniões', '% Presença', 'Score'],
    data.map((r, i) => [`${i + 1}º`, r.tecnico, r.dss, `${r.pctDss}%`, r.inspecoes, `${r.pctInsp}%`, r.reunioes, `${r.pctReunioes}%`, `${r.score}%`]),
    'Ranking'
  )
  download(wb, fileName)
}
