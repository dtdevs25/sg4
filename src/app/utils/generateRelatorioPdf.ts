import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── EXIF Helpers ────────────────────────────────────────────────────────────
function readUint16(bytes: Uint8Array, offset: number, le: boolean): number {
  return le
    ? bytes[offset] | (bytes[offset + 1] << 8)
    : (bytes[offset] << 8) | bytes[offset + 1]
}

function readUint32(bytes: Uint8Array, offset: number, le: boolean): number {
  const b = bytes
  return le
    ? b[offset] | (b[offset + 1] << 8) | (b[offset + 2] << 16) | (b[offset + 3] << 24)
    : (b[offset] << 24) | (b[offset + 1] << 16) | (b[offset + 2] << 8) | b[offset + 3]
}

/**
 * Lê a tag de orientação EXIF de um buffer JPEG.
 * Retorna um valor de 1 a 8, ou 1 (padrão) se não encontrar.
 */
function getExifOrientation(bytes: Uint8Array): number {
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return 1 // Não é JPEG

  let i = 2
  while (i < bytes.length - 3) {
    if (bytes[i] !== 0xFF) break
    const marker = bytes[i + 1]

    // Marcador APP1 (0xFFE1) contém EXIF
    if (marker === 0xE1) {
      const segLen = (bytes[i + 2] << 8) | bytes[i + 3]
      // Verifica header "Exif\0\0"
      if (
        bytes[i + 4] === 0x45 && bytes[i + 5] === 0x78 &&
        bytes[i + 6] === 0x69 && bytes[i + 7] === 0x66
      ) {
        const tiffStart = i + 10
        const le = bytes[tiffStart] === 0x49 // 'II' = little-endian
        const ifdOffset = readUint32(bytes, tiffStart + 4, le)
        const ifdStart = tiffStart + ifdOffset
        const numEntries = readUint16(bytes, ifdStart, le)

        for (let e = 0; e < numEntries; e++) {
          const entryOffset = ifdStart + 2 + e * 12
          const tag = readUint16(bytes, entryOffset, le)
          if (tag === 0x0112) { // Tag de orientação
            return readUint16(bytes, entryOffset + 8, le)
          }
        }
      }
      i += 2 + segLen
    } else {
      const segLen = (bytes[i + 2] << 8) | bytes[i + 3]
      i += 2 + segLen
    }
  }
  return 1
}

/**
 * Corrige a orientação EXIF de uma imagem base64, redesenhando num canvas.
 * Retorna a imagem corrigida como base64.
 *
 * FIX #1: Imagens de ponta cabeça — lê o metadado EXIF de orientação e
 * aplica a rotação/espelhamento correto antes de inserir no PDF.
 */
async function correctImageOrientation(base64: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      // Extrai os bytes para leitura de EXIF
      const dataStr = base64.includes(',') ? base64.split(',')[1] : base64
      const binary = atob(dataStr)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

      const orientation = getExifOrientation(bytes)

      // Se orientação for 1 (normal), não precisa corrigir
      if (orientation === 1) {
        resolve(base64)
        return
      }

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(base64); return }

        // Orientações 5-8 trocam largura/altura (rotação 90° ou 270°)
        if (orientation >= 5) {
          canvas.width = img.height
          canvas.height = img.width
        } else {
          canvas.width = img.width
          canvas.height = img.height
        }

        // Aplica a transformação correta para cada valor de orientação EXIF
        switch (orientation) {
          case 2: ctx.transform(-1, 0, 0, 1, img.width, 0); break
          case 3: ctx.transform(-1, 0, 0, -1, img.width, img.height); break
          case 4: ctx.transform(1, 0, 0, -1, 0, img.height); break
          case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
          case 6: ctx.transform(0, 1, -1, 0, img.height, 0); break
          case 7: ctx.transform(0, -1, -1, 0, img.height, img.width); break
          case 8: ctx.transform(0, -1, 1, 0, 0, img.width); break
        }

        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.92))
      }
      img.onerror = () => resolve(base64)
      img.src = base64
    } catch {
      resolve(base64)
    }
  })
}

// ─── Gerador Principal ───────────────────────────────────────────────────────

