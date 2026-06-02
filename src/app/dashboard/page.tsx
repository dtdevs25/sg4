'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  ClipboardCheck, Clock, CheckCircle2, AlertTriangle,
  FileText, Bell,
} from 'lucide-react'

// ── Paleta de cores (identica ao InspecaoPRO) ───────────────────────────────
const COLORS = ['#5DADE2', '#FF4D4D', '#FFB84D', '#B84DFF', '#4DFFB8', '#4DB8FF', '#FF4DFF', '#F4D03F', '#58D68D']

// ── Dados dos técnicos (bar chart "por setor") ──────────────────────────────
const SETOR_DATA = [
  { name: 'Antonio C.',    value: 106, color: COLORS[0] },
  { name: 'Daniel G.',     value: 136, color: COLORS[1] },
  { name: 'Dara A.',       value: 8,   color: COLORS[2] },
  { name: 'Djonatê C.',    value: 93,  color: COLORS[3] },
  { name: 'Jonas R.',      value: 110, color: COLORS[4] },
  { name: 'Karine N.',     value: 123, color: COLORS[5] },
  { name: 'Luis C.',       value: 60,  color: COLORS[6] },
  { name: 'Rogério L.',    value: 89,  color: COLORS[7] },
  { name: 'Rosicleide F.', value: 150, color: COLORS[8] },
  { name: 'Samuel S.',     value: 8,   color: COLORS[0] },
]

// ── Dados do PieChart "por tipo" ────────────────────────────────────────────
const TIPO_DATA = [
  { name: 'DSS',        value: 288, color: '#5DADE2' },
  { name: 'Inspeções',  value: 595, color: '#28A745' },
  { name: 'Entregas',   value: 316, color: '#FFB84D' },
  { name: 'Pendentes',  value: 47,  color: '#FF4D4D' },
]

// ── Próximos vencimentos (mock) ─────────────────────────────────────────────
const VENCIMENTOS = [
  { nome: 'Rosicleide F.', tipo: 'DSS + Inspeção', prazo: '07/06/2026' },
  { nome: 'Daniel G.',     tipo: 'DSS + Inspeção', prazo: '08/06/2026' },
  { nome: 'Karine N.',     tipo: 'DSS + Inspeção', prazo: '09/06/2026' },
  { nome: 'Jonas R.',      tipo: 'Inspeção',        prazo: '10/06/2026' },
  { nome: 'Antonio C.',    tipo: 'DSS',             prazo: '11/06/2026' },
]

// ── Stat card (identico ao InspecaoPRO) ────────────────────────────────────
function StatCard({ icon: Icon, label, value, bgColor, bottomColor, iconColor }: {
  icon: React.ElementType; label: string; value: string | number
  bgColor: string; bottomColor: string; iconColor: string
}) {
  return (
    <div className={`relative flex flex-col justify-between rounded-lg shadow-sm overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] ${bgColor}`}>
      <div className="p-4 md:p-5 flex justify-between items-center">
        <div className="space-y-0.5">
          <p className="text-white text-sm md:text-base font-medium tracking-wide">{label}</p>
          <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{value}</h3>
        </div>
        <Icon className={`h-14 w-14 md:h-16 md:w-16 mr-1 ${iconColor}`} strokeWidth={1.5} />
      </div>
      <div className={`h-3 w-full ${bottomColor}`} />
    </div>
  )
}

// ── Pie label ───────────────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  const pct = (percent * 100).toFixed(0)
  if (Number(pct) < 4) return null
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 900 }}>
      {pct}%
    </text>
  )
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      <p style={{ fontWeight: 700, color: '#334155', marginBottom: 4, fontSize: 12 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill || p.color, display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#1e293b', fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Dashboard ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session } = useSession()
  const userName = session?.user?.name?.split(' ')[0] || 'Usuário'

  // totais
  const totalDss   = 288
  const totalInsp  = 595
  const totalEnt   = 316
  const totalPend  = 47

  return (
    <div className="space-y-6 pb-10">

      {/* ── Barra de saudação (identica ao InspecaoPRO) ── */}
      <div className="bg-white py-3 px-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
          <h1 className="text-lg font-bold text-gray-800">Olá, {userName}!</h1>
          <p className="text-gray-400 text-xs sm:text-sm">Bem-vindo ao painel SG4</p>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 font-semibold">
          <span className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">📅 Acumulado 2026</span>
        </div>
      </div>

      {/* ── 4 Stat Cards (identicos ao InspecaoPRO) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={ClipboardCheck}
          label="DSS Realizados"
          value={totalDss}
          bgColor="bg-[#007BFF]"
          bottomColor="bg-[#0069D9]"
          iconColor="text-white/30"
        />
        <StatCard
          icon={Clock}
          label="Inspeções"
          value={totalInsp}
          bgColor="bg-[#FFC107]"
          bottomColor="bg-[#E0A800]"
          iconColor="text-white/40"
        />
        <StatCard
          icon={CheckCircle2}
          label="Entregas"
          value={totalEnt}
          bgColor="bg-[#28A745]"
          bottomColor="bg-[#218838]"
          iconColor="text-white/30"
        />
        <StatCard
          icon={AlertTriangle}
          label="Pendentes"
          value={totalPend}
          bgColor="bg-[#DC3545]"
          bottomColor="bg-[#C82333]"
          iconColor="text-white/30"
        />
      </div>

      {/* ── Charts (identico ao InspecaoPRO: 2/3 bar + 1/3 pie) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna larga: BarChart + Vencimentos */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* BarChart - Desempenho por Técnico */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col" style={{ height: 500 }}>
            <div className="bg-[#27AE60] p-4 flex items-center gap-2 text-white font-bold">
              <FileText className="h-5 w-5" />
              <span>Desempenho por Técnico</span>
            </div>
            <div className="flex-1 p-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SETOR_DATA} margin={{ left: -10, right: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#A6ACAF"
                    fontSize={10}
                    tickLine={false}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#A6ACAF" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(39,174,96,0.08)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {SETOR_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Próximos Vencimentos */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col max-h-[250px]">
            <div className="bg-[#27AE60] p-4 flex items-center gap-2 text-white font-bold">
              <Clock className="h-5 w-5" />
              <span>Próximos Vencimentos (7 dias)</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 sticky top-0 border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-widest font-black">
                  <tr>
                    <th className="px-4 py-3">Técnico</th>
                    <th className="px-4 py-3">Atividade</th>
                    <th className="px-4 py-3">Prazo</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {VENCIMENTOS.map((v, i) => (
                    <tr key={i} className="hover:bg-amber-50/40 transition-colors cursor-pointer">
                      <td className="px-4 py-3 font-bold text-gray-700">{v.nome}</td>
                      <td className="px-4 py-3 text-gray-500">{v.tipo}</td>
                      <td className="px-4 py-3 font-black text-amber-600">{v.prazo}</td>
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

        {/* PieChart - Distribuição por Tipo */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col" style={{ minHeight: 600 }}>
          <div className="bg-[#27AE60] p-4 flex items-center gap-2 text-white font-bold">
            <Bell className="h-5 w-5" />
            <span>Apontamentos por Tipo</span>
          </div>
          <div className="flex-1 p-4 flex flex-col">
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={TIPO_DATA}
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    dataKey="value"
                    label={PieLabel}
                    labelLine={false}
                  >
                    {TIPO_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {TIPO_DATA.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                  <div className="w-8 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-gray-600 font-bold truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
