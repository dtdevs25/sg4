'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'

export async function getUnidades() {
  try {
    const unidades = await prisma.unidade.findMany({
      orderBy: { nome: 'asc' },
      include: {
        _count: {
          select: { tecnicos: true }
        }
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
    const { id, nome, endereco, responsavel, cidade, estado } = data
    
    if (id) {
      await prisma.unidade.update({
        where: { id },
        data: { nome, endereco, responsavel, cidade, estado }
      })
    } else {
      await prisma.unidade.create({
        data: { nome, endereco, responsavel, cidade, estado }
      })
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
    await prisma.unidade.delete({
      where: { id }
    })
    
    revalidatePath('/dashboard/cadastros/unidades')
    revalidatePath('/dashboard/cadastros/tecnicos')
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteUnidade:', error)
    return { success: false, error: error.message }
  }
}
