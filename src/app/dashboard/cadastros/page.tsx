'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Building,
  UserCheck,
  Shield,
  Layers,
  Settings
} from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Import das páginas existentes como componentes de aba
import TecnicosContent from './tecnicos/page'
import UsuariosContent from './usuarios/page'
import UnidadesContent from './unidades/page'

const PURPLE = '#660099'
const PURPLE_BG = 'rgba(102,0,153,0.08)'

export default function CadastrosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('aba') || 'tecnicos'

  const [activeTab, setActiveTab] = useState<'tecnicos' | 'usuarios' | 'unidades'>('tecnicos')

  useEffect(() => {
    if (tabParam === 'usuarios' || tabParam === 'unidades' || tabParam === 'tecnicos') {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (tab: 'tecnicos' | 'usuarios' | 'unidades') => {
    setActiveTab(tab)
    router.replace(`/dashboard/cadastros?aba=${tab}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* ─── CABEÇALHO PADRONIZADO DO SISTEMA ─── */}
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
            <Layers size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Central de Cadastros
            </h1>
          </div>
        </div>
      </div>

      {/* ─── MENU DE ABAS ESTILO RELATÓRIOS ─── */}
      <div style={{
        display: 'flex',
        background: '#f1f5f9',
        padding: 4,
        borderRadius: 8,
        gap: 4,
        width: 'fit-content',
      }}>
        <button
          onClick={() => handleTabChange('tecnicos')}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: 'none',
            background: activeTab === 'tecnicos' ? '#fff' : 'transparent',
            color: activeTab === 'tecnicos' ? PURPLE : '#64748b',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: activeTab === 'tecnicos' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
        >
          <UserCheck size={16} />
          Técnicos
        </button>

        <button
          onClick={() => handleTabChange('usuarios')}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: 'none',
            background: activeTab === 'usuarios' ? '#fff' : 'transparent',
            color: activeTab === 'usuarios' ? PURPLE : '#64748b',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: activeTab === 'usuarios' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
        >
          <Users size={16} />
          Usuários
        </button>

        <button
          onClick={() => handleTabChange('unidades')}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: 'none',
            background: activeTab === 'unidades' ? '#fff' : 'transparent',
            color: activeTab === 'unidades' ? PURPLE : '#64748b',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: activeTab === 'unidades' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
        >
          <Building size={16} />
          Unidades
        </button>
      </div>

      {/* ─── CONTEÚDO DA ABA SELECIONADA ─── */}
      <div>
        {activeTab === 'tecnicos' && <TecnicosContent hideHeader={true} />}
        {activeTab === 'usuarios' && <UsuariosContent hideHeader={true} />}
        {activeTab === 'unidades' && <UnidadesContent hideHeader={true} />}
      </div>
    </div>
  )
}
