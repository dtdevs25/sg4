'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface ActionLoadingOverlayProps {
  open: boolean
  title?: string
  subtitle?: string
}

/**
 * Tela/etapa de carregamento bloqueante que impede cliques duplicados
 * enquanto uma ação de cadastro, salvamento, exclusão ou envio aguarda resposta do servidor.
 */
export function ActionLoadingOverlay({
  open,
  title = 'Processando e salvando...',
  subtitle = 'Por favor, aguarde a confirmação do servidor. Não clique novamente nem feche esta tela.',
}: ActionLoadingOverlayProps) {
  if (!open) return null

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-busy="true"
      onClick={(e) => {
        e.stopPropagation()
      }}
      onMouseDown={(e) => {
        e.stopPropagation()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        pointerEvents: 'all',
        cursor: 'wait',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '32px 36px',
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(102, 0, 153, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 16,
          animation: 'sg4LoadingFadeIn 0.18s ease-out',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(102, 0, 153, 0.12), rgba(147, 51, 234, 0.08))',
            border: '2px solid rgba(102, 0, 153, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader2
            size={32}
            color="#660099"
            style={{ animation: 'sg4Spin 0.9s linear infinite' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: '#1e293b',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 500,
              color: '#64748b',
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes sg4Spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes sg4LoadingFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

