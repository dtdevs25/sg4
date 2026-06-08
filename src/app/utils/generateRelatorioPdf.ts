import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function gerarPdfRelatorio(
  atividades: any[],
  filtros: { mes: number, ano: number, empresa: string, elaborador: string }
) {
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
  const projeto = atividades.length > 0 ? atividades[0].projeto : '-'

  // A borda da tabela começará em Y=165 na primeira página e Y=110 nas demais.
  // Vamos desenhar o cabeçalho no final, para todas as páginas.

  // O cabeçalho completo (FO 40 + Info Gerais) será desenhado no loop no final, em todas as páginas.
  // Função auxiliar para desenhar a grade de Informações Gerais
  const drawInfoRow = (y: number, items: { wTitle: number, title: string, wValue: number, value: string, offsetX: number }[]) => {
    items.forEach(item => {
      // Caixa do Título
      doc.setDrawColor(0)
      doc.setLineWidth(0.5)
      doc.setFillColor(240, 240, 240)
      doc.rect(item.offsetX, y, item.wTitle, 16, 'FD')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(item.title, item.offsetX + (item.wTitle / 2), y + 11, { align: 'center' })

      // Caixa do Valor
      doc.setFillColor(255, 255, 255)
      doc.rect(item.offsetX + item.wTitle, y, item.wValue, 16, 'FD')
      doc.setFont('helvetica', 'normal')
      doc.text(item.value, item.offsetX + item.wTitle + 6, y + 11)
    })
  }
  // Função auxiliar para desenhar imagens mantendo proporção (evita esticar)
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
      doc.addImage(base64, props.fileType || 'PNG', finalX, finalY, finalW, finalH, undefined, 'FAST')
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
  const tableData = atividades.map(a => [
    new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
    a.local,
    a.cidadeUf,
    a.fotoBase64 ? '' : 'NÃO SE APLICA', // Célula vazia para podermos desenhar a imagem por cima
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
    margin: { top: 185, bottom: 90, left: 40, right: 40 },
    styles: { fontSize: 8, cellPadding: 4, valign: 'middle', lineColor: [0, 0, 0], lineWidth: 0.5 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.5 },
    columnStyles: {
      0: { cellWidth: 55, halign: 'center' },
      1: { cellWidth: 70, halign: 'center' },
      2: { cellWidth: 70, halign: 'center' },
      3: { cellWidth: 140, halign: 'center' },
      4: { cellWidth: 'auto' }
    },
    didParseCell: function(data) {
      // Força a altura mínima da célula para caber a foto
      if (data.section === 'body' && data.column.index === 3) {
        const rowData = atividades[data.row.index]
        if (rowData && rowData.fotoBase64) {
          data.cell.styles.minCellHeight = 85
        }
      }
    },
    didDrawCell: function(data) {
      if (data.section === 'body' && data.column.index === 3) {
        const rowData = atividades[data.row.index]
        if (rowData && rowData.fotoBase64) {
          drawImageProp(rowData.fotoBase64, data.cell.x + 4, data.cell.y + 4, data.cell.width - 8, data.cell.height - 8)
        }
      }
    }
  })

  // === FOOTER / VALIDAÇÃO NO RODAPÉ ===
  // O rodapé ficará sempre no final da última página, posição Y=720
  if ((doc as any).lastAutoTable.finalY > 700) {
    doc.addPage()
  }
  const footerY = 740

  // Caixa de Validação - Título
  doc.setDrawColor(0)
  doc.setLineWidth(0.5)
  doc.setFillColor(240, 240, 240)
  doc.rect(40, footerY, 340, 16, 'FD')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(120, 120, 120)
  doc.text('VALIDAÇÃO', 210, footerY + 11, { align: 'center' })

  // Caixa de Validação - Texto
  doc.setFillColor(255, 255, 255)
  doc.rect(40, footerY + 16, 340, 24, 'FD')
  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  doc.text('A validação deste Relatório é feita através da confirmação via e-mail.', 210, footerY + 32, { align: 'center' })

  // Legenda à direita
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  
  // "Legenda" com sublinhado
  doc.setFont('helvetica', 'bold')
  doc.text('Legenda', 390, footerY + 10)
  doc.line(390, footerY + 11, 425, footerY + 11)

  // Item S/M
  doc.text('S/M:', 390, footerY + 22)
  doc.setFont('helvetica', 'normal')
  doc.text('Semana/Mês do projeto;', 410, footerY + 22)

  // Item HD/HR (Com quebra de linha usando maxWidth)
  doc.setFont('helvetica', 'bold')
  doc.text('HD/HR:', 390, footerY + 34)
  doc.setFont('helvetica', 'normal')
  doc.text('Quantidade de HD ou horas utilizadas para atividade.', 426, footerY + 34, { maxWidth: 130 })

  // === CABEÇALHO EM TODAS AS PÁGINAS ===
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

    // Adiciona a logo colada à esquerda (Caixa: X=40 a 110)
    if (logoBase64) {
      drawImageProp(logoBase64, 42, 42, 66, 56)
    }

    // --- Repete as Informações Gerais (Empresa, Projeto, Elaborador) em cada página ---
    // Linha 1: Empresa
    drawInfoRow(115, [
      { offsetX: 40, wTitle: 70, title: 'EMPRESA:', wValue: 445, value: 'Telefônica Brasil S. A' }
    ])

    // Linha 2: Projeto e Período
    drawInfoRow(135, [
      { offsetX: 40, wTitle: 70, title: 'PROJETO:', wValue: 310, value: 'VIVO' },
      { offsetX: 430, wTitle: 60, title: 'PERÍODO:', wValue: 65, value: mesAno.replace('/', '.') }
    ])

    // Linha 3: Elaborador
    drawInfoRow(155, [
      { offsetX: 40, wTitle: 70, title: 'ELABORADOR:', wValue: 445, value: filtros.elaborador.toUpperCase() }
    ])
  }

  const mmYYYY = new Date(filtros.ano, filtros.mes - 1).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }).replace('/', '.')
  const safeName = filtros.elaborador.toUpperCase().replace(/[^A-Z0-9 \-]/g, '')
  doc.save(`${safeName} - RELATÓRIO DE ATIVIDADES - ${mmYYYY}.pdf`)
}
