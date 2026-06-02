'use client'

import { useSession } from 'next-auth/react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  ClipboardCheck, Clock, CheckCircle2, AlertTriangle,
  FileText, Bell,
} from 'lucide-react'

/* ── Cores ── */
const RED   = '#e53935'
const RED2  = '#c62828'  // darker bottom bar
const COLORS = ['#5DADE2','#FF4D4D','#FFB84D','#B84DFF','#4DFFB8','#4DB8FF','#FF4DFF','#F4D03F','#58D68D']

/* ── Dados ── */
const SETOR_DATA = [
  { name: 'Antonio C.',    value: 106 },
  { name: 'Daniel G.',     value: 136 },
  { name: 'Dara A.',       value: 8   },
  { name: 'Djonatê C.',    value: 93  },
  { name: 'Jonas R.',      value: 110 },
  { name: 'Karine N.',     value: 123 },
  { name: 'Luis C.',       value: 60  },
  { name: 'Rogério L.',    value: 89  },
  { name: 'Rosicleide F.', value: 150 },
  { name: 'Samuel S.',     value: 8   },
]

const TIPO_DATA = [
  { name: 'DSS',       value: 288, color: '#5DADE2' },
  { name: 'Inspeções', value: 595, color: '#28A745' },
  { name: 'Entregas',  value: 316, color: '#FFB84D' },
  { name: 'Pendentes', value: 47,  color: '#FF4D4D' },
]

const VENCIMENTOS = [
  { nome: 'Rosicleide F.', tipo: 'DSS + Inspeção', prazo: '07/06/2026' },
  { nome: 'Daniel G.',     tipo: 'DSS + Inspeção', prazo: '08/06/2026' },
  { nome: 'Karine N.',     tipo: 'DSS + Inspeção', prazo: '09/06/2026' },
  { nome: 'Jonas R.',      tipo: 'Inspeção',        prazo: '10/06/2026' },
  { nome: 'Antonio C.',    tipo: 'DSS',             prazo: '11/06/2026' },
]

/* ── Stat Card (proporcional ao InspecaoPRO) ── */
function StatCard({ icon: Icon, label, value, bg, bgDark }: {
  icon: React.ElementType
  label: string
  value: string | number
  bg: string
  bgDark: string
}) {
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
      <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 500, marginBottom: 6, letterSpacing: 0.3 }}>{label}</p>
          <h3 style={{ color: '#fff', fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>{value}</h3>
        </div>
        <Icon size={64} strokeWidth={1.2} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
      </div>
      <div style={{ height: 12, background: bgDark }} />
    </div>
  )
}

/* ── Chart card wrapper ── */
function ChartCard({ icon: Icon, title, children, style }: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
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

/* ── Pie label ── */
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  const pct = Math.round(percent * 100)
  if (pct < 4) return null
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 12, fontWeight: 900 }}>
      {pct}%
    </text>
  )
}

/* ── Tooltip ── */
function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight: 700, color: '#334155', marginBottom: 4, fontSize: 12 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{payload[0]?.value}</p>
    </div>
  )
}

/* ── Page ── */
export default function DashboardPage() {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(' ')[0] || 'Gestor'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Barra de boas-vindas ── */}
      <div style={{
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Olá, {firstName}!
          </h1>
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 400 }}>
            Bem-vindo ao painel SG4
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#f8fafc', border: '1px solid #f1f5f9',
          borderRadius: 8, padding: '8px 14px',
          fontSize: 13, color: '#475569', fontWeight: 600,
        }}>
          📅 Acumulado 2026
        </div>
      </div>

      {/* ── 4 Stat cards ── */}
      <div style={{ display: 'flex', gap: 20 }}>
        <StatCard icon={ClipboardCheck} label="DSS Realizados" value={288}  bg="#007BFF" bgDark="#0069D9" />
        <StatCard icon={Clock}          label="Inspeções"       value={595}  bg="#FFC107" bgDark="#E0A800" />
        <StatCard icon={CheckCircle2}   label="Entregas"        value={316}  bg="#28A745" bgDark="#218838" />
        <StatCard icon={AlertTriangle}  label="Pendentes"       value={47}   bg="#DC3545" bgDark="#C82333" />
      </div>

      {/* ── Charts: 2/3 bar + 1/3 pie ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Coluna esquerda (2/3) */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Bar chart */}
          <ChartCard icon={FileText} title="Desempenho por Técnico" style={{ height: 480 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SETOR_DATA} margin={{ left: -10, right: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} cursor={{ fill: 'rgba(229,57,53,0.05)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {SETOR_DATA.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Próximos vencimentos */}
          <ChartCard icon={Clock} title="Próximos Vencimentos (7 dias)">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    {['Técnico', 'Atividade', 'Prazo', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {VENCIMENTOS.map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#334155' }}>{v.nome}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{v.tipo}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#d97706' }}>{v.prazo}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: '#fef3c7', color: '#b45309', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Pendente
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        {/* Coluna direita (1/3) — PieChart */}
        <div style={{ flex: 1 }}>
          <ChartCard icon={Bell} title="Apontamentos por Tipo" style={{ minHeight: 600 }}>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={TIPO_DATA}
                    cx="50%" cy="50%"
                    outerRadius="82%"
                    dataKey="value"
                    label={PieLabel}
                    labelLine={false}
                  >
                    {TIPO_DATA.map((e, i) => (
                      <Cell key={i} fill={e.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #f1f5f9', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 20 }}>
              {TIPO_DATA.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 12, borderRadius: 4, background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{item.name}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

    </div>
  )
}
