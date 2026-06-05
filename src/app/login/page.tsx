'use client'

import { useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { forgotPassword } from '@/app/actions/authActions'

export default function LoginPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ show: false, msg: '' })
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [loadingForgot, setLoadingForgot] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  function showToastMsg(msg: string) {
    setToast({ show: true, msg })
    setTimeout(() => setToast({ show: false, msg: '' }), 5000)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.password) {
      showToastMsg('⚠️ Preencha usuário e senha.')
      return
    }
    startTransition(async () => {
      const res = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      if (res?.error === 'ACCOUNT_LOCKED') {
        setError('Conta bloqueada por 15 min. Muitas tentativas.')
      } else if (res?.error) {
        setError('E-mail ou senha incorretos.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    })
  }

  async function handleForgot() {
    if (!forgotEmail || !forgotEmail.includes('@')) {
      showToastMsg('⚠️ Informe um e-mail válido.')
      return
    }
    
    setLoadingForgot(true)
    const res = await forgotPassword(forgotEmail)
    setLoadingForgot(false)

    if (!res.success) {
      showToastMsg('⚠️ ' + res.error)
      return
    }

    setShowForgot(false)
    setForgotEmail('')
    showToastMsg('📧 Link de recuperação enviado para ' + forgotEmail)
  }

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

        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -4px;
          margin-bottom: 28px;
        }
        .forgot-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.70);
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 4px;
          transition: color 0.2s;
          text-decoration: underline transparent;
          text-underline-offset: 2px;
        }
        .forgot-btn:hover { color: #fff; text-decoration-color: #fff; }

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

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(80,0,0,0.55);
          backdrop-filter: blur(6px);
          animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }

        .modal {
          background: #e53935;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 24px;
          padding: 40px 36px 32px;
          max-width: 380px;
          width: 90%;
          box-shadow: 0 12px 48px rgba(0,0,0,0.4);
          animation: modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes modalIn {
          from { opacity:0; transform: scale(0.88) translateY(20px); }
          to   { opacity:1; transform: scale(1) translateY(0); }
        }
        .modal h2 { color: #fff; font-size: 1.15rem; font-weight: 700; margin-bottom: 8px; }
        .modal p  { color: rgba(255,255,255,0.60); font-size: 0.82rem; line-height: 1.6; margin-bottom: 24px; }

        .modal-actions { display: flex; gap: 12px; margin-top: 20px; }
        .btn-secondary {
          flex: 1; padding: 12px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8);
          font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; transition: background 0.2s;
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.15); }
        .btn-primary-modal {
          flex: 1; padding: 12px; border-radius: 12px; border: none;
          background: linear-gradient(135deg, #fff 0%, #ffe0e0 100%);
          color: #9b0000; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; transition: transform 0.18s, box-shadow 0.18s;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }
        .btn-primary-modal:hover { transform: translateY(-1px); }

        /* Toast */
        .toast-bar {
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%) translateY(80px);
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.25);
          color: #fff;
          padding: 12px 24px;
          border-radius: 40px;
          font-family: 'Inter', sans-serif;
          font-size: 0.83rem;
          font-weight: 500;
          z-index: 200;
          transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s;
          opacity: 0;
          white-space: nowrap;
        }
        .toast-bar.show {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }

        @media (max-width: 480px) {
          .login-card { padding: 36px 24px 32px; border-radius: 22px; }
          .logo-wrap img { width: 150px; }
        }
      `}</style>

      <div className="login-root">
        {/* Blobs */}
        <div className="blob1" aria-hidden="true" />
        <div className="blob2" aria-hidden="true" />

        {/* Floating particles */}
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

        {/* Login Card */}
        <main className="login-card" role="main" aria-label="Formulário de login">
          {/* Logo */}
          <div className="logo-wrap">
            <img src="/logo.png" alt="SG4 — Segurança do Trabalho" />
          </div>

          {/* Tagline */}
          <div className="tagline">
            <h1>Gestão de Segurança do Trabalho</h1>
          </div>
          <div className="divider" />

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate autoComplete="off">
            {/* Usuário (e-mail) */}
            <label className="form-label" htmlFor="email">Usuário</label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                className="login-input"
                placeholder="Digite seu e-mail"
                value={form.email}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </div>

            {/* Senha */}
            <label className="form-label" htmlFor="password">Senha</label>
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
                placeholder="Digite sua senha"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
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

            {/* Esqueci a senha */}
            <div className="forgot-row">
              <button
                type="button"
                className="forgot-btn"
                onClick={() => setShowForgot(true)}
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              className="btn-login"
              disabled={pending}
            >
              {pending ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg style={{ animation: 'spin 0.7s linear infinite' }} width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="rgba(180,0,0,0.3)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#9b0000" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Entrando…
                </span>
              ) : 'Entrar'}
            </button>

            {/* Error */}
            {error && <div className="error-msg" role="alert">{error}</div>}
          </form>
        </main>

        {/* Modal Esqueci a Senha */}
        {showForgot && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalTitle"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForgot(false) }}
          >
            <div className="modal">
              <h2 id="modalTitle">Recuperar Acesso</h2>
              <p>Informe seu e-mail cadastrado. Enviaremos um link para redefinir sua senha.</p>
              <label className="form-label" htmlFor="recoveryEmail">E-mail</label>
              <div className="input-wrap">
                <span className="input-icon" aria-hidden="true">
                  <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2 7 10 7 10-7"/>
                  </svg>
                </span>
                <input
                  id="recoveryEmail"
                  type="email"
                  className="login-input"
                  placeholder="seu@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => { setShowForgot(false); setForgotEmail('') }} disabled={loadingForgot}>
                  Cancelar
                </button>
                <button className="btn-primary-modal" onClick={handleForgot} disabled={loadingForgot}>
                  {loadingForgot ? 'Enviando...' : 'Enviar Link'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        <div className={`toast-bar${toast.show ? ' show' : ''}`} role="alert" aria-live="polite">
          {toast.msg}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
