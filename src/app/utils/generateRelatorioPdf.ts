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

  // === INFORMAÇÕES GERAIS (Página 1) ===
  const drawInfoRow = (y: number, items: { wTitle: number, title: string, wValue: number, value: string, offsetX: number }[]) => {
    items.forEach(item => {
      // Caixa do Título (Fundo cinza)
      doc.setDrawColor(0)
      doc.setFillColor(240, 240, 240)
      doc.rect(item.offsetX, y, item.wTitle, 16, 'FD')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(item.title, item.offsetX + (item.wTitle / 2), y + 11, { align: 'center' })

      // Caixa do Valor (Fundo branco)
      doc.setFillColor(255, 255, 255)
      doc.rect(item.offsetX + item.wTitle, y, item.wValue, 16, 'FD')
      doc.setFont('helvetica', 'normal')
      doc.text(item.value, item.offsetX + item.wTitle + 6, y + 11)
    })
  }

  // Linha 1: Empresa
  drawInfoRow(105, [
    { offsetX: 40, wTitle: 70, title: 'EMPRESA:', wValue: 445, value: filtros.empresa }
  ])

  // Linha 2: Projeto e Período
  drawInfoRow(125, [
    { offsetX: 40, wTitle: 70, title: 'PROJETO:', wValue: 310, value: projeto },
    { offsetX: 430, wTitle: 60, title: 'PERÍODO:', wValue: 65, value: mesAno.replace('/', '.') }
  ])

  // Linha 3: Elaborador
  drawInfoRow(145, [
    { offsetX: 40, wTitle: 70, title: 'ELABORADOR:', wValue: 445, value: filtros.elaborador.toUpperCase() }
  ])
  // === TABELA ===
  const tableData = atividades.map(a => [
    new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
    a.local,
    a.cidadeUf,
    a.fotoUrl ? 'COM FOTO' : 'S/F', // Pode-se injetar a imagem depois, mas por texto é mais seguro contra CORS
    a.descricao
  ])

  if (tableData.length === 0) {
    tableData.push(['-', '-', '-', '-', 'Nenhuma atividade registrada no período.'])
  }

  autoTable(doc, {
    startY: 170,
    head: [['DATA', 'LOCAL', 'CIDADE/UF', 'REGISTRO', 'ATIVIDADE']],
    body: tableData,
    theme: 'grid',
    margin: { top: 110, bottom: 40, left: 40, right: 40 },
    styles: { fontSize: 8, cellPadding: 4, valign: 'middle' },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 50, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 70 },
      3: { cellWidth: 60, halign: 'center' },
      4: { cellWidth: 'auto' }
    }
  })

  // === FOOTER / ASSINATURAS ===
  let finalY = (doc as any).lastAutoTable.finalY + 30
  if (finalY > 700) {
    doc.addPage()
    finalY = 40
  }

  doc.rect(40, finalY, 515, 120)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('LEGENDA: C - Conforme / NC - Não Conforme / NA - Não se Aplica', 45, finalY + 15)

  doc.setFont('helvetica', 'normal')
  doc.text('1. As informações contidas neste relatório são verdadeiras?', 45, finalY + 35)
  doc.text('( X ) C       (  ) NC', 420, finalY + 35)
  doc.text('2. As atividades foram realizadas conforme procedimentos?', 45, finalY + 50)
  doc.text('( X ) C       (  ) NC', 420, finalY + 50)

  doc.line(100, finalY + 100, 250, finalY + 100)
  doc.text('Assinatura Elaborador', 135, finalY + 112)

  doc.line(350, finalY + 100, 450, finalY + 100)
  doc.text('Data', 390, finalY + 112)

  // === CABEÇALHO EM TODAS AS PÁGINAS ===
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    
    // Borda externa
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.rect(40, 40, 515, 60)
    
    // Separador esquerdo (Logo)
    doc.line(140, 40, 140, 100)
    
    // Separador direito (Info Box)
    doc.line(440, 40, 440, 100)
    
    // Linhas internas da direita
    doc.line(440, 60, 555, 60)
    doc.line(440, 80, 555, 80)
    
    // Textos do centro
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text('FO 40 - Relatório de Visita', 290, 74, { align: 'center' })
    
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

    // Adiciona a logo se carregada com sucesso
    if (logoBase64) {
      // Ajuste as dimensões da logo dentro do box 40x40 -> 140x100
      // Caixa tem larg 100, alt 60. Margem interna.
      doc.addImage(logoBase64, 'PNG', 50, 45, 80, 50, undefined, 'FAST')
    }
  }

  const mmYYYY = new Date(filtros.ano, filtros.mes - 1).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }).replace('/', '.')
  const safeName = filtros.elaborador.toUpperCase().replace(/[^A-Z0-9 \-]/g, '')
  doc.save(`${safeName} - RELATÓRIO DE ATIVIDADES - ${mmYYYY}.pdf`)
}
