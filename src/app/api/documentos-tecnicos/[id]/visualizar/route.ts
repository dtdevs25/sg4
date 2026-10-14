import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import s3Client from '@/lib/s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'

const BUCKET_DOCUMENTOS = process.env.S3_BUCKET_DOCUMENTOS || 'sg4-docststs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse('Não autorizado', { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return new NextResponse('Identificador inválido', { status: 400 })
    }

    let doc: any = await prisma.documentoTecnico.findUnique({
      where: { id },
      include: {
        tecnico: { select: { id: true, nome: true } },
        tipoDocumento: { select: { nome: true } },
      },
    })

    if (!doc) {
      const hist = await prisma.documentoTecnicoHistorico.findUnique({
        where: { id },
        include: {
          documentoTecnico: {
            include: {
              tecnico: { select: { id: true, nome: true } },
              tipoDocumento: { select: { nome: true } },
            },
          },
        },
      })
      if (hist) {
        doc = {
          ...hist,
          tecnicoId: hist.documentoTecnico?.tecnicoId,
        }
      }
    }

    if (!doc || !doc.arquivoUrl) {
      return new NextResponse('Documento não encontrado', { status: 404 })
    }

    // Validação de acesso por perfil
    const role = (session.user as any)?.role
    const userTecnicoId = (session.user as any)?.tecnicoId
    if (role === 'TST' && userTecnicoId && doc.tecnicoId !== userTecnicoId) {
      return new NextResponse('Acesso restrito ao titular do documento', { status: 403 })
    }

    // Extrai a chave S3
    const marker = `/${BUCKET_DOCUMENTOS}/`
    let key = ''
    if (doc.arquivoUrl.includes(marker)) {
      key = decodeURIComponent(doc.arquivoUrl.split(marker)[1])
    } else {
      const parts = doc.arquivoUrl.split('/')
      key = decodeURIComponent(parts.slice(-2).join('/'))
    }

    let buffer: Buffer | null = null
    let contentType = 'application/pdf'

    if (key) {
      try {
        const cmd = new GetObjectCommand({
          Bucket: BUCKET_DOCUMENTOS,
          Key: key,
        })
        const s3Res = await s3Client.send(cmd)
        if (s3Res.ContentType) {
          contentType = s3Res.ContentType
        }
        if (s3Res.Body) {
          const bytes = await s3Res.Body.transformToByteArray()
          buffer = Buffer.from(bytes)
        }
      } catch (err) {
        console.warn('Tentativa via SDK falhou, usando fallback fetch:', err)
      }
    }

    // Fallback: se o SDK direto falhar, busca na URL interna
    if (!buffer) {
      const resp = await fetch(doc.arquivoUrl)
      if (!resp.ok) {
        return new NextResponse('Arquivo indisponível no servidor de armazenamento', { status: 502 })
      }
      contentType = resp.headers.get('content-type') || 'application/pdf'
      buffer = Buffer.from(await resp.arrayBuffer())
    }

    const safeFileName = (doc.arquivoNome || 'documento.pdf').replace(/["\r\n]/g, '')
    const isDownload = req.nextUrl.searchParams.get('download') === '1'
    const disposition = isDownload ? 'attachment' : 'inline'

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${safeFileName}"`,
        'Cache-Control': 'private, max-age=1800',
      },
    })
  } catch (error) {
    console.error('Erro na rota segura de visualização de documento:', error)
    return new NextResponse('Erro interno ao carregar documento', { status: 500 })
  }
}
