'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Smartphone, QrCode, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react'
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
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&color=4a0072&bgcolor=ffffff&data=${encodeURIComponent(apkUrl)}`
    : ''

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: '#ffffff',
          borderRadius: 24,
          border: '1px solid #e2e8f0',
          boxShadow: '0 12px 36px rgba(15, 23, 42, 0.08)',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 20,
          boxSizing: 'border-box',
        }}
      >
        {/* Ícone oficial e Título */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #c01c1c, #8b0000)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 20px rgba(185, 28, 28, 0.28)',
            }}
          >
            <img
              src="/logovermelho.png"
              alt="Ícone do App SG4"
              style={{
                width: 38,
                height: 38,
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)',
              }}
            />
          </div>

          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Aplicativo SG4 SST Mobile
            </h1>
            <p
              style={{
                fontSize: 13,
                color: '#64748b',
                margin: '6px 0 0 0',
                lineHeight: 1.4,
              }}
            >
              Instale o aplicativo oficial para celular Android e realize lançamentos de campo com <b>geolocalização GPS</b> e suporte offline.
            </p>
          </div>
        </div>

        {/* Moldura do QR Code */}
        <div
          style={{
            padding: 14,
            borderRadius: 20,
            background: '#f8fafc',
            border: '2px dashed rgba(102, 0, 153, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {qrImageSrc ? (
            <img
              src={qrImageSrc}
              alt="QR Code para baixar o App SG4 no celular"
              width={180}
              height={180}
              style={{
                borderRadius: 12,
                display: 'block',
                background: '#fff',
              }}
            />
          ) : (
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: 12,
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: PURPLE,
              }}
            >
              <QrCode size={56} />
            </div>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: PURPLE,
              letterSpacing: '0.04em',
            }}
          >
            APONTE A CÂMERA DO CELULAR PARA O QR CODE
          </span>
        </div>

        {/* Botão de Download Direto do APK */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadApk}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #660099, #4a0072)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 800,
              cursor: downloading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 8px 22px rgba(102, 0, 153, 0.25)',
              transition: 'transform 0.15s ease',
            }}
          >
            <Download size={18} />
            {downloading ? 'Iniciando download...' : 'Baixar Instalador Android (.apk)'}
          </button>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
            Compatível com Android 8.0 ou superior • Versão 2.7.3
          </span>
        </div>

        {/* Instruções Rápidas de Instalação */}
        <div
          style={{
            width: '100%',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '14px 16px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} color={PURPLE} /> Como instalar no seu smartphone:
          </div>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div><b>1.</b> Aponte a câmera para o QR Code ou clique no botão acima para baixar o arquivo <b>.apk</b>.</div>
            <div><b>2.</b> Abra o arquivo baixado e confirme a instalação (caso o Android solicite, permita a instalação a partir do navegador).</div>
            <div><b>3.</b> Abra o app SG4 e entre com o mesmo <b>usuário e senha</b> que você já utiliza no sistema web.</div>
            <div><b>4.</b> Mantenha a localização ativada no celular para registrar KM, abastecimento e manutenção.</div>
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
