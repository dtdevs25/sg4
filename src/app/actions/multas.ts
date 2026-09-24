'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import s3Client from '@/lib/s3'

// ─── UPLOAD PARA O MINIO (Bucket: sg4-km) ───
export async function uploadFotoMulta(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const fileData = formData.get('fileData') as string
    const fileName = formData.get('fileName') as string
    const contentType = formData.get('contentType') as string

    if (!fileData || !fileName) return { success: false, error: 'Dados inválidos' }

    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData
    const buffer = Buffer.from(base64Data, 'base64')
    const ext = fileName.split('.').pop() || 'jpg'
    const key = `multas-avarias/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

    const command = new PutObjectCommand({
      Bucket: 'sg4-km',
      Key: key,
      Body: buffer,
      ContentType: contentType || 'image/jpeg',
      ACL: 'public-read',
    })

    await s3Client.send(command)

    const baseUrl = (process.env.S3_ENDPOINT || 'https://storage-api.ehspro.com.br').replace(/\/$/, '')
    const url = `${baseUrl}/sg4-km/${key}`

    return { success: true, url }
  } catch (error) {
    console.error('Erro ao fazer upload da foto de multa/avaria:', error)
    return { success: false, error: 'Erro ao fazer upload da foto no MinIO' }
  }
}

// ─── LISTAGEM ───
export async function getMultasAvarias(filtros?: {
  ano?: number
  mes?: number
  tipo?: 'ALL' | 'MULTA' | 'AVARIA'
  status?: string
  tecnicoId?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const userTecnicoId = (session.user as any).tecnicoId

    const where: any = {}

    // Restrição se for TST
    if (role === 'TST') {
      where.tecnicoId = userTecnicoId || 'unassigned'
    } else if (filtros?.tecnicoId && filtros.tecnicoId !== 'ALL') {
      where.tecnicoId = filtros.tecnicoId
    }

    if (filtros?.tipo && filtros.tipo !== 'ALL') {
      where.tipo = filtros.tipo
    }

    if (filtros?.status && filtros.status !== 'ALL') {
      where.status = filtros.status
    }

    if (filtros?.ano && !isNaN(filtros.ano)) {
      if (filtros.mes && !isNaN(filtros.mes)) {
        where.dataOcorrencia = {
          gte: new Date(filtros.ano, filtros.mes - 1, 1),
          lte: new Date(filtros.ano, filtros.mes, 0, 23, 59, 59),
        }
      } else {
        where.dataOcorrencia = {
          gte: new Date(filtros.ano, 0, 1),
          lte: new Date(filtros.ano, 11, 31, 23, 59, 59),
        }
      }
    }

    const data = await (prisma as any).multaAvaria.findMany({
      where,
      include: {
        tecnico: {
          select: {
            id: true,
            nome: true,
            fotoUrl: true,
            veiculo: true,
            ativo: true,
          },
        },
      },
      orderBy: { dataOcorrencia: 'desc' },
    })

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao buscar multas e avarias:', error)
    return { success: false, error: 'Falha ao buscar multas e avarias' }
  }
}

// ─── CRIAR ───
export async function createMultaAvaria(data: {
  tecnicoId: string
  tipo: 'MULTA' | 'AVARIA'
  placaVeiculo?: string
  dataOcorrencia: string | Date
  valor?: number
  status?: 'PENDENTE' | 'PAGO' | 'DESCONTADO_FOLHA' | 'EM_CONTESTACAO' | 'CONCLUIDO'
  descricao?: string
  localidade?: string
  fotoUrl?: string
  comprovanteUrl?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const item = await (prisma as any).multaAvaria.create({
      data: {
        tecnicoId: data.tecnicoId,
        tipo: data.tipo,
        placaVeiculo: data.placaVeiculo || null,
        dataOcorrencia: new Date(data.dataOcorrencia),
        valor: data.valor !== undefined ? Number(data.valor) : 0,
        status: data.status || 'PENDENTE',
        descricao: data.descricao || null,
        localidade: data.localidade || null,
        fotoUrl: data.fotoUrl || null,
        comprovanteUrl: data.comprovanteUrl || null,
      },
      include: {
        tecnico: {
          select: {
            id: true,
            nome: true,
            veiculo: true,
          },
        },
      },
    })

    await audit({
      userId,
      action: 'CRIAR_MULTA_AVARIA',
      entity: 'MultaAvaria',
      entityId: item.id,
      details: { tipo: data.tipo, valor: data.valor, tecnicoId: data.tecnicoId },
    })

    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao registrar multa/avaria:', error)
    return { success: false, error: 'Erro ao registrar ocorrência' }
  }
}

// ─── ATUALIZAR ───
export async function updateMultaAvaria(
  id: string,
  data: {
    tecnicoId?: string
    tipo?: 'MULTA' | 'AVARIA'
    placaVeiculo?: string
    dataOcorrencia?: string | Date
    valor?: number
    status?: 'PENDENTE' | 'PAGO' | 'DESCONTADO_FOLHA' | 'EM_CONTESTACAO' | 'CONCLUIDO'
    descricao?: string
    localidade?: string
    fotoUrl?: string
    comprovanteUrl?: string
  }
) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const updateData: any = {}
    if (data.tecnicoId !== undefined) updateData.tecnicoId = data.tecnicoId
    if (data.tipo !== undefined) updateData.tipo = data.tipo
    if (data.placaVeiculo !== undefined) updateData.placaVeiculo = data.placaVeiculo || null
    if (data.dataOcorrencia !== undefined) updateData.dataOcorrencia = new Date(data.dataOcorrencia)
    if (data.valor !== undefined) updateData.valor = Number(data.valor)
    if (data.status !== undefined) updateData.status = data.status
    if (data.descricao !== undefined) updateData.descricao = data.descricao || null
    if (data.localidade !== undefined) updateData.localidade = data.localidade || null
    if (data.fotoUrl !== undefined) updateData.fotoUrl = data.fotoUrl || null
    if (data.comprovanteUrl !== undefined) updateData.comprovanteUrl = data.comprovanteUrl || null

    const item = await (prisma as any).multaAvaria.update({
      where: { id },
      data: updateData,
      include: {
        tecnico: {
          select: {
            id: true,
            nome: true,
            veiculo: true,
          },
        },
      },
    })

    await audit({
      userId,
      action: 'ATUALIZAR_MULTA_AVARIA',
      entity: 'MultaAvaria',
      entityId: id,
      details: { ...updateData },
    })

    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao atualizar multa/avaria:', error)
    return { success: false, error: 'Erro ao atualizar ocorrência' }
  }
}

// ─── EXCLUIR ───
export async function deleteMultaAvaria(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    await (prisma as any).multaAvaria.delete({
      where: { id },
    })

    await audit({
      userId,
      action: 'EXCLUIR_MULTA_AVARIA',
      entity: 'MultaAvaria',
      entityId: id,
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir multa/avaria:', error)
    return { success: false, error: 'Erro ao excluir ocorrência' }
  }
}
