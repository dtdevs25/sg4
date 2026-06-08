import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function gerarPdfRelatorio(
  atividades: any[],
  filtros: { mes: number, ano: number, empresa: string, elaborador: string }
) {
  const doc = new jsPDF('p', 'pt', 'a4')

  const mesAno = new Date(filtros.ano, filtros.mes - 1).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
  const projeto = atividades.length > 0 ? atividades[0].projeto : '-'

  // A borda da tabela começará em Y=160 na primeira página e Y=110 nas demais.
  // Vamos desenhar o cabeçalho no final, para todas as páginas.

  // === INFORMAÇÕES GERAIS (Página 1) ===
  doc.rect(40, 110, 515, 40)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`Empresa: ${filtros.empresa}`, 45, 125)
  doc.text(`Projeto: ${projeto}`, 45, 140)
  doc.text(`Data: ${mesAno}`, 250, 140)
  doc.text(`Elaborador: ${filtros.elaborador}`, 380, 140)

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
    startY: 160,
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
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'bold')
    
    doc.text('Revisão:', 445, 54)
    doc.setFont('helvetica', 'normal')
    doc.text('05', 545, 54, { align: 'right' })
    
    doc.setFont('helvetica', 'bold')
    doc.text('Data Revisão:', 445, 74)
    doc.setFont('helvetica', 'normal')
    doc.text('06/09/2024', 545, 74, { align: 'right' })
    
    doc.setFont('helvetica', 'bold')
    doc.text('Página:', 445, 94)
    doc.setFont('helvetica', 'normal')
    doc.text(`${i} de ${pageCount}`, 545, 94, { align: 'right' })

    // Opcional: Adicionar a imagem da logo SG4 no espaço da esquerda
    // const logoBase64 = "..."
    // doc.addImage(logoBase64, 'PNG', 45, 45, 90, 50)
  }

  const mmYYYY = new Date(filtros.ano, filtros.mes - 1).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }).replace('/', '.')
  const safeName = filtros.elaborador.toUpperCase().replace(/[^A-Z0-9 \-]/g, '')
  doc.save(`${safeName} - RELATÓRIO DE ATIVIDADES - ${mmYYYY}.pdf`)
}
