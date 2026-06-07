'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import s3Client from '@/lib/s3'

// ─── UPLOAD PARA O MINIO (Bucket: sg4-km) ───
export async function uploadFotoKm(fileData: string, fileName: string, contentType: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const buffer = Buffer.from(fileData.split(',')[1], 'base64')
    const ext = fileName.split('.').pop()
    const key = `fotos/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    
    const command = new PutObjectCommand({
      Bucket: 'sg4-km',
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read'
    })

    await s3Client.send(command)
    
    const baseUrl = (process.env.S3_ENDPOINT || 'https://storage-api.ehspro.com.br').replace(/\/$/, '')
    const url = `${baseUrl}/sg4-km/${key}`
    
    return { success: true, url }
  } catch (error) {
    console.error('Erro ao fazer upload da foto:', error)
    return { success: false, error: 'Erro ao fazer upload da foto no MinIO' }
  }
}

// ─── QUILOMETRAGEM ───
export async function getQuilometragens(ano: number, mes?: number) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const role = (session.user as any).role
    const tecnicoId = (session.user as any).tecnicoId

    const where: any = {}
    if (role === 'TST') {
      where.tecnicoId = tecnicoId
    }
    
    if (mes) {
      where.dataInicial = {
        gte: new Date(ano, mes - 1, 1),
        lte: new Date(ano, mes, 0, 23, 59, 59)
      }
    } else {
      where.dataInicial = {
        gte: new Date(ano, 0, 1),
        lte: new Date(ano, 11, 31, 23, 59, 59)
      }
    }

    const data = await prisma.quilometragem.findMany({
      where,
      include: {
        tecnico: { select: { id: true, nome: true, fotoUrl: true, admissao: true } }
      },
      orderBy: { dataInicial: 'desc' }
    })
    
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao buscar quilometragens:', error)
    return { success: false, error: 'Falha ao buscar' }
  }
}

export async function createQuilometragem(data: {
  tecnicoId: string
  diaSemana: string
  dataInicial: Date
  kmInicial: number
  fotoInicial?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const item = await prisma.quilometragem.create({
      data: {
        tecnicoId: data.tecnicoId,
        diaSemana: data.diaSemana,
        dataInicial: data.dataInicial,
        kmInicial: data.kmInicial,
        fotoInicial: data.fotoInicial
      }
    })
    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao criar quilometragem:', error)
    return { success: false, error: 'Erro ao criar' }
  }
}

export async function fecharQuilometragem(id: string, kmFinal: number, fotoFinal?: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const km = await prisma.quilometragem.findUnique({ where: { id } })
    if (!km) return { success: false, error: 'Registro não encontrado' }

    const diferenca = kmFinal - km.kmInicial

    const item = await prisma.quilometragem.update({
      where: { id },
      data: {
        dataFinal: new Date(),
        kmFinal,
        fotoFinal,
        diferenca
      }
    })
    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao fechar quilometragem:', error)
    return { success: false, error: 'Erro ao fechar' }
  }
}

export async function updateQuilometragem(id: string, data: {
  diaSemana?: string
  kmInicial?: number
  fotoInicial?: string
  kmFinal?: number | null
  fotoFinal?: string | null
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const km = await prisma.quilometragem.findUnique({ where: { id } })
    if (!km) return { success: false, error: 'Registro não encontrado' }

    const newKmInicial = data.kmInicial !== undefined ? data.kmInicial : km.kmInicial
    const newKmFinal = data.kmFinal !== undefined ? data.kmFinal : km.kmFinal

    let diferenca = null
    if (newKmFinal !== null) {
      diferenca = newKmFinal - newKmInicial
    }

    const item = await prisma.quilometragem.update({
      where: { id },
      data: {
        diaSemana: data.diaSemana !== undefined ? data.diaSemana : km.diaSemana,
        kmInicial: newKmInicial,
        fotoInicial: data.fotoInicial !== undefined ? data.fotoInicial : km.fotoInicial,
        kmFinal: newKmFinal,
        fotoFinal: data.fotoFinal !== undefined ? data.fotoFinal : km.fotoFinal,
        diferenca
      }
    })
    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao atualizar quilometragem:', error)
    return { success: false, error: 'Erro ao atualizar' }
  }
}

export async function deleteQuilometragem(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    await prisma.quilometragem.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    console.error('Erro ao deletar quilometragem:', error)
    return { success: false, error: 'Erro ao deletar' }
  }
}

// ─── ABASTECIMENTO ───
export async function getAbastecimentos(ano: number, mes?: number) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const role = (session.user as any).role
    const tecnicoId = (session.user as any).tecnicoId

    const where: any = {}
    if (role === 'TST') {
      where.tecnicoId = tecnicoId
    }
    
    if (mes) {
      where.data = {
        gte: new Date(ano, mes - 1, 1),
        lte: new Date(ano, mes, 0, 23, 59, 59)
      }
    } else {
      where.data = {
        gte: new Date(ano, 0, 1),
        lte: new Date(ano, 11, 31, 23, 59, 59)
      }
    }

    const data = await prisma.abastecimento.findMany({
      where,
      include: {
        tecnico: { select: { id: true, nome: true, fotoUrl: true, admissao: true } }
      },
      orderBy: { data: 'desc' }
    })
    
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao buscar abastecimentos:', error)
    return { success: false, error: 'Falha ao buscar' }
  }
}

export async function createAbastecimento(data: {
  tecnicoId: string
  data: Date
  valor: number
  fotoCupom?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const item = await prisma.abastecimento.create({
      data: {
        tecnicoId: data.tecnicoId,
        data: data.data,
        valor: data.valor,
        fotoCupom: data.fotoCupom
      }
    })
    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao criar abastecimento:', error)
    return { success: false, error: 'Erro ao criar' }
  }
}

export async function updateAbastecimento(id: string, data: {
  data?: Date
  valor?: number
  fotoCupom?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const item = await prisma.abastecimento.update({
      where: { id },
      data: {
        ...(data.data && { data: data.data }),
        ...(data.valor !== undefined && { valor: data.valor }),
        ...(data.fotoCupom !== undefined && { fotoCupom: data.fotoCupom })
      }
    })
    return { success: true, data: item }
  } catch (error) {
    console.error('Erro ao atualizar abastecimento:', error)
    return { success: false, error: 'Erro ao atualizar' }
  }
}

export async function deleteAbastecimento(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    await prisma.abastecimento.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    console.error('Erro ao deletar abastecimento:', error)
    return { success: false, error: 'Erro ao deletar' }
  }
}
