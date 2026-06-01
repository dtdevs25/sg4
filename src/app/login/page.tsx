'use client'

import { useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import Image from 'next/image'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

export default function LoginPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = schema.safeParse(form)
    if (!result.success) {
      setError(result.error.issues[0].message)
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

  function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!forgotEmail.includes('@')) {
      setForgotMsg('Informe um e-mail válido.')
      return
    }
    setForgotMsg('✅ Se o e-mail existir, enviaremos as instruções.')
    setTimeout(() => setShowForgot(false), 3000)
  }

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'Inter',sans-serif}
        body{
          display:flex;align-items:center;justify-content:center;
          min-height:100vh;overflow:hidden;
          background:linear-gradient(135deg,#7f0000 0%,#b91c1c 35%,#c0392b 60%,#8b0000 100%);
          position:relative;
        }
        body::before{
          content:'';position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0;
          width:600px;height:600px;
          background:radial-gradient(circle,rgba(255,100,100,.35) 0%,transparent 70%);
          top:-150px;left:-150px;
          animation:blob1 8s ease-in-out infinite alternate;
        }
        body::after{
          content:'';position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0;
          width:500px;height:500px;
          background:radial-gradient(circle,rgba(120,0,0,.5) 0%,transparent 70%);
          bottom:-120px;right:-120px;
          animation:blob2 10s ease-in-out infinite alternate;
        }
        @keyframes blob1{from{transform:translate(0,0) scale(1)}to{transform:translate(60px,40px) scale(1.1)}}
        @keyframes blob2{from{transform:translate(0,0) scale(1)}to{transform:translate(-50px,-30px) scale(1.08)}}
        .card{
          position:relative;z-index:10;width:100%;max-width:420px;
          padding:40px 40px 36px;border-radius:28px;
          background:rgba(255,255,255,.10);
          backdrop-filter:blur(28px) saturate(1.8);
          -webkit-backdrop-filter:blur(28px) saturate(1.8);
          border:1px solid rgba(255,255,255,.22);
          box-shadow:0 8px 32px rgba(0,0,0,.35),0 2px 8px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.25);
          animation:cardIn .7s cubic-bezier(.34,1.56,.64,1) both;
        }
        @keyframes cardIn{from{opacity:0;transform:translateY(40px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
        .logo-wrap{display:flex;justify-content:center;margin-bottom:12px;}
        .logo-wrap img{width:180px;height:auto;filter:brightness(0) invert(1);}
        .title{text-align:center;color:#fff;font-size:1rem;font-weight:600;letter-spacing:.5px;margin-bottom:28px;}
        .divider{width:40px;height:2px;background:rgba(255,255,255,.3);border-radius:2px;margin:0 auto 24px;}
        .label{display:block;font-size:.75rem;font-weight:600;color:rgba(255,255,255,.8);letter-spacing:.8px;text-transform:uppercase;margin-bottom:7px;}
        .input-wrap{position:relative;margin-bottom:16px;}
        .input-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,.6);pointer-events:none;display:flex;align-items:center;}
        .input{width:100%;padding:13px 44px 13px 42px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.10);color:#fff;font-family:inherit;font-size:.9rem;outline:none;transition:border-color .25s,background .25s,box-shadow .25s;}
        .input::placeholder{color:rgba(255,255,255,.38);}
        .input:focus{border-color:rgba(255,255,255,.55);background:rgba(255,255,255,.16);box-shadow:0 0 0 3px rgba(255,255,255,.10);}
        .input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px rgba(150,0,0,.7) inset;-webkit-text-fill-color:#fff;}
        .eye-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,.6);display:flex;align-items:center;padding:4px;border-radius:6px;transition:color .2s,background .2s;}
        .eye-btn:hover{color:#fff;background:rgba(255,255,255,.1);}
        .forgot-row{display:flex;justify-content:flex-end;margin-bottom:24px;}
        .forgot-btn{background:none;border:none;color:rgba(255,255,255,.7);font-family:inherit;font-size:.78rem;font-weight:500;cursor:pointer;padding:2px 4px;border-radius:4px;transition:color .2s;text-decoration:underline;text-underline-offset:2px;}
        .forgot-btn:hover{color:#fff;}
        .btn-login{width:100%;padding:14px;border-radius:14px;border:none;cursor:pointer;font-family:inherit;font-size:.95rem;font-weight:700;letter-spacing:.5px;color:#9b0000;background:linear-gradient(135deg,#fff 0%,#ffe0e0 100%);box-shadow:0 4px 20px rgba(0,0,0,.25);transition:transform .18s,box-shadow .18s,opacity .2s;}
        .btn-login:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,.3);}
        .btn-login:disabled{opacity:.65;cursor:not-allowed;}
        .error-msg{background:rgba(255,80,80,.2);border:1px solid rgba(255,120,120,.4);color:#ffcccc;padding:10px 14px;border-radius:10px;font-size:.82rem;text-align:center;margin-bottom:16px;}
        /* Modal */
        .overlay{display:flex;position:fixed;inset:0;z-index:100;align-items:center;justify-content:center;background:rgba(80,0,0,.55);backdrop-filter:blur(6px);}
        .modal{background:rgba(255,255,255,.12);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,.25);border-radius:24px;padding:36px 32px 28px;max-width:380px;width:90%;box-shadow:0 12px 48px rgba(0,0,0,.4);animation:cardIn .35s cubic-bezier(.34,1.56,.64,1) both;}
        .modal h2{color:#fff;font-size:1.1rem;font-weight:700;margin-bottom:8px;}
        .modal p{color:rgba(255,255,255,.65);font-size:.82rem;line-height:1.6;margin-bottom:20px;}
        .modal-actions{display:flex;gap:12px;margin-top:4px;}
        .btn-sec{flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:rgba(255,255,255,.85);font-family:inherit;font-size:.85rem;font-weight:600;cursor:pointer;transition:background .2s;}
        .btn-sec:hover{background:rgba(255,255,255,.15);}
        .btn-pri{flex:1;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,#fff,#ffe0e0);color:#9b0000;font-family:inherit;font-size:.85rem;font-weight:700;cursor:pointer;transition:transform .18s;box-shadow:0 4px 16px rgba(0,0,0,.2);}
        .btn-pri:hover{transform:translateY(-1px);}
        .forgot-msg{font-size:.8rem;text-align:center;margin-top:12px;color:#ffe0e0;}
        @media(max-width:480px){body{align-items:flex-start;padding:40px 16px;overflow:auto}.card{padding:32px 20px 28px;border-radius:20px}.logo-wrap img{width:150px}}
      `}</style>

      <div className="card">
        {/* Logo */}
        <div className="logo-wrap">
          <img src="/logo.png" alt="SG4 Segurança do Trabalho" />
        </div>
        <h1 className="title">Gestão de Segurança do Trabalho</h1>
        <div className="divider" />

        {/* Error */}
        {error && <div className="error-msg" role="alert">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          {/* E-mail */}
          <label className="label" htmlFor="email">E-mail</label>
          <div className="input-wrap">
            <span className="input-icon">
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2 7 10 7 10-7"/>
              </svg>
            </span>
            <input id="email" name="email" type="email" className="input" placeholder="seu@email.com"
              value={form.email} onChange={handleChange} autoComplete="email" required />
          </div>

          {/* Senha */}
          <label className="label" htmlFor="password">Senha</label>
          <div className="input-wrap">
            <span className="input-icon">
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path strokeLinecap="round" d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input id="password" name="password" type={showPwd ? 'text' : 'password'}
              className="input" placeholder="Mínimo 8 caracteres"
              value={form.password} onChange={handleChange} autoComplete="current-password" required />
            <button type="button" className="eye-btn" onClick={() => setShowPwd((p) => !p)}
              aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}>
              {showPwd ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.364 0-10-7-10-7a17.83 17.83 0 0 1 4.95-6.03M9.9 4.24A9.12 9.12 0 0 1 12 4c6.364 0 10 7 10 7a17.82 17.82 0 0 1-2.58 3.58M3 3l18 18"/>
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.636-7 10-7 10 7 10 7-3.636 7-10 7S2 12 2 12z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {/* Esqueci */}
          <div className="forgot-row">
            <button type="button" className="forgot-btn" onClick={() => setShowForgot(true)}>
              Esqueci minha senha
            </button>
          </div>

          <button type="submit" className="btn-login" disabled={pending}>
            {pending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      {/* Modal Esqueci a Senha */}
      {showForgot && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setShowForgot(false)}>
          <div className="modal" role="dialog" aria-modal aria-labelledby="modal-title">
            <h2 id="modal-title">Recuperar Acesso</h2>
            <p>Informe seu e-mail cadastrado. Enviaremos um link para redefinir sua senha.</p>
            <form onSubmit={handleForgot}>
              <label className="label" htmlFor="forgotEmail">E-mail</label>
              <div className="input-wrap">
                <span className="input-icon">
                  <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2 7 10 7 10-7"/>
                  </svg>
                </span>
                <input id="forgotEmail" type="email" className="input" placeholder="seu@email.com"
                  value={forgotEmail} onChange={(e) => { setForgotEmail(e.target.value); setForgotMsg('') }} />
              </div>
              {forgotMsg && <p className="forgot-msg">{forgotMsg}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-sec" onClick={() => setShowForgot(false)}>Cancelar</button>
                <button type="submit" className="btn-pri">Enviar Link</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
