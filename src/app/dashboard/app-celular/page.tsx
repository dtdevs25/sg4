'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Smartphone,
  Download,
  RefreshCw,
  CheckCircle2,
  Database,
  Cpu,
  Layers,
  WifiOff,
  ExternalLink,
  Terminal,
  ShieldCheck,
  QrCode,
  Copy,
  Check
} from 'lucide-react'
import { ActionLoadingOverlay } from '@/components/ActionLoadingOverlay'

type ApkInfo = {
  available: boolean
  version: string
  packageName: string
  minSdk: number
  targetSdk: number
  kotlinVersion: string
  fileName: string
  sizeBytes: number
  updatedAt: string | null
  path: string
}

const PURPLE = '#660099'

export default function AppCelularPage() {
  const [apkInfo, setApkInfo] = useState<ApkInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [simulatorKey, setSimulatorKey] = useState(1)
  const [originUrl, setOriginUrl] = useState('')
  const actionLockRef = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin)
    }
    fetchApkInfo()
  }, [])

  async function fetchApkInfo() {
    setLoadingInfo(true)
    try {
      const res = await fetch('/api/mobile/apk?info=1', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setApkInfo(data)
      }
    } catch {
      // Ignore
    } finally {
      setLoadingInfo(false)
    }
  }

  async function handleDownloadApk() {
    if (actionLockRef.current) return
    actionLockRef.current = true
    setDownloading(true)
    try {
      const infoRes = await fetch('/api/mobile/apk?info=1', { cache: 'no-store' })
      const info: ApkInfo = await infoRes.json()
      setApkInfo(info)

      if (!info.available) {
        alert(
          'O instalador APK ainda não foi compilado nesta máquina.\n\n' +
          'Para gerar o APK assinado sem precisar de Android Studio:\n' +
          '1. Abra a pasta app-celular do projeto\n' +
          '2. Dê 2 cliques em compilar_apk.bat (ou execute build_android_app.ps1)\n\n' +
          'Enquanto isso, você já pode usar o Simulador Ao Vivo ao lado ou abrir o WebApp direto no navegador do celular!'
        )
        return
      }

      const a = document.createElement('a')
      a.href = '/api/mobile/apk'
      a.download = info.fileName || 'SG4-Mobile.apk'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setDownloading(false)
      actionLockRef.current = false
    }
  }

  function handleCopyServerUrl() {
    if (!originUrl) return
    navigator.clipboard.writeText(originUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2500)
  }

  function formatSizeMb(bytes: number) {
    if (!bytes) return '0 MB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Cabeçalho */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #f1f5f9',
          boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #660099, #4a0072)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 6px 16px rgba(102,0,153,0.25)',
            }}
          >
            <Smartphone size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                App Celular SG4 (Android Nativo & Simulador)
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 99,
                  background: 'rgba(102,0,153,0.1)',
                  color: PURPLE,
                }}
              >
                v{apkInfo?.version || '2.6.0'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0 0' }}>
              Baixe o instalador APK direto do sistema ou utilize o simulador conectado em tempo real ao seu banco PostgreSQL.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => window.open('/api/mobile/simulator', '_blank')}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ExternalLink size={16} />
            Abrir Simulador em Tela Cheia
          </button>

          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadApk}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #660099, #4a0072)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              cursor: downloading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 6px 16px rgba(102,0,153,0.28)',
            }}
          >
            <Download size={16} />
            {downloading ? 'Preparando Download...' : 'Baixar APK Android (.apk)'}
          </button>
        </div>
      </div>

      {/* Layout Principal: Informações + Simulador Interativo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Coluna Esquerda: Download, Status do APK, QR Code e Arquitetura */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card de Download Direto do APK */}
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: 24,
              boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                📦 Instalador Oficial Android (APK)
              </h2>
              <button
                type="button"
                onClick={fetchApkInfo}
                title="Atualizar status do APK"
                style={{
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <RefreshCw size={13} />
                Verificar APK
              </button>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: apkInfo?.available ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.1)',
                border: `1px solid ${apkInfo?.available ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.3)'}`,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2
                  size={20}
                  color={apkInfo?.available ? '#059669' : '#d97706'}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                    {loadingInfo
                      ? 'Verificando pacote APK...'
                      : apkInfo?.available
                        ? `APK Pronto para Download (${formatSizeMb(apkInfo.sizeBytes)})`
                        : 'Código-fonte 100% pronto em app-celular/ (Aguardando compilação do APK)'}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                    {apkInfo?.available && apkInfo.updatedAt
                      ? `Compilado em ${new Date(apkInfo.updatedAt).toLocaleString('pt-BR')} • Pacote: ${apkInfo.packageName}`
                      : 'Execute app-celular/compilar_apk.bat (1 clique) para gerar o arquivo sg4-mobile.apk assinado.'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div style={{ padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>PLATAFORMA NATIVA</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  Kotlin {apkInfo?.kotlinVersion || '2.2.10'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Android 7.0 (SDK 24) até SDK 36
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>BANCO DE DADOS</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  PostgreSQL + Room
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Sincronização Híbrida Offline
                </div>
              </div>
            </div>

            {/* URL do Servidor para o App */}
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                  ENDEREÇO DO SERVIDOR PARA CONECTAR NO APP:
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: PURPLE,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {originUrl || 'http://localhost:3000'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyServerUrl}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                {copiedUrl ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                {copiedUrl ? 'Copiado!' : 'Copiar URL'}
              </button>
            </div>

            <button
              type="button"
              disabled={downloading}
              onClick={handleDownloadApk}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 12,
                border: 'none',
                background: PURPLE,
                color: '#fff',
                fontSize: 14,
                fontWeight: 800,
                cursor: downloading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <Download size={18} />
              {downloading ? 'Processando Download...' : 'Baixar Instalador SG4-Mobile.apk'}
            </button>
          </div>

          {/* Card de Arquitetura Técnica Implementada em app-celular/ */}
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: 24,
              boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0' }}>
              🛠️ Estrutura Criada em <code>app-celular/</code>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ padding: 8, borderRadius: 10, background: 'rgba(102,0,153,0.08)', color: PURPLE }}>
                  <Cpu size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                    Jetpack Compose + Material Design 3 (MVVM)
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Interface 100% declarativa em Kotlin 2.2.10 com <code>Sg4ViewModel.kt</code> reativo via <code>StateFlow</code> e bloqueio atômico contra duplo clique.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ padding: 8, borderRadius: 10, background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                  <Database size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                    Room Database via KSP + API REST (Retrofit/Moshi)
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Tabelas SQLite locais (<code>AppDatabase.kt</code>, <code>Sg4Dao.kt</code>, <code>Sg4Repository.kt</code>) que salvam o cache completo e enfileiram lançamentos feitos sem sinal para sincronizar automaticamente com o PostgreSQL.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ padding: 8, borderRadius: 10, background: 'rgba(14,165,233,0.1)', color: '#0284c7' }}>
                  <Terminal size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                    Gerador de APK Portátil (Sem Android Studio)
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Scripts <code>app-celular/build_android_app.ps1</code> e <code>app-celular/compilar_apk.bat</code> que configuram OpenJDK 17, Android SDK e Gradle em <code>D:\android_tools</code>, assinam com <code>my-upload-key.jks</code> e publicam o APK automaticamente.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Simulador Interativo Embutido conectado ao Banco Real */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: 20,
            boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                📱 Simulador Interativo em Tempo Real
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>
                Conectado diretamente ao seu banco de dados PostgreSQL (<code>app-celular/index.html</code>)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSimulatorKey((k) => k + 1)}
              style={{
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={13} />
              Reiniciar Simulador
            </button>
          </div>

          <iframe
            key={simulatorKey}
            src="/api/mobile/simulator?embed=1"
            title="Simulador SG4 SST Mobile"
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
      </div>

      <ActionLoadingOverlay
        open={downloading}
        title="Verificando e iniciando download do APK..."
      />
    </div>
  )
}

