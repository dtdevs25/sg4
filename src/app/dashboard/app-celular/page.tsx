'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, QrCode, Smartphone, CheckCircle, ShieldAlert } from 'lucide-react'
import { ActionLoadingOverlay } from '@/components/ActionLoadingOverlay'

const PURPLE = '#660099'

export default function AppCelularPage() {
  const [downloading, setDownloading] = useState(false)
  const [apkUrl, setApkUrl] = useState('')
  const actionLockRef = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApkUrl(`${window.location.origin}/api/mobile/apk`)
    }
  }, [])

  async function handleDownloadApk() {
    if (actionLockRef.current) return
    actionLockRef.current = true
    setDownloading(true)
    try {
      const a = document.createElement('a')
      a.href = '/api/mobile/apk'
      a.download = 'SG4-Mobile.apk'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      await new Promise((resolve) => setTimeout(resolve, 800))
    } finally {
      setDownloading(false)
      actionLockRef.current = false
    }
  }

  const qrImageSrc = apkUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&color=4a0072&bgcolor=ffffff&data=${encodeURIComponent(apkUrl)}`
    : ''

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '16px',
        flexWrap: 'wrap',
        boxSizing: 'border-box',
      }}
    >
      {/* ── CARD 1: QR CODE E DOWNLOAD ── */}
      <div
        style={{
          width: 290,
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 12,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #c01c1c, #8b0000)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(185, 28, 28, 0.25)',
            }}
          >
            <img
              src="/logovermelho.png"
              alt="SG4"
              style={{ width: 22, height: 22, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              SG4 Mobile
            </h2>
            <span style={{ fontSize: 11, color: '#64748b' }}>Android • Versão 2.7.5</span>
          </div>
        </div>

        {/* Moldura do QR Code */}
        <div
          style={{
            padding: 8,
            borderRadius: 14,
            background: '#f8fafc',
            border: '1.5px dashed rgba(102, 0, 153, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {qrImageSrc ? (
            <img
              src={qrImageSrc}
              alt="QR Code SG4"
              width={145}
              height={145}
              style={{ borderRadius: 8, display: 'block', background: '#fff' }}
            />
          ) : (
            <div style={{ width: 145, height: 145, display: 'flex', alignItems: 'center', justifyContent: 'center', color: PURPLE }}>
              <QrCode size={40} />
            </div>
          )}
          <span style={{ fontSize: 9.5, fontWeight: 800, color: PURPLE, letterSpacing: '0.04em' }}>
            ESCANEIE COM O CELULAR
          </span>
        </div>

        {/* Botão de Download Direto */}
        <button
          type="button"
          disabled={downloading}
          onClick={handleDownloadApk}
          style={{
            width: '100%',
            padding: '11px 16px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg, #660099, #4a0072)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 800,
            cursor: downloading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(102, 0, 153, 0.25)',
            transition: 'transform 0.15s ease',
          }}
        >
          <Download size={16} />
          {downloading ? 'Baixando...' : 'Baixar APK Direto'}
        </button>
      </div>

      {/* ── CARD 2: PASSO A PASSO DE INSTALAÇÃO ── */}
      <div
        style={{
          width: 360,
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#f3e8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: PURPLE,
            }}
          >
            <Smartphone size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Instalação no Celular
            </h2>
            <span style={{ fontSize: 11, color: '#64748b' }}>Passo a passo rápido</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12.5, color: '#334155', lineHeight: 1.4 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              1
            </span>
            <span>Aponte a câmera para o QR Code ou clique no botão <b>Baixar APK</b>.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              2
            </span>
            <span>Abra o arquivo baixado nas notificações ou na pasta <b>Downloads</b>.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '6px 8px' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#dc2626', color: '#fff', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              3
            </span>
            <span>Se o Android alertar, toque em <b>Configurações</b> e marque <b>Permitir desta fonte</b> (fontes desconhecidas).</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              4
            </span>
            <span>Retorne à tela e toque em <b>Instalar</b>.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              5
            </span>
            <span>Abra o app SG4 e entre com seu <b>usuário e senha</b>.</span>
          </div>
        </div>
      </div>

      <ActionLoadingOverlay
        open={downloading}
        title="Iniciando download do aplicativo SG4..."
      />
    </div>
  )
}
