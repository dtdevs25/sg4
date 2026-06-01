'use client'

import { signOut, useSession } from 'next-auth/react'
import { LogOut, Bell, User } from 'lucide-react'

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="h-16 bg-gradient-to-r from-red-900 via-red-700 to-red-800 flex items-center justify-between px-6 shadow-lg shadow-red-950/40 shrink-0 sticky top-0 z-30">
      {/* Logo — lado esquerdo */}
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="SG4" className="h-8 brightness-0 invert" />
      </div>

      {/* Direita: usuário + sair */}
      <div className="flex items-center gap-3">
        {/* Nome do usuário */}
        {session?.user?.name && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10">
            <User size={15} className="text-red-200" />
            <span className="text-sm text-white font-medium">{session.user.name}</span>
          </div>
        )}

        {/* Botão sair */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all duration-200 border border-white/20 hover:border-white/40"
          aria-label="Sair do sistema"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  )
}
