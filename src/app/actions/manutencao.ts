'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { sendMail } from '@/lib/mail'

export async function getManutencoes(ano?: number, mes?: number, tecnicoId?: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const tId = (session.user as any).tecnicoId

    const where: any = {}
    if (role === 'TST') {
      where.tecnicoId = tId || 'unassigned'
    } else if (tecnicoId) {
      where.tecnicoId = tecnicoId
    }

    if (ano && !isNaN(ano)) {
      if (mes) {
        where.dataManutencao = { gte: new Date(ano, mes - 1, 1), lte: new Date(ano, mes, 0, 23, 59, 59) }
      } else {
        where.dataManutencao = { gte: new Date(ano, 0, 1), lte: new Date(ano, 11, 31, 23, 59, 59) }
      }
    }

    const data = await prisma.manutencaoVeiculo.findMany({
      where,
      include: { tecnico: { select: { nome: true, fotoUrl: true, ativo: true } } },
      orderBy: { dataManutencao: 'desc' }
    })

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao buscar manutenções:', error)
    return { success: false, error: 'Erro ao buscar manutenções' }
  }
}

export async function registrarManutencao(data: {
  tecnicoId: string
  kmManutencao: number
  dataManutencao: Date
  comprovanteUrl?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const item = await prisma.manutencaoVeiculo.create({
      data: {
        tecnicoId: data.tecnicoId,
        kmManutencao: data.kmManutencao,
        dataManutencao: data.dataManutencao,
        comprovanteUrl: data.comprovanteUrl
      }
    })

    await audit({ userId, action: 'REGISTRAR_MANUTENCAO', entity: 'ManutencaoVeiculo', entityId: item.id, details: { km: data.kmManutencao } })

    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao registrar manutenção:', error)
    return { success: false, error: 'Erro ao registrar manutenção' }
  }
}

export async function excluirManutencao(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') return { success: false, error: 'Sem permissão' }

    await prisma.manutencaoVeiculo.delete({ where: { id } })
    await audit({ userId, action: 'EXCLUIR_MANUTENCAO', entity: 'ManutencaoVeiculo', entityId: id })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir manutenção:', error)
    return { success: false, error: 'Erro ao excluir' }
  }
}

export async function checkMaintenanceAlert(tecnicoId: string, kmAtual: number) {
  try {
    const targetMilestone = Math.ceil(kmAtual / 10000) * 10000
    if (targetMilestone === 0) return // Sem marcos para 0 km

    const alertThreshold = targetMilestone - 1000

    // Se ainda não entrou na janela de alerta, não faz nada
    if (kmAtual < alertThreshold) return

    // Buscar técnico para ver o último alerta e email
    const tecnico = await prisma.tecnico.findUnique({
      where: { id: tecnicoId },
      include: { user: { select: { email: true } } }
    })
    
    if (!tecnico) return

    // Checar se já fez a manutenção para ESTE ciclo
    const manutencao = await prisma.manutencaoVeiculo.findFirst({
      where: {
        tecnicoId,
        kmManutencao: { gte: alertThreshold }
      }
    })

    if (manutencao) {
      // Manutenção já registrada, nada a fazer
      return
    }

    // Verificar se já mandamos email recentemente (a cada 100 km)
    const ultimoKmAlerta = tecnico.ultimoKmAlerta || 0
    if (ultimoKmAlerta > 0 && kmAtual - ultimoKmAlerta < 100) {
      // Já avisamos a menos de 100km atrás
      return
    }

    // Precisamos avisar!
    // Buscar e-mails da liderança (ADMIN / MASTER)
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MASTER'] }, active: true },
      select: { email: true }
    })

    const adminEmails = admins.map(a => a.email).filter(Boolean).join(',')
    const tecnicoEmail = tecnico.user?.email || tecnico.email

    let to = tecnicoEmail || 'sg4@ehspro.com.br'
    let cc = adminEmails

    const faltam = targetMilestone - kmAtual
    const subject = `⚠️ Alerta de Manutenção - Veículo de ${tecnico.nome}`
    
    const html = `
      <div style="font-family: sans-serif; color: #334155; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #f59e0b; padding: 16px; text-align: center;">
          <h2 style="color: #fff; margin: 0;">Lembrete de Manutenção Preventiva</h2>
        </div>
        <div style="padding: 24px;">
          <p>Olá,</p>
          <p>O veículo sob responsabilidade de <b>${tecnico.nome}</b> está se aproximando ou passou do marco de manutenção de <b>${targetMilestone.toLocaleString('pt-BR')} km</b>.</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><b>KM Atual:</b> ${kmAtual.toLocaleString('pt-BR')} km</p>
            <p style="margin: 0; color: ${faltam <= 0 ? '#ef4444' : '#f59e0b'}; font-weight: bold;">
              ${faltam <= 0 ? `Passou ${Math.abs(faltam).toLocaleString('pt-BR')} km da meta!` : `Faltam apenas ${faltam.toLocaleString('pt-BR')} km.`}
            </p>
          </div>
          <p>Por favor, agende a revisão e <b>registre no painel do sistema SG4</b> assim que for realizada para parar de receber estes alertas a cada 100 km.</p>
        </div>
      </div>
    `

    await sendMail({ to, cc, subject, html })

    // Atualizar o último km de alerta
    await prisma.tecnico.update({
      where: { id: tecnicoId },
      data: { ultimoKmAlerta: kmAtual }
    })

    console.log(`[MANUTENCAO] Alerta enviado para ${to} (CC: ${cc}). KM Atual: ${kmAtual}, Meta: ${targetMilestone}`)

  } catch (error) {
    console.error('Erro no disparador de alerta de manutenção:', error)
  }
}
