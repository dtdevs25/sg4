'use client'

import { useState } from 'react'
import {
  CalendarDays, CheckCircle2, Clock, XCircle, AlertCircle,
  PlusCircle, User, Search, TrendingUp, Sparkles, Filter
} from 'lucide-react'

// Dados reais da planilha "GESTÃO DE PARTICIPAÇÃO E PONTUALIDADE" compilados
const INITIAL_REUNIOES_LOG = [
  { id: '1', data: '05/01/2026', nome: 'ANTONIO CARLOS JUNIOR DIAS', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '2', data: '05/01/2026', nome: 'DANIEL JOSÉ GREGORIO JUNIOR', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '3', data: '05/01/2026', nome: 'DJONATÊ CRUZ DOS SANTOS', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '4', data: '05/01/2026', nome: 'JONAS RODRIGUES PEREIRA', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '5', data: '05/01/2026', nome: 'KARINE NOVAES ASSEM', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '6', data: '05/01/2026', nome: 'ROGÉRIO LIMA DA SILVA', presenca: 'Presente', pontualidade: 'Atrasado', justificada: 'Sim', motivo: 'Investigação de acidente em curso.' },
  { id: '7', data: '05/01/2026', nome: 'ROSICLEIDE FERNANDES SANTOS DAVINO', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  
  { id: '8', data: '12/01/2026', nome: 'ANTONIO CARLOS JUNIOR DIAS', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '9', data: '12/01/2026', nome: 'DANIEL JOSÉ GREGORIO JUNIOR', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '10', data: '12/01/2026', nome: 'DJONATÊ CRUZ DOS SANTOS', presenca: 'Ausente', pontualidade: 'N/A', justificada: 'Sim', motivo: 'Atendimento de urgência em campo' },
  { id: '11', data: '12/01/2026', nome: 'JONAS RODRIGUES PEREIRA', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '12', data: '12/01/2026', nome: 'KARINE NOVAES ASSEM', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  
  { id: '13', data: '19/01/2026', nome: 'ANTONIO CARLOS JUNIOR DIAS', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '14', data: '19/01/2026', nome: 'DANIEL JOSÉ GREGORIO JUNIOR', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '15', data: '19/01/2026', nome: 'DJONATÊ CRUZ DOS SANTOS', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '16', data: '19/01/2026', nome: 'JONAS RODRIGUES PEREIRA', presenca: 'Ausente', pontualidade: 'N/A', justificada: 'Não', motivo: 'Esqueceu o horário' },
  
  { id: '17', data: '02/02/2026', nome: 'ANTONIO CARLOS JUNIOR DIAS', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '18', data: '02/02/2026', nome: 'DANIEL JOSÉ GREGORIO JUNIOR', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '19', data: '02/02/2026', nome: 'ROSICLEIDE FERNANDES SANTOS DAVINO', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
]

// Lista de Técnicos
const TECNICOS = [
  'ANTONIO CARLOS JUNIOR DIAS',
  'DANIEL JOSÉ GREGORIO JUNIOR',
  'DJONATÊ CRUZ DOS SANTOS',
  'JONAS RODRIGUES PEREIRA',
  'KARINE NOVAES ASSEM',
  'LUIS CLAUDIO SOARES',
  'ROGÉRIO LIMA DA SILVA',
  'ROSICLEIDE FERNANDES SANTOS DAVINO',
  'SAMUEL DA SILVA SANTOS',
  'DARA AMORIM SILVA DE LIMA'
]

export default function ReunioesPage() {
  const [logs, setLogs] = useState(INITIAL_REUNIOES_LOG)
  const [search, setSearch] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('01') // Janeiro padrão
  const [showModal, setShowModal] = useState(false)

  // Form para nova reunião
  const [meetingDate, setMeetingDate] = useState('02/03/2026')
  const [attendance, setAttendance] = useState<Record<string, { presenca: string; pontualidade: string; justificada: string; motivo: string }>>(
    TECNICOS.reduce((acc, t) => ({
      ...acc,
      [t]: { presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' }
    }), {})
  )

  const filtered = logs.filter(l => {
    const matchSearch = l.nome.toLowerCase().includes(search.toLowerCase()) || l.motivo.toLowerCase().includes(search.toLowerCase())
    const matchMonth = l.data.split('/')[1] === selectedMonth
    return matchSearch && matchMonth
  })

  // Estatísticas gerais baseadas nas fórmulas reais da planilha
  const totalMeetings = Array.from(new Set(filtered.map(l => l.data))).length
  const totalPresences = filtered.filter(l => l.presenca === 'Presente').length
  const totalPunctual = filtered.filter(l => l.pontualidade === 'Pontual').length
  const totalAtrasados = filtered.filter(l => l.pontualidade === 'Atrasado').length
  const totalAusentes = filtered.filter(l => l.presenca === 'Ausente').length
  const totalRegistrations = filtered.length

  const presenceRate = totalRegistrations > 0 ? Math.round((totalPresences / totalRegistrations) * 100) : 0
  const punctualityRate = totalPresences > 0 ? Math.round((totalPunctual / totalPresences) * 100) : 0

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const newLogs: typeof INITIAL_REUNIOES_LOG = []
    let idCounter = logs.length + 1

    TECNICOS.forEach(t => {
      const att = attendance[t]
      newLogs.push({
        id: (idCounter++).toString(),
        data: meetingDate,
        nome: t,
        presenca: att.presenca,
        pontualidade: att.presenca === 'Ausente' ? 'N/A' : att.pontualidade,
        justificada: att.justificada,
        motivo: att.motivo
      })
    })

    setLogs(prev => [...newLogs, ...prev])
    setShowModal(false)
  }

  function updateAttendance(nome: string, field: string, value: string) {
    setAttendance(prev => ({
      ...prev,
      [nome]: {
        ...prev[nome],
        [field]: value
      }
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="text-red-500" /> Presença e Pontualidade em Reuniões
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Substitua a planilha de reuniões: controle a frequência, atrasos e justificativas de ausência do time.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-red-900/20 active:scale-95"
        >
          <PlusCircle size={18} />
          <span>Lançar Chamada</span>
        </button>
      </div>

      {/* Meses Selector & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month Picker */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3 block">Selecionar Mês da Reunião</span>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {[
              { key: '01', label: 'Janeiro' },
              { key: '02', label: 'Fevereiro' },
              { key: '03', label: 'Março' },
              { key: '04', label: 'Abril' },
              { key: '05', label: 'Maio' },
              { key: '06', label: 'Junho' },
              { key: '07', label: 'Julho' },
              { key: '08', label: 'Agosto' },
              { key: '09', label: 'Setembro' },
              { key: '10', label: 'Outubro' },
              { key: '11', label: 'Novembro' },
              { key: '12', label: 'Dezembro' }
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setSelectedMonth(m.key)}
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
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Métricas das Reuniões</span>
            <span className="text-[10px] bg-red-500/10 text-red-400 font-semibold px-2 py-0.5 rounded-full uppercase">
              Mês {selectedMonth}
            </span>
          </div>
          
          <div className="my-3 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Presença Geral</span>
              <span className="text-3xl font-extrabold text-slate-900">{presenceRate}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Pontualidade</span>
              <span className="text-3xl font-extrabold text-emerald-400">{punctualityRate}%</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 flex justify-between text-[11px] text-slate-500">
            <span>Reuniões: <b>{totalMeetings}</b></span>
            <span>Atrasos: <b className="text-amber-400">{totalAtrasados}</b></span>
            <span>Ausentes: <b className="text-red-400">{totalAusentes}</b></span>
          </div>
        </div>
      </div>

      {/* Filters and Counters */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filtrar por técnico ou motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-white text-xs focus:border-red-500 focus:outline-none transition-colors"
          />
        </div>
        <div className="text-xs text-slate-500">
          Encontrados: <b>{filtered.length}</b> lançamentos de chamadas
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Data</th>
                <th className="py-4 px-6">Técnico</th>
                <th className="py-4 px-6 text-center">Presença</th>
                <th className="py-4 px-6 text-center">Pontualidade</th>
                <th className="py-4 px-6 text-center">Ausência Justificada?</th>
                <th className="py-4 px-6">Motivo / Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/20 transition-colors text-sm">
                  {/* Data */}
                  <td className="py-4 px-6 font-semibold text-slate-600">
                    {l.data}
                  </td>

                  {/* Técnico */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[9px] text-red-500 border border-slate-200">
                        {l.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <span className="font-semibold text-slate-700">{l.nome}</span>
                    </div>
                  </td>

                  {/* Presença */}
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      l.presenca === 'Presente'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {l.presenca === 'Presente' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {l.presenca}
                    </span>
                  </td>

                  {/* Pontualidade */}
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      l.pontualidade === 'Pontual'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : l.pontualidade === 'Atrasado'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {l.pontualidade === 'Pontual' ? <CheckCircle2 size={11} /> : l.pontualidade === 'Atrasado' ? <Clock size={11} /> : null}
                      {l.pontualidade}
                    </span>
                  </td>

                  {/* Justificada */}
                  <td className="py-4 px-6 text-center text-xs font-semibold text-slate-500">
                    {l.justificada}
                  </td>

                  {/* Motivo */}
                  <td className="py-4 px-6 text-slate-500 text-xs italic max-w-[250px] truncate" title={l.motivo}>
                    {l.motivo || '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-medium">
                    Nenhuma reunião encontrada para o período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lançar Chamada */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
          
          <div className="relative bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-white">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Sparkles className="text-red-500" /> Registrar Chamada de Reunião
            </h2>
            <p className="text-slate-500 text-xs mb-5">Selecione a data da reunião e defina a presença e pontualidade da equipe de TSTs.</p>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="w-full sm:max-w-xs">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data da Reunião</label>
                <input
                  type="text"
                  required
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-red-500 focus:outline-none"
                />
              </div>

              {/* Grid de Técnicos */}
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Chamada dos Técnicos</span>
                
                <div className="grid grid-cols-1 gap-3">
                  {TECNICOS.map((t) => {
                    const att = attendance[t]
                    return (
                      <div key={t} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-slate-50/40 border border-slate-200 rounded-xl hover:border-slate-200 transition-all">
                        <span className="text-xs font-bold text-slate-900 lg:w-56 truncate">{t}</span>
                        
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Presença */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Presença</span>
                            <select
                              value={att.presenca}
                              onChange={(e) => updateAttendance(t, 'presenca', e.target.value)}
                              className="px-2 py-1 rounded bg-white border border-slate-200 text-xs text-white"
                            >
                              <option value="Presente">Presente</option>
                              <option value="Ausente">Ausente</option>
                            </select>
                          </div>

                          {/* Pontualidade */}
                          {att.presenca === 'Presente' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">Pontualidade</span>
                              <select
                                value={att.pontualidade}
                                onChange={(e) => updateAttendance(t, 'pontualidade', e.target.value)}
                                className="px-2 py-1 rounded bg-white border border-slate-200 text-xs text-white"
                              >
                                <option value="Pontual">Pontual</option>
                                <option value="Atrasado">Atrasado</option>
                              </select>
                            </div>
                          )}

                          {/* Justificada */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Justificado?</span>
                            <select
                              value={att.justificada}
                              onChange={(e) => updateAttendance(t, 'justificada', e.target.value)}
                              className="px-2 py-1 rounded bg-white border border-slate-200 text-xs text-white"
                            >
                              <option value="Não Se Aplica">Não Se Aplica</option>
                              <option value="Sim">Sim</option>
                              <option value="Não">Não</option>
                            </select>
                          </div>

                          {/* Motivo */}
                          <input
                            type="text"
                            placeholder="Motivo / Justificativa se houver..."
                            value={att.motivo}
                            onChange={(e) => updateAttendance(t, 'motivo', e.target.value)}
                            className="px-3 py-1 rounded bg-white border border-slate-200 text-xs text-white w-48 lg:w-64 focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 font-semibold text-sm transition-colors border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/20"
                >
                  Confirmar Chamada Geral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
