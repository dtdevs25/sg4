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
  // Evita IDs simbólicos que violam a FK audit_logs_userId_fkey
  const safeUserId =
    opts.userId && opts.userId !== 'CRON_SYSTEM' && opts.userId !== 'SYSTEM'
      ? opts.userId
      : null

  const detailsPayload =
    opts.userId && !safeUserId
      ? { ...(opts.details || {}), executor: opts.userId }
      : opts.details

  try {
    await prisma.auditLog.create({
      data: {
        userId:   safeUserId,
        action:   opts.action,
        entity:   opts.entity   ?? null,
        entityId: opts.entityId ?? null,
        details:  detailsPayload ? detailsPayload : undefined,
      }
    })
  } catch (err: any) {
    // Se o userId fornecido não existir na tabela User (erro P2003 de FK), salva com userId null
    if (safeUserId && err?.code === 'P2003') {
      try {
        await prisma.auditLog.create({
          data: {
            userId:   null,
            action:   opts.action,
            entity:   opts.entity   ?? null,
            entityId: opts.entityId ?? null,
            details:  { ...(opts.details || {}), _unmatchedUserId: safeUserId },
          }
        })
      } catch {
        // silencia
      }
    }
  }
}
