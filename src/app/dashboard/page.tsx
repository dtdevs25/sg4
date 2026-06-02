'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  ClipboardCheck, Clock, FileText, Award, ChevronDown
} from 'lucide-react'

/* ── Constantes Visuais ── */
const RED   = '#e53935'
const RED2  = '#c62828'
const COLORS = {
  dss: '#5DADE2',    // Azul claro para DSS
  insp: '#F4D03F',   // Amarelo para Inspeções
}

/* ── Dados Mock (lógica do sistema original) ── */
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const ANOS  = ['2026', '2025']

const DADOS_MENSAIS: Record<string, { dss: number; insp: number }> = {
  Jan: { dss: 70,  insp: 148 },
  Fev: { dss: 68,  insp: 148 },
  Mar: { dss: 84,  insp: 165 },
  Abr: { dss: 66,  insp: 134 },
  Mai: { dss: 0,   insp: 0   },
  Jun: { dss: 0,   insp: 0   },
  Jul: { dss: 0,   insp: 0   },
  Ago: { dss: 0,   insp: 0   },
  Set: { dss: 0,   insp: 0   },
  Out: { dss: 0,   insp: 0   },
  Nov: { dss: 0,   insp: 0   },
  Dez: { dss: 0,   insp: 0   },
}

const TECNICOS = [
  { nome: 'Antonio C.',  dss: 32, insp: 74  },
  { nome: 'Daniel G.',   dss: 44, insp: 92  },
  { nome: 'Dara A.',     dss: 3,  insp: 5   },
  { nome: 'Djonatê C.',  dss: 27, insp: 66  },
  { nome: 'Jonas R.',    dss: 28, insp: 82  },
  { nome: 'Karine N.',   dss: 40, insp: 83  },
  { nome: 'Luis C.',     dss: 19, insp: 41  },
  { nome: 'Rogério L.',  dss: 29, insp: 60  },
  { nome: 'Rosicleide F.', dss: 62, insp: 88 },
  { nome: 'Samuel S.',   dss: 4,  insp: 4   },
]

// Metas por técnico por mês
const META_DSS_POR_TEC = 8
const META_INSP_POR_TEC = 20

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

/* ── Componentes de UI ── */
function StatCard({ icon: Icon, label, value, bg, bgDark, subtitle }: any) {
  return (
    <div style={{
      background: bg,
      borderRadius: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'transform .15s',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      flex: 1,
    }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#fff', fontSize: 14, fontWeight: 500, marginBottom: 4, letterSpacing: 0.3 }}>{label}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <h3 style={{ color: '#fff', fontSize: 38, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>{value}</h3>
            {subtitle && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600 }}>{subtitle}</span>}
          </div>
        </div>
        <Icon size={56} strokeWidth={1.2} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
      </div>
      <div style={{ height: 10, background: bgDark }} />
    </div>
  )
}

