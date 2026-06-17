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
    opts.headers,
    ...opts.rows
  ]
  const wsData = XLSX.utils.aoa_to_sheet(dataAoa)
  const colWidths = opts.headers.map((h, i) => ({
    wch: Math.max(h.length, ...opts.rows.map(r => String(r[i] ?? '').length)) + 2
  }))
  wsData['!cols'] = colWidths
  XLSX.utils.book_append_sheet(wb, wsData, 'Detalhado')

  if (opts.resumo && opts.resumo.length > 0) {
    const resAoa = [
      ['Métrica / Indicador', 'Valor', 'Percentual'],
      ...opts.resumo.map(r => [r.label, r.valor, r.pct !== undefined ? `${r.pct}%` : '—'])
    ]
    const wsRes = XLSX.utils.aoa_to_sheet(resAoa)
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
