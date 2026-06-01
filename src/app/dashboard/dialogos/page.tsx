'use client'

import { useState } from 'react'
import {
  MessageSquare, Calendar, ShieldCheck, HelpCircle,
  TrendingUp, Search, Plus, Trash2, Edit
} from 'lucide-react'

// Dados reais compilados da aba "GESTÃO DE DSS - TIME TST SG4"
const INITIAL_DIALOGOS = [
  { id: '1', nome: 'Antonio Carlos Junior Dias', jan: 8, fev: 8, mar: 8, abr: 8, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '2', nome: 'Daniel José Gregorio Junior', jan: 8, fev: 8, mar: 8, abr: 20, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 }, // Daniel fez 20 em abr na planilha
  { id: '3', nome: 'Dara Amorim Silva de Lima', jan: 0, fev: 0, mar: 0, abr: 3, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '4', nome: 'Djonatê Cruz dos Santos', jan: 8, fev: 8, mar: 8, abr: 3, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '5', nome: 'Jonas Rodrigues Pereira', jan: 9, fev: 8, mar: 8, abr: 3, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '6', nome: 'Karine Novaes Assem', jan: 8, fev: 9, mar: 13, abr: 10, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '7', nome: 'Luis Claudio Soares', jan: 0, fev: 3, mar: 8, abr: 8, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '8', nome: 'Rogério Lima da Silva', jan: 9, fev: 8, mar: 9, abr: 3, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '9', nome: 'Rosicleide Fernandes Santos Davino', jan: 16, fev: 14, mar: 18, abr: 14, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '10', nome: 'Samuel da Silva Santos', jan: 0, fev: 2, mar: 0, abr: 2, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
]

// Lista de temas sugeridos de DSS altamente profissionais
const SUGGESTED_TOPICS = [
  { id: 't1', tema: 'Uso correto e higienização dos EPIs em campo', categoria: 'EPI' },
  { id: 't2', tema: 'Prevenção de acidentes em trabalhos em altura (NR 35)', categoria: 'NRs' },
  { id: 't3', tema: 'Importância da sinalização preventiva e isolamento de área', categoria: 'Procedimento' },
  { id: 't4', tema: 'Ergonomia na rotina operacional: postura e pausas', categoria: 'Saúde' },
  { id: 't5', tema: 'Primeiros socorros e plano de abandono de área', categoria: 'Emergência' },
]

type MesKey = 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun' | 'jul' | 'ago' | 'set' | 'out' | 'nov' | 'dez'

export default function DialogosPage() {
  const [data, setData] = useState(INITIAL_DIALOGOS)
  const [selectedMonth, setSelectedMonth] = useState<MesKey>('abr')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)
  
  // Sugestões de temas criados pelo usuário localmente
  const [topics, setTopics] = useState(SUGGESTED_TOPICS)
  const [newTopic, setNewTopic] = useState('')
  const [newCategory, setNewCategory] = useState('EPI')

  const targetMeta = 8 // Meta de DSS da planilha (8/mês)

  const filtered = data.filter(t => t.nome.toLowerCase().includes(search.toLowerCase()))

  const totalRealizado = filtered.reduce((acc, curr) => acc + curr[selectedMonth], 0)
  const totalMeta = filtered.length * targetMeta
  const pctRealizado = totalMeta > 0 ? Math.round((totalRealizado / totalMeta) * 100) : 0

  function saveEdit(id: string) {
    setData(prev => prev.map(t => t.id === id ? { ...t, [selectedMonth]: editValue } : t))
    setEditingId(null)
  }

  function handleAddTopic(e: React.FormEvent) {
    e.preventDefault()
    if (!newTopic.trim()) return
    const id = 't-' + Date.now()
    setTopics(prev => [...prev, { id, tema: newTopic.trim(), categoria: newCategory }])
    setNewTopic('')
  }

  function handleDeleteTopic(id: string) {
    setTopics(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="text-red-500" /> Diálogos Diários de Segurança (DSS)
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Acompanhe os DDSs ministrados e gerencie sugestões de temas de conscientização. (Meta: <b>{targetMeta}</b>/mês por técnico)
        </p>
      </div>

      {/* Meses Selector & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month Picker */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 block">Selecionar Período</span>
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
                    : 'bg-slate-950 text-slate-400 hover:bg-slate-850 hover:text-white border border-slate-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Atingimento de DSS</span>
            <span className="text-xs bg-red-500/10 text-red-400 font-semibold px-2 py-0.5 rounded-full uppercase">
              {selectedMonth}
            </span>
          </div>
          
          <div className="my-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white">{totalRealizado}</span>
            <span className="text-slate-500 text-sm">/ {totalMeta} DDS realizados</span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-500" 
              style={{ width: `${Math.min(pctRealizado, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between text-[11px] text-slate-400 mt-2">
            <span>Atingimento: <b>{pctRealizado}%</b></span>
            <span>Meta: {targetMeta} / técnico</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Lançamentos table - col-span 2 */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div className="relative w-full max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrar por técnico..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-red-500 focus:outline-none"
              />
            </div>
            <div className="text-xs text-slate-400">
              Período selecionado: <b className="text-white uppercase">{selectedMonth}</b>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-5">Técnico</th>
                    <th className="py-4 px-5 text-center">Meta</th>
                    <th className="py-4 px-5 text-center">Realizado</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Lançar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((t) => {
                    const realizado = t[selectedMonth]
                    const isCompleted = realizado >= targetMeta
                    const hasStarted = realizado > 0

                    return (
                      <tr key={t.id} className="hover:bg-slate-950/20 transition-colors text-sm">
                        <td className="py-4 px-5 font-semibold text-white">{t.nome}</td>
                        <td className="py-4 px-5 text-center text-slate-400">{targetMeta}</td>
                        <td className="py-4 px-5 text-center font-bold">
                          {editingId === t.id ? (
                            <input
                              type="number"
                              value={editValue}
                              min={0}
                              onChange={(e) => setEditValue(Number(e.target.value))}
                              className="w-14 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-center text-white"
                            />
                          ) : (
                            <span className={isCompleted ? 'text-emerald-400' : hasStarted ? 'text-orange-400' : 'text-slate-500'}>
                              {realizado}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-center">
                          {isCompleted ? (
                            <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Completo</span>
                          ) : hasStarted ? (
                            <span className="text-orange-400 text-xs font-bold bg-orange-500/10 px-2 py-0.5 rounded-full">{realizado}/{targetMeta}</span>
                          ) : (
                            <span className="text-slate-500 text-xs font-bold bg-slate-800 px-2 py-0.5 rounded-full">Aguardando</span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          {editingId === t.id ? (
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => saveEdit(t.id)} className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">OK</button>
                              <button onClick={() => setEditingId(null)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold">Cancelar</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingId(t.id); setEditValue(realizado) }}
                              className="text-slate-400 hover:text-white hover:bg-slate-850 px-2.5 py-1 rounded border border-slate-800 hover:border-slate-700 text-xs font-medium"
                            >
                              Editar
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

        {/* Sugestões de Temas de DDS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="text-red-500" /> Temas Sugeridos para DDS
            </h2>
            <p className="text-slate-400 text-xs mt-1">Crie e sugira temas semanais para a equipe ministrar em campo.</p>
          </div>

          {/* Add topic form */}
          <form onSubmit={handleAddTopic} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Ex: Prevenção de choques elétricos..."
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 focus:outline-none"
              >
                <option value="EPI">EPI</option>
                <option value="NRs">NRs</option>
                <option value="Saúde">Saúde</option>
                <option value="Procedimento">Procedimento</option>
                <option value="Emergência">Emergência</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} /> Sugerir
              </button>
            </div>
          </form>

          {/* List of topics */}
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {topics.map(t => (
              <div key={t.id} className="flex justify-between items-start gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850 hover:border-slate-800 transition-colors">
                <div className="space-y-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    t.categoria === 'EPI' ? 'bg-blue-500/10 text-blue-400' :
                    t.categoria === 'NRs' ? 'bg-purple-500/10 text-purple-400' :
                    t.categoria === 'Saúde' ? 'bg-emerald-500/10 text-emerald-400' :
                    t.categoria === 'Emergência' ? 'bg-red-500/10 text-red-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {t.categoria}
                  </span>
                  <p className="text-xs font-semibold text-slate-200 leading-relaxed">{t.tema}</p>
                </div>
                <button
                  onClick={() => handleDeleteTopic(t.id)}
                  className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors shrink-0"
                  title="Excluir sugestão"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
