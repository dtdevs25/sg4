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
    
    const endpoint = (process.env.S3_ENDPOINT || 'https://sg4minio.fslab.dev').replace('http://', 'https://').replace(/\/$/, '')
    const publicUrl = `${endpoint}/${BUCKET_NAME}/${key}`
    return { success: true, url: publicUrl, key }
  } catch (error) {
    console.error("S3 Upload Error:", error)
    return { success: false, error: 'Falha ao fazer upload da foto' }
  }
}

// ===========================
// ATIVIDADES CRUD
// ===========================

export async function getAtividadesRelatorio(mes: number, ano: number) {
  const session = await auth()
  if (!session?.user) return []

  const role = (session.user as any).role
  const userId = session.user.id

  const startDate = new Date(Date.UTC(ano, mes - 1, 1))
  const endDate = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999))

  let whereClause: any = {
    data: { gte: startDate, lte: endDate }
  }

  if (role === 'TST') {
    const tecnico = await prisma.tecnico.findUnique({ where: { userId } })
    if (tecnico) {
      whereClause.tecnicoId = tecnico.id
    }
  }

  const items = await prisma.relatorioAtividade.findMany({
    where: whereClause,
    include: {
      tecnico: true
    },
    orderBy: { data: 'desc' }
  })

  return items
}

export async function addAtividade(data: {
  tecnicoId: string
  data: Date
  empresa: string
  projeto: string
  local: string
  cidadeUf: string
  descricao: string
  fotoUrl?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const item = await prisma.relatorioAtividade.create({
      data
    })

    revalidatePath('/dashboard/relatorios')
    return { success: true, item }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateAtividade(id: string, data: {
  data?: Date
  empresa?: string
  projeto?: string
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

// Para o gerador de PDF
export async function getAtividadesForPrint(mes: number, ano: number, empresa: string, tecnicoId?: string) {
  const startDate = new Date(Date.UTC(ano, mes - 1, 1))
  const endDate = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999))

  let whereClause: any = {
    data: { gte: startDate, lte: endDate },
    empresa: { equals: empresa, mode: 'insensitive' }
  }

  if (tecnicoId) {
    whereClause.tecnicoId = tecnicoId
  }

  const items = await prisma.relatorioAtividade.findMany({
    where: whereClause,
    include: { tecnico: true },
    orderBy: { data: 'asc' }
  })

  // Converter fotoUrl para fotoBase64 no backend para evitar CORS no client
  for (let item of items) {
    if (item.fotoUrl) {
      try {
        const url = item.fotoUrl.replace('//sg4-relatorios', '/sg4-relatorios')
        const res = await fetch(url)
        if (res.ok) {
          const buffer = await res.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const mime = res.headers.get('content-type') || 'image/jpeg'
          ;(item as any).fotoBase64 = `data:${mime};base64,${base64}`
        }
      } catch (err) {
        console.error('Erro ao converter fotoUrl para base64:', err)
      }
    }
  }

  return items
}
