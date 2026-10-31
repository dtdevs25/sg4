import { NextResponse } from 'next/server'
import { isAntepenultimoDiaUtil, isJanelaAntepenultimoDiaUtil } from '@/lib/businessDays'
import { dispararNotificacaoPrevisaoDepositos } from '@/app/actions/abastecimentoOrcamento'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'
    const catchup = searchParams.get('catchup') !== 'false'

    const hoje = new Date()
    const ehAntepenultimo = isAntepenultimoDiaUtil(hoje)
    const ehJanela = catchup && isJanelaAntepenultimoDiaUtil(hoje)

    if (!ehAntepenultimo && !ehJanela && !force) {
      return NextResponse.json({
        executado: false,
        motivo: 'Hoje não é o antepenúltimo dia útil do mês.',
        data: hoje.toISOString(),
      })
    }

    const resultado = await dispararNotificacaoPrevisaoDepositos(force, ehJanela)

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
