'use client'

import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell, RadialBarChart, RadialBar,
} from 'recharts'
import { ShieldAlert, Eye, FileCheck, Target, TrendingUp, Award, BarChart2, ChevronDown } from 'lucide-react'

// ÔöÇÔöÇ Dados por m├¬s ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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

// Desempenho por t├®cnico (acumulado)
const TECNICOS = [
  { nome: 'Antonio C.',  dss: 32, insp: 74  },
  { nome: 'Daniel G.',   dss: 44, insp: 92  },
  { nome: 'Dara A.',     dss: 3,  insp: 5   },
  { nome: 'Djonat├¬ C.',  dss: 27, insp: 66  },
  { nome: 'Jonas R.',    dss: 28, insp: 82  },
  { nome: 'Karine N.',   dss: 40, insp: 83  },
  { nome: 'Luis C.',     dss: 19, insp: 41  },
  { nome: 'Rog├®rio L.',  dss: 29, insp: 60  },
  { nome: 'Rosicleide F.', dss: 62, insp: 88 },
  { nome: 'Samuel S.',   dss: 4,  insp: 4   },
]

const META_DSS_MES = 400
const META_INSP_MES = 1000
const META_ENT_MES = 90

// Evolu├º├úo acumulada para o area chart
const EVOLUCAO = MESES.map(mes => ({
  mes,
  dss: DADOS_MENSAIS[mes].dss,
  insp: DADOS_MENSAIS[mes].insp,
  entregas: DADOS_MENSAIS[mes].entregas,
}))

const getInitials = (n: string) => {
  const p = n.split(' ')
  return p.length >= 2 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : n.slice(0,2).toUpperCase()
}

// Custom Tooltip
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

interface KpiProps {
  label: string; value: string | number; subtitle: string
  progress?: number; icon: React.ReactNode; accent: string; iconBg: string; iconColor: string
}

