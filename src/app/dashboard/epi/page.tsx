'use client'

import { HardHat } from 'lucide-react'

export default function EPIPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 24,
      padding: 32,
    }}>
      {/* Icon badge */}
      <div style={{
        width: 96,
        height: 96,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(102,0,153,0.12), rgba(102,0,153,0.04))',
        border: '2px solid rgba(102,0,153,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <HardHat size={44} style={{ color: '#660099' }} />
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          color: '#1e293b',
          marginBottom: 8,
          letterSpacing: '-0.5px',
        }}>
          EPI — Equipamento de Proteção Individual
        </h1>
        <p style={{
          fontSize: 15,
          color: '#94a3b8',
          maxWidth: 440,
          lineHeight: 1.6,
        }}>
          Este módulo está em desenvolvimento. Em breve você poderá controlar a entrega,
          validade e conformidade dos EPIs de toda a equipe por aqui.
        </p>
      </div>

      {/* Status badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 20px',
        borderRadius: 999,
        background: 'rgba(102,0,153,0.08)',
        border: '1px solid rgba(102,0,153,0.18)',
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#660099',
          display: 'inline-block',
          animation: 'pulse 2s infinite',
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#660099' }}>
          Em desenvolvimento
        </span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}