function ChartCard({ icon: Icon, title, children, style }: any) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}>
      <div style={{
        background: RED,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: '#fff',
        fontWeight: 700,
        fontSize: 15,
      }}>
        <Icon size={18} />
        <span>{title}</span>
      </div>
      <div style={{ flex: 1, padding: 20, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight: 700, color: '#334155', marginBottom: 4, fontSize: 12 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{p.value} {p.name}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Página ── */
export default function DashboardPage() {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(' ')[0] || 'Gestor'

  const [ano, setAno] = useState('2026')
  const [mes, setMes] = useState<string | null>(null) // null = Geral/Acumulado

  // Lógica de Metas
  const nTecnicos = TECNICOS.length
  const metaDssTotal = mes ? (nTecnicos * META_DSS_POR_TEC) : (nTecnicos * META_DSS_POR_TEC * 4) // multiplicando por 4 meses ativos para simular acumulado
  const metaInspTotal = mes ? (nTecnicos * META_INSP_POR_TEC) : (nTecnicos * META_INSP_POR_TEC * 4)

  // Valores reais baseados no filtro
  const totalDss = mes ? DADOS_MENSAIS[mes].dss : Object.values(DADOS_MENSAIS).reduce((a, v) => a + v.dss, 0)
  const totalInsp = mes ? DADOS_MENSAIS[mes].insp : Object.values(DADOS_MENSAIS).reduce((a, v) => a + v.insp, 0)

  // Percentuais
  const pctDss = Math.round((totalDss / metaDssTotal) * 100)
  const pctInsp = Math.round((totalInsp / metaInspTotal) * 100)

  // Dados do Gráfico de Desempenho (2 barras: DSS e Inspeção)
  // Simula os dados do mês dividindo o acumulado por 4 (como no sistema original)
  const barData = mes
    ? TECNICOS.map(t => ({ nome: t.nome, dss: Math.round(t.dss / 4), insp: Math.round(t.insp / 4) }))
    : TECNICOS

  // Rankings
  const rankDss = [...barData].sort((a, b) => b.dss - a.dss)
  const rankInsp = [...barData].sort((a, b) => b.insp - a.insp)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

      {/* ── Barra superior com Filtros ── */}
      <div style={{
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Olá, {firstName}!
          </h1>
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
            Bem-vindo ao painel SG4
          </span>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Select Ano */}
          <div style={{ position: 'relative' }}>
            <select
              value={ano}
              onChange={e => setAno(e.target.value)}
              style={{
                appearance: 'none',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 36px 8px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: 11, pointerEvents: 'none', color: '#94a3b8' }} />
          </div>

          {/* Select Mês */}
          <div style={{ position: 'relative' }}>
            <select
              value={mes || ''}
              onChange={e => setMes(e.target.value || null)}
              style={{
                appearance: 'none',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 36px 8px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">Geral (Acumulado)</option>
              {MESES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: 11, pointerEvents: 'none', color: '#94a3b8' }} />
          </div>
        </div>
      </div>

      {/* ── 4 Stat cards ── */}
      <div style={{ display: 'flex', gap: 20 }}>
        <StatCard icon={ClipboardCheck} label="DSS Realizados" value={totalDss} bg="#007BFF" bgDark="#0069D9" />
        <StatCard icon={Clock}          label="Inspeções Realizadas" value={totalInsp} bg="#FFC107" bgDark="#E0A800" />
        <StatCard icon={Award}          label="% Atendimento DSS" value={`${pctDss}%`} subtitle={`Meta: ${metaDssTotal}`} bg="#28A745" bgDark="#218838" />
        <StatCard icon={Award}          label="% Atendimento Inspeção" value={`${pctInsp}%`} subtitle={`Meta: ${metaInspTotal}`} bg="#DC3545" bgDark="#C82333" />
      </div>

      {/* ── Charts & Rankings (2/3 + 1/3) ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Coluna Esquerda: Gráfico BarChart (2 barras por técnico) */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ChartCard icon={FileText} title="Desempenho por Técnico" style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ left: -10, right: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="nome"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(229,57,53,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 13, fontWeight: 700, paddingTop: 10 }} />
                
                <Bar dataKey="dss" name="DSS" fill={COLORS.dss} radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="insp" name="Inspeções" fill={COLORS.insp} radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Coluna Direita: Rankings */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Ranking DSS */}
          <ChartCard icon={Award} title="Ranking - DSS" style={{ height: 240 }}>
            <div style={{ overflowY: 'auto', height: '100%', paddingRight: 4 }} className="scrollbar-hide">
              {rankDss.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: i < 3 ? '#fef3c7' : '#f1f5f9', color: i < 3 ? '#d97706' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#334155' }}>{t.nome}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: COLORS.dss }}>{t.dss}</div>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Ranking Inspeções */}
          <ChartCard icon={Award} title="Ranking - Inspeções" style={{ height: 240 }}>
            <div style={{ overflowY: 'auto', height: '100%', paddingRight: 4 }} className="scrollbar-hide">
              {rankInsp.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: i < 3 ? '#fef3c7' : '#f1f5f9', color: i < 3 ? '#d97706' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#334155' }}>{t.nome}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: COLORS.insp }}>{t.insp}</div>
                </div>
              ))}
            </div>
          </ChartCard>

        </div>
      </div>
    </div>
  )
}
