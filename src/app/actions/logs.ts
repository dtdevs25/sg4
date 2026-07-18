'use server'

import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export type AuditLogEntry = {
  id: string
  action: string
  entity: string | null
  entityId: string | null
  details: any
  ipAddress: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

export async function getLogs(opts?: {
  page?: number
  limit?: number
  search?: string
  entity?: string
}): Promise<{ success: boolean; data?: AuditLogEntry[]; total?: number; error?: string }> {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role

    if (role !== 'MASTER' && role !== 'ADMIN') {
      return { success: false, error: 'Acesso negado' }
    }

    const page  = opts?.page  ?? 1
    const limit = opts?.limit ?? 50
    const skip  = (page - 1) * limit

    const where: any = {}

    if (opts?.search) {
      where.OR = [
        { action:    { contains: opts.search, mode: 'insensitive' } },
        { entity:    { contains: opts.search, mode: 'insensitive' } },
        { entityId:  { contains: opts.search, mode: 'insensitive' } },
        { user:      { name: { contains: opts.search, mode: 'insensitive' } } },
      ]
    }

    if (opts?.entity && opts.entity !== 'all') {
      where.entity = opts.entity
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ])

    const data: AuditLogEntry[] = logs.map(l => ({
      id:        l.id,
      action:    l.action,
      entity:    l.entity,
      entityId:  l.entityId,
      details:   l.details,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
      user: l.user ? {
        id:    l.user.id,
        name:  l.user.name,
        email: l.user.email,
        role:  l.user.role,
      } : null,
    }))

    return { success: true, data, total }
  } catch (error) {
    console.error('Erro ao buscar logs:', error)
    return { success: false, error: 'Erro ao buscar logs de auditoria' }
  }
}

export async function getLogEntities(): Promise<string[]> {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (role !== 'MASTER' && role !== 'ADMIN') return []

    const results = await prisma.auditLog.findMany({
      select: { entity: true },
      distinct: ['entity'],
      where: { entity: { not: null } },
      orderBy: { entity: 'asc' }
    })

    return results.map(r => r.entity!).filter(Boolean)
  } catch {
    return []
  }
}

export async function getLastImportTime(action: 'IMPORTAR_NAO_CONFORMIDADES' | 'IMPORTAR_INSPECOES' | 'IMPORTAR_DSS' | 'IMPORTAR_APR') {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Não autorizado' }

    const lastLog = await prisma.auditLog.findFirst({
      where: { action },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, user: { select: { name: true } } }
    })

    if (!lastLog) return { success: true, data: null }

    return {
      success: true,
      data: {
        createdAt: lastLog.createdAt.toISOString(),
        userName: lastLog.user?.name || 'Sistema'
      }
    }
  } catch (error: any) {
    console.error(`Erro ao buscar último log de ${action}:`, error)
    return { success: false, error: error.message }
  }
}

