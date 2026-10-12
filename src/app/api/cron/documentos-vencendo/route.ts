import { NextResponse } from 'next/server'
import { verificarENotificarDocumentosVencendo } from '@/app/actions/documentosTecnicos'

// Esta rota pode ser acionada por um CRON Job diário (ex: via N8N, cron-job.org ou serviço agendado)
// GET /api/cron/documentos-vencendo
export async function GET(request: Request) {
  try {
    const resultado = await verificarENotificarDocumentosVencendo()
    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error('Erro na API Cron de documentos a vencer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
