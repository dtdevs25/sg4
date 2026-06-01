'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { 
  ShieldAlert, Eye, Calendar, FileCheck, Users, Target, 
  TrendingUp, BarChart2, Award, Zap
} from 'lucide-react'

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

const METRICAS_REUNIOES = { presencaGeral: 86, pontualidadeGeral: 92 }
const METRICAS_ENTREGAS = { noPrazo: 78 }

const ranking = [...TECNICOS]
  .map((t) => ({ ...t, total: t.dss + t.insp }))
  .sort((a, b) => b.total - a.total)

// Function to get user initials
const getInitials = (name: string) => {
  const parts = name.split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

interface KpiCardProps {
  label: string
  value: string | number
  subtitle?: string
  progress?: number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  accentLineColor?: string
}

function KpiCard({ label, value, subtitle, progress, icon, iconBg, iconColor, accentLineColor = 'bg-red-500' }: KpiCardProps) {
  return (
    <div className="group bg-white border border-slate-100 hover:border-red-100 shadow-sm hover:shadow-md rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
      {/* Accent hover line */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accentLineColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
      
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor} shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
          {icon}
        </div>
      </div>

      {progress !== undefined ? (
        <div className="mt-4 space-y-1.5">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className={`h-1.5 rounded-full ${accentLineColor} transition-all duration-500`} style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between items-center text-[10px] font-medium text-slate-400">
            <span>{subtitle || `${progress}% atingido`}</span>
            <span className="font-bold">{progress}%</span>
          </div>
        </div>
      ) : (
        subtitle && (
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-1 text-[11px] font-medium text-slate-400">
            <Zap size={12} className="text-amber-500 shrink-0 animate-pulse" />
            <span>{subtitle}</span>
          </div>
        )
      )}
    </div>
  )
}

const TooltipStyle = {
  contentStyle: { background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: 16, color: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
  labelStyle: { color: '#64748b', fontWeight: 600 },
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Dashboard Executivo</h1>
          <p className="text-slate-400 text-xs mt-0.5">Indicadores operacionais em tempo real para tomada de decisão.</p>
        </div>
        <div className="bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-red-100 shadow-sm">
          Período Ativo: Jan · Abr 2026
        </div>
      </div>

      {/* Modernized KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        <KpiCard 
          label="DSS Realizados" 
          value={TOT_DSS.toLocaleString('pt-BR')} 
          subtitle={`Meta: ${META_DSS.toLocaleString('pt-BR')}`}
          progress={PCT_DSS}
          accentLineColor="bg-red-500"
          icon={<ShieldAlert size={20} />}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        
        <KpiCard 
          label="Inspeções" 
          value={TOT_INSP.toLocaleString('pt-BR')} 
          subtitle={`Meta: ${META_INSP.toLocaleString('pt-BR')}`}
          progress={PCT_INSP}
          accentLineColor="bg-orange-500"
          icon={<Eye size={20} />}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />

        <KpiCard 
          label="Presença Reuniões" 
          value={`${METRICAS_REUNIOES.presencaGeral}%`} 
          subtitle={`${METRICAS_REUNIOES.pontualidadeGeral}% pontualidade`}
          progress={METRICAS_REUNIOES.presencaGeral}
          accentLineColor="bg-cyan-500"
          icon={<Calendar size={20} />}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
        />

        <KpiCard 
          label="Entregas No Prazo" 
          value={`${METRICAS_ENTREGAS.noPrazo}%`} 
          subtitle="KM & Atividades operacionais"
          progress={METRICAS_ENTREGAS.noPrazo}
          accentLineColor="bg-emerald-500"
          icon={<FileCheck size={20} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        <KpiCard 
          label="Técnicos Ativos" 
          value="10" 
          subtitle="Time operacional 100% ativo"
          accentLineColor="bg-violet-500"
          icon={<Users size={20} />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />

        <KpiCard 
          label="Atingimento Geral" 
          value={`${PCT_GERAL}%`} 
          subtitle={`${TOTAL_REAL.toLocaleString('pt-BR')} total de registros`}
          progress={PCT_GERAL}
          accentLineColor="bg-amber-500"
          icon={<Target size={20} />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Grid for Charts & Ranking */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Charts Container - spans 2 columns */}
        <div className="xl:col-span-2 space-y-6">
          {/* Bar Chart Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <BarChart2 size={16} />
              </div>
              <h2 className="text-base font-bold text-slate-800">Desempenho por Técnico</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={TECNICOS} margin={{ left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="nome" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} interval={0} angle={-20} textAnchor="end" height={55} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} />
                <Tooltip {...TooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#475569', paddingTop: 10 }} />
                <Bar dataKey="dss" name="DSS" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={25} />
                <Bar dataKey="insp" name="Inspeção" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <TrendingUp size={16} />
              </div>
              <h2 className="text-base font-bold text-slate-800">Evolução Mensal — 2026</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={MENSAL} margin={{ left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} />
                <Tooltip {...TooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#475569', paddingTop: 10 }} />
                <Line type="monotone" dataKey="dss" name="DSS" stroke="#ef4444" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 3, strokeWidth: 2 }} />
                <Line type="monotone" dataKey="insp" name="Inspeção" stroke="#f97316" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 3, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ranking List - spans 1 column */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Award size={16} />
            </div>
            <h2 className="text-base font-bold text-slate-800">Ranking do Time</h2>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {ranking.map((t, i) => {
              const pct = Math.round((t.total / (t.meta_dss + t.meta_insp)) * 100)
              const initials = getInitials(t.nome)
              
              // Custom rank index circles
              const rankColor = i === 0 
                ? 'bg-amber-100 text-amber-700 border-amber-200' 
                : i === 1 
                ? 'bg-slate-100 text-slate-700 border-slate-200' 
                : i === 2 
                ? 'bg-orange-100 text-orange-700 border-orange-200' 
                : 'bg-slate-50 text-slate-400 border-slate-100'

              return (
                <div key={t.nome} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50/50 transition-colors border border-transparent hover:border-slate-100">
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${rankColor}`}>
                    {i + 1}
                  </div>
                  
                  {/* Avatar Initials Badge */}
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                    {initials}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-semibold text-slate-700 truncate block">{t.nome}</span>
                      <span className="text-xs font-bold text-slate-500 shrink-0">{t.total} ativ.</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0 w-8 text-right">{pct}%</span>
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
