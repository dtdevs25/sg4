'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function getUnidades() {
  try {
    const unidades = await prisma.unidade.findMany({
      orderBy: { nome: 'asc' },
      include: {
        _count: { select: { tecnicos: true } },
        tecnicos: { select: { id: true, nome: true } }
      }
    })
    return { success: true, data: unidades }
  } catch (error: any) {
    console.error('Error in getUnidades:', error)
    return { success: false, error: error.message }
  }
}

export async function saveUnidade(data: { id?: string; nome: string; endereco?: string; responsavel?: string; cidade?: string; estado?: string }) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id ?? null
    const { id, nome, endereco, responsavel, cidade, estado } = data
    
    if (id) {
      await prisma.unidade.update({ where: { id }, data: { nome, endereco, responsavel, cidade, estado } })
      await audit({ userId, action: 'EDITAR_UNIDADE', entity: 'Unidade', entityId: id, details: { nome } })
    } else {
      const unidade = await prisma.unidade.create({ data: { nome, endereco, responsavel, cidade, estado } })
      await audit({ userId, action: 'CRIAR_UNIDADE', entity: 'Unidade', entityId: unidade.id, details: { nome } })
    }

    revalidatePath('/dashboard/cadastros/unidades')
    revalidatePath('/dashboard/cadastros/tecnicos')
    return { success: true }
  } catch (error: any) {
    console.error('Error in saveUnidade:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteUnidade(id: string) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id ?? null

    const unidade = await prisma.unidade.findUnique({ where: { id } })
    await prisma.unidade.delete({ where: { id } })
    await audit({ userId, action: 'EXCLUIR_UNIDADE', entity: 'Unidade', entityId: id, details: { nome: unidade?.nome } })
    
    revalidatePath('/dashboard/cadastros/unidades')
    revalidatePath('/dashboard/cadastros/tecnicos')
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteUnidade:', error)
    return { success: false, error: error.message }
  }
}
