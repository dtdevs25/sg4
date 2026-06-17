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

async function loadLogo(src: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = src
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      c.getContext('2d')?.drawImage(img, 0, 0)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => resolve('')
  })
}

function drawHeader(doc: jsPDF, sg4: string, vivo: string, titulo: string, sub: string, autor: string, p: number, total: number) {
  const W = 595
  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, W, 72, 'F')
  if (sg4)  { try { doc.addImage(sg4,  'PNG', 12, 10, 50, 50) } catch {} }
  if (vivo) { try { doc.addImage(vivo, 'PNG', W - 70, 20, 58, 28) } catch {} }
  doc.setFont('helvetica', 'bold');   doc.setFontSize(13); doc.setTextColor(...WHITE)
  doc.text(titulo.toUpperCase(), W / 2, 25, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  doc.text(sub, W / 2, 38, { align: 'center' })
  doc.text(`Gerado em: ${fmtDateTime(new Date().toISOString())}  ·  por ${autor}`, W / 2, 51, { align: 'center' })
  doc.text(`Pág. ${p} / ${total}`, W - 14, 64, { align: 'right' })
  doc.setDrawColor(...WHITE); doc.setLineWidth(0.4); doc.line(14, 67, W - 14, 67)
}

function drawFooter(doc: jsPDF) {
  doc.setFillColor(...PURPLE)
  doc.rect(0, 818, 595, 24, 'F')
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...WHITE)
  doc.text('SG4 – Sistema de Gestão de Segurança do Trabalho  |  Documento gerado automaticamente', 297.5, 832, { align: 'center' })
}

export async function gerarPdfCentral(opts: {
  titulo: string
  subtitulo: string
  geradoPor: string
  headers: string[]
  rows: (string | number)[][]
  resumo?: { label: string; valor: string; pct?: number }[]
}) {
  const [sg4, vivo] = await Promise.all([loadLogo('/logo.png'), loadLogo('/logovivo.png')])
  const doc = new jsPDF('p', 'pt', 'a4')
  const W = 595

  let startY = 80

  if (opts.resumo?.length) {
    doc.setFillColor(...GRAY_BG)
    doc.rect(14, startY, W - 28, 16, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...PURPLE)
    doc.text('SUMÁRIO DO PERÍODO', 20, startY + 11)
    startY += 20

    const cols = Math.min(opts.resumo.length, 4)
    const colW = (W - 28) / cols
    opts.resumo.forEach((item, i) => {
      const col = i % 4; const row = Math.floor(i / 4)
      const x = 14 + col * colW; const y = startY + row * 50
      doc.setFillColor(...WHITE); doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.4)
      doc.roundedRect(x + 2, y, colW - 4, 44, 3, 3, 'FD')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...PURPLE)
      doc.text(item.valor, x + colW / 2, y + 18, { align: 'center' })
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139)
      doc.text(item.label, x + colW / 2, y + 30, { align: 'center' })
      if (item.pct !== undefined) {
        const bW = colW - 20
        doc.setFillColor(220, 220, 220); doc.roundedRect(x + 10, y + 36, bW, 4, 2, 2, 'F')
        doc.setFillColor(...PURPLE); doc.roundedRect(x + 10, y + 36, bW * (Math.min(item.pct, 100) / 100), 4, 2, 2, 'F')
      }
    })
    startY += Math.ceil(opts.resumo.length / 4) * 50 + 8
  }

  autoTable(doc, {
    theme: 'grid',
    startY,
    head: [opts.headers],
    body: opts.rows,
    styles: { fontSize: 7.5, cellPadding: 3.5, valign: 'middle', lineColor: [220, 220, 220], lineWidth: 0.3, textColor: DARK },
    headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: GRAY_BG },
    margin: { top: 80, left: 14, right: 14, bottom: 28 },
    didDrawPage: () => {
      const info = (doc as any).internal
      drawHeader(doc, sg4, vivo, opts.titulo, opts.subtitulo, opts.geradoPor,
        info.getCurrentPageInfo().pageNumber, info.getNumberOfPages())
      drawFooter(doc)
    },
  })

  // repintar cabeçalho + rodapé em todas as páginas
  const total = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    drawHeader(doc, sg4, vivo, opts.titulo, opts.subtitulo, opts.geradoPor, p, total)
    drawFooter(doc)
  }

  const safe = opts.titulo.replace(/[^a-zA-Z0-9 \-]/g, '').slice(0, 50)
  const fn = `${safe} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '.')}.pdf`
  return { fileName: fn, base64: doc.output('datauristring') }
}
