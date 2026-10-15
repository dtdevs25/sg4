import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import s3Client from '@/lib/s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'

const BUCKET_PADRAO = (
  process.env.S3_BUCKET_DOCUMENTOS ||
  process.env.S3_BUCKET ||
  'sg4-docststs'
).trim()

function extractS3Candidates(arquivoUrl: string, defaultBucket: string): Array<{ bucket: string; key: string }> {
  const candidates: Array<{ bucket: string; key: string }> = []
  const cleanUrl = arquivoUrl.split('?')[0]

  let pathname = cleanUrl
  try {
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      const u = new URL(cleanUrl)
      pathname = u.pathname
    }
  } catch {}

  const normalizedPath = pathname.replace(/^\/+/, '')
  const parts = normalizedPath.split('/')

  // Caso 1: se contiver 'documentos-tecnicos/'
  const dtIdx = normalizedPath.indexOf('documentos-tecnicos/')
  if (dtIdx !== -1) {
    const keyFromDt = normalizedPath.substring(dtIdx)
    candidates.push({ bucket: defaultBucket, key: decodeURIComponent(keyFromDt) })
    candidates.push({ bucket: defaultBucket, key: keyFromDt })

    const prefix = normalizedPath.substring(0, dtIdx).replace(/\/+$/, '')
    if (prefix && prefix !== defaultBucket) {
      candidates.push({ bucket: prefix, key: decodeURIComponent(keyFromDt) })
      candidates.push({ bucket: prefix, key: keyFromDt })
    }
  }

  // Caso 2: primeiro segmento é o bucket, restante é a key
  if (parts.length >= 2) {
    const bucketFromUrl = parts[0]
    const keyFromUrl = parts.slice(1).join('/')
    candidates.push({ bucket: bucketFromUrl, key: decodeURIComponent(keyFromUrl) })
    candidates.push({ bucket: bucketFromUrl, key: keyFromUrl })
    if (bucketFromUrl !== defaultBucket) {
      candidates.push({ bucket: defaultBucket, key: decodeURIComponent(keyFromUrl) })
      candidates.push({ bucket: defaultBucket, key: keyFromUrl })
    }
  }

  // Caso 3: todo o path é a chave dentro do bucket padrão
  candidates.push({ bucket: defaultBucket, key: decodeURIComponent(normalizedPath) })
  candidates.push({ bucket: defaultBucket, key: normalizedPath })

  // Remove duplicados
  const seen = new Set<string>()
  return candidates.filter((c) => {
    if (!c.bucket || !c.key) return false
    const k = `${c.bucket}:::${c.key}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

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

    let buffer: Buffer | null = null
    let contentType = 'application/pdf'

    // 1. Tentativa via AWS SDK (S3 / MinIO) com candidatos
    const candidates = extractS3Candidates(doc.arquivoUrl, BUCKET_PADRAO)
    for (const cand of candidates) {
      try {
        const cmd = new GetObjectCommand({
          Bucket: cand.bucket,
          Key: cand.key,
        })
        const s3Res = await s3Client.send(cmd)
        if (s3Res.ContentType) {
          contentType = s3Res.ContentType
        }
        if (s3Res.Body) {
          const bytes = await s3Res.Body.transformToByteArray()
          buffer = Buffer.from(bytes)
          break
        }
      } catch (err: any) {
        // Tenta o próximo candidato
      }
    }

    // 2. Fallback via HTTP fetch interno no servidor (se aplicável)
    if (!buffer && (doc.arquivoUrl.startsWith('http://') || doc.arquivoUrl.startsWith('https://'))) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
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

    // Se o arquivo não pôde ser recuperado, retorna 404 limpo (sem redirecionamento externo)
    if (!buffer) {
      return new NextResponse(
        `<!DOCTYPE html><html><body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #475569;"><div style="text-align: center; padding: 24px;"><h3 style="color: #e11d48; margin-bottom: 8px;">Documento não localizado</h3><p style="font-size: 14px;">Não foi possível carregar o arquivo a partir do armazenamento seguro.</p></div></body></html>`,
        {
          status: 404,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Frame-Options': 'SAMEORIGIN',
          },
        }
      )
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
