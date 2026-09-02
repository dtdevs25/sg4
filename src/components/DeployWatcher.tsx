'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Detecta novos deploys comparando o buildId do Next.js a cada 60s.
 * Quando detecta uma versão nova, exibe um banner pedindo ao usuário para recarregar.
 * Isso resolve o erro "Failed to find Server Action" que causa travadas após deploys.
 */
export function DeployWatcher() {
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const buildIdRef = useRef<string | null>(null)

  useEffect(() => {
    async function fetchBuildId(): Promise<string | null> {
      try {
        const res = await fetch('/_next/static/chunks/webpack.js', {
          method: 'HEAD',
          cache: 'no-store',
        })
        // Usa o header ETag ou Last-Modified como fingerprint do deploy
        return res.headers.get('etag') || res.headers.get('last-modified') || null
      } catch {
        return null
      }
    }

    // Captura o buildId inicial
    fetchBuildId().then(id => {
      buildIdRef.current = id
    })

    // Checa a cada 60 segundos
    const interval = setInterval(async () => {
      const currentId = await fetchBuildId()
      if (
        currentId &&
        buildIdRef.current &&
        currentId !== buildIdRef.current
      ) {
        setNeedsRefresh(true)
        clearInterval(interval)
      }
    }, 60_000)

    return () => clearInterval(interval)
  }, [])

  if (!needsRefresh) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99999,
      background: '#1e293b',
      color: '#fff',
      padding: '14px 20px',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      fontSize: 14,
      fontWeight: 600,
      maxWidth: 'calc(100vw - 40px)',
      animation: 'sg4-slidein 0.4s ease',
    }}>
      <style>{`
        @keyframes sg4-slidein {
          from { transform: translateX(-50%) translateY(80px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);   opacity: 1; }
        }
      `}</style>
      <span style={{ fontSize: 20 }}>🔄</span>
      <span>Nova versão disponível. Atualize para evitar erros.</span>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#660099',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Atualizar agora
      </button>
    </div>
  )
}
