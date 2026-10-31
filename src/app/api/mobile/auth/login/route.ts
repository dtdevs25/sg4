import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { forgotPassword } from '@/app/actions/authActions'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_mobile_sg4_2026'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = (body.email || '').trim().toLowerCase()
    const password = body.password || ''

    if (body.action === 'FORGOT_PASSWORD') {
      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { success: false, error: 'Informe um e-mail válido.' },
          { status: 400, headers: CORS_HEADERS }
        )
      }
      const res = await forgotPassword(email)
      if (!res.success) {
        return NextResponse.json(
          { success: false, error: res.error || 'Não foi possível enviar o link de recuperação.' },
          { status: 400, headers: CORS_HEADERS }
        )
      }
      return NextResponse.json(
        {
          success: true,
          message: `Link de recuperação enviado para ${email}`,
        },
        { headers: CORS_HEADERS }
      )
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tecnico: {
          include: {
            baseFixa: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Usuário inativo. Contate o administrador.' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'Conta temporariamente bloqueada por tentativas excessivas.' },
        { status: 429, headers: CORS_HEADERS }
      )
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLogin: new Date() },
    })

    // Se o usuário for MASTER/ADMIN e não tiver técnico vinculado direto, busca o primeiro técnico ativo como fallback opcional
    let defaultTecnico = user.tecnico
    if (!defaultTecnico) {
      defaultTecnico = await prisma.tecnico.findFirst({
        where: { ativo: true },
        include: { baseFixa: true },
        orderBy: { nome: 'asc' },
      })
    }

    const token = jwt.sign(
      {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tecnicoId: user.tecnico?.id || defaultTecnico?.id || null,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    return NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tecnicoId: user.tecnico?.id || defaultTecnico?.id || null,
          tecnico: (user.tecnico || defaultTecnico)
            ? {
                id: (user.tecnico || defaultTecnico)!.id,
                nome: (user.tecnico || defaultTecnico)!.nome,
                email: (user.tecnico || defaultTecnico)!.email,
                telefone: (user.tecnico || defaultTecnico)!.telefone,
                cargo: (user.tecnico || defaultTecnico)!.cargo,
                fotoUrl: (user.tecnico || defaultTecnico)!.fotoUrl,
                veiculo: (user.tecnico || defaultTecnico)!.veiculo,
                matriculaArkium: (user.tecnico || defaultTecnico)!.matriculaArkium,
                orcamentoAbastecimento: (user.tecnico || defaultTecnico)!.orcamentoAbastecimento,
                baseFixaNome: (user.tecnico || defaultTecnico)!.baseFixa?.nome || null,
              }
            : null,
        },
      },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('Erro no login mobile:', error)
    return NextResponse.json(
      { error: 'Erro interno no servidor.' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
