'use client'

import { useEffect, useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'

const INACTIVE_TIMEOUT_MS = 30 * 60 * 1000  // 30 minutos
const WARN_BEFORE_MS      =  5 * 60 * 1000  //  5 minutos antes → aviso aparece aos 25 min

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const

export function InactivityWatcher() {
  const { status } = useSession()
  const [countdown, setCountdown] = useState<number | null>(null) // segundos restantes para logout
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearAll() {
    if (timerRef.current)    clearTimeout(timerRef.current)
    if (warnRef.current)     clearTimeout(warnRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  function startCountdownDisplay(secondsLeft: number) {
    setCountdown(secondsLeft)
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) return null
        return prev - 1
      })
    }, 1_000)
  }

  function resetTimers() {
    clearAll()
    setCountdown(null)

    // Aviso 5 min antes do logout
    warnRef.current = setTimeout(() => {
      startCountdownDisplay(WARN_BEFORE_MS / 1000)
    }, INACTIVE_TIMEOUT_MS - WARN_BEFORE_MS)

    // Logout após 30 min
    timerRef.current = setTimeout(() => {
      clearAll()
      setCountdown(null)
      signOut({ callbackUrl: '/login' })
    }, INACTIVE_TIMEOUT_MS)
  }

  useEffect(() => {
    // Só monitora usuários autenticados
    if (status !== 'authenticated') return

    resetTimers()

    const handleActivity = () => resetTimers()
    EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))

    return () => {
      clearAll()
      EVENTS.forEach(e => window.removeEventListener(e, handleActivity))
    }
  }, [status])

  if (countdown === null) return null

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const urgente = countdown <= 60

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99998,
      background: urgente ? '#dc2626' : '#1e293b',
      color: '#fff',
      padding: '14px 20px',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      fontSize: 14,
      fontWeight: 600,
      maxWidth: 'calc(100vw - 40px)',
      animation: 'sg4-slidein 0.4s ease',
      transition: 'background 0.5s',
    }}>
      <style>{`
        @keyframes sg4-slidein {
          from { transform: translateX(-50%) translateY(80px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);   opacity: 1; }
        }
      `}</style>
      <span style={{ fontSize: 20 }}>{urgente ? '⚠️' : '⏱️'}</span>
      <span>
        Sessão expira em <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formattedTime}</strong> por inatividade.
      </span>
      <button
        onClick={() => resetTimers()}
        style={{
          background: urgente ? '#fff' : '#660099',
          color: urgente ? '#dc2626' : '#fff',
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
        Continuar sessão
      </button>
    </div>
  )
}
