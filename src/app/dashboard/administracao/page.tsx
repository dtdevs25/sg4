'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Fuel,
  FileCheck,
  Car,
  ShieldAlert,
  BarChart3,
  Clock,
  Send
} from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'

// Import das páginas existentes como componentes de aba
import AbastecimentosContent from './abastecimento/page'
import DocumentosContent from './documentos/page'
import MultasContent from './multas/page'
import MedidasContent from './medidas-administrativas/page'
import RelatoriosContent from './relatorios/page'
import LogsContent from './logs/page'
import TestesContent from './testes/page'

const PURPLE = '#660099'
const PURPLE_BG = 'rgba(102,0,153,0.08)'

type TabKey = 'abastecimentos' | 'documentos' | 'multas' | 'medidas' | 'relatorios' | 'logs' | 'testes'

export default function AdministracaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('aba')

  const [activeTab, setActiveTab] = useState<TabKey>('abastecimentos')

  // Refs para acionar os modais de adicionar de cada aba
  const openAddDocRef = useRef<(() => void) | null>(null)
  const openAddMultaRef = useRef<(() => void) | null>(null)
  const openAddMedidaRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!tabParam) return
    if (tabParam === 'abastecimento' || tabParam === 'abastecimentos') setActiveTab('abastecimentos')
    else if (tabParam === 'docs' || tabParam === 'documentos') setActiveTab('documentos')
    else if (tabParam === 'multas') setActiveTab('multas')
    else if (tabParam === 'medidas' || tabParam === 'medidas-administrativas') setActiveTab('medidas')
    else if (tabParam === 'relatorios') setActiveTab('relatorios')
    else if (tabParam === 'logs') setActiveTab('logs')
    else if (tabParam === 'testes') setActiveTab('testes')
  }, [tabParam])

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab)
    router.replace(`/dashboard/administracao?aba=${tab}`)
  }

  // Configuração dinâmica de cada aba (Título, Ícone, Botão Superior)
  const configAba: Record<TabKey, {
    titulo: string
    icone: any
    botao?: string
    acao?: () => void
  }> = {
    abastecimentos: {
      titulo: 'Abastecimentos',
      icone: Fuel,
    },
    documentos: {
      titulo: 'Docs. Técnicos',
      icone: FileCheck,
      botao: '+ Doc./Renovação',
      acao: () => openAddDocRef.current && openAddDocRef.current(),
    },
    multas: {
      titulo: 'Multas e Avarias',
      icone: Car,
      botao: '+ Ocorrência',
      acao: () => openAddMultaRef.current && openAddMultaRef.current(),
    },
    medidas: {
      titulo: 'Medidas Adm',
      icone: ShieldAlert,
      botao: '+ Medida',
      acao: () => openAddMedidaRef.current && openAddMedidaRef.current(),
    },
    relatorios: {
      titulo: 'Relatórios',
      icone: BarChart3,
    },
    logs: {
      titulo: 'Logs',
      icone: Clock,
    },
    testes: {
      titulo: 'Testes',
      icone: Send,
    },
  }

  const tabAtual = configAba[activeTab]
  const IconeAtual = tabAtual.icone

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'abastecimentos', label: 'Abastecimentos', icon: Fuel },
    { key: 'documentos', label: 'Docs. Técnicos', icon: FileCheck },
    { key: 'multas', label: 'Multas e Avarias', icon: Car },
    { key: 'medidas', label: 'Medidas Adm', icon: ShieldAlert },
    { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { key: 'logs', label: 'Logs', icon: Clock },
    { key: 'testes', label: 'Testes', icon: Send },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* ─── CABEÇALHO DINÂMICO CONFORME A ABA ─── */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: PURPLE_BG,
              color: PURPLE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconeAtual size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
              {tabAtual.titulo}
            </h1>
          </div>
        </div>

        {tabAtual.botao && (
          <button
            onClick={tabAtual.acao}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 8,
              background: `linear-gradient(135deg, ${PURPLE}, #4a0072)`,
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(102,0,153,0.25)',
              transition: 'all 0.15s',
            }}
          >
            {tabAtual.botao}
          </button>
        )}
      </div>

      {/* ─── MENU DE ABAS ESTILO SG4 ─── */}
      <div
        style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: 4,
          borderRadius: 8,
          gap: 4,
          width: 'fit-content',
          flexWrap: 'wrap',
        }}
      >
        {tabs.map(tab => {
          const TabIcon = tab.icon
          const isSelected = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: isSelected ? '#fff' : 'transparent',
                color: isSelected ? PURPLE : '#64748b',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s',
              }}
            >
              <TabIcon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ─── CONTEÚDO DA ABA SELECIONADA ─── */}
      <div>
        {activeTab === 'abastecimentos' && (
          <AbastecimentosContent hideHeader={true} />
        )}
        {activeTab === 'documentos' && (
          <DocumentosContent hideHeader={true} onOpenAddRef={openAddDocRef} />
        )}
        {activeTab === 'multas' && (
          <MultasContent hideHeader={true} onOpenAddRef={openAddMultaRef} />
        )}
        {activeTab === 'medidas' && (
          <MedidasContent hideHeader={true} onOpenAddRef={openAddMedidaRef} />
        )}
        {activeTab === 'relatorios' && (
          <RelatoriosContent hideHeader={true} />
        )}
        {activeTab === 'logs' && (
          <LogsContent hideHeader={true} />
        )}
        {activeTab === 'testes' && (
          <TestesContent hideHeader={true} />
        )}
      </div>
    </div>
  )
}
