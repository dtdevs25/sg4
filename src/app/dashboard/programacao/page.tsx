'use client'

import { useState } from 'react'
import {
  Calendar as CalendarIcon, Clock, MapPin, User,
  Plus, CheckCircle2, AlertCircle, Trash2, Search, Filter
} from 'lucide-react'

const INITIAL_SCHEDULE = [
  { id: 'sch-1', tecnico: 'Rosicleide Fernandes', titulo: 'Treinamento de NR-35 (Trabalho em Altura)', local: 'Centro de Treinamento - Sala B', data: '05/06/2026', hora: '08:30', status: 'Pendente', prioridade: 'Alta' },
  { id: 'sch-2', tecnico: 'Daniel José Gregorio', titulo: 'Auditoria de Conformidade Geral', local: 'Galpão Logístico Sul', data: '08/06/2026', hora: '10:00', status: 'Pendente', prioridade: 'Alta' },
  { id: 'sch-3', tecnico: 'Karine Novaes Assem', titulo: 'Inspeção Periódica de Vasos de Pressão', local: 'Planta Industrial - Área 4', data: '12/06/2026', hora: '14:00', status: 'Pendente', prioridade: 'Média' },
  { id: 'sch-4', tecnico: 'Jonas Rodrigues Pereira', titulo: 'Integração de Novos Funcionários Terceirizados', local: 'Auditório Principal', data: '15/06/2026', hora: '09:00', status: 'Concluído', prioridade: 'Baixa' },
  { id: 'sch-5', tecnico: 'Antonio Carlos Junior', titulo: 'Simulado de Abandono de Área e Incêndio', local: 'Área Comum Externa', data: '18/06/2026', hora: '15:30', status: 'Pendente', prioridade: 'Alta' },
]

export default function ProgramacaoPage() {
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  
  // New schedule form
  const [form, setForm] = useState({
    tecnico: 'Antonio Carlos Junior',
    titulo: '',
    local: '',
    data: '',
    hora: '',
    status: 'Pendente',
    prioridade: 'Média'
  })

  const filtered = schedule.filter(s => 
    s.titulo.toLowerCase().includes(search.toLowerCase()) ||
    s.tecnico.toLowerCase().includes(search.toLowerCase()) ||
    s.local.toLowerCase().includes(search.toLowerCase())
  )

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo || !form.data) return
    const id = 'sch-' + Date.now()
    setSchedule(prev => [ { id, ...form }, ...prev ])
    setShowAddModal(false)
    setForm({
      tecnico: 'Antonio Carlos Junior',
      titulo: '',
      local: '',
      data: '',
      hora: '',
      status: 'Pendente',
      prioridade: 'Média'
    })
  }

  function toggleStatus(id: string) {
    setSchedule(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'Concluído' ? 'Pendente' : 'Concluído' }
      }
      return s
    }))
  }

  function deleteSchedule(id: string) {
    setSchedule(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="text-red-500" /> Programação e Agenda do Time
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Planejamento de treinamentos, auditorias e inspeções especiais para a equipe de TSTs
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-red-900/20 active:scale-95"
        >
          <Plus size={18} />
          <span>Agendar Evento</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por título do evento, técnico ou local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-white text-xs focus:outline-none focus:border-red-500"
          />
        </div>
        <div className="text-xs text-slate-500">
          Total agendado: <b>{filtered.length}</b> compromissos
        </div>
      </div>

      {/* Grid containing Schedule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`group bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-slate-700 hover:shadow-xl ${
              item.status === 'Concluído' ? 'border-slate-200 opacity-75' : 'border-slate-200'
            }`}
          >
            <div className="space-y-4">
              {/* Prioridade & Status */}
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  item.prioridade === 'Alta' ? 'bg-red-500/10 text-red-400' :
                  item.prioridade === 'Média' ? 'bg-orange-500/10 text-orange-400' :
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  {item.prioridade} prioridade
                </span>
                <button
                  onClick={() => toggleStatus(item.id)}
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-colors ${
                    item.status === 'Concluído'
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  }`}
                >
                  {item.status}
                </button>
              </div>

              {/* Título */}
              <h3 className="font-bold text-slate-900 group-hover:text-red-400 transition-colors leading-snug">
                {item.titulo}
              </h3>

              {/* Informações de Tempo e Local */}
              <div className="space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={14} className="text-slate-500" />
                  <span>Data: <b>{item.data}</b> às <b>{item.hora}</b></span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-500" />
                  <span className="truncate">{item.local}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-slate-500" />
                  <span className="font-medium text-slate-600">Técnico: {item.tecnico}</span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 mt-5 border-t border-slate-200 pt-3">
              <button
                onClick={() => toggleStatus(item.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  item.status === 'Concluído'
                    ? 'border-slate-200 bg-slate-100 text-slate-500'
                    : 'border-emerald-950/40 text-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20'
                }`}
              >
                {item.status === 'Concluído' ? 'Desmarcar Concluído' : 'Marcar Concluído'}
              </button>
              <button
                onClick={() => deleteSchedule(item.id)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-950/30 hover:text-red-400 border border-slate-200 transition-colors"
                title="Excluir agendamento"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          
          <div className="relative bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-white">
            <h2 className="text-lg font-bold mb-1">Agendar Novo Evento</h2>
            <p className="text-slate-500 text-xs mb-5">Planeje uma atividade para a equipe técnica.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título do Evento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treinamento NR-10 Basico"
                  value={form.titulo}
                  onChange={(e) => setForm(p => ({ ...p, titulo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Técnico Encarregado</label>
                <select
                  value={form.tecnico}
                  onChange={(e) => setForm(p => ({ ...p, tecnico: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-red-500 focus:outline-none"
                >
                  <option value="Antonio Carlos Junior">Antonio Carlos Junior</option>
                  <option value="Daniel José Gregorio">Daniel José Gregorio</option>
                  <option value="Dara Amorim Silva">Dara Amorim Silva</option>
                  <option value="Djonatê Cruz dos Santos">Djonatê Cruz dos Santos</option>
                  <option value="Jonas Rodrigues Pereira">Jonas Rodrigues Pereira</option>
                  <option value="Karine Novaes Assem">Karine Novaes Assem</option>
                  <option value="Luis Claudio Soares">Luis Claudio Soares</option>
                  <option value="Rosicleide Fernandes">Rosicleide Fernandes</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
                  <input
                    type="text"
                    required
                    placeholder="DD/MM/AAAA"
                    value={form.data}
                    onChange={(e) => setForm(p => ({ ...p, data: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hora</label>
                  <input
                    type="text"
                    required
                    placeholder="HH:MM"
                    value={form.hora}
                    onChange={(e) => setForm(p => ({ ...p, hora: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Local / Planta</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Refinaria Leste - Setor Elétrico"
                  value={form.local}
                  onChange={(e) => setForm(p => ({ ...p, local: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prioridade</label>
                <select
                  value={form.prioridade}
                  onChange={(e) => setForm(p => ({ ...p, prioridade: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-red-500 focus:outline-none"
                >
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 font-semibold text-sm transition-colors border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/20"
                >
                  Agendar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
