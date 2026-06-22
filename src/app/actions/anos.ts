'use server'

import { prisma } from '@/lib/db'

export async function getAnosComDados() {
  const anos = new Set<number>()
  anos.add(new Date().getFullYear())

  try {
    const relatorios = await prisma.relatorioAtividade.findMany({ select: { data: true } })
    relatorios.forEach(r => anos.add(r.data.getFullYear()))
    
    const reunioes = await prisma.reuniao.findMany({ select: { data: true } })
    reunioes.forEach(r => anos.add(r.data.getFullYear()))
    
    const atas = await prisma.ata.findMany({ select: { data: true } })
    atas.forEach(a => anos.add(a.data.getFullYear()))
    
    const kms = await prisma.quilometragem.findMany({ select: { dataHora: true } })
    kms.forEach(k => anos.add(k.dataHora.getFullYear()))
    
    const abs = await prisma.abastecimento.findMany({ select: { dataHora: true } })
    abs.forEach(a => anos.add(a.dataHora.getFullYear()))
    
    const man = await prisma.manutencao.findMany({ select: { dataHora: true } })
    man.forEach(m => anos.add(m.dataHora.getFullYear()))
    
    const dss = await prisma.dssArkium.findMany({ select: { dataFechamento: true } })
    dss.forEach(d => {
        if (!d.dataFechamento) return;
        const parts = d.dataFechamento.split('/')
        if (parts.length >= 3) {
            let y = parseInt(parts[2], 10)
            if (parts[2].length === 2) y += 2000
            if (y > 2000 && y < 2100) anos.add(y)
        } else if (d.dataFechamento.includes('-')) {
            const parts = d.dataFechamento.split('-')
            if (parts.length >= 3) {
                let y = parseInt(parts[0], 10)
                if (y > 2000 && y < 2100) anos.add(y)
            }
        } else {
            const num = Number(d.dataFechamento)
            if (!isNaN(num) && num > 20000) {
                const date = new Date(Math.round((num - 25569) * 86400 * 1000))
                anos.add(date.getUTCFullYear())
            }
        }
    })
    
    const insp = await prisma.inspecoesArkium.findMany({ select: { dataAbertura: true, dataFechamento: true } })
    insp.forEach(i => {
        const dStr = i.dataAbertura || i.dataFechamento
        if (!dStr) return;
        const parts = dStr.split('/')
        if (parts.length >= 3) {
            let y = parseInt(parts[2], 10)
            if (parts[2].length === 2) y += 2000
            if (y > 2000 && y < 2100) anos.add(y)
        } else if (dStr.includes('-')) {
            const parts = dStr.split('-')
            if (parts.length >= 3) {
                let y = parseInt(parts[0], 10)
                if (y > 2000 && y < 2100) anos.add(y)
            }
        } else {
            const num = Number(dStr)
            if (!isNaN(num) && num > 20000) {
                const date = new Date(Math.round((num - 25569) * 86400 * 1000))
                anos.add(date.getUTCFullYear())
            }
        }
    })

    const ativMes = await prisma.atividadeMes.findMany({ select: { ano: true } })
    ativMes.forEach(a => anos.add(a.ano))
  } catch (err) {
    console.error('Erro ao buscar anos com dados:', err)
  }

  return Array.from(anos).sort((a,b) => b - a)
}
