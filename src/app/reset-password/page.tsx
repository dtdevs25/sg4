'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetPassword } from '@/app/actions/authActions'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      setError('Token ausente. Use o link enviado por e-mail.')
      return
    }
    if (form.password.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setError('')
    startTransition(async () => {
      const res = await resetPassword(token, form.password)
      if (res.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(res.error)
      }
    })
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ color: '#10b981', fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: 8 }}>Senha redefinida com sucesso!</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Redirecionando para o login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: 8 }}>
        Crie uma nova senha segura para sua conta.
      </p>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', marginBottom: 8 }}>Nova Senha</label>
        <input 
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
          placeholder="Minimo de 6 caracteres"
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', marginBottom: 8 }}>Confirmar Nova Senha</label>
        <input 
          type="password"
          required
          value={form.confirmPassword}
          onChange={(e) => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
          placeholder="Digite a senha novamente"
        />
      </div>

      <button 
        type="submit"
        disabled={pending}
        style={{
          width: '100%', padding: '14px', borderRadius: 14, border: 'none',
          background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
          color: '#660099', fontSize: '0.95rem', fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer',
          marginTop: 8, opacity: pending ? 0.7 : 1
        }}
      >
        {pending ? 'Salvando...' : 'Salvar Nova Senha'}
      </button>

      {error && (
        <div style={{ textAlign: 'center', color: '#fecaca', fontSize: '0.82rem', padding: '8px 12px', background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 10 }}>
          {error}
        </div>
      )}
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #3a005c 0%, #660099 35%, #8b2c8c 60%, #4a0072 100%)',
      fontFamily: '"Inter", sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: '40px',
        borderRadius: 24,
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        margin: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <img src="/logo.png" alt="SG4" style={{ height: 48, filter: 'brightness(0) invert(1)' }} />
        </div>
        
        <h1 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>
          Redefinir Senha
        </h1>

        <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center' }}>Carregando...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
