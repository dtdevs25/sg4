'use server'

import { prisma } from '@/lib/db'

function formatWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  const numbersOnly = phone.replace(/\D/g, '')
  if (numbersOnly.length < 10) return null
  if (numbersOnly.startsWith('55')) return numbersOnly
  return `55${numbersOnly}`
}

export async function testN8NAniversarioWebhook(telefoneDestino?: string, tecnicoId?: string) {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_ANIVERSARIO
    if (!webhookUrl) {
      return { success: false, error: 'A variável N8N_WEBHOOK_ANIVERSARIO não está configurada.' }
    }

    let tec;
    if (tecnicoId) {
      tec = await prisma.tecnico.findUnique({
        where: { id: tecnicoId },
        select: { id: true, nome: true, telefone: true, dataNascimento: true }
      })
    }

    if (!tec) {
      tec = await prisma.tecnico.findFirst({
        where: { ativo: true, dataNascimento: { not: null } },
        select: { id: true, nome: true, telefone: true, dataNascimento: true }
      })
    }

    const nomeTecnico = tec?.nome || 'Técnico Teste'
    const telefoneFinal = telefoneDestino || tec?.telefone || '11999999999'

    const payload = {
      tecnicoId: tec?.id || 'teste-aniversario',
      nome: nomeTecnico.split(' ')[0], // Apenas o primeiro nome
      nomeCompleto: nomeTecnico,
      NumeroDestino: formatWhatsAppNumber(telefoneFinal),
      dataNascimento: tec?.dataNascimento ? tec.dataNascimento.toISOString().split('T')[0] : '1990-01-01',
      mensagemSugerida: `Feliz aniversário, ${nomeTecnico.split(' ')[0]}! 🎂🎉 Desejamos muita saúde, paz e sucesso hoje e sempre.`
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      return { success: false, error: `N8N retornou status de erro: ${res.status}` }
    }

    return { success: true }
  } catch (error) {
    console.error('Erro ao testar webhook de aniversário:', error)
    return { success: false, error: 'Falha ao conectar na URL do webhook.' }
  }
}
