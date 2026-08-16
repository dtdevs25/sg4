'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import s3Client from '@/lib/s3'

function normalize(str: string | null | undefined): string {
  if (!str) return ''
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
}

function nameMatches(arkiumName: string, dbName: string): boolean {
  if (!arkiumName || !dbName) return false
  
  if (arkiumName === dbName) return true
  
  const prepositions = ['de', 'da', 'do', 'das', 'dos', 'e']
  
  const arkTokens = arkiumName.toLowerCase()
    .split(' ')
    .filter(t => t.length > 2 && !prepositions.includes(t))
    
  const dbTokens = dbName.toLowerCase()
    .split(' ')
    .filter(t => t.length > 2 && !prepositions.includes(t))
  
  const firstArk = arkTokens[0]
  const firstDb = dbTokens[0]
  if (!firstArk || !firstDb) return false
  
  // First name must match exactly
  if (firstArk !== firstDb) return false
  
  // If one name has only one token, allow it
  if (arkTokens.length === 1 || dbTokens.length === 1) return true
  
  // Exigir que TODOS os sobrenomes do nome mais curto estejam contidos no maior
  const arkSurnames = arkTokens.slice(1)
  const dbSurnames = dbTokens.slice(1)
  
  const minSurnamesCount = Math.min(arkSurnames.length, dbSurnames.length)
  const sharedSurnames = arkSurnames.filter(s => dbSurnames.includes(s))
  
  return sharedSurnames.length >= minSurnamesCount
}

function cleanName(nameStr: string): string {
  if (!nameStr) return ''
  if (nameStr.includes('-')) {
    const parts = nameStr.split('-')
    const namePart = parts[1] || parts[0]
    return namePart.trim()
  }
  return nameStr.trim()
}

export async function getNaoConformidades() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const tecnicoId = (session.user as any).tecnicoId

    let whereClause: any = {}

    if (role === 'TST') {
      if (!tecnicoId) return { success: true, data: [] }
      whereClause.tecnicoId = tecnicoId
    }

    const data = await prisma.naoConformidade.findMany({
      where: whereClause,
      include: {
        tecnico: {
          select: {
            id: true,
            nome: true,
            fotoUrl: true,
            ativo: true
          }
        }
      },
      orderBy: {
        dataAbertura: 'desc'
      }
    })

    return { success: true, data }
  } catch (error: any) {
    console.error('Erro ao buscar não conformidades:', error)
    return { success: false, error: error.message }
  }
}

export async function upsertNaoConformidadesBatch(items: any[]) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    
    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão' }
    }
    
    const userId = (session.user as any).id
    let inseridos = 0
    let atualizados = 0

    // Fetch all technicians to perform matching
    const tecnicos = await prisma.tecnico.findMany({
      select: { id: true, nome: true, matriculaArkium: true }
    })

    for (const item of items) {
      // originalId is mandatory to avoid duplicates
      if (!item.originalId) continue

      let tecnicoId: string | null = null

      const rawExecutor = item.executor || ''
      const rawResponsavel = item.responsavel || ''

      const cleanExecutor = cleanName(rawExecutor)
      const cleanResponsavel = cleanName(rawResponsavel)

      // Try matching Executor name
      if (cleanExecutor) {
        const executorNorm = normalize(cleanExecutor)
        let match = tecnicos.find(t => normalize(t.nome) === executorNorm)
        if (!match) {
          match = tecnicos.find(t => nameMatches(executorNorm, normalize(t.nome)))
        }
        if (match) {
          tecnicoId = match.id
        }
      }

      // Try matching Responsavel name if Executor didn't match
      if (!tecnicoId && cleanResponsavel) {
        const responsavelNorm = normalize(cleanResponsavel)
        let match = tecnicos.find(t => normalize(t.nome) === responsavelNorm)
        if (!match) {
          match = tecnicos.find(t => nameMatches(responsavelNorm, normalize(t.nome)))
        }
        if (match) {
          tecnicoId = match.id
        }
      }

      // Se não corresponde a nenhum técnico da nossa base, ignora o registro
      if (!tecnicoId) continue

      const existing = await prisma.naoConformidade.findUnique({
        where: { originalId: String(item.originalId) }
      })

      if (existing) {
        const currentStatus = existing.status
        let finalStatus = currentStatus
        if (item.status === 'RESOLVIDO') {
          finalStatus = 'RESOLVIDO'
        } else if (currentStatus !== 'EM_ANDAMENTO' && currentStatus !== 'RESOLVIDO') {
          finalStatus = item.status || 'PENDENTE_NAO_VENCIDA'
        }

        await prisma.naoConformidade.update({
          where: { id: existing.id },
          data: {
            executor: rawExecutor || rawResponsavel || existing.executor,
            tecnicoId: tecnicoId || existing.tecnicoId,
            pergunta: item.pergunta !== undefined ? item.pergunta : existing.pergunta,
            resposta: item.resposta !== undefined ? item.resposta : existing.resposta,
            classificacao: item.classificacao !== undefined ? item.classificacao : existing.classificacao,
            compl1: item.compl1 !== undefined ? item.compl1 : existing.compl1,
            rCompl1: item.rCompl1 !== undefined ? item.rCompl1 : existing.rCompl1,
            localidade: item.localidade !== undefined ? item.localidade : existing.localidade,
            base: item.base !== undefined ? item.base : existing.base,
            questionario: item.questionario !== undefined ? item.questionario : existing.questionario,
            dataAbertura: item.dataAbertura ? new Date(item.dataAbertura) : existing.dataAbertura,
            status: finalStatus
          }
        })
        atualizados++
      } else {
        await prisma.naoConformidade.create({
          data: {
            originalId: String(item.originalId),
            executor: rawExecutor || rawResponsavel || '',
            tecnicoId,
            pergunta: item.pergunta || '',
            resposta: item.resposta || '',
            classificacao: item.classificacao || '',
            compl1: item.compl1 || '',
            rCompl1: item.rCompl1 || '',
            localidade: item.localidade || '',
            base: item.base || '',
            questionario: item.questionario || '',
            dataAbertura: item.dataAbertura ? new Date(item.dataAbertura) : null,
            status: item.status || 'PENDENTE_NAO_VENCIDA',
            updates: []
          }
        })
        inseridos++
      }
    }

    await audit({
      userId,
      action: 'IMPORTAR_NAO_CONFORMIDADES',
      entity: 'NaoConformidade',
      details: { inseridos, atualizados, total: items.length }
    })

    revalidatePath('/dashboard/naoconformidades')
    return { success: true, inseridos, atualizados }
  } catch (error: any) {
    console.error('Erro ao processar lote de não conformidades:', error)
    return { success: false, error: error.message }
  }
}

