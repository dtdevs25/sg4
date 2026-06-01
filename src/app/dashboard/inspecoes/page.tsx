'use client'

import { useState } from 'react'
import {
  ClipboardCheck, Calendar, Filter, User,
  CheckCircle2, AlertTriangle, PlayCircle, PlusCircle, ArrowUpRight, Search
} from 'lucide-react'

// Dados reais compilados da aba "GESTÃO DE INSPEÇÕES DE SEGURANÇA"
const INITIAL_INSPECOES = [
  { id: '1', nome: 'Antonio Carlos Junior Dias', admissao: '05/08/2025', jan: 20, fev: 20, mar: 16, abr: 18, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '2', nome: 'Daniel José Gregorio Junior', admissao: '05/08/2025', jan: 23, fev: 22, mar: 25, abr: 22, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '3', nome: 'Dara Amorim Silva de Lima', admissao: '23/03/2026', jan: 0, fev: 0, mar: 0, abr: 5, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '4', nome: 'Djonatê Cruz dos Santos', admissao: '05/08/2025', jan: 20, fev: 21, mar: 20, abr: 5, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '5', nome: 'Jonas Rodrigues Pereira', admissao: '18/09/2025', jan: 20, fev: 20, mar: 21, abr: 21, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '6', nome: 'Karine Novaes Assem', admissao: '05/08/2025', jan: 20, fev: 22, mar: 20, abr: 21, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '7', nome: 'Luis Claudio Soares', admissao: '02/02/2026', jan: 0, fev: 1, mar: 19, abr: 21, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '8', nome: 'Rogério Lima da Silva', admissao: '12/04/2025', jan: 20, fev: 20, mar: 20, abr: 0, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '9', nome: 'Rosicleide Fernandes Santos Davino', admissao: '05/08/2025', jan: 25, fev: 21, mar: 24, abr: 18, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '10', nome: 'Samuel da Silva Santos', admissao: '05/08/2025', jan: 0, fev: 2, mar: 0, abr: 2, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
]

type MesKey = 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun' | 'jul' | 'ago' | 'set' | 'out' | 'nov' | 'dez'

export default function InspecoesPage() {
  const [data, setData] = useState(INITIAL_INSPECOES)
  const [selectedMonth, setSelectedMonth] = useState<MesKey>('abr')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)
  
  const targetMeta = 20 // Meta padrão mensal da planilha de inspeções

  const filtered = data.filter(t => t.nome.toLowerCase().includes(search.toLowerCase()))

  // Estatísticas do mês
  const totalRealizado = filtered.reduce((acc, curr) => acc + curr[selectedMonth], 0)
  const totalMeta = filtered.length * targetMeta
  const pctRealizado = totalMeta > 0 ? Math.round((totalRealizado / totalMeta) * 100) : 0

  function startEdit(id: string, currentValue: number) {
    setEditingId(id)
    setEditValue(currentValue)
  }

  function saveEdit(id: string) {
    setData(prev => prev.map(t => t.id === id ? { ...t, [selectedMonth]: editValue } : t))
    setEditingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardCheck className="text-red-500" /> Gestão de Inspeções de Segurança
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Gerencie e acompanhe as metas mensais de inspeções (Meta: <b>{targetMeta}</b> por técnico/mês)
        </p>
      </div>

      {/* Meses Selector & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month Picker */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3 block">Selecionar Período</span>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {[
              { key: 'jan', label: 'Janeiro' },
              { key: 'fev', label: 'Fevereiro' },
              { key: 'mar', label: 'Março' },
              { key: 'abr', label: 'Abril' },
              { key: 'mai', label: 'Maio' },
              { key: 'jun', label: 'Junho' },
              { key: 'jul', label: 'Julho' },
              { key: 'ago', label: 'Agosto' },
              { key: 'set', label: 'Setembro' },
              { key: 'out', label: 'Outubro' },
              { key: 'nov', label: 'Novembro' },
              { key: 'dez', label: 'Dezembro' }
            ].map(m => (
              <button
                key={m.key}
                onClick={() => { setSelectedMonth(m.key as MesKey); setEditingId(null) }}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                  selectedMonth === m.key
                    ? 'bg-red-700 text-white shadow-md shadow-red-900/30'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats card */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Atingimento do Mês</span>
            <span className="text-xs bg-red-500/10 text-red-400 font-semibold px-2 py-0.5 rounded-full uppercase">
              {selectedMonth}
            </span>
          </div>
          
          <div className="my-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900">{totalRealizado}</span>
            <span className="text-slate-500 text-sm">/ {totalMeta} inspeções realizadas</span>
          </div>

          <div className="w-full bg-slate-50 rounded-full h-2.5 overflow-hidden border border-slate-200">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500" 
              style={{ width: `${Math.min(pctRealizado, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between text-[11px] text-slate-500 mt-2">
            <span>Atingimento: <b>{pctRealizado}%</b></span>
            <span>Meta: {targetMeta} / técnico</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filtrar por técnico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-white text-xs focus:border-red-500 focus:outline-none transition-colors"
          />
        </div>
        <div className="text-xs text-slate-500">
          Mostrando <b>{filtered.length}</b> de <b>{data.length}</b> técnicos cadastrados
        </div>
      </div>

      {/* Grid of details */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Técnico</th>
                <th className="py-4 px-6 text-center">Meta Mensal</th>
                <th className="py-4 px-6 text-center">Realizado</th>
                <th className="py-4 px-6 text-center">Progresso</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((t) => {
                const realizado = t[selectedMonth]
                const statusPct = Math.round((realizado / targetMeta) * 100)
                const isCompleted = realizado >= targetMeta
                const hasStarted = realizado > 0

                return (
                  <tr key={t.id} className="hover:bg-slate-50/20 transition-colors text-sm">
                    {/* Técnico */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-red-500">
                          {t.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">{t.nome}</span>
                          <span className="text-[10px] text-slate-500">Admissão: {t.admissao}</span>
                        </div>
                      </div>
                    </td>

                    {/* Meta */}
                    <td className="py-4 px-6 text-center font-semibold text-slate-500">
                      {targetMeta}
                    </td>

                    {/* Realizado */}
                    <td className="py-4 px-6 text-center">
                      {editingId === t.id ? (
                        <input
                          type="number"
                          value={editValue}
                          min={0}
                          max={100}
                          onChange={(e) => setEditValue(Number(e.target.value))}
                          className="w-16 px-2 py-1 rounded bg-slate-50 border border-slate-700 text-center text-white focus:outline-none focus:border-red-500 font-semibold"
                        />
                      ) : (
                        <span className={`font-bold ${isCompleted ? 'text-emerald-400' : hasStarted ? 'text-orange-400' : 'text-slate-500'}`}>
                          {realizado}
                        </span>
                      )}
                    </td>

                    {/* Progresso bar */}
                    <td className="py-4 px-6 min-w-[150px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-50 rounded-full h-2 border border-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCompleted ? 'bg-emerald-500' : hasStarted ? 'bg-orange-500' : 'bg-slate-700'
                            }`}
                            style={{ width: `${Math.min(statusPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 w-8 text-right">
                          {statusPct}%
                        </span>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-6 text-center">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                          <CheckCircle2 size={12} /> Meta Atingida
                        </span>
                      ) : hasStarted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400">
                          <PlayCircle size={12} /> Em andamento
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-500">
                          <AlertTriangle size={12} /> Não iniciado
                        </span>
                      )}
                    </td>

                    {/* Ação */}
                    <td className="py-4 px-6 text-right">
                      {editingId === t.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => saveEdit(t.id)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-600 text-xs font-bold transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(t.id, realizado)}
                          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-700 text-xs font-semibold transition-all"
                        >
                          Lançar Realizado
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
