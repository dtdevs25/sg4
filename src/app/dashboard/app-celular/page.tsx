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
      await new Promise((resolve) => setTimeout(resolve, 800))
    } finally {
      setDownloading(false)
      actionLockRef.current = false
    }
  }

  const qrImageSrc = apkUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&color=4a0072&bgcolor=ffffff&data=${encodeURIComponent(apkUrl)}`
    : ''

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)',
          padding: '22px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxSizing: 'border-box',
        }}
      >
        {/* Cabeçalho do Card */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #c01c1c, #8b0000)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 10px rgba(185, 28, 28, 0.25)',
              }}
            >
              <img
                src="/logovermelho.png"
                alt="SG4"
                style={{
                  width: 24,
                  height: 24,
                  objectFit: 'contain',
                  filter: 'brightness(0) invert(1)',
                }}
              />
            </div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Instalar Aplicativo SG4
              </h1>
              <span style={{ fontSize: 12, color: '#64748b' }}>Disponível para celulares Android</span>
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#f3e8ff', color: PURPLE }}>
            Versão 2.7.4 (.apk)
          </span>
        </div>

        {/* Conteúdo em 2 Colunas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Coluna 1: QR Code + Botão */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: 180, flexShrink: 0 }}>
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
                  width={140}
                  height={140}
                  style={{ borderRadius: 8, display: 'block', background: '#fff' }}
                />
              ) : (
                <div style={{ width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: PURPLE }}>
                  <QrCode size={40} />
                </div>
              )}
              <span style={{ fontSize: 9, fontWeight: 800, color: PURPLE, letterSpacing: '0.03em' }}>
                APONTE A CÂMERA
              </span>
            </div>

            <button
              type="button"
              disabled={downloading}
              onClick={handleDownloadApk}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #660099, #4a0072)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 800,
                cursor: downloading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(102, 0, 153, 0.25)',
              }}
            >
              <Download size={15} />
              {downloading ? 'Baixando...' : 'Baixar APK'}
            </button>
          </div>

          {/* Coluna 2: Passo a Passo Simples e Direto */}
          <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>
              Passo a passo para instalar:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#f1f5f9', color: '#1e293b', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
                <span>Aponte a câmera para o QR Code ou clique em <b>Baixar APK</b>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#f1f5f9', color: '#1e293b', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
                <span>Toque na notificação de download concluído ou abra a pasta <b>Downloads</b>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</span>
                <span>Se o celular bloquear, toque em <b>Configurações</b> e ative <b>Permitir desta fonte</b> (fontes desconhecidas).</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#f1f5f9', color: '#1e293b', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>4</span>
                <span>Volte e toque em <b>Instalar</b>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>5</span>
                <span>Abra o app e faça login com seu <b>usuário e senha</b>.</span>
              </div>
            </div>
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
