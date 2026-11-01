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
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&color=4a0072&bgcolor=ffffff&data=${encodeURIComponent(apkUrl)}`
    : ''

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 100px)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: '10px 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. O APP (Simulador Interativo Conectado ao Banco, em tamanho compacto) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: 290,
          height: 601,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 36,
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
        }}
      >
        <iframe
          src="/api/mobile/simulator?embed=1"
          title="App Celular SG4"
          style={{
            width: 392,
            height: 812,
            border: 'none',
            borderRadius: 48,
            background: 'transparent',
            transform: 'scale(0.74)',
            transformOrigin: 'top left',
          }}
        />
      </div>

      {/* 2. QR CODE + BOTÃO DE BAIXAR E INSTALAR NO CELULAR */}
      <div
        style={{
          width: 310,
          maxWidth: '100%',
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 12,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #c01c1c, #8b0000)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 6px 16px rgba(185, 28, 28, 0.28)',
          }}
        >
          <img
            src="/logovermelho.png"
            alt="Ícone do App SG4"
            style={{
              width: 32,
              height: 32,
              objectFit: 'contain',
              filter: 'brightness(0) invert(1)',
            }}
          />
        </div>

        <div>
          <h1
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
            }}
          >
            Instalar no Celular
          </h1>
          <p
            style={{
              fontSize: 12,
              color: '#64748b',
              margin: '4px 0 0 0',
              lineHeight: 1.35,
            }}
          >
            Aponte a câmera para o QR Code ou clique abaixo para baixar o instalador Android (<b>.apk</b>).
          </p>
        </div>

        {/* Moldura do QR Code Compacto */}
        <div
          style={{
            padding: 10,
            borderRadius: 16,
            background: '#f8fafc',
            border: '1.5px dashed rgba(102, 0, 153, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {qrImageSrc ? (
            <img
              src={qrImageSrc}
              alt="QR Code para baixar o App SG4 no celular"
              width={145}
              height={145}
              style={{
                borderRadius: 10,
                display: 'block',
                background: '#fff',
              }}
            />
          ) : (
            <div
              style={{
                width: 145,
                height: 145,
                borderRadius: 10,
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: PURPLE,
              }}
            >
              <QrCode size={44} />
            </div>
          )}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: PURPLE,
              letterSpacing: '0.03em',
            }}
          >
            ESCANEIE COM O CELULAR
          </span>
        </div>

        {/* Botão de Baixar e Instalar */}
        <button
          type="button"
          disabled={downloading}
          onClick={handleDownloadApk}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
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
            boxShadow: '0 6px 18px rgba(102, 0, 153, 0.25)',
            transition: 'transform 0.15s ease',
          }}
        >
          <Download size={17} />
          {downloading ? 'Iniciando...' : 'Baixar e Instalar (.apk)'}
        </button>
      </div>

      <ActionLoadingOverlay
        open={downloading}
        title="Iniciando download do aplicativo SG4..."
      />
    </div>
  )
}