export async function addNaoConformidadeUpdate(
  id: string,
  text: string,
  newStatus?: string,
  actionDate?: string,
  fotoUrl?: string
) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const author = session.user.name || 'Usuário SG4'
    const userId = (session.user as any).id

    const item = await prisma.naoConformidade.findUnique({
      where: { id }
    })

    if (!item) return { success: false, error: 'Não conformidade não encontrada' }

    let currentUpdates: any[] = []
    if (item.updates && typeof item.updates === 'object') {
      currentUpdates = Array.isArray(item.updates) ? item.updates : []
    }

    const newUpdate = {
      date: new Date().toISOString(),
      text,
      author,
      actionDate: actionDate || new Date().toISOString().split('T')[0],
      fotoUrl: fotoUrl || null
    }

    const updatedUpdates = [...currentUpdates, newUpdate]
    const updatedStatus = newStatus || item.status

    const updated = await prisma.naoConformidade.update({
      where: { id },
      data: {
        updates: updatedUpdates,
        status: updatedStatus
      }
    })

    await audit({
      userId,
      action: 'ATUALIZAR_NAO_CONFORMIDADE',
      entity: 'NaoConformidade',
      entityId: id,
      details: { text, status: updatedStatus, actionDate, fotoUrl }
    })

    revalidatePath('/dashboard/naoconformidades')
    return { success: true, data: updated }
  } catch (error: any) {
    console.error('Erro ao adicionar atualização:', error)
    return { success: false, error: error.message }
  }
}

