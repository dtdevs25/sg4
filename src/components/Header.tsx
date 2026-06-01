'use client'

import { signOut, useSession } from 'next-auth/react'
import { LogOut, Bell, User } from 'lucide-react'

export function Header() {
  const { data: session } = useSession()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.href = '/login'
  }

  return (
    <header className="h-16 bg-red-600 flex items-center justify-between pl-16 pr-8 md:pl-20 md:pr-12 shadow-md shrink-0 sticky top-0 z-30">
      {/* Logo — lado esquerdo (um pouco maior) */}
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="SG4" className="h-12 w-auto brightness-0 invert object-contain" />
      </div>

      {/* Direita: botão de sair (apenas o ícone) */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/20 hover:border-white/40 active:scale-95"
          aria-label="Sair do sistema"
          title="Sair do sistema"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
