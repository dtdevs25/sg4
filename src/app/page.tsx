'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetPassword } from '@/app/actions/authActions'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [pending, startTransition] = useTransition()
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
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
        setError(res.error || 'Erro desconhecido. Tente novamente.')
      }
    })
  }

  if (success) {
    return (
      <main className="login-card" role="main">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ color: '#10b981', fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: 8 }}>Senha redefinida com sucesso!</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Redirecionando para o login...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="login-card" role="main">
      <div className="logo-wrap">
        <img src="/logo.png" alt="SG4" />
      </div>
      <div className="tagline">
        <h1>Redefinição de Senha</h1>
      </div>
      <div className="divider" />

      <form onSubmit={handleSubmit} noValidate autoComplete="off">
        {/* Nova Senha */}
        <label className="form-label" htmlFor="password">Nova Senha</label>
        <div className="input-wrap">
          <span className="input-icon" aria-hidden="true">
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path strokeLinecap="round" d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <input
            id="password"
            name="password"
            type={showPwd ? 'text' : 'password'}
            className="login-input"
            placeholder="No mínimo 6 caracteres"
            value={form.password}
            onChange={(e) => { setForm(p => ({ ...p, password: e.target.value })); setError('') }}
            required
          />
          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowPwd((p) => !p)}
            aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPwd ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.364 0-10-7-10-7a17.83 17.83 0 0 1 4.95-6.03M9.9 4.24A9.12 9.12 0 0 1 12 4c6.364 0 10 7 10 7a17.82 17.82 0 0 1-2.58 3.58M3 3l18 18"/>
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.636-7 10-7 10 7 10 7-3.636 7-10 7S2 12 2 12z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        {/* Confirmar Senha */}
        <label className="form-label" htmlFor="confirmPassword">Confirmar Nova Senha</label>
        <div className="input-wrap">
          <span className="input-icon" aria-hidden="true">
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path strokeLinecap="round" d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPwd ? 'text' : 'password'}
            className="login-input"
            placeholder="Digite a senha novamente"
            value={form.confirmPassword}
            onChange={(e) => { setForm(p => ({ ...p, confirmPassword: e.target.value })); setError('') }}
            required
          />
          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowConfirmPwd((p) => !p)}
            aria-label={showConfirmPwd ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showConfirmPwd ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.364 0-10-7-10-7a17.83 17.83 0 0 1 4.95-6.03M9.9 4.24A9.12 9.12 0 0 1 12 4c6.364 0 10 7 10 7a17.82 17.82 0 0 1-2.58 3.58M3 3l18 18"/>
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.636-7 10-7 10 7 10 7-3.636 7-10 7S2 12 2 12z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        <button type="submit" className="btn-login" disabled={pending} style={{ marginTop: 12 }}>
          {pending ? 'Salvando...' : 'Salvar Nova Senha'}
        </button>

        {error && <div className="error-msg" role="alert">{error}</div>}
      </form>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .login-root {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #7f0000 0%, #b91c1c 35%, #c0392b 60%, #8b0000 100%);
          position: relative;
          overflow: hidden;
        }

        .blob1, .blob2 {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }
        .blob1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(255,100,100,0.35) 0%, transparent 70%);
          top: -150px; left: -150px;
          filter: blur(80px);
          animation: blobMove1 8s ease-in-out infinite alternate;
        }
        .blob2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(120,0,0,0.5) 0%, transparent 70%);
          bottom: -120px; right: -120px;
          filter: blur(80px);
          animation: blobMove2 10s ease-in-out infinite alternate;
        }
        @keyframes blobMove1 {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(60px,40px) scale(1.1); }
        }
        @keyframes blobMove2 {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(-50px,-30px) scale(1.08); }
        }

        .particle {
          position: fixed;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          animation: floatUp linear infinite;
          pointer-events: none;
          z-index: 0;
        }
        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(-110vh) rotate(720deg); opacity: 0; }
        }

        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          padding: 48px 40px 40px;
          border-radius: 28px;
          background: rgba(255,255,255,0.10);
          backdrop-filter: blur(28px) saturate(1.8);
          -webkit-backdrop-filter: blur(28px) saturate(1.8);
          border: 1px solid rgba(255,255,255,0.22);
          box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.25);
          animation: cardIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both;
          margin: 24px 16px;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .logo-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 10px;
          animation: logoIn 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.15s both;
        }
        .logo-wrap img {
          width: 180px;
          height: auto;
          filter: brightness(0) invert(1);
        }
        @keyframes logoIn {
          from { opacity: 0; transform: scale(0.8) translateY(-10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .tagline {
          text-align: center;
          margin-bottom: 10px;
        }
        .tagline h1 {
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          letter-spacing: 0.5px;
        }

        .divider {
          width: 40px;
          height: 2px;
          background: rgba(255,255,255,0.35);
          border-radius: 2px;
          margin: 0 auto 28px;
        }

        .form-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .input-wrap {
          position: relative;
          margin-bottom: 18px;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.6);
          pointer-events: none;
          display: flex;
          align-items: center;
        }
        .login-input {
          width: 100%;
          padding: 13px 44px 13px 42px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.25);
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
          backdrop-filter: blur(4px);
        }
        .login-input::placeholder { color: rgba(255,255,255,0.5); }
        .login-input:focus {
          border-color: rgba(255,255,255,0.65);
          background: rgba(255,255,255,0.35);
          box-shadow: 0 0 0 3px rgba(255,255,255,0.15);
        }
        .login-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px rgba(180,0,0,0.6) inset;
          -webkit-text-fill-color: #fff;
        }

        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.6);
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.2s, background 0.2s;
        }
        .eye-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }

        .btn-login {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: #9b0000;
          background: linear-gradient(135deg, #ffffff 0%, #ffe0e0 100%);
          box-shadow: 0 4px 20px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15);
          transition: transform 0.18s, box-shadow 0.18s, filter 0.18s;
          position: relative;
          overflow: hidden;
        }
        .btn-login:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.30);
          filter: brightness(1.04);
        }
        .btn-login:active:not(:disabled) { transform: translateY(0); }
        .btn-login:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .error-msg {
          text-align: center;
          color: #fecaca;
          font-size: 0.82rem;
          font-weight: 500;
          margin-top: 12px;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(255,0,0,0.15);
          border: 1px solid rgba(255,100,100,0.3);
        }

        @media (max-width: 480px) {
          .login-card { padding: 36px 24px 32px; border-radius: 22px; }
          .logo-wrap img { width: 150px; }
        }
      `}</style>

      <div className="login-root">
        <div className="blob1" aria-hidden="true" />
        <div className="blob2" aria-hidden="true" />

        {[
          { w: 8,  l: '10%', d: '12s', delay: '0s'   },
          { w: 5,  l: '25%', d: '9s',  delay: '2s'   },
          { w: 12, l: '40%', d: '15s', delay: '1s'   },
          { w: 6,  l: '60%', d: '11s', delay: '3s'   },
          { w: 9,  l: '75%', d: '13s', delay: '0.5s' },
          { w: 4,  l: '88%', d: '10s', delay: '4s'   },
          { w: 7,  l: '50%', d: '14s', delay: '1.5s' },
        ].map((p, i) => (
          <span
            key={i}
            className="particle"
            style={{
              width: p.w, height: p.w,
              left: p.l, bottom: '-20px',
              animationDuration: p.d,
              animationDelay: p.delay,
            }}
            aria-hidden="true"
          />
        ))}

        <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', zIndex: 10 }}>Carregando...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </>
  )
}
