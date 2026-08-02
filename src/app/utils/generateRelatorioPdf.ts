import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Normaliza a orientação de uma imagem base64 usando o canvas do browser.
 *
 * POR QUÊ ISSO FUNCIONA:
 *   O backend converte a foto do MinIO para base64 preservando os bytes JPEG
 *   originais, incluindo o metadado EXIF de orientação. Quando carregamos esse
 *   base64 em um <img>, o browser (Chrome 81+, Firefox, Safari) lê o EXIF e
 *   renderiza a imagem já corrigida. Ao redesenhar no canvas com ctx.drawImage()
 *   capturamos os pixels já na orientação correta e exportamos um novo JPEG sem
 *   EXIF — que o jsPDF pode embutir no PDF sem distorções.
 *
 * FIX #1: Imagens de cabeça para baixo.
 */
async function normalizeImageOrientation(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        // naturalWidth/naturalHeight refletem as dimensões APÓS o browser
        // aplicar a rotação EXIF (ex: foto tirada em portrait fica w<h).
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(base64); return }

        ctx.drawImage(img, 0, 0)

        // Exporta como JPEG sem EXIF, pixels já corretamente orientados.
        resolve(canvas.toDataURL('image/jpeg', 0.92))
      } catch {
        resolve(base64)
      }
    }

    img.onerror = () => resolve(base64)

    // Atribui DEPOIS de definir os handlers para garantir que o evento
    // onload dispara mesmo se a imagem estiver em cache.
    img.src = base64
  })
}

// ─── Gerador Principal ───────────────────────────────────────────────────────

export async function gerarPdfRelatorio(
  atividades: any[],
  filtros: { mes: number, ano: number, empresa: string, elaborador: string }
) {
  // FIX #1: Normaliza a orientação EXIF de todas as fotos em paralelo
  // antes de qualquer geração de PDF.
  const atividadesCorrigidas = await Promise.all(
    atividades.map(async (a) => {
      if (!a.fotoBase64) return a
      const fotoCorrigida = await normalizeImageOrientation(a.fotoBase64)
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
   * FIX #2: Centraliza dentro do espaço disponível para que todas as
   * imagens — incluindo a da última linha — fiquem do mesmo tamanho visual.
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
      doc.addImage(base64, 'JPEG', finalX, finalY, finalW, finalH, undefined, 'FAST')
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
  const FOTO_CELL_HEIGHT = 90

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

  autoTable(doc, {
    startY: 205,
    head: [['DATA', 'LOCAL', 'CIDADE/UF', 'REGISTRO (FOTO)', 'ATIVIDADE']],
    body: tableData,
    theme: 'grid',
    // FIX #2: evita que linhas sejam cortadas no meio de uma página
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
      // FIX #3: largura explícita + quebra de linha na coluna de descrição
      4: { cellWidth: COL_DESCRICAO_W, overflow: 'linebreak', halign: 'left' },
    },
    didParseCell: function(data) {
      // FIX #2: altura mínima uniforme para células de foto
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
