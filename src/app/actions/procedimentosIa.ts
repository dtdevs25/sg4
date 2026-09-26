'use server'

import { PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import s3Client from '@/lib/s3'
import { auth } from '@/lib/auth'

const BUCKET_NAME = 'sg4-procedimentos-ia'

export async function uploadProcedimentoIa(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role === 'TST') return { success: false, error: 'Não autorizado' }

    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'Arquivo inválido' }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Normalizar nome do arquivo: remover espaços, acentos, etc.
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `${Date.now()}_${safeName}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read'
    })

    await s3Client.send(command)

    return { success: true, fileName: key }
  } catch (error) {
    console.error('Erro ao fazer upload do procedimento no MinIO:', error)
    return { success: false, error: 'Erro ao fazer upload do arquivo' }
  }
}

export async function getProcedimentosIa() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME
    })

    try {
      const response = await s3Client.send(command)
      
      const arquivos = (response.Contents || []).map(file => ({
        nome: file.Key,
        tamanho: file.Size,
        data: file.LastModified
      }))

      // Ordenar por mais recente
      arquivos.sort((a, b) => {
        if (!a.data || !b.data) return 0
        return b.data.getTime() - a.data.getTime()
      })

      return { success: true, data: arquivos }
    } catch (e: any) {
      // Se o bucket não existir ainda, retorna lista vazia
      if (e.name === 'NoSuchBucket') {
        return { success: true, data: [] }
      }
      throw e
    }
  } catch (error) {
    console.error('Erro ao listar procedimentos:', error)
    return { success: false, error: 'Erro ao listar arquivos' }
  }
}

export async function deleteProcedimentoIa(fileName: string) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role === 'TST') return { success: false, error: 'Não autorizado' }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName
    })

    await s3Client.send(command)

    return { success: true }
  } catch (error) {
    console.error('Erro ao deletar procedimento:', error)
    return { success: false, error: 'Erro ao deletar arquivo' }
  }
}
