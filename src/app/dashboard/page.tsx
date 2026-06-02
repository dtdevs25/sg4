'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, Legend,
} from 'recharts'
import {
  ShieldAlert, Eye, FileCheck, Target, TrendingUp, Award,
  BarChart2, Clock, ClipboardCheck, CheckCircle2, AlertTriangle,
  Bell, FileText,
} from 'lucide-react'

// ── Dados por mês ──────────────────────────────────────────────────────────
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const DADOS_MENSAIS: Record<string, { dss: number; insp: number; entregas: number }> = {
  Jan: { dss: 70,  insp: 148, entregas: 82 },
  Fev: { dss: 68,  insp: 148, entregas: 78 },
  Mar: { dss: 84,  insp: 165, entregas: 85 },
  Abr: { dss: 66,  insp: 134, entregas: 71 },
  Mai: { dss: 0,   insp: 0,   entregas: 0  },
  Jun: { dss: 0,   insp: 0,   entregas: 0  },
  Jul: { dss: 0,   insp: 0,   entregas: 0  },
  Ago: { dss: 0,   insp: 0,   entregas: 0  },
  Set: { dss: 0,   insp: 0,   entregas: 0  },
  Out: { dss: 0,   insp: 0,   entregas: 0  },
  Nov: { dss: 0,   insp: 0,   entregas: 0  },
  Dez: { dss: 0,   insp: 0,   entregas: 0  },
}

// Desempenho por técnico (acumulado)
const TECNICOS = [
  { nome: 'Antonio C.',    dss: 32, insp: 74  },
  { nome: 'Daniel G.',     dss: 44, insp: 92  },
  { nome: 'Dara A.',       dss: 3,  insp: 5   },
  { nome: 'Djonatê C.',    dss: 27, insp: 66  },
  { nome: 'Jonas R.',      dss: 28, insp: 82  },
  { nome: 'Karine N.',     dss: 40, insp: 83  },
  { nome: 'Luis C.',       dss: 19, insp: 41  },
  { nome: 'Rogério L.',    dss: 29, insp: 60  },
  { nome: 'Rosicleide F.', dss: 62, insp: 88  },
  { nome: 'Samuel S.',     dss: 4,  insp: 4   },
]

// Distribuição por tipo (para PieChart)
const TIPO_DATA = [
  { name: 'DSS',        value: 288, color: '#5DADE2' },
  { name: 'Inspeções',  value: 595, color: '#27AE60' },
  { name: 'Entregas',   value: 316, color: '#FFC107' },
  { name: 'Pendentes',  value: 47,  color: '#FF4D4D' },
]

const CHART_COLORS = ['#5DADE2', '#FF4D4D', '#FFB84D', '#B84DFF', '#4DFFB8', '#4DB8FF', '#FF4DFF', '#F4D03F', '#58D68D']

const META_DSS_MES  = 400
const META_INSP_MES = 1000
const META_ENT_MES  = 90

const EVOLUCAO = MESES.map(mes => ({
  mes,
  dss:      DADOS_MENSAIS[mes].dss,
  insp:     DADOS_MENSAIS[mes].insp,
  entregas: DADOS_MENSAIS[mes].entregas,
}))

