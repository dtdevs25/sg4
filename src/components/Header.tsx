'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, Bell, X } from 'lucide-react'

export function Header() {
  const { data: session } = useSession()
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 80,
      background: '#ffffff',
      borderBottom: '1px solid #f1f5f9',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img
          src="/logo.png"
          alt="SG4"
          style={{ height: 48, width: 'auto', objectFit: 'contain' }}
        />
      </div>

      {/* Ações direita */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Sino */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              padding: 10, border: 'none', background: 'transparent',
              cursor: 'pointer', borderRadius: 12, color: '#94a3b8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .2s',
            }}
          >
            <Bell size={24} />
          </button>

          {showNotifications && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 200 }}
                onClick={() => setShowNotifications(false)}
              />
              <div style={{
                position: 'absolute', top: '110%', right: 0,
                width: 300, background: '#fff',
                borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: '1px solid #f1f5f9', overflow: 'hidden', zIndex: 300,
              }}>
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Notificações</span>
                  <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={16} />
                  </button>
                </div>
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Nenhuma notificação no momento.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divisor */}
        <div style={{ width: 1, height: 28, background: '#f1f5f9', margin: '0 4px' }} />

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Sair do Sistema"
          style={{
            padding: 10, border: 'none', background: 'transparent',
            cursor: 'pointer', borderRadius: 12, color: '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <LogOut size={24} />
        </button>
      </div>
    </header>
  )
}