export async function gerarPdfRelatorio(
  atividades: any[],
  filtros: { mes: number, ano: number, empresa: string, elaborador: string }
) {
  // FIX #1: Corrige orientação EXIF de todas as fotos antes de gerar o PDF
  const atividadesCorrigidas = await Promise.all(
    atividades.map(async (a) => {
      if (!a.fotoBase64) return a
      const fotoCorrigida = await correctImageOrientation(a.fotoBase64)
      return { ...a, fotoBase64: fotoCorrigida }
    })
  )

  // Carrega a logo dinamicamente
  const logoBase64 = await new Promise<string>((resolve) => {
    const img = new Image()
    img.src = '/logovermelho.png'
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve('')
  })

  const doc = new jsPDF('p', 'pt', 'a4')

  const mesAno = new Date(filtros.ano, filtros.mes - 1).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
  const projeto = atividadesCorrigidas.length > 0 ? atividadesCorrigidas[0].projeto : '-'

  // Função auxiliar para desenhar a grade de Informações Gerais
  const drawInfoRow = (y: number, items: { wTitle: number, title: string, wValue: number, value: string, offsetX: number }[]) => {
    items.forEach(item => {
      doc.setDrawColor(0)
      doc.setLineWidth(0.5)
      doc.setFillColor(240, 240, 240)
      doc.rect(item.offsetX, y, item.wTitle, 16, 'FD')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(item.title, item.offsetX + (item.wTitle / 2), y + 11, { align: 'center' })

      doc.setFillColor(255, 255, 255)
      doc.rect(item.offsetX + item.wTitle, y, item.wValue, 16, 'FD')
      doc.setFont('helvetica', 'normal')

      // FIX #3: Trunca o texto para não vazar da célula
      const maxWidth = item.wValue - 8
      const lines = doc.splitTextToSize(item.value, maxWidth)
      doc.text(lines[0] ?? '', item.offsetX + item.wTitle + 6, y + 11)
    })
  }

  /**
   * Desenha a imagem mantendo proporção dentro do quadro (maxW × maxH).
   * FIX #2: centraliza dentro do espaço disponível para que todas as
   * imagens — incluindo a da última linha — fiquem do mesmo tamanho.
   */
  const drawImageProp = (base64: string, x: number, y: number, maxW: number, maxH: number) => {
    try {
      const props = doc.getImageProperties(base64)
      const ratio = props.width / props.height
      const boxRatio = maxW / maxH
      let finalW, finalH
      if (ratio > boxRatio) {
        finalW = maxW
        finalH = maxW / ratio
      } else {
        finalH = maxH
        finalW = maxH * ratio
      }
      const finalX = x + (maxW - finalW) / 2
      const finalY = y + (maxH - finalH) / 2
      doc.addImage(base64, props.fileType || 'JPEG', finalX, finalY, finalW, finalH, undefined, 'FAST')
    } catch (e) {
      console.error('Erro ao processar imagem:', e)
    }
  }

  // Título da Tabela (Somente primeira página)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Descrição das atividades conduzidas:', 40, 195)

  // === TABELA ===
  // Largura utilizável: 595 (A4) - 80 (margens) = 515pt
  // Colunas fixas: 55 + 70 + 70 + 140 = 335pt → descrição = 180pt
  const COL_DESCRICAO_W = 180

  const tableData = atividadesCorrigidas.map(a => [
    new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
    a.local,
    a.cidadeUf,
    a.fotoBase64 ? '' : 'NÃO SE APLICA',
    a.descricao
  ])

  if (tableData.length === 0) {
    tableData.push(['-', '-', '-', '-', 'Nenhuma atividade registrada no período.'])
  }

  // Altura fixa da célula de foto — mesma para TODAS as linhas
  const FOTO_CELL_HEIGHT = 90

  autoTable(doc, {
    startY: 205,
    head: [['DATA', 'LOCAL', 'CIDADE/UF', 'REGISTRO (FOTO)', 'ATIVIDADE']],
    body: tableData,
    theme: 'grid',
    // FIX #2: rowPageBreak 'avoid' garante que a última linha de uma página
    // nunca seja cortada pela metade, evitando alturas inconsistentes.
    rowPageBreak: 'avoid',
    margin: { top: 185, bottom: 130, left: 40, right: 40 },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      // FIX #3: quebra automática de linha em todas as células
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 55, halign: 'center' },
      1: { cellWidth: 70, halign: 'center', overflow: 'linebreak' },
      2: { cellWidth: 70, halign: 'center', overflow: 'linebreak' },
      3: { cellWidth: 140, halign: 'center' },
      // FIX #3: Largura explícita na coluna de descrição + quebra de linha
      4: { cellWidth: COL_DESCRICAO_W, overflow: 'linebreak', halign: 'left' },
    },
    didParseCell: function(data) {
      // FIX #2: altura mínima uniforme para todas as células de foto
      if (data.section === 'body' && data.column.index === 3) {
        const rowData = atividadesCorrigidas[data.row.index]
        if (rowData && rowData.fotoBase64) {
          data.cell.styles.minCellHeight = FOTO_CELL_HEIGHT
        }
      }
    },
    didDrawCell: function(data) {
      if (data.section === 'body' && data.column.index === 3) {
        const rowData = atividadesCorrigidas[data.row.index]
        if (rowData && rowData.fotoBase64) {
          // FIX #2: usa a altura real da célula, mas com padding uniforme
          const padding = 4
          drawImageProp(
            rowData.fotoBase64,
            data.cell.x + padding,
            data.cell.y + padding,
            data.cell.width - padding * 2,
            data.cell.height - padding * 2
          )
        }
      }
    }
  })

  // === CABEÇALHO E RODAPÉ EM TODAS AS PÁGINAS ===
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Borda externa
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.rect(40, 40, 515, 60)

    // Separador esquerdo (Logo)
    doc.line(110, 40, 110, 100)

    // Separador direito (Info Box)
    doc.line(440, 40, 440, 100)

    // Linhas internas da direita
    doc.line(440, 60, 555, 60)
    doc.line(440, 80, 555, 80)

    // Textos do centro
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text('FO 40 - Relatório de Visita', 275, 74, { align: 'center' })

    // Textos da direita
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)

    doc.setFont('helvetica', 'bold')
    doc.text('Revisão:', 445, 54)
    doc.setFont('helvetica', 'normal')
    doc.text('05', 550, 54, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.text('Data Revisão:', 445, 74)
    doc.setFont('helvetica', 'normal')
    doc.text('06/09/2024', 550, 74, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.text('Página:', 445, 94)
    doc.setFont('helvetica', 'normal')
    doc.text(`${i} de ${pageCount}`, 550, 94, { align: 'right' })

    // Logo
    if (logoBase64) {
      drawImageProp(logoBase64, 42, 42, 66, 56)
    }

    // Informações Gerais em cada página
    drawInfoRow(115, [
      { offsetX: 40, wTitle: 70, title: 'EMPRESA:', wValue: 445, value: 'Telefônica Brasil S. A' }
    ])
    drawInfoRow(135, [
      { offsetX: 40, wTitle: 70, title: 'PROJETO:', wValue: 310, value: 'VIVO' },
      { offsetX: 430, wTitle: 60, title: 'PERÍODO:', wValue: 65, value: mesAno.replace('/', '.') }
    ])
    drawInfoRow(155, [
      { offsetX: 40, wTitle: 70, title: 'ELABORADOR:', wValue: 445, value: filtros.elaborador.toUpperCase() }
    ])

    // Rodapé
    const footerY = 740

    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.setFillColor(240, 240, 240)
    doc.rect(40, footerY, 340, 16, 'FD')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(120, 120, 120)
    doc.text('VALIDAÇÃO', 210, footerY + 11, { align: 'center' })

    doc.setFillColor(255, 255, 255)
    doc.rect(40, footerY + 16, 340, 24, 'FD')
    doc.setFontSize(10)
    doc.setTextColor(120, 120, 120)
    doc.text('A validação deste Relatório é feita através da confirmação via e-mail.', 210, footerY + 32, { align: 'center' })

    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)

    doc.setFont('helvetica', 'bold')
    doc.text('Legenda', 390, footerY + 10)
    doc.line(390, footerY + 11, 425, footerY + 11)

    doc.text('S/M:', 390, footerY + 22)
    doc.setFont('helvetica', 'normal')
    doc.text('Semana/Mês do projeto;', 410, footerY + 22)

    doc.setFont('helvetica', 'bold')
    doc.text('HD/HR:', 390, footerY + 34)
    doc.setFont('helvetica', 'normal')
    doc.text('Quantidade de HD ou horas utilizadas para atividade.', 426, footerY + 34, { maxWidth: 130 })
  }

  const mmYYYY = new Date(filtros.ano, filtros.mes - 1).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }).replace('/', '.')
  const safeName = filtros.elaborador.toUpperCase().replace(/[^A-Z0-9 \-]/g, '')
  const fileName = `${safeName} - RELATÓRIO DE ATIVIDADES - ${mmYYYY}.pdf`

  return {
    fileName,
    base64: doc.output('datauristring')
  }
}
