'use server'

import { prisma as db } from '@/lib/db'
import s3Client from '@/lib/s3'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/lib/auth'

const BUCKET_NAME = process.env.S3_BUCKET_RELATORIOS || 'relatorio-pdf'
const FOLDER_NAME = 'sg4-relatorios/'

export async function uploadRelatorioPdf(formData: FormData) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const user = userId ? await db.user.findUnique({ where: { id: userId }, include: { tecnico: true } }) : null

    // Resolver técnico por vínculo direto, email ou nome
    let tecnico = user?.tecnico
    if (!tecnico && user) {
      tecnico = await db.tecnico.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.email ? [{ email: { equals: user.email, mode: 'insensitive' as const } }] : []),
            ...(user.name ? [{ nome: { equals: user.name, mode: 'insensitive' as const } }] : [])
          ]
        }
      })
      if (tecnico && !tecnico.userId) {
        await db.tecnico.update({ where: { id: tecnico.id }, data: { userId: user.id } }).catch(() => {})
      }
    }

    const formTecnicoId = formData.get('tecnicoId') as string | null;
    const formElaborador = formData.get('elaborador') as string | null;

    const tecnicoId = formTecnicoId || tecnico?.id || null
    let elaborador = (formElaborador && formElaborador !== 'TST' && formElaborador !== 'Não Identificado')
      ? formElaborador
      : (tecnico?.nome || user?.name || 'Sistema')

    const base64Data = formData.get('fileData') as string;
    let fileName = formData.get('fileName') as string;
    const mesAno = formData.get('mesAno') as string;

    if (!base64Data || !fileName) return { success: false, error: 'Dados inválidos' }

    // Se o nome do arquivo começou com "TST - " mas temos o nome real, ajusta o nome
    if (fileName.startsWith('TST - ') && elaborador && elaborador !== 'TST') {
      const safeElab = elaborador.toUpperCase().replace(/[^A-Z0-9 \-]/g, '')
      fileName = fileName.replace(/^TST - /, `${safeElab} - `)
    }

    // Limpar o prefixo data:application/pdf;base64,
    const base64String = base64Data.split(',')[1] || base64Data
    const buffer = Buffer.from(base64String, 'base64')

    // Garantir nome único para não sobrescrever
    const timestamp = Date.now()
    const uniqueFileName = `${timestamp}_${fileName}`
    const s3Key = `${FOLDER_NAME}${uniqueFileName}`

    // Faz upload pro MinIO
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: 'application/pdf',
    }

    await s3Client.send(new PutObjectCommand(uploadParams))

    // Formar URL pública (pode variar se o endpoint não incluir o bucket automaticamente)
    // Para AWS SDK forcePathStyle=true: endpoint/bucket/key
    const endpointUrl = process.env.S3_ENDPOINT?.endsWith('/') 
      ? process.env.S3_ENDPOINT 
      : `${process.env.S3_ENDPOINT}/`
    const publicUrl = `${endpointUrl}${BUCKET_NAME}/${s3Key}`

    // Salvar no DB
    const relatorioDb = await db.relatorioPdf.create({
      data: {
        nomeArquivo: fileName,
        url: publicUrl,
        tamanhoBytes: buffer.length,
        tecnicoId,
        elaborador,
        mesAno
      }
    })

    return { success: true, data: relatorioDb }
  } catch (error: any) {
    console.error('Erro ao fazer upload do PDF:', error)
    return { success: false, error: error?.message || 'Erro ao fazer upload do PDF' }
  }
}

export async function getRelatoriosPdf() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const userId = session.user.id
    let tecnicoId = (session.user as any).tecnicoId

    let where: any = {}
    if (role === 'TST') {
      let tecNome = session.user.name || ''

      // Se não veio o tecnicoId na sessão, busca no banco
      if (!tecnicoId && userId) {
        const tec = await db.tecnico.findFirst({
          where: {
            OR: [
              { userId: userId },
              ...(session.user.email ? [{ email: { equals: session.user.email, mode: 'insensitive' as const } }] : []),
              ...(session.user.name ? [{ nome: { equals: session.user.name, mode: 'insensitive' as const } }] : [])
            ]
          }
        })
        if (tec) {
          tecnicoId = tec.id
          tecNome = tec.nome
          if (!tec.userId) {
            await db.tecnico.update({ where: { id: tec.id }, data: { userId } }).catch(() => {})
          }
        }
      } else if (tecnicoId && !tecNome) {
        const tec = await db.tecnico.findUnique({ where: { id: tecnicoId } })
        if (tec) tecNome = tec.nome
      }

      const conditions: any[] = []
      if (tecnicoId) conditions.push({ tecnicoId })
      if (tecNome) {
        conditions.push({ elaborador: { contains: tecNome, mode: 'insensitive' as const } })
        conditions.push({ nomeArquivo: { contains: tecNome, mode: 'insensitive' as const } })
      }
      if (session.user.name && session.user.name !== tecNome) {
        conditions.push({ elaborador: { contains: session.user.name, mode: 'insensitive' as const } })
        conditions.push({ nomeArquivo: { contains: session.user.name, mode: 'insensitive' as const } })
      }

      where = conditions.length > 0 ? { OR: conditions } : { id: 'sem_acesso_tst_nao_localizado' }
    }

    const relatorios = await db.relatorioPdf.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tecnico: true
      }
    })
    return { success: true, data: relatorios }
  } catch (error: any) {
    console.error('Erro ao buscar relatórios PDF:', error)
    return { success: false, error: 'Erro ao buscar relatórios gerados' }
  }
}

export async function deleteRelatorioPdf(id: string) {
  try {
    const relatorio = await db.relatorioPdf.findUnique({ where: { id } })
    if (!relatorio) return { success: false, error: 'Relatório não encontrado' }

    // Obter o Key do S3 através da URL
    const urlParts = relatorio.url.split(`${BUCKET_NAME}/`)
    const s3Key = urlParts[1]

    if (s3Key) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      }))
    }

    await db.relatorioPdf.delete({ where: { id } })

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao deletar relatório PDF:', error)
    return { success: false, error: 'Erro ao deletar relatório' }
  }
}