const getInitials = (n: string) => {
  const p = n.split(' ')
  return p.length >= 2 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : n.slice(0,2).toUpperCase()
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      <p style={{ fontWeight: 700, color: '#334155', marginBottom: 6, fontSize: 12 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#64748b' }}>{p.name}:</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Pie label ──────────────────────────────────────────────────────────────
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 900 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ── StatCard (estilo InspecaoPRO) ──────────────────────────────────────────
interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  bgColor: string
  bottomColor: string
  iconColor: string
}

function StatCard({ icon: Icon, label, value, bgColor, bottomColor, iconColor }: StatCardProps) {
  return (
    <div className={`relative flex flex-col justify-between rounded-lg shadow-sm overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] ${bgColor}`}>
      <div className="p-4 md:p-5 flex justify-between items-center relative z-10">
        <div className="space-y-0.5 z-10">
          <p className="text-white text-sm md:text-base font-medium tracking-wide">{label}</p>
          <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{value}</h3>
        </div>
        <Icon className={`h-14 w-14 md:h-16 md:w-16 z-0 mr-1 ${iconColor}`} strokeWidth={1.5} />
      </div>
      <div className={`h-3 w-full ${bottomColor}`} />
    </div>
  )
}

// ── Chart Card wrapper (estilo InspecaoPRO) ────────────────────────────────
function ChartCard({ icon: Icon, title, children, className = '' }: {
  icon: React.ElementType; title: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden flex flex-col ${className}`}>
      <div className="bg-[#27AE60] p-4 flex items-center gap-2 text-white font-bold">
        <Icon className="h-5 w-5" />
        <span>{title}</span>
      </div>
      <div className="flex-1 p-6 w-full">
        {children}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [mesSel, setMesSel] = useState<string | null>(null)

  const mesesComDados = MESES.filter(m => DADOS_MENSAIS[m].dss > 0 || DADOS_MENSAIS[m].insp > 0)

  const kpiDss  = mesSel ? DADOS_MENSAIS[mesSel].dss   : Object.values(DADOS_MENSAIS).reduce((a, v) => a + v.dss, 0)
  const kpiInsp = mesSel ? DADOS_MENSAIS[mesSel].insp  : Object.values(DADOS_MENSAIS).reduce((a, v) => a + v.insp, 0)
  const kpiEnt  = mesSel
    ? DADOS_MENSAIS[mesSel].entregas
    : Math.round(Object.values(DADOS_MENSAIS).filter(v => v.entregas > 0).reduce((a, v) => a + v.entregas, 0) / 4)

  const metaDss  = mesSel ? META_DSS_MES  : META_DSS_MES * 12
  const metaInsp = mesSel ? META_INSP_MES : META_INSP_MES * 12
  const metaEnt  = mesSel ? META_ENT_MES  : META_ENT_MES

  const pctDss   = Math.round((kpiDss  / metaDss)  * 100)
  const pctInsp  = Math.round((kpiInsp / metaInsp) * 100)
  const pctEnt   = Math.round(kpiEnt)
  const pctGeral = Math.round(((kpiDss + kpiInsp) / (metaDss + metaInsp)) * 100)

  const ranking = [...TECNICOS]
    .map(t => ({ ...t, total: t.dss + t.insp, pct: Math.round(((t.dss + t.insp) / (480 + 1200)) * 100) }))
    .sort((a, b) => b.total - a.total)

  const barData = mesSel
    ? TECNICOS.map(t => ({ nome: t.nome, dss: Math.round(t.dss / 4), insp: Math.round(t.insp / 4) }))
    : TECNICOS

  const areaData = mesSel
    ? EVOLUCAO.filter(d => d.dss > 0 || d.insp > 0)
    : EVOLUCAO.filter(d => d.dss > 0 || d.insp > 0)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

      {/* ── Cabeçalho + Filtro de mês ── */}
      <div className="bg-white py-3 px-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Dashboard Executivo</h1>
          <p className="text-gray-400 text-xs mt-0.5">Indicadores operacionais · TST SG4 · 2026</p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setMesSel(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
              mesSel === null
                ? 'bg-[#27AE60] text-white border-[#27AE60] shadow-md'
                : 'text-slate-500 border-slate-200 hover:border-[#27AE60] hover:text-[#27AE60] bg-white'
            }`}
          >
            Geral
          </button>
          {mesesComDados.map(mes => (
            <button
              key={mes}
              onClick={() => setMesSel(mesSel === mes ? null : mes)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                mesSel === mes
                  ? 'bg-[#27AE60] text-white border-[#27AE60] shadow-md'
                  : 'text-slate-500 border-slate-200 hover:border-[#27AE60] hover:text-[#27AE60] bg-white'
              }`}
            >
              {mes}
            </button>
          ))}
          {mesSel && (
            <span className="ml-1 text-xs text-slate-400 font-medium">
              — exibindo <span className="text-[#27AE60] font-bold">{mesSel}/2026</span>
            </span>
          )}
        </div>
      </div>

      {/* ── KPI Cards (estilo InspecaoPRO) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={ClipboardCheck}
          label="DSS Realizados"
          value={kpiDss.toLocaleString('pt-BR')}
          bgColor="bg-[#007BFF]"
          bottomColor="bg-[#0069D9]"
          iconColor="text-white/30"
        />
        <StatCard
          icon={Eye}
          label="Inspeções"
          value={kpiInsp.toLocaleString('pt-BR')}
          bgColor="bg-[#FFC107]"
          bottomColor="bg-[#E0A800]"
          iconColor="text-white/40"
        />
        <StatCard
          icon={FileCheck}
          label="Entregas no Prazo"
          value={`${pctEnt}%`}
          bgColor="bg-[#28A745]"
          bottomColor="bg-[#218838]"
          iconColor="text-white/30"
        />
        <StatCard
          icon={Target}
          label="Atingimento Geral"
          value={`${pctGeral}%`}
          bgColor="bg-[#DC3545]"
          bottomColor="bg-[#C82333]"
          iconColor="text-white/30"
        />
      </div>

      {/* ── Gráficos principais ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Evolução Mensal (área) + Próximos Vencimentos — coluna larga */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          <ChartCard icon={TrendingUp} title="Evolução Mensal 2026" className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="dssGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#007BFF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#007BFF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="inspGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FFC107" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FFC107" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="entGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#28A745" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#28A745" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#475569', paddingTop: 12 }} />
                <Area type="monotone" dataKey="dss"      name="DSS"      stroke="#007BFF" strokeWidth={2.5} fill="url(#dssGrad)"  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#007BFF' }} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="insp"     name="Inspeção" stroke="#FFC107" strokeWidth={2.5} fill="url(#inspGrad)" dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#FFC107' }} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="entregas" name="Entregas" stroke="#28A745" strokeWidth={2.5} fill="url(#entGrad)"  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#28A745' }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Próximos vencimentos — table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col max-h-[250px]">
            <div className="bg-[#27AE60] p-4 flex items-center gap-2 text-white font-bold">
              <Clock className="h-5 w-5" />
              <span>Próximos Vencimentos (7 dias)</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="w-full h-full overflow-y-auto scrollbar-hide">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 sticky top-0 border-b border-gray-100 z-10 text-[10px] text-gray-400 uppercase tracking-widest font-black">
                    <tr>
                      <th className="px-4 py-3">Técnico</th>
                      <th className="px-4 py-3">Atividade</th>
                      <th className="px-4 py-3">Prazo</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ranking.slice(0, 3).map((t, i) => (
                      <tr key={t.nome} className="hover:bg-amber-50/40 transition-colors cursor-pointer">
                        <td className="px-4 py-3 font-bold text-gray-700">{t.nome}</td>
                        <td className="px-4 py-3 text-gray-500">DSS + Inspeção</td>
                        <td className="px-4 py-3 font-black text-amber-600">{`0${i + 7}/06/2026`}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-700">
                            Pendente
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Apontamentos por Tipo — PieChart */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col min-h-[600px]">
          <div className="bg-[#27AE60] p-4 flex items-center gap-2 text-white font-bold">
            <Bell className="h-5 w-5" />
            <span>Distribuição por Tipo</span>
          </div>
          <div className="flex-1 p-4 w-full flex flex-col">
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={TIPO_DATA}
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    dataKey="value"
                    label={renderPieLabel}
                    labelLine={false}
                    isAnimationActive
                  >
                    {TIPO_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {TIPO_DATA.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                  <div className="w-8 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-gray-600 font-bold truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Barras por Técnico + Ranking ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Bar Chart */}
        <ChartCard icon={BarChart2} title="Desempenho por Técnico" className="xl:col-span-2 h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ left: -15, right: 10, bottom: 10 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nome" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 500 }} angle={-20} textAnchor="end" height={55} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(39,174,96,0.08)' }} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#475569', paddingTop: 10 }} />
              <Bar dataKey="dss"  name="DSS"      radius={[6, 6, 0, 0]} maxBarSize={20}>
                {barData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
              <Bar dataKey="insp" name="Inspeção" fill="#28A745" radius={[6, 6, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Ranking */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
          <div className="bg-[#27AE60] p-4 flex items-center gap-2 text-white font-bold">
            <Award className="h-5 w-5" />
            <span>Ranking do Time</span>
          </div>
          <div className="flex-1 p-5 space-y-4 overflow-y-auto scrollbar-hide">
            {ranking.map((t, i) => {
              const colors = ['bg-amber-100 text-amber-700', 'bg-slate-100 text-slate-600', 'bg-orange-100 text-orange-700']
              const badgeColor = colors[i] ?? 'bg-slate-50 text-slate-400'
              return (
                <div key={t.nome} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${badgeColor}`}>{i + 1}</span>
                  <div className="w-8 h-8 rounded-xl bg-green-50 text-green-700 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                    {getInitials(t.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-semibold text-slate-700 truncate">{t.nome}</span>
                      <span className="text-[10px] font-bold text-slate-500 ml-1 shrink-0">{t.total}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${t.pct}%`, background: 'linear-gradient(to right, #28A745, #27AE60)' }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 w-7 text-right">{t.pct}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
