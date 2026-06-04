import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const MAX_FAILED = 5
const LOCK_MINUTES = 15

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        // 1. Validar input com Zod
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        // 2. Buscar usuário com seu perfil de técnico
        const user = await prisma.user.findUnique({ 
          where: { email },
          include: { tecnico: { select: { id: true } } }
        })
        if (!user || !user.active) return null

        // 3. Verificar bloqueio por tentativas falhas
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error('ACCOUNT_LOCKED')
        }

        // 4. Verificar senha com bcrypt (timing-safe)
        const valid = await bcrypt.compare(password, user.password)

        if (!valid) {
          const newFailed = user.failedLogins + 1
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLogins: newFailed,
              lockedUntil:
                newFailed >= MAX_FAILED
                  ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
                  : null,
            },
          })
          return null
        }

        // 5. Login bem-sucedido — resetar contadores
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: null, lastLogin: new Date() },
        })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tecnicoId: user.tecnico?.id,
        }
      },
    }),
  ],
})
