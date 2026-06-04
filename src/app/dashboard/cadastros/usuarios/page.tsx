'use client'

import { Users, Plus, Search } from 'lucide-react'

export default function UsuariosPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      <div style={{
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users color="#e53935" size={22} />
            Gestão de Usuários
          </h1>
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
            Gerencie os acessos ao sistema
          </span>
        </div>
      </div>
      
      <div style={{ background: '#fff', padding: 40, borderRadius: 10, border: '1px solid #f1f5f9', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>A gestão de usuários será implementada nesta tela.</p>
      </div>
    </div>
  )
}
