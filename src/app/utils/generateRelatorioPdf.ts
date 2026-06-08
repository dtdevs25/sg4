import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function gerarPdfRelatorio(
  atividades: any[],
  filtros: { mes: number, ano: number, empresa: string, elaborador: string }
) {
  const doc = new jsPDF('p', 'pt', 'a4')

  const mesAno = new Date(filtros.ano, filtros.mes - 1).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
  const projeto = atividades.length > 0 ? atividades[0].projeto : '-'

  // === HEADER ===
  // Borda externa do header
  doc.rect(40, 40, 515, 60)
  
  // Linha separando a logo
  doc.line(140, 40, 140, 100)
  // Texto central
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PROCEDIMENTO TÉCNICO E GERENCIAL', 250, 65)
  doc.text('RELATÓRIO DE ATIVIDADES', 280, 80)
  
  // Linha separando as infos da direita
  doc.line(440, 40, 440, 100)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Revisão: 00', 445, 55)
  doc.line(440, 60, 555, 60)
  doc.text(`Data: ${mesAno}`, 445, 75)
  doc.line(440, 80, 555, 80)
  doc.text('Página: 1', 445, 95)

  // Opcional: Adicionar a logo se você tiver a base64 (você pode colocar depois)
  // doc.addImage(logoBase64, 'PNG', 45, 45, 90, 50)

  // === INFORMAÇÕES GERAIS ===
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
    styles: { fontSize: 8, cellPadding: 4, valign: 'middle' },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 50, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 70 },
      3: { cellWidth: 60, halign: 'center' },
      4: { cellWidth: 'auto' }
    },
    didDrawPage: function (data) {
      // Opcional: Footer em cada página se necessário
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

  doc.save(`Relatorio_${filtros.empresa.replace(/[^a-z0-9]/gi, '_')}_${mesAno.replace('/', '-')}.pdf`)
}
