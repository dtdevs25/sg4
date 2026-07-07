import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const PURPLE = [102, 0, 153] as [number, number, number]
const WHITE  = [255, 255, 255] as [number, number, number]
const DARK   = [30, 41, 59] as [number, number, number]

async function loadLogo(src: string, makeWhite: boolean = false): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = src
    img.onload = () => {
      const MAX_W = 200
      const scale = img.width > MAX_W ? MAX_W / img.width : 1
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const ctx = c.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h)
        if (makeWhite) {
          ctx.globalCompositeOperation = 'source-in'
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, w, h)
        }
      }
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => resolve('')
  })
}

function cleanHtml(html: string): string {
  if (!html) return ''
  let text = html
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<[^>]+>/g, '')
  
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
  
  return text.trim()
}

export async function gerarPdfAta(opts: {
  data: string
  assunto: string
  conteudo: string
  anexoNome?: string
  presencas: {
    tecnico: { nome: string }
    presenca: string
    pontualidade: string
    motivo?: string | null
    observacao?: string | null
  }[]
}) {
  const [sg4, vivo] = await Promise.all([loadLogo('/logo.png', true), loadLogo('/logovivo.png', true)])
  const doc = new jsPDF('p', 'pt', 'a4') // Portrait A4: 595 x 842 pt
  const W = 595
  const H = 842

  // 1. Desenhar o Cabeçalho Roxo
  doc.setFillColor(...PURPLE)
  doc.rect(30, 30, W - 60, 60, 'F')

  let logoX = 45

  // SG4 Logo
  if (sg4) {
    try {
      const props = doc.getImageProperties(sg4)
      const ratio = props.width / props.height
      const h = 28
      const w = h * ratio
      doc.addImage(sg4, 'PNG', logoX, 46, w, h)
      logoX += w + 12
    } catch {}
  }

  // Divisor
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.8)
  doc.line(logoX, 46, logoX, 74)
  logoX += 12

  // Vivo Logo
  if (vivo) {
    try {
      const props = doc.getImageProperties(vivo)
      const ratio = props.width / props.height
      const h = 20
      const w = h * ratio
      doc.addImage(vivo, 'PNG', logoX, 50, w, h)
    } catch {}
  }

  // Título e Assunto
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...WHITE)
  doc.text('ATA DE REUNIÃO', W - 45, 56, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(230, 230, 230)
  const assuntoTruncated = opts.assunto.length > 40 ? opts.assunto.slice(0, 37) + '...' : opts.assunto
  doc.text(assuntoTruncated.toUpperCase(), W - 45, 72, { align: 'right' })

  // 2. Data e Hora da Reunião
  let y = 120
  const rawDate = new Date(opts.data)
  const dateFmt = rawDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  const timeFmt = rawDate.toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...DARK)
  doc.text(`Data e Hora: ${dateFmt} às ${timeFmt}`, 30, y)

  y += 24

  // 3. Tópicos Abordados (Conteúdo)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...PURPLE)
  doc.text('TÓPICOS ABORDADOS', 30, y)
  
  doc.setDrawColor(...PURPLE)
  doc.setLineWidth(1)
  doc.line(30, y + 4, W - 30, y + 4)

  y += 20

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(50, 50, 50)

  const cleanedText = cleanHtml(opts.conteudo)
  const lines = doc.splitTextToSize(cleanedText, W - 60)
  const lineHeight = 15
  const pageLimit = H - 50

  for (const line of lines) {
    if (y > pageLimit) {
      doc.addPage()
      y = 50
    }
    doc.text(line, 30, y)
    y += lineHeight
  }

  if (opts.anexoNome) {
    y += 10
    if (y > pageLimit - 30) {
      doc.addPage()
      y = 50
    }
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(30, y, W - 60, 26, 4, 4, 'FD')
    
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PURPLE)
    doc.text('Anexo:', 38, y + 16)
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(70, 70, 70)
    doc.text(opts.anexoNome, 80, y + 16)
    y += 40
  } else {
    y += 20
  }

  // 4. Controle de Presença
  if (y > pageLimit - 80) {
    doc.addPage()
    y = 50
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...PURPLE)
  doc.text('CONTROLE DE PRESENÇA', 30, y)
  
  doc.setDrawColor(...PURPLE)
  doc.setLineWidth(1)
  doc.line(30, y + 4, W - 30, y + 4)

  autoTable(doc, {
    theme: 'grid',
    startY: y + 12,
    head: [['Técnico', 'Presença', 'Pontualidade', 'Observação']],
    body: opts.presencas.map(p => [
      p.tecnico.nome,
      p.presenca,
      p.presenca === 'PRESENTE' ? p.pontualidade.replace('_', ' ') : '-',
      p.motivo || p.observacao || '-'
    ]),
    styles: { fontSize: 8, cellPadding: 4.5, valign: 'middle', lineColor: [220, 220, 220], lineWidth: 0.3, textColor: [30, 41, 59] },
    headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 30, right: 30 }
  })

  // Rodapé em todas as páginas
  const total = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(`Página ${p} de ${total}`, W / 2, H - 20, { align: 'center' })
  }

  const safeSubject = opts.assunto.replace(/[^a-zA-Z0-9 \-]/g, '').slice(0, 30)
  const fn = `Ata de Reunião - ${safeSubject} - ${dateFmt.replace(/\//g, '.')}.pdf`

  return {
    fileName: fn,
    doc
  }
}
