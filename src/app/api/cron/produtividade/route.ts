import { NextResponse } from 'next/server'
import { dispararRelatorioProdutividadeMensal } from '@/lib/cronProdutividade'

export const dynamic = 'force-dynamic'

// Esta rota pode ser acionada por um CRON Job externo ou pelo agendador interno do servidor.
// O script verifica se hoje é o 1º dia útil do mês (no fuso America/Sao_Paulo) e garante idempotência.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'
    const catchup = searchParams.get('catchup') !== 'false'

    const resultado = await dispararRelatorioProdutividadeMensal(force, catchup)

    return NextResponse.json({
      ...resultado,
      data: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Erro no CRON de Produtividade:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno no CRON de Produtividade.' },
      { status: 500 }
    )
  }
}