export async function uploadNaoConformidadeEvidencia(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const fileData = formData.get('fileData') as string;
    const fileName = formData.get('fileName') as string;
    const contentType = formData.get('contentType') as string;

    if (!fileData || !fileName) return { success: false, error: 'Dados inválidos' }

    const buffer = Buffer.from(fileData.split(',')[1], 'base64')
    const ext = fileName.split('.').pop()
    const key = `evidencias/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    
    const command = new PutObjectCommand({
      Bucket: 'sg4-ncvivo',
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read'
    })

    await s3Client.send(command)
    
    const baseUrl = (process.env.S3_ENDPOINT || 'https://storage-api.ehspro.com.br').replace(/\/$/, '')
    const url = `${baseUrl}/sg4-ncvivo/${key}`
    
    return { success: true, url }
  } catch (error) {
    console.error('Erro ao fazer upload da evidência no MinIO:', error)
    return { success: false, error: 'Erro ao fazer upload da evidência no MinIO' }
  }
}

export async function updateNaoConformidadeStatus(id: string, status: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const updated = await prisma.naoConformidade.update({
      where: { id },
      data: { status }
    })

    await audit({
      userId,
      action: 'ALTERAR_STATUS_NAO_CONFORMIDADE',
      entity: 'NaoConformidade',
      entityId: id,
      details: { status }
    })

    revalidatePath('/dashboard/naoconformidades')
    return { success: true, data: updated }
  } catch (error: any) {
    console.error('Erro ao alterar status:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteNaoConformidade(id: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Sem permissão' }
    }

    const userId = (session.user as any).id

    await prisma.naoConformidade.delete({
      where: { id }
    })

    await audit({
      userId,
      action: 'EXCLUIR_NAO_CONFORMIDADE',
      entity: 'NaoConformidade',
      entityId: id
    })

    revalidatePath('/dashboard/naoconformidades')
    return { success: true }
  } catch (error: any) {
    console.error('Erro ao excluir não conformidade:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteNaoConformidadeUpdate(id: string, updateDate: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const item = await prisma.naoConformidade.findUnique({
      where: { id }
    })

    if (!item) return { success: false, error: 'Não conformidade não encontrada' }

    let currentUpdates: any[] = []
    if (item.updates && typeof item.updates === 'object') {
      currentUpdates = Array.isArray(item.updates) ? item.updates : []
    }

    // 1. Delete image from MinIO if it exists
    const updateToDelete = currentUpdates.find((up: any) => up.date === updateDate)
    if (updateToDelete && updateToDelete.fotoUrl) {
      try {
        const bucket = 'sg4-ncvivo'
        const bucketPart = `/${bucket}/`
        const idx = updateToDelete.fotoUrl.indexOf(bucketPart)
        if (idx !== -1) {
          const key = updateToDelete.fotoUrl.substring(idx + bucketPart.length)
          const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
          })
          await s3Client.send(command)
        }
      } catch (err) {
        console.error('Erro ao deletar foto do MinIO:', err)
      }
    }

    // 2. Remove from database
    const updatedUpdates = currentUpdates.filter((up: any) => up.date !== updateDate)

    const updated = await prisma.naoConformidade.update({
      where: { id },
      data: {
        updates: updatedUpdates
      }
    })

    await audit({
      userId,
      action: 'EXCLUIR_ATUALIZACAO_NAO_CONFORMIDADE',
      entity: 'NaoConformidade',
      entityId: id,
      details: { updateDate }
    })

    revalidatePath('/dashboard/naoconformidades')
    return { success: true, data: updated }
  } catch (error: any) {
    console.error('Erro ao excluir atualização:', error)
    return { success: false, error: error.message }
  }
}

export async function replaceNaoConformidadeUpdateImage(id: string, updateDate: string, newFotoUrl: string | null) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const item = await prisma.naoConformidade.findUnique({
      where: { id }
    })

    if (!item) return { success: false, error: 'Não conformidade não encontrada' }

    let currentUpdates: any[] = []
    if (item.updates && typeof item.updates === 'object') {
      currentUpdates = Array.isArray(item.updates) ? item.updates : []
    }

    // 1. Delete old image from MinIO if it exists
    const updateToReplace = currentUpdates.find((up: any) => up.date === updateDate)
    if (updateToReplace && updateToReplace.fotoUrl) {
      try {
        const bucket = 'sg4-ncvivo'
        const bucketPart = `/${bucket}/`
        const idx = updateToReplace.fotoUrl.indexOf(bucketPart)
        if (idx !== -1) {
          const key = updateToReplace.fotoUrl.substring(idx + bucketPart.length)
          const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
          })
          await s3Client.send(command)
        }
      } catch (err) {
        console.error('Erro ao deletar foto antiga do MinIO:', err)
      }
    }

    // 2. Update database
    const updatedUpdates = currentUpdates.map((up: any) => {
      if (up.date === updateDate) {
        return { ...up, fotoUrl: newFotoUrl }
      }
      return up
    })

    const updated = await prisma.naoConformidade.update({
      where: { id },
      data: {
        updates: updatedUpdates
      }
    })

    await audit({
      userId,
      action: 'SUBSTITUIR_IMAGEM_ATUALIZACAO_NAO_CONFORMIDADE',
      entity: 'NaoConformidade',
      entityId: id,
      details: { updateDate, newFotoUrl }
    })

    revalidatePath('/dashboard/naoconformidades')
    return { success: true, data: updated }
  } catch (error: any) {
    console.error('Erro ao substituir imagem da atualização:', error)
    return { success: false, error: error.message }
  }
}
