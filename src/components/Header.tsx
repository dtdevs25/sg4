'use client'

import { signOut } from 'next-auth/react'
import { LogOut, Menu } from 'lucide-react'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-[80px] bg-[#660099] border-b border-[#4a0072] z-[100] flex items-center justify-between px-[16px] md:px-[32px] shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
      {/* Logos */}
      <div className="flex items-center gap-[12px] md:gap-[16px]">
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('toggleSidebar'))} 
          className="md:hidden text-white p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors mr-1"
        >
          <Menu size={24} />
        </button>
        <img
          src="/logo.png"
          alt="SG4"
          className="h-[36px] md:h-[48px] w-auto object-contain brightness-0 invert"
        />
        <div className="hidden sm:block w-[1px] h-[32px] bg-[rgba(255,255,255,0.4)]" />
        <img
          src="/logovivo.png"
          alt="Vivo"
          className="hidden sm:block h-[32px] md:h-[40px] w-auto object-contain brightness-0 invert"
        />
      </div>

      {/* Logout */}
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        title="Sair do Sistema"
        className="p-[10px] border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.1)] cursor-pointer rounded-[12px] text-white flex items-center justify-center transition-all duration-200 hover:bg-[rgba(255,255,255,0.2)]"
      >
        <LogOut size={20} />
      </button>
    </header>
  )
}
