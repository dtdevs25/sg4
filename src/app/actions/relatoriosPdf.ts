'use server'

import { db } from '@/lib/db'
import s3Client from '@/lib/s3'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/lib/auth'

const BUCKET_NAME = process.env.S3_BUCKET_RELATORIOS || 'relatorio-pdf'
const FOLDER_NAME = 'sg4-relatorios/'

export async function uploadRelatorioPdf(base64Data: string, fileName: string, mesAno: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const user = await db.user.findUnique({ where: { id: userId }, include: { tecnico: true } })
    const tecnicoId = user?.tecnico?.id || null
    const elaborador = user?.name || 'Sistema'

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
      ACL: 'public-read' as const,
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
    return { success: false, error: 'Erro ao fazer upload do PDF' }
  }
}

export async function getRelatoriosPdf() {
  try {
    const relatorios = await db.relatorioPdf.findMany({
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
