import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function formatWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  const numbersOnly = phone.replace(/\D/g, '')
  if (numbersOnly.length < 10) return null
  if (numbersOnly.startsWith('55')) return numbersOnly
  return `55${numbersOnly}`
}

// Essa rota deve ser acionada por um CRON Job externo todos os dias (ex: 08:00 AM)
export async function GET(request: Request) {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_ANIVERSARIO
    if (!webhookUrl) {
      return NextResponse.json({ success: false, message: 'N8N_WEBHOOK_ANIVERSARIO não configurado.' }, { status: 400 })
    }

    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1
    const diaAtual = hoje.getDate()

    // 1. Busca todos os técnicos ativos que possuem data de nascimento
    const tecnicos = await prisma.tecnico.findMany({
      where: { 
        ativo: true,
        dataNascimento: { not: null }
      },
      select: {
        id: true,
        nome: true,
        telefone: true,
        dataNascimento: true
      }
    })

    // 2. Filtra em memória os que fazem aniversário hoje
    const aniversariantes = tecnicos.filter(tec => {
      if (!tec.dataNascimento) return false
      return tec.dataNascimento.getUTCDate() === diaAtual && (tec.dataNascimento.getUTCMonth() + 1) === mesAtual
    })

    if (aniversariantes.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum aniversariante hoje.' })
    }

    // 3. Dispara o webhook para cada um
    let enviados = 0
    let falhas = 0

    for (const tec of aniversariantes) {
      const payload = {
        tecnicoId: tec.id,
        nome: tec.nome.split(' ')[0],
        nomeCompleto: tec.nome,
        NumeroDestino: formatWhatsAppNumber(tec.telefone),
        dataNascimento: tec.dataNascimento?.toISOString().split('T')[0],
        mensagemSugerida: `Feliz aniversário, ${tec.nome.split(' ')[0]}! 🎂🎉 Desejamos muita saúde, paz e sucesso hoje e sempre.`
      }

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)

        if (res.ok) enviados++
        else falhas++
      } catch (err) {
        console.error(`Falha ao enviar webhook de aniversário para ${tec.nome}`, err)
        falhas++
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Webhooks processados. Enviados: ${enviados}. Falhas: ${falhas}.`
    })

  } catch (error: any) {
    console.error('Erro no CRON de Aniversários:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
