'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import s3Client from '@/lib/s3'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

export async function getAtas(ano?: number) {
  try {
    const where: any = {}
    if (ano) {
      where.data = {
        gte: new Date(ano, 0, 1),
        lte: new Date(ano, 11, 31, 23, 59, 59)
      }
    }
    
    const atas = await prisma.ataReuniao.findMany({
      where,
      orderBy: { data: 'desc' }
    })
    
    return { success: true, data: atas }
  } catch (error) {
    console.error('Erro ao buscar atas:', error)
    return { success: false, error: 'Falha ao buscar atas' }
  }
}

export async function getAtaUnica(dataIso: string, assunto: string) {
  try {
    // Para simplificar a busca e casar com a Reunião, usamos "começa com a data" ou match exato
    const dateObj = new Date(dataIso)
    
    // Procura uma ata com aquela exata data e assunto. Se não existir retorna null
    const ata = await prisma.ataReuniao.findFirst({
      where: {
        data: dateObj,
        assunto: assunto
      }
    })
    
    return { success: true, data: ata }
  } catch (error) {
    console.error('Erro ao buscar ata única:', error)
    return { success: false, error: 'Falha ao buscar ata' }
  }
}

export async function upsertAta(dataIso: string, assunto: string, conteudo: string, anexoUrl?: string, anexoNome?: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão para criar/editar atas' }
    }

    const dateObj = new Date(dataIso)

    // Usa a combinação única de data + assunto
    const ata = await prisma.ataReuniao.upsert({
      where: {
        data_assunto: {
          data: dateObj,
          assunto: assunto
        }
      },
      update: {
        conteudo,
        ...(anexoUrl !== undefined ? { anexoUrl } : {}),
        ...(anexoNome !== undefined ? { anexoNome } : {})
      },
      create: {
        data: dateObj,
        assunto: assunto,
        conteudo,
        anexoUrl,
        anexoNome
      }
    })
    
    return { success: true, data: ata }
  } catch (error) {
    console.error('Erro ao salvar ata:', error)
    return { success: false, error: 'Falha ao salvar ata' }
  }
}

export async function deleteAta(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão para excluir atas' }
    }

    await prisma.ataReuniao.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir ata:', error)
    return { success: false, error: 'Falha ao excluir' }
  }
}

export async function uploadAnexoReuniao(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão' }
    }

    const base64 = formData.get('fileData') as string;
    const fileName = formData.get('fileName') as string;
    const contentType = formData.get('contentType') as string;

    if (!base64 || !fileName) return { success: false, error: 'Dados inválidos' }

    // Remover header do base64 se houver
    const base64Data = base64.replace(/^data:.*?;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Gerar nome único
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const bucket = 'sg4-reunioes'

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: uniqueName,
      Body: buffer,
      ContentType: contentType,
    })

    await s3Client.send(command)

    const url = `${process.env.S3_ENDPOINT || 'https://storage-api.ehspro.com.br/'}${bucket}/${uniqueName}`
    
    return { success: true, url, name: fileName }
  } catch (error) {
    console.error('Erro no upload de anexo de ata:', error)
    return { success: false, error: 'Falha no upload' }
  }
}

export async function deleteAnexoAta(dataIso: string, assunto: string, anexoUrl: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão' }
    }

    const dateObj = new Date(dataIso)

    const ata = await prisma.ataReuniao.findUnique({
      where: {
        data_assunto: { data: dateObj, assunto }
      }
    })
    
    if (!ata || ata.anexoUrl !== anexoUrl) return { success: false, error: 'Anexo não confere ou não existe' }

    const bucket = 'sg4-reunioes'
    const bucketPart = `/${bucket}/`
    const idx = anexoUrl.indexOf(bucketPart)
    if (idx !== -1) {
      const key = anexoUrl.substring(idx + bucketPart.length)
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })
      await s3Client.send(command)
    }

    await prisma.ataReuniao.update({
      where: { id: ata.id },
      data: { anexoUrl: null, anexoNome: null }
    })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir anexo:', error)
    return { success: false, error: 'Falha ao excluir anexo' }
  }
}
