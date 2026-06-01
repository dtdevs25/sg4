'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'

// ── Dados reais extraídos da planilha ─────────────────────────────────────
const TECNICOS = [
  { nome: 'Antonio Carlos', dss: 32, insp: 74, meta_dss: 480, meta_insp: 1200 },
  { nome: 'Daniel Gregório', dss: 44, insp: 92, meta_dss: 480, meta_insp: 1200 },
  { nome: 'Dara Amorim',     dss: 3,  insp: 5,  meta_dss: 480, meta_insp: 1200 },
  { nome: 'Djonatê Cruz',    dss: 27, insp: 66, meta_dss: 480, meta_insp: 1200 },
  { nome: 'Jonas Rodrigues', dss: 28, insp: 82, meta_dss: 480, meta_insp: 1200 },
  { nome: 'Karine Novaes',   dss: 40, insp: 83, meta_dss: 480, meta_insp: 1200 },
  { nome: 'Luis Claudio',    dss: 19, insp: 41, meta_dss: 480, meta_insp: 1200 },
  { nome: 'Rogério Lima',    dss: 29, insp: 60, meta_dss: 480, meta_insp: 1200 },
  { nome: 'Rosicleide F.',   dss: 62, insp: 88, meta_dss: 480, meta_insp: 1200 },
  { nome: 'Samuel Santos',   dss: 4,  insp: 4,  meta_dss: 480, meta_insp: 1200 },
]

const MENSAL = [
  { mes: 'Jan', dss: 70,  insp: 148 },
  { mes: 'Fev', dss: 68,  insp: 148 },
  { mes: 'Mar', dss: 84,  insp: 165 },
  { mes: 'Abr', dss: 66,  insp: 134 },
  { mes: 'Mai', dss: 0,   insp: 0   },
  { mes: 'Jun', dss: 0,   insp: 0   },
  { mes: 'Jul', dss: 0,   insp: 0   },
  { mes: 'Ago', dss: 0,   insp: 0   },
  { mes: 'Set', dss: 0,   insp: 0   },
  { mes: 'Out', dss: 0,   insp: 0   },
  { mes: 'Nov', dss: 0,   insp: 0   },
  { mes: 'Dez', dss: 0,   insp: 0   },
]

const TOT_DSS   = 288
const META_DSS  = 4800
const TOT_INSP  = 595
const META_INSP = 12000
const PCT_DSS   = Math.round((TOT_DSS  / META_DSS)  * 100)
const PCT_INSP  = Math.round((TOT_INSP / META_INSP) * 100)
const TOTAL_REAL = TOT_DSS + TOT_INSP
const TOTAL_META = META_DSS + META_INSP
const PCT_GERAL  = Math.round((TOTAL_REAL / TOTAL_META) * 100)

// Métricas de Reuniões e Entregas (Dados consolidados das planilhas correspondentes)
const METRICAS_REUNIOES = { presencaGeral: 86, pontualidadeGeral: 92 }
const METRICAS_ENTREGAS = { noPrazo: 78 }

const ranking = [...TECNICOS]
  .map((t) => ({ ...t, total: t.dss + t.insp }))
  .sort((a, b) => b.total - a.total)

function KpiCard({ label, value, meta, pct, color }: {
  label: string; value: number; meta: number; pct: number; color: string
}) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
      <span className="text-slate-500 text-sm font-medium">{label}</span>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-slate-800">{value.toLocaleString('pt-BR')}</span>
        <span className="text-slate-500 text-sm mb-1">/ {meta.toLocaleString('pt-BR')}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all`} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-slate-500">{pct}% atingido</span>
    </div>
  )
}

const TooltipStyle = {
  contentStyle: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, color: '#334155' },
  labelStyle: { color: '#64748b' },
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Visão geral — Time TST SG4 · 2026</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="DSS Realizados"     value={TOT_DSS}   meta={META_DSS}   pct={PCT_DSS}  color="#ef4444" />
        <KpiCard label="Inspeções Realizadas" value={TOT_INSP} meta={META_INSP}  pct={PCT_INSP} color="#f97316" />
        
        {/* KPI Novo: Reuniões */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
          <span className="text-slate-500 text-sm font-medium">Presença Reuniões</span>
          <span className="text-3xl font-bold text-slate-800">{METRICAS_REUNIOES.presencaGeral}%</span>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${METRICAS_REUNIOES.presencaGeral}%` }} />
          </div>
          <span className="text-xs text-slate-500">{METRICAS_REUNIOES.pontualidadeGeral}% pontualidade</span>
        </div>

        {/* KPI Novo: Entregas */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
          <span className="text-slate-500 text-sm font-medium">Entregas no Prazo</span>
          <span className="text-3xl font-bold text-emerald-600">{METRICAS_ENTREGAS.noPrazo}%</span>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${METRICAS_ENTREGAS.noPrazo}%` }} />
          </div>
          <span className="text-xs text-slate-500">Atividades e Registros de KM</span>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
          <span className="text-slate-500 text-sm font-medium">Total de Técnicos</span>
          <span className="text-3xl font-bold text-slate-800">10</span>
          <span className="text-xs text-slate-500">Ativos no time</span>
        </div>
        
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
          <span className="text-slate-500 text-sm font-medium">Atingimento Geral</span>
          <span className="text-3xl font-bold text-slate-800">{PCT_GERAL}%</span>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${PCT_GERAL}%` }} />
          </div>
          <span className="text-xs text-slate-500">{TOTAL_REAL} / {TOTAL_META.toLocaleString('pt-BR')} atividades</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bar chart por técnico */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Desempenho por Técnico</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={TECNICOS} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="nome" tick={{ fill: '#64748b', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={55} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip {...TooltipStyle} />
              <Legend wrapperStyle={{ color: '#64748b', fontSize: 12 }} />
              <Bar dataKey="dss"  name="DSS"      fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="insp" name="Inspeção"  fill="#f97316" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart mensal */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Evolução Mensal — 2026</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={MENSAL} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip {...TooltipStyle} />
              <Legend wrapperStyle={{ color: '#64748b', fontSize: 12 }} />
              <Line type="monotone" dataKey="dss"  name="DSS"      stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="insp" name="Inspeção"  stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Ranking do Time</h2>
        <div className="space-y-3">
          {ranking.map((t, i) => {
            const pct = Math.round((t.total / (t.meta_dss + t.meta_insp)) * 100)
            return (
              <div key={t.nome} className="flex items-center gap-4">
                <span className={`text-sm font-bold w-6 text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-500' : i === 2 ? 'text-orange-500' : 'text-slate-500'}`}>
                  {i + 1}
                </span>
                <span className="text-sm text-slate-700 w-36 truncate">{t.nome}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-red-600" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-16 text-right">{t.total} ativ.</span>
                <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
