/**
 * audit.ts — Helper centralizado para gravar AuditLog.
 * Chame `audit()` depois de qualquer operação mutável (create/update/delete).
 * Fire-and-forget: nunca lança exceção para não afetar o fluxo principal.
 */

import { prisma } from '@/lib/db'

export async function audit(opts: {
  userId?: string | null
  action: string
  entity?: string | null
  entityId?: string | null
  details?: Record<string, any> | null
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId:   opts.userId   ?? null,
        action:   opts.action,
        entity:   opts.entity   ?? null,
        entityId: opts.entityId ?? null,
        details:  opts.details  ?? null,
      }
    })
  } catch {
    // silencia — log não pode derrubar a operação
  }
}
