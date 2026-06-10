'use client'

import { signOut } from 'next-auth/react'
import { LogOut, Menu } from 'lucide-react'

export function Header() {
  return (
    <header style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 80,
      background: '#660099',
      borderBottom: '1px solid #4a0072',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      {/* Logos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggleSidebar'))}
          className="mobile-menu-btn"
          style={{
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff',
            marginRight: 8,
          }}
        >
          <Menu size={22} />
        </button>
        <style>{`
          .mobile-menu-btn { display: none; }
          @media (max-width: 768px) {
            .mobile-menu-btn { display: flex; align-items: center; justify-content: center; }
          }
        `}</style>
        <img
          src="/logo.png"
          alt="SG4"
          style={{ height: 48, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
        />
        <div style={{ width: 1, height: 32, background: 'rgba(255, 255, 255, 0.4)' }} />
        <img
          src="/logovivo.png"
          alt="Vivo"
          style={{ height: 40, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
        />
      </div>

      {/* Logout */}
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        title="Sair do Sistema"
        style={{
          padding: 10, border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.1)',
          cursor: 'pointer', borderRadius: 12, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
        }}
      >
        <LogOut size={20} />
      </button>
    </header>
  )
}
