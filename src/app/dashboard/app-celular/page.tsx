'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Smartphone, QrCode } from 'lucide-react'
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
      await new Promise((resolve) => setTimeout(resolve, 900))
    } finally {
      setDownloading(false)
      actionLockRef.current = false
    }
  }

  const qrImageSrc = apkUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&color=4a0072&bgcolor=ffffff&data=${encodeURIComponent(apkUrl)}`
    : ''

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 110px)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        padding: '16px 16px 40px',
      }}
    >
      {/* 1. O APP (Simulador Interativo Conectado ao Banco) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <iframe
          src="/api/mobile/simulator?embed=1"
          title="App Celular SG4"
          style={{
            width: 400,
            maxWidth: '100%',
            height: 825,
            border: 'none',
            borderRadius: 48,
            background: 'transparent',
          }}
        />
      </div>

      {/* 2. QR CODE + BOTÃO DE BAIXAR E INSTALAR NO CELULAR */}
      <div
        style={{
          width: 360,
          maxWidth: '100%',
          background: '#ffffff',
          borderRadius: 24,
          border: '1px solid #e2e8f0',
          boxShadow: '0 14px 36px rgba(15, 23, 42, 0.07)',
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 20,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #660099, #4a0072)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 20px rgba(102, 0, 153, 0.25)',
          }}
        >
          <Smartphone size={28} />
        </div>

        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
            }}
          >
            Instalar no Celular
          </h1>
          <p
            style={{
              fontSize: 13,
              color: '#64748b',
              margin: '6px 0 0 0',
              lineHeight: 1.45,
            }}
          >
            Aponte a câmera do celular para o QR Code abaixo ou clique no botão para baixar e instalar o aplicativo Android (<b>.apk</b>).
          </p>
        </div>

        {/* Moldura do QR Code */}
        <div
          style={{
            padding: 16,
            borderRadius: 20,
            background: '#f8fafc',
            border: '2px dashed rgba(102, 0, 153, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {qrImageSrc ? (
            <img
              src={qrImageSrc}
              alt="QR Code para baixar o App SG4 no celular"
              width={220}
              height={220}
              style={{
                borderRadius: 12,
                display: 'block',
                background: '#fff',
              }}
            />
          ) : (
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: 12,
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: PURPLE,
              }}
            >
              <QrCode size={64} />
            </div>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: PURPLE,
              letterSpacing: '0.03em',
            }}
          >
            ESCANEIE COM A CÂMERA DO CELULAR
          </span>
        </div>

        {/* Botão de Baixar e Instalar */}
        <button
          type="button"
          disabled={downloading}
          onClick={handleDownloadApk}
          style={{
            width: '100%',
            padding: '16px 20px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, #660099, #4a0072)',
            color: '#ffffff',
            fontSize: 15,
            fontWeight: 800,
            cursor: downloading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 8px 22px rgba(102, 0, 153, 0.3)',
            transition: 'transform 0.15s ease',
          }}
        >
          <Download size={20} />
          {downloading ? 'Iniciando Download...' : 'Baixar e Instalar no Celular'}
        </button>
      </div>

      <ActionLoadingOverlay
        open={downloading}
        title="Iniciando download do aplicativo SG4..."
      />
    </div>
  )
}
