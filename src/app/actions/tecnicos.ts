'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function getTecnicos() {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const role = (session.user as any).role
    const tecnicoId = (session.user as any).tecnicoId

    if (role === 'TST' && !tecnicoId) {
      return { success: false, error: 'Perfil de técnico não vinculado a este usuário.' }
    }

    const tecnicos = await prisma.tecnico.findMany({
      orderBy: { nome: 'asc' },
      include: { unidades: true, baseFixa: true }
    })
    return { success: true, data: tecnicos }
  } catch (error) {
    console.error('Erro ao buscar técnicos:', error)
    return { success: false, error: 'Erro ao buscar técnicos' }
  }
}

import { PutObjectCommand } from '@aws-sdk/client-s3'
import s3Client from '@/lib/s3'

export async function uploadFotoTecnico(fileData: string, fileName: string, contentType: string) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role === 'TST') return { success: false, error: 'Não autorizado' }

    const buffer = Buffer.from(fileData.split(',')[1], 'base64')
    const ext = fileName.split('.').pop()
    const key = `fotos/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    
    const command = new PutObjectCommand({
      Bucket: 'sg4-fototecnicos',
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read'
    })

    await s3Client.send(command)
    
    const baseUrl = (process.env.S3_ENDPOINT || 'https://storage-api.ehspro.com.br').replace(/\/$/, '')
    const url = `${baseUrl}/sg4-fototecnicos/${key}`
    
    return { success: true, url }
  } catch (error) {
    console.error('Erro ao fazer upload da foto:', error)
    return { success: false, error: 'Erro ao fazer upload da foto no MinIO' }
  }
}

export async function saveTecnico(data: { id?: string, nome: string, email: string, telefone: string, admissao: string, fotoUrl?: string, unidadeIds?: string[], baseFixaId?: string | null, contaMeta?: boolean }) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role === 'TST') return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const parts = data.admissao.split('/')
    const admissaoDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`)

    const payload: any = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      cargo: 'Técnico de Segurança do Trabalho',
      admissao: admissaoDate,
      fotoUrl: data.fotoUrl,
      baseFixaId: data.baseFixaId || null,
      contaMeta: data.contaMeta !== undefined ? data.contaMeta : true
    }

    if (data.unidadeIds !== undefined) {
      payload.unidades = { set: data.unidadeIds.map(id => ({ id })) }
    }

    if (data.id) {
      await prisma.tecnico.update({ where: { id: data.id }, data: payload })
      await audit({ userId, action: 'EDITAR_TECNICO', entity: 'Técnico', entityId: data.id, details: { nome: data.nome } })
    } else {
      const tecnico = await prisma.tecnico.create({ data: payload })
      await audit({ userId, action: 'CRIAR_TECNICO', entity: 'Técnico', entityId: tecnico.id, details: { nome: data.nome } })
    }

    return { success: true }
  } catch (error) {
    console.error('Erro ao salvar técnico:', error)
    return { success: false, error: 'Erro ao salvar técnico' }
  }
}

export async function toggleTecnicoStatus(id: string) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role === 'TST') return { success: false, error: 'Não autorizado' }
    const userId = (session.user as any).id

    const target = await prisma.tecnico.findUnique({ where: { id } })
    if (!target) return { success: false, error: 'Técnico não encontrado' }

    await prisma.tecnico.update({ where: { id }, data: { ativo: !target.ativo } })
    await audit({ userId, action: target.ativo ? 'DESATIVAR_TECNICO' : 'ATIVAR_TECNICO', entity: 'Técnico', entityId: id, details: { nome: target.nome } })

    return { success: true }
  } catch (error) {
    console.error('Erro ao alterar status:', error)
    return { success: false, error: 'Erro ao alterar status' }
  }
}

export async function deleteTecnico(id: string) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Acesso negado. Apenas administradores podem excluir registros.' }
    }
    const userId = (session?.user as any)?.id

    const target = await prisma.tecnico.findUnique({ where: { id } })
    if (!target) return { success: false, error: 'Técnico não encontrado' }

    await prisma.tecnico.delete({ where: { id } })
    await audit({ userId, action: 'EXCLUIR_TECNICO', entity: 'Técnico', entityId: id, details: { nome: target.nome } })

    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir técnico:', error)
    return { success: false, error: 'Erro ao excluir técnico. Verifique se ele não possui vínculos ativos.' }
  }
}
