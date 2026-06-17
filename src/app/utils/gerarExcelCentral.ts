import * as XLSX from 'xlsx'

export function gerarExcelCentral(opts: {
  titulo: string
  subtitulo: string
  headers: string[]
  rows: (string | number)[][]
  resumo?: { label: string; valor: string | number; pct?: number | string }[]
  fileName?: string
}) {
  const wb = XLSX.utils.book_new()
  
  const dataAoa = [
    ['SG4 - SISTEMA DE GESTÃO DE SEGURANÇA DO TRABALHO'],
    [opts.titulo.toUpperCase()],
    [opts.subtitulo],
    [],
    opts.headers,
    ...opts.rows
  ]
  const wsData = XLSX.utils.aoa_to_sheet(dataAoa)
  wsData['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: opts.headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: opts.headers.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: opts.headers.length - 1 } },
  ]
  const colWidths = opts.headers.map((h, i) => ({
    wch: Math.max(h.length, ...opts.rows.map(r => String(r[i] ?? '').length)) + 2
  }))
  wsData['!cols'] = colWidths
  XLSX.utils.book_append_sheet(wb, wsData, 'Detalhado')

  if (opts.resumo && opts.resumo.length > 0) {
    const resAoa = [
      ['SG4 - SUMÁRIO DO PERÍODO'],
      [opts.titulo.toUpperCase()],
      [opts.subtitulo],
      [],
      ['Métrica / Indicador', 'Valor', 'Percentual'],
      ...opts.resumo.map(r => [r.label, r.valor, r.pct !== undefined ? `${r.pct}%` : '—'])
    ]
    const wsRes = XLSX.utils.aoa_to_sheet(resAoa)
    wsRes['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    ]
    wsRes['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, wsRes, 'Resumo')
  }

  const safe = opts.titulo.replace(/[^a-zA-Z0-9 \-]/g, '').slice(0, 50)
  const fn = opts.fileName || `${safe} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '.')}.xlsx`

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = fn
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}
