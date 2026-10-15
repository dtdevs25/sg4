import { NextResponse } from 'next/server'
import { isPenultimoDiaUtil } from '@/lib/businessDays'
import { dispararNotificacaoPrevisaoDepositos } from '@/app/actions/abastecimentoOrcamento'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    const hoje = new Date()
    const ehPenultimo = isPenultimoDiaUtil(hoje)

    if (!ehPenultimo && !force) {
      return NextResponse.json({
        executado: false,
        motivo: 'Hoje não é o penúltimo dia útil do mês.',
        data: hoje.toISOString(),
      })
    }

    const resultado = await dispararNotificacaoPrevisaoDepositos(force)

    return NextResponse.json({
      executado: true,
      data: hoje.toISOString(),
      resultado,
    })
  } catch (error: any) {
    console.error('Erro no cron de previsão de abastecimento:', error)
    return NextResponse.json(
      {
        executado: false,
        error: error.message || 'Erro interno no cron de previsão de abastecimento.',
      },
      { status: 500 }
    )
  }
}
