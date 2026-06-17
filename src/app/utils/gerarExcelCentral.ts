import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

async function loadLogoBase64(src: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = src
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      const ctx = c.getContext('2d')
      if (ctx) ctx.drawImage(img, 0, 0)
      const dataUrl = c.toDataURL('image/png')
      resolve(dataUrl.split(',')[1] || '')
    }
    img.onerror = () => resolve('')
  })
}

export async function gerarExcelCentral(opts: {
  titulo: string
  subtitulo: string
  headers: string[]
  rows: (string | number)[][]
  resumo?: { label: string; valor: string | number; pct?: number | string }[]
  fileName?: string
}) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Detalhado')

  const sg4B64 = await loadLogoBase64('/logo.png')
  const vivoB64 = await loadLogoBase64('/logovivo.png')

  const totalCols = Math.max(8, opts.headers.length)

  // Cabeçalho roxo (linhas 1 a 4)
  for (let i = 1; i <= 4; i++) {
    const row = ws.getRow(i)
    row.height = 25
    for (let j = 1; j <= totalCols; j++) {
      const cell = row.getCell(j)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF660099' } }
    }
  }

  // Fundo branco para os logos (A1 a C4)
  for (let i = 1; i <= 4; i++) {
    const row = ws.getRow(i)
    for (let j = 1; j <= 3; j++) {
      const cell = row.getCell(j)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
    }
  }

  // Textos do Cabeçalho
  ws.mergeCells(1, 4, 2, totalCols)
  const titleCell = ws.getCell(1, 4)
  titleCell.value = '   ' + opts.titulo.toUpperCase()
  titleCell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 14, name: 'Arial' }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }

  ws.mergeCells(3, 4, 4, totalCols)
  const subCell = ws.getCell(3, 4)
  subCell.value = '   ' + opts.subtitulo
  subCell.font = { color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' }
  subCell.alignment = { vertical: 'middle', horizontal: 'left' }

  // Imagens
  if (sg4B64) {
    const imgId1 = wb.addImage({ base64: sg4B64, extension: 'png' })
    ws.addImage(imgId1, {
      tl: { col: 0.2, row: 0.5 },
      ext: { width: 60, height: 60 }
    })
  }
  if (vivoB64) {
    const imgId2 = wb.addImage({ base64: vivoB64, extension: 'png' })
    ws.addImage(imgId2, {
      tl: { col: 1.5, row: 1.0 },
      ext: { width: 60, height: 30 }
    })
  }

  // Tabela de Dados
  const startRow = 6
  const headerRow = ws.getRow(startRow)
  headerRow.height = 20
  opts.headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF660099' } }
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10, name: 'Arial' }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
    }
  })

  if (opts.rows.length === 0) {
    const emptyRow = ws.getRow(startRow + 1)
    ws.mergeCells(startRow + 1, 1, startRow + 1, opts.headers.length)
    emptyRow.getCell(1).value = 'Nenhum registro encontrado para os filtros selecionados.'
    emptyRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    emptyRow.height = 30
  } else {
    opts.rows.forEach((r, rowIdx) => {
      const row = ws.getRow(startRow + 1 + rowIdx)
      row.height = 18
      const isEven = rowIdx % 2 === 0
      r.forEach((val, colIdx) => {
        const cell = row.getCell(colIdx + 1)
        cell.value = val
        cell.font = { size: 10, name: 'Arial', color: { argb: 'FF333333' } }
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          right: { style: 'thin', color: { argb: 'FFEEEEEE' } }
        }
        cell.alignment = { vertical: 'middle', horizontal: typeof val === 'number' ? 'center' : 'left' }
      })
    })
  }

  // Largura das colunas (Auto-width)
  opts.headers.forEach((h, i) => {
    const col = ws.getColumn(i + 1)
    let maxLen = h.length
    if (opts.rows.length > 0) {
      maxLen = Math.max(h.length, ...opts.rows.map(r => String(r[i] ?? '').length))
    }
    col.width = Math.min(Math.max(maxLen + 2, 12), 60)
  })

  // Resumo (se houver)
  if (opts.resumo && opts.resumo.length > 0) {
    const wsRes = wb.addWorksheet('Resumo')
    
    // Cabeçalho roxo (linhas 1 a 4)
    for (let i = 1; i <= 4; i++) {
      const row = wsRes.getRow(i)
      row.height = 25
      for (let j = 1; j <= 3; j++) {
        const cell = row.getCell(j)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF660099' } }
      }
    }

    // Textos do Cabeçalho
    wsRes.mergeCells(1, 1, 2, 3)
    const titleRes = wsRes.getCell(1, 1)
    titleRes.value = '   ' + opts.titulo.toUpperCase() + ' - SUMÁRIO'
    titleRes.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 14, name: 'Arial' }
    titleRes.alignment = { vertical: 'middle', horizontal: 'left' }

    wsRes.mergeCells(3, 1, 4, 3)
    const subRes = wsRes.getCell(3, 1)
    subRes.value = '   ' + opts.subtitulo
    subRes.font = { color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' }
    subRes.alignment = { vertical: 'middle', horizontal: 'left' }

    // Tabela do Resumo
    const resStart = 6
    const resHeader = wsRes.getRow(resStart)
    resHeader.height = 20
    const resHeaders = ['Métrica / Indicador', 'Valor', 'Percentual']
    resHeaders.forEach((h, i) => {
      const cell = resHeader.getCell(i + 1)
      cell.value = h
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF660099' } }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10, name: 'Arial' }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
      }
    })

    opts.resumo.forEach((r, rowIdx) => {
      const row = wsRes.getRow(resStart + 1 + rowIdx)
      row.height = 18
      const isEven = rowIdx % 2 === 0
      const vals = [r.label, r.valor, r.pct !== undefined ? `${r.pct}%` : '—']
      vals.forEach((val, colIdx) => {
        const cell = row.getCell(colIdx + 1)
        cell.value = val
        cell.font = { size: 10, name: 'Arial', color: { argb: 'FF333333' } }
        if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          right: { style: 'thin', color: { argb: 'FFEEEEEE' } }
        }
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      })
    })

    wsRes.getColumn(1).width = 40
    wsRes.getColumn(2).width = 20
    wsRes.getColumn(3).width = 15
  }

  // Exportar
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const safe = opts.titulo.replace(/[^a-zA-Z0-9 \-]/g, '').slice(0, 50)
  const fn = opts.fileName || `${safe} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '.')}.xlsx`
  saveAs(blob, fn)
}
