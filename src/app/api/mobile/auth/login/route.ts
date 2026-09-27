import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_mobile_sg4_2026'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 })
    }

    // Busca o usuário no banco
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tecnico: true // Traz os dados do técnico caso ele esteja vinculado
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
    }

    if (!user.active) {
      return NextResponse.json({ error: 'Usuário inativo. Contate o administrador.' }, { status: 403 })
    }

    // Verifica a senha
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
    }

    // Gera o token de acesso (expira em 30 dias para não deslogar o técnico no meio da rua toda hora)
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        tecnicoId: user.tecnico?.id 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tecnico: user.tecnico ? {
          id: user.tecnico.id,
          nome: user.tecnico.nome,
          fotoUrl: user.tecnico.fotoUrl
        } : null
      }
    })

  } catch (error) {
    console.error('Erro no login mobile:', error)
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 })
  }
}