function KpiCard({ label, value, subtitle, progress, icon, accent, iconBg, iconColor }: KpiProps) {
  return (
    <div className={`group relative bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
        </div>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${iconBg} ${iconColor} shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
      {progress !== undefined && (
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className={`h-1.5 rounded-full ${accent} transition-all duration-700`} style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-semibold text-slate-400">
            <span>{subtitle}</span>
            <span className="font-bold text-slate-600">{progress}%</span>
          </div>
        </div>
      )}
      {progress === undefined && <p className="text-[11px] text-slate-400 font-medium mt-1">{subtitle}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [mesSel, setMesSel] = useState<string | null>(null)

  const mesesComDados = MESES.filter(m => DADOS_MENSAIS[m].dss > 0 || DADOS_MENSAIS[m].insp > 0)

  // KPI values ÔÇö se m├¬s selecionado, mostra do m├¬s; sen├úo acumulado
  const kpiDss   = mesSel ? DADOS_MENSAIS[mesSel].dss   : Object.values(DADOS_MENSAIS).reduce((a, v) => a + v.dss, 0)
  const kpiInsp  = mesSel ? DADOS_MENSAIS[mesSel].insp  : Object.values(DADOS_MENSAIS).reduce((a, v) => a + v.insp, 0)
  const kpiEnt   = mesSel ? DADOS_MENSAIS[mesSel].entregas : Math.round(Object.values(DADOS_MENSAIS).filter(v=>v.entregas>0).reduce((a,v)=>a+v.entregas,0)/4)

  const metaDss  = mesSel ? META_DSS_MES  : META_DSS_MES * 12
  const metaInsp = mesSel ? META_INSP_MES : META_INSP_MES * 12
  const metaEnt  = mesSel ? META_ENT_MES  : META_ENT_MES

  const pctDss  = Math.round((kpiDss  / metaDss)  * 100)
  const pctInsp = Math.round((kpiInsp / metaInsp) * 100)
  const pctEnt  = Math.round(kpiEnt)
  const pctGeral = Math.round(((kpiDss + kpiInsp) / (metaDss + metaInsp)) * 100)

  // Ranking sempre acumulado
  const ranking = [...TECNICOS]
    .map(t => ({ ...t, total: t.dss + t.insp, pct: Math.round(((t.dss + t.insp) / (480 + 1200)) * 100) }))
    .sort((a, b) => b.total - a.total)

  // Dados do gr├ífico de barras por t├®cnico
  const barData = mesSel
    ? TECNICOS.map(t => ({ nome: t.nome, dss: Math.round(t.dss / 4), insp: Math.round(t.insp / 4) }))
    : TECNICOS

  // Dados da evolu├º├úo ÔÇö se m├¬s selecionado, destaca s├│ aquele
  const areaData = mesSel
    ? EVOLUCAO.filter(d => d.dss > 0 || d.insp > 0)
    : EVOLUCAO.filter(d => d.dss > 0 || d.insp > 0)

  const radialData = [
    { name: 'DSS',      value: pctDss,  fill: '#ef4444' },
    { name: 'Inspe├º├úo', value: pctInsp, fill: '#f97316' },
    { name: 'Entregas', value: pctEnt,  fill: '#10b981' },
  ]

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">

      {/* ÔöÇÔöÇ Cabe├ºalho + Seletor de M├¬s ÔöÇÔöÇ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Dashboard Executivo</h1>
          <p className="text-slate-400 text-xs mt-0.5">Indicadores operacionais ┬À TST SG4 ┬À 2026</p>
        </div>

        {/* Seletor de m├¬s */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setMesSel(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
              mesSel === null
                ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-500/20'
                : 'text-slate-500 border-slate-200 hover:border-red-300 hover:text-red-600 bg-white'
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
                  ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-500/20'
                  : 'text-slate-500 border-slate-200 hover:border-red-300 hover:text-red-600 bg-white'
              }`}
            >
              {mes}
            </button>
          ))}
          {mesSel && (
            <span className="ml-1 text-xs text-slate-400 font-medium">
              ÔÇö exibindo dados de <span className="text-red-600 font-bold">{mesSel}/2026</span>
            </span>
          )}
        </div>
      </div>

      {/* ÔöÇÔöÇ KPI Cards ÔöÇÔöÇ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <KpiCard
          label="DSS Realizados" value={kpiDss.toLocaleString('pt-BR')}
          subtitle={`Meta: ${metaDss.toLocaleString('pt-BR')}`} progress={pctDss}
          accent="bg-red-500" icon={<ShieldAlert size={20} />} iconBg="bg-red-50" iconColor="text-red-600"
        />
        <KpiCard
          label="Inspe├º├Áes" value={kpiInsp.toLocaleString('pt-BR')}
          subtitle={`Meta: ${metaInsp.toLocaleString('pt-BR')}`} progress={pctInsp}
          accent="bg-orange-500" icon={<Eye size={20} />} iconBg="bg-orange-50" iconColor="text-orange-600"
        />
        <KpiCard
          label="Entregas no Prazo" value={`${pctEnt}%`}
          subtitle="Atividades & Registros de KM" progress={pctEnt}
          accent="bg-emerald-500" icon={<FileCheck size={20} />} iconBg="bg-emerald-50" iconColor="text-emerald-600"
        />
        <KpiCard
          label="Atingimento Geral" value={`${pctGeral}%`}
          subtitle={`${(kpiDss + kpiInsp).toLocaleString('pt-BR')} registros no total`} progress={pctGeral}
          accent="bg-amber-500" icon={<Target size={20} />} iconBg="bg-amber-50" iconColor="text-amber-600"
        />
      </div>

      {/* ÔöÇÔöÇ Evolu├º├úo + Radial ÔöÇÔöÇ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Area Chart - Evolu├º├úo Mensal */}
        <div className="xl:col-span-2 bg-white border border-slate-100 rounded-3xl p-7 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Evolu├º├úo Mensal 2026</h2>
              <p className="text-xs text-slate-400">Clique nos meses acima para filtrar</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={areaData} margin={{ left: -10, right: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="dssGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="inspGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="entGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#475569', paddingTop: 12 }} />
              <Area type="monotone" dataKey="dss"      name="DSS"      stroke="#ef4444" strokeWidth={2.5} fill="url(#dssGrad)"  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#ef4444' }} activeDot={{ r: 6 }} />
              <Area type="monotone" dataKey="insp"     name="Inspe├º├úo" stroke="#f97316" strokeWidth={2.5} fill="url(#inspGrad)" dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#f97316' }} activeDot={{ r: 6 }} />
              <Area type="monotone" dataKey="entregas" name="Entregas" stroke="#10b981" strokeWidth={2.5} fill="url(#entGrad)"  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#10b981' }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Radial Progress */}
        <div className="bg-white border border-slate-100 rounded-3xl p-7 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Target size={16} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Metas {mesSel ?? 'Gerais'}</h2>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f1f5f9' }} />
                <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 12 }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 mt-2">
            {radialData.map(d => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                <span className="text-xs text-slate-600 flex-1 font-medium">{d.name}</span>
                <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-1.5 rounded-full" style={{ width: `${d.value}%`, background: d.fill }} />
                </div>
                <span className="text-xs font-bold text-slate-700 w-8 text-right">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ÔöÇÔöÇ Barras por T├®cnico + Ranking ÔöÇÔöÇ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Bar Chart */}
        <div className="xl:col-span-2 bg-white border border-slate-100 rounded-3xl p-7 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <BarChart2 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Desempenho por T├®cnico</h2>
              <p className="text-xs text-slate-400">{mesSel ? `Estimativa de ${mesSel}/2026` : 'Acumulado 2026'}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barData} margin={{ left: -15, right: 10, bottom: 10 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nome" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 500 }} angle={-20} textAnchor="end" height={55} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241,245,249,0.6)', radius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#475569', paddingTop: 10 }} />
              <Bar dataKey="dss"  name="DSS"      fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={20} />
              <Bar dataKey="insp" name="Inspe├º├úo" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ranking */}
        <div className="bg-white border border-slate-100 rounded-3xl p-7 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Award size={16} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Ranking do Time</h2>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {ranking.map((t, i) => {
              const colors = ['bg-amber-100 text-amber-700', 'bg-slate-100 text-slate-600', 'bg-orange-100 text-orange-700']
              const badgeColor = colors[i] ?? 'bg-slate-50 text-slate-400'
              return (
                <div key={t.nome} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${badgeColor}`}>{i+1}</span>
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-700 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                    {getInitials(t.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-semibold text-slate-700 truncate">{t.nome}</span>
                      <span className="text-[10px] font-bold text-slate-500 ml-1 shrink-0">{t.total}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-700" style={{ width: `${t.pct}%` }} />
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
