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

    // Extrai o bucket e a chave S3 de forma flexível e robusta
    let bucket = BUCKET_DOCUMENTOS
    let key = ''

    try {
      if (doc.arquivoUrl.startsWith('http://') || doc.arquivoUrl.startsWith('https://')) {
        const parsed = new URL(doc.arquivoUrl)
        const segments = parsed.pathname.replace(/^\/+/, '').split('/')
        if (segments.length >= 2) {
          bucket = segments[0]
          key = decodeURIComponent(segments.slice(1).join('/'))
        } else if (segments.length === 1) {
          key = decodeURIComponent(segments[0])
        }
      } else {
        const parts = doc.arquivoUrl.replace(/^\/+/, '').split('?')[0].split('/')
        if (parts.length >= 2) {
          bucket = parts[0]
          key = decodeURIComponent(parts.slice(1).join('/'))
        } else {
          key = decodeURIComponent(parts[0])
        }
      }
    } catch {
      const marker = `/${BUCKET_DOCUMENTOS}/`
      if (doc.arquivoUrl.includes(marker)) {
        key = decodeURIComponent(doc.arquivoUrl.split(marker)[1].split('?')[0])
      } else {
        const parts = doc.arquivoUrl.split('?')[0].split('/')
        key = decodeURIComponent(parts.slice(-2).join('/'))
      }
    }

    let buffer: Buffer | null = null
    let contentType = 'application/pdf'

    // 1. Tentativa via AWS SDK (S3 / MinIO)
    if (key) {
      try {
        const cmd = new GetObjectCommand({
          Bucket: bucket,
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
      } catch (err: any) {
        console.warn(`Tentativa S3 SDK falhou para bucket "${bucket}" e key "${key}":`, err?.message || err)
        if (bucket !== BUCKET_DOCUMENTOS) {
          try {
            const fallbackCmd = new GetObjectCommand({
              Bucket: BUCKET_DOCUMENTOS,
              Key: key,
            })
            const s3Res = await s3Client.send(fallbackCmd)
            if (s3Res.ContentType) contentType = s3Res.ContentType
            if (s3Res.Body) {
              const bytes = await s3Res.Body.transformToByteArray()
              buffer = Buffer.from(bytes)
            }
          } catch (e2) {
            // Segue para os próximos fallbacks
          }
        }
      }
    }

    // 2. Fallback via HTTP fetch no servidor
    if (!buffer && (doc.arquivoUrl.startsWith('http://') || doc.arquivoUrl.startsWith('https://'))) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        const resp = await fetch(doc.arquivoUrl, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (resp.ok) {
          const ct = resp.headers.get('content-type')
          if (ct && ct !== 'application/octet-stream') contentType = ct
          buffer = Buffer.from(await resp.arrayBuffer())
        }
      } catch (fetchErr: any) {
        console.warn('Fallback fetch falhou:', fetchErr?.message || fetchErr)
      }
    }

    // 3. Fallback de Redirecionamento 302 direto para a URL do arquivo
    // Garante que, se o servidor interno não alcançar o MinIO (ex: rede Docker),
    // o próprio navegador do usuário consiga abrir o arquivo sem apresentar erro
    if (!buffer) {
      console.log('Servidor redirecionando cliente para arquivoUrl direto:', doc.arquivoUrl)
      return NextResponse.redirect(doc.arquivoUrl, 302)
    }

    const safeFileName = (doc.arquivoNome || 'documento.pdf').replace(/["\r\n]/g, '')
    const isDownload = req.nextUrl.searchParams.get('download') === '1'
    const disposition = isDownload ? 'attachment' : 'inline'

    if (!contentType || contentType === 'application/octet-stream') {
      const lower = safeFileName.toLowerCase()
      if (lower.endsWith('.pdf')) contentType = 'application/pdf'
      else if (lower.endsWith('.png')) contentType = 'image/png'
      else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) contentType = 'image/jpeg'
      else if (lower.endsWith('.webp')) contentType = 'image/webp'
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${safeFileName}"`,
        'Cache-Control': 'private, max-age=1800',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    })
  } catch (error) {
    console.error('Erro na rota segura de visualização de documento:', error)
    return new NextResponse('Erro interno ao carregar documento', { status: 500 })
  }
}
