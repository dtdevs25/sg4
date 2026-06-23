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
    
    const atas = await prisma.ataReuniao.findMany({ select: { data: true } })
    atas.forEach(a => anos.add(a.data.getFullYear()))
    
    const kms = await prisma.quilometragem.findMany({ select: { dataInicial: true, dataFinal: true } })
    kms.forEach(k => {
      if (k.dataInicial) anos.add(k.dataInicial.getFullYear())
      if (k.dataFinal) anos.add(k.dataFinal.getFullYear())
    })
    
    const abs = await prisma.abastecimento.findMany({ select: { data: true } })
    abs.forEach(a => anos.add(a.data.getFullYear()))
    
    const man = await prisma.manutencaoVeiculo.findMany({ select: { dataManutencao: true } })
    man.forEach(m => anos.add(m.dataManutencao.getFullYear()))
    
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

    const atividades = await prisma.atividade.findMany({ select: { ano: true } })
    atividades.forEach(a => anos.add(a.ano))
  } catch (err) {
    console.error('Erro ao buscar anos com dados:', err)
  }

  return Array.from(anos).sort((a,b) => b - a)
}
