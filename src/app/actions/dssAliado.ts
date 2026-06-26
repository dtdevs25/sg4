'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import s3Client from '@/lib/s3'
import { audit } from '@/lib/audit'

const BUCKET_NAME = 'sg4-relatorios'

export async function saveDssAliado(data: {
  tecnicoId: string
  data: Date
  tema: string
  fotoBase64?: string
  fileName?: string
  contentType?: string
  planejamentoItemRef?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    let fotoUrl: string | undefined = undefined

    // Upload da foto, se fornecida
    if (data.fotoBase64 && data.fileName && data.contentType) {
      const buffer = Buffer.from(
        data.fotoBase64.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      )
      const key = `dss-aliado/${Date.now()}-${data.fileName.replace(/\s+/g, '_')}`
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: data.contentType,
      })
      await s3Client.send(command)

      const endpoint = (process.env.S3_ENDPOINT || 'https://sg4minio.fslab.dev')
        .replace('http://', 'https://')
        .replace(/\/$/, '')
      fotoUrl = `${endpoint}/${BUCKET_NAME}/${key}`
    }

    const item = await prisma.dssAliado.create({
      data: {
        tecnicoId: data.tecnicoId,
        data: data.data,
        tema: data.tema,
        fotoUrl,
        planejamentoItemRef: data.planejamentoItemRef,
      },
    })

    await audit({
      userId,
      action: 'CRIAR_DSS_ALIADO',
      entity: 'DssAliado',
      entityId: item.id,
      details: { tema: data.tema, tecnicoId: data.tecnicoId },
    })

    revalidatePath('/dashboard/dialogos')
    return { success: true, item }
  } catch (error: any) {
    console.error('Erro ao salvar DSS Aliado:', error)
    return { success: false, error: error.message }
  }
}

export async function getDssAliados(mes?: number, ano?: number, tecnicoId?: string) {
  const session = await auth()
  if (!session?.user) return []

  const role = (session.user as any).role
  const sessionTecnicoId = (session.user as any).tecnicoId

  let whereClause: any = {}

  if (mes && ano) {
    const startDate = new Date(Date.UTC(ano, mes - 1, 1))
    const endDate = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999))
    whereClause.data = { gte: startDate, lte: endDate }
  } else if (ano) {
    const startDate = new Date(Date.UTC(ano, 0, 1))
    const endDate = new Date(Date.UTC(ano, 11, 31, 23, 59, 59, 999))
    whereClause.data = { gte: startDate, lte: endDate }
  }

  if (role === 'TST') {
    whereClause.tecnicoId = sessionTecnicoId
  } else if (tecnicoId) {
    whereClause.tecnicoId = tecnicoId
  }

  const items = await prisma.dssAliado.findMany({
    where: whereClause,
    include: { tecnico: true },
    orderBy: { data: 'desc' },
  })

  return items
}

export async function deleteDssAliado(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    await prisma.dssAliado.delete({ where: { id } })
    await audit({ userId, action: 'EXCLUIR_DSS_ALIADO', entity: 'DssAliado', entityId: id })

    revalidatePath('/dashboard/dialogos')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
