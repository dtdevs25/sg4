import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const PURPLE  = [102, 0, 153] as [number, number, number]
const WHITE   = [255, 255, 255] as [number, number, number]
const GRAY_BG = [245, 245, 248] as [number, number, number]
const DARK    = [30,  41,  59]  as [number, number, number]

export function fmtDate(iso: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) } catch { return iso }
}
export function fmtDateTime(iso: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) } catch { return iso }
}

async function loadLogo(src: string, makeWhite: boolean = false): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = src
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      const ctx = c.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        if (makeWhite) {
          ctx.globalCompositeOperation = 'source-in'
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, c.width, c.height)
        }
      }
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => resolve('')
  })
}

function drawHeader(doc: jsPDF, sg4: string, vivo: string, titulo: string) {
  const W = 842 // Landscape A4
  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, W, 60, 'F')
  
  let logoX = 20
  if (sg4) {
    try { doc.addImage(sg4, 'PNG', logoX, 10, 40, 40); logoX += 50 } catch {}
  }
  
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(1)
  doc.line(logoX, 14, logoX, 46)
  logoX += 12
  
  if (vivo) {
    try { doc.addImage(vivo, 'PNG', logoX, 18, 56, 26); logoX += 66 } catch {}
  }
  
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...WHITE)
  doc.text(titulo.toUpperCase(), W - 20, 35, { align: 'right' })
}

function drawFooter(doc: jsPDF, p: number, total: number) {
  const W = 842 // Landscape A4
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120)
  doc.text(`Página ${p} de ${total}`, W / 2, 575, { align: 'center' })
}

export async function gerarPdfCentral(opts: {
  titulo: string
  subtitulo: string // Agora será usado talvez na seção de Total ou Título da tabela
  geradoPor: string
  headers: string[]
  rows: (string | number)[][]
  resumo?: { label: string; valor: string; pct?: number }[]
  totalTexto?: string
}) {
  const [sg4, vivo] = await Promise.all([loadLogo('/logo.png', true), loadLogo('/logovivo.png', true)])
  const doc = new jsPDF('l', 'pt', 'a4') // Landscape
  const W = 842

  let startY = 76

  // Texto Total (Top)
  const textoTotal = opts.totalTexto ?? `Total: ${opts.rows.length} registro(s)`
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(50, 50, 50)
  doc.text(textoTotal, 14, startY)
  
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100)
  doc.text(opts.subtitulo, W - 14, startY, { align: 'right' })

  startY += 12

  if (opts.resumo?.length) {
    doc.setFillColor(...GRAY_BG)
    doc.rect(14, startY, W - 28, 16, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...PURPLE)
    doc.text('SUMÁRIO', 20, startY + 11)
    startY += 20

    const cols = Math.min(opts.resumo.length, 6)
    const colW = (W - 28) / cols
    opts.resumo.forEach((item, i) => {
      const col = i % cols; const row = Math.floor(i / cols)
      const x = 14 + col * colW; const y = startY + row * 44
      doc.setFillColor(...WHITE); doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.4)
      doc.roundedRect(x + 2, y, colW - 4, 38, 3, 3, 'FD')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...PURPLE)
      doc.text(item.valor, x + colW / 2, y + 16, { align: 'center' })
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139)
      doc.text(item.label, x + colW / 2, y + 26, { align: 'center' })
      if (item.pct !== undefined) {
        const bW = colW - 20
        doc.setFillColor(220, 220, 220); doc.roundedRect(x + 10, y + 32, bW, 3, 1.5, 1.5, 'F')
        doc.setFillColor(...PURPLE); doc.roundedRect(x + 10, y + 32, bW * (Math.min(item.pct, 100) / 100), 3, 1.5, 1.5, 'F')
      }
    })
    startY += Math.ceil(opts.resumo.length / cols) * 44 + 8
  }

  autoTable(doc, {
    theme: 'grid',
    startY,
    head: [opts.headers],
    body: opts.rows,
    styles: { fontSize: 7.5, cellPadding: 3.5, valign: 'middle', lineColor: [220, 220, 220], lineWidth: 0.3, textColor: DARK },
    headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: GRAY_BG },
    margin: { top: 76, left: 14, right: 14, bottom: 30 },
    didDrawPage: () => {
      const info = (doc as any).internal
      drawHeader(doc, sg4, vivo, opts.titulo)
      drawFooter(doc, info.getCurrentPageInfo().pageNumber, info.getNumberOfPages())
    },
  })

  // repintar cabeçalho + rodapé em todas as páginas para ter as numerações certas de total
  const total = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    drawHeader(doc, sg4, vivo, opts.titulo)
    drawFooter(doc, p, total)
  }

  const safe = opts.titulo.replace(/[^a-zA-Z0-9 \-]/g, '').slice(0, 50)
  const fn = `${safe} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '.')}.pdf`
  return { fileName: fn, base64: doc.output('datauristring') }
}
