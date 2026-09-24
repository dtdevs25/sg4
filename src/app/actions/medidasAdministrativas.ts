'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import s3Client from '@/lib/s3'

// ─── UPLOAD PARA O MINIO (Bucket: sg4-km) ───
export async function uploadDocumentoMedida(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const fileData = formData.get('fileData') as string
    const fileName = formData.get('fileName') as string
    const contentType = formData.get('contentType') as string

    if (!fileData || !fileName) return { success: false, error: 'Dados inválidos' }

    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData
    const buffer = Buffer.from(base64Data, 'base64')
    const ext = fileName.split('.').pop() || 'pdf'
    const key = `medidas-administrativas/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

    const command = new PutObjectCommand({
      Bucket: 'sg4-km',
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/pdf',
      ACL: 'public-read',
    })

    await s3Client.send(command)

    const baseUrl = (process.env.S3_ENDPOINT || 'https://storage-api.ehspro.com.br').replace(/\/$/, '')
    const url = `${baseUrl}/sg4-km/${key}`

    return { success: true, url }
  } catch (error) {
    console.error('Erro ao fazer upload do documento de medida administrativa:', error)
    return { success: false, error: 'Erro ao fazer upload do documento no MinIO' }
  }
}

// ─── LISTAGEM ───
export async function getMedidasAdministrativas(filtros?: {
  ano?: number
  mes?: number
  tipo?: string
  status?: string
  tecnicoId?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const userTecnicoId = (session.user as any).tecnicoId

    const where: any = {}

    // Restrição para TST
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
        where.data = {
          gte: new Date(filtros.ano, filtros.mes - 1, 1),
          lte: new Date(filtros.ano, filtros.mes, 0, 23, 59, 59),
        }
      } else {
        where.data = {
          gte: new Date(filtros.ano, 0, 1),
          lte: new Date(filtros.ano, 11, 31, 23, 59, 59),
        }
      }
    }

    const data = await (prisma as any).medidaAdministrativa.findMany({
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
        multaAvaria: {
          select: {
            id: true,
            tipo: true,
            dataOcorrencia: true,
            valor: true,
            placaVeiculo: true,
            descricao: true,
          },
        },
      },
      orderBy: { data: 'desc' },
    })

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao buscar medidas administrativas:', error)
    return { success: false, error: 'Falha ao buscar medidas administrativas' }
  }
}

// ─── BUSCAR MULTAS/AVARIAS DE UM TÉCNICO PARA VÍNCULO ───
export async function getMultasParaVinculo(tecnicoId?: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const where: any = {}
    if (tecnicoId && tecnicoId !== 'ALL') {
      where.tecnicoId = tecnicoId
    }

    const multas = await (prisma as any).multaAvaria.findMany({
      where,
      select: {
        id: true,
        tipo: true,
        dataOcorrencia: true,
        valor: true,
        placaVeiculo: true,
        descricao: true,
        tecnico: {
          select: {
            nome: true,
          },
        },
      },
      orderBy: { dataOcorrencia: 'desc' },
      take: 50,
    })

    return { success: true, data: multas }
  } catch (error) {
    console.error('Erro ao buscar multas para vínculo:', error)
    return { success: false, error: 'Erro ao buscar multas' }
  }
}

// ─── CRIAR ───
export async function createMedidaAdministrativa(data: {
  tecnicoId: string
  tipo: 'ADVERTENCIA_VERBAL' | 'ADVERTENCIA_ESCRITA' | 'SUSPENSAO' | 'ORIENTACAO_FEEDBACK'
  data: string | Date
  motivo: string
  descricao?: string
  status?: 'PENDENTE_ASSINATURA' | 'APLICADA' | 'CANCELADA'
  aplicadoPor?: string
  multaAvariaId?: string
  documentoUrl?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id
    const userName = (session.user as any).name

    const item = await (prisma as any).medidaAdministrativa.create({
      data: {
        tecnicoId: data.tecnicoId,
        tipo: data.tipo,
        data: new Date(data.data),
        motivo: data.motivo,
        descricao: data.descricao || null,
        status: data.status || 'APLICADA',
        aplicadoPor: data.aplicadoPor || userName || null,
        multaAvariaId: data.multaAvariaId || null,
        documentoUrl: data.documentoUrl || null,
      },
      include: {
        tecnico: {
          select: {
            id: true,
            nome: true,
          },
        },
        multaAvaria: true,
      },
    })

    await audit({
      userId,
      action: 'CRIAR_MEDIDA_ADMINISTRATIVA',
      entity: 'MedidaAdministrativa',
      entityId: item.id,
      details: { tipo: data.tipo, motivo: data.motivo, tecnicoId: data.tecnicoId },
    })

    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao registrar medida administrativa:', error)
    return { success: false, error: 'Erro ao registrar medida administrativa' }
  }
}

// ─── ATUALIZAR ───
export async function updateMedidaAdministrativa(
  id: string,
  data: {
    tecnicoId?: string
    tipo?: 'ADVERTENCIA_VERBAL' | 'ADVERTENCIA_ESCRITA' | 'SUSPENSAO' | 'ORIENTACAO_FEEDBACK'
    data?: string | Date
    motivo?: string
    descricao?: string
    status?: 'PENDENTE_ASSINATURA' | 'APLICADA' | 'CANCELADA'
    aplicadoPor?: string
    multaAvariaId?: string | null
    documentoUrl?: string | null
  }
) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const updateData: any = {}
    if (data.tecnicoId !== undefined) updateData.tecnicoId = data.tecnicoId
    if (data.tipo !== undefined) updateData.tipo = data.tipo
    if (data.data !== undefined) updateData.data = new Date(data.data)
    if (data.motivo !== undefined) updateData.motivo = data.motivo
    if (data.descricao !== undefined) updateData.descricao = data.descricao || null
    if (data.status !== undefined) updateData.status = data.status
    if (data.aplicadoPor !== undefined) updateData.aplicadoPor = data.aplicadoPor || null
    if (data.multaAvariaId !== undefined) updateData.multaAvariaId = data.multaAvariaId || null
    if (data.documentoUrl !== undefined) updateData.documentoUrl = data.documentoUrl || null

    const item = await (prisma as any).medidaAdministrativa.update({
      where: { id },
      data: updateData,
      include: {
        tecnico: {
          select: {
            id: true,
            nome: true,
          },
        },
        multaAvaria: true,
      },
    })

    await audit({
      userId,
      action: 'ATUALIZAR_MEDIDA_ADMINISTRATIVA',
      entity: 'MedidaAdministrativa',
      entityId: id,
      details: { ...updateData },
    })

    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao atualizar medida administrativa:', error)
    return { success: false, error: 'Erro ao atualizar medida administrativa' }
  }
}

// ─── EXCLUIR ───
export async function deleteMedidaAdministrativa(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    await (prisma as any).medidaAdministrativa.delete({
      where: { id },
    })

    await audit({
      userId,
      action: 'EXCLUIR_MEDIDA_ADMINISTRATIVA',
      entity: 'MedidaAdministrativa',
      entityId: id,
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir medida administrativa:', error)
    return { success: false, error: 'Erro ao excluir medida administrativa' }
  }
}
