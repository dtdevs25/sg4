import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8h
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [], // Added in auth.ts (Node runtime)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.tecnicoId = (user as any).tecnicoId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).tecnicoId = token.tecnicoId as string | undefined;
      }
      return session
    },
  },
} satisfies NextAuthConfig
