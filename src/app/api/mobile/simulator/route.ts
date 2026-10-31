import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const htmlPath = path.join(process.cwd(), 'app-celular', 'index.html')
    if (!fs.existsSync(htmlPath)) {
      return new NextResponse('Simulador index.html não encontrado em app-celular/index.html', {
        status: 404,
      })
    }
    const html = fs.readFileSync(htmlPath, 'utf-8')
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    return new NextResponse('Erro ao carregar simulador: ' + (err?.message || err), {
      status: 500,
    })
  }
}

