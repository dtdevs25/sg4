'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import s3Client from '@/lib/s3'

const BUCKET_NAME = 'sg4-relatorios'

export async function uploadFotoRelatorio(base64: string, fileName: string, contentType: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64')
    const key = `fotos/${Date.now()}-${fileName.replace(/\s+/g, '_')}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })

    await s3Client.send(command)
    
    const endpoint = process.env.S3_ENDPOINT?.replace('http://', 'https://') || 'https://sg4minio.fslab.dev'
    const publicUrl = `${endpoint}/${BUCKET_NAME}/${key}`
    return { success: true, url: publicUrl, key }
  } catch (error) {
    console.error("S3 Upload Error:", error)
    return { success: false, error: 'Falha ao fazer upload da foto' }
  }
}

// ===========================
// RELATÓRIOS CRUD
// ===========================

export async function getRelatorios(mes: number, ano: number) {
  const session = await auth()
  if (!session?.user) return []

  const role = (session.user as any).role
  const userId = session.user.id

  const startDate = new Date(Date.UTC(ano, mes - 1, 1))
  const endDate = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999))

  let whereClause: any = {
    dataReferencia: { gte: startDate, lte: endDate }
  }

  // TST only sees their own
  if (role === 'TST') {
    const tecnico = await prisma.tecnico.findUnique({ where: { userId } })
    if (tecnico) {
      whereClause.tecnicoId = tecnico.id
    }
  }

  const items = await prisma.relatorio.findMany({
    where: whereClause,
    include: {
      tecnico: true,
      atividades: {
        orderBy: { data: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return items
}

export async function createRelatorio(data: {
  tecnicoId: string
  empresa: string
  projeto: string
  dataReferencia: Date
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const item = await prisma.relatorio.create({
      data: {
        tecnicoId: data.tecnicoId,
        empresa: data.empresa,
        projeto: data.projeto,
        dataReferencia: data.dataReferencia
      }
    })

    revalidatePath('/dashboard/relatorios')
    return { success: true, item }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateRelatorio(id: string, data: {
  empresa?: string
  projeto?: string
  dataReferencia?: Date
  revisao?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const item = await prisma.relatorio.update({
      where: { id },
      data
    })

    revalidatePath('/dashboard/relatorios')
    return { success: true, item }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteRelatorio(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    await prisma.relatorio.delete({ where: { id } })
    revalidatePath('/dashboard/relatorios')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getRelatorioById(id: string) {
  const session = await auth()
  if (!session?.user) return null

  return await prisma.relatorio.findUnique({
    where: { id },
    include: {
      tecnico: true,
      atividades: {
        orderBy: { data: 'asc' }
      }
    }
  })
}

// ===========================
// ATIVIDADES CRUD
// ===========================

export async function addAtividade(relatorioId: string, data: {
  data: Date
  local: string
  cidadeUf: string
  descricao: string
  fotoUrl?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const item = await prisma.relatorioAtividade.create({
      data: {
        relatorioId,
        ...data
      }
    })

    revalidatePath('/dashboard/relatorios')
    return { success: true, item }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateAtividade(id: string, data: {
  data?: Date
  local?: string
  cidadeUf?: string
  descricao?: string
  fotoUrl?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const item = await prisma.relatorioAtividade.update({
      where: { id },
      data
    })

    revalidatePath('/dashboard/relatorios')
    return { success: true, item }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteAtividade(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    await prisma.relatorioAtividade.delete({ where: { id } })
    revalidatePath('/dashboard/relatorios')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
