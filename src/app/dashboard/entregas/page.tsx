'use client'

import { useState } from 'react'
import {
  FileCheck, Calendar, Filter, User, CheckCircle2,
  AlertTriangle, Clock, Search, PlusCircle, ArrowUpRight, Award, ShieldAlert
} from 'lucide-react'

// Dados reais da planilha "GESTÃO DAS ENTREGAS 2026"
const INITIAL_ENTREGAS = [
  { id: '1', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '02/03/2026 a 06/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '09/03/2026 14:05', status: 'Atrasado' },
  { id: '2', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '02/03/2026 a 06/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '09/03/2026 09:12', status: 'No Prazo' },
  { id: '3', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '09/03/2026 a 13/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '16/03/2026 12:02', status: 'Atrasado' },
  { id: '4', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '09/03/2026 a 13/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '16/03/2026 08:33', status: 'No Prazo' },
  { id: '5', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '16/03/2026 a 20/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '23/03/2026 11:39', status: 'No Prazo' },
  { id: '6', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '16/03/2026 a 20/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '23/03/2026 07:44', status: 'No Prazo' },

  { id: '7', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '02/03/2026 a 06/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '09/03/2026 08:28', status: 'No Prazo' },
  { id: '8', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '02/03/2026 a 06/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '09/03/2026 07:36', status: 'No Prazo' },
  { id: '9', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '09/03/2026 a 13/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '16/03/2026 09:13', status: 'No Prazo' },
  { id: '10', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '09/03/2026 a 13/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '13/03/2026 17:00', status: 'No Prazo' },
  { id: '11', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '16/03/2026 a 20/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '23/03/2026 11:00', status: 'No Prazo' },
  { id: '12', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '16/03/2026 a 20/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '23/03/2026 15:29', status: 'Atrasado' },

  { id: '13', tecnico: 'DJONATÊ CRUZ DOS SANTOS', periodo: '02/03/2026 a 06/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '09/03/2026 14:49', status: 'Atrasado' },
  { id: '14', tecnico: 'DJONATÊ CRUZ DOS SANTOS', periodo: '02/03/2026 a 06/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '09/03/2026 11:12', status: 'No Prazo' },
  { id: '15', tecnico: 'DJONATÊ CRUZ DOS SANTOS', periodo: '09/03/2026 a 13/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '16/03/2026 10:15', status: 'Atrasado' },
  { id: '16', tecnico: 'DJONATÊ CRUZ DOS SANTOS', periodo: '09/03/2026 a 13/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '16/03/2026 15:30', status: 'Atrasado' },

  { id: '17', tecnico: 'ROSICLEIDE FERNANDES SANTOS DAVINO', periodo: '02/03/2026 a 06/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '06/03/2026 16:30', status: 'No Prazo' },
  { id: '18', tecnico: 'ROSICLEIDE FERNANDES SANTOS DAVINO', periodo: '02/03/2026 a 06/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '09/03/2026 08:01', status: 'No Prazo' },
]

const PERIODS = [
  '02/03/2026 a 06/03/2026',
  '09/03/2026 a 13/03/2026',
  '16/03/2026 a 20/03/2026',
  '23/03/2026 a 27/03/2026',
]

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

export default function EntregasPage() {
  const [entregas, setEntregas] = useState(INITIAL_ENTREGAS)
  const [selectedTecnico, setSelectedTecnico] = useState('TODOS')
  const [selectedType, setSelectedType] = useState('TODOS')
  const [showAddModal, setShowAddModal] = useState(false)

  // Form de Lançamento
  const [form, setForm] = useState({
    tecnico: 'ANTONIO CARLOS JUNIOR DIAS',
    periodo: '23/03/2026 a 27/03/2026',
    tipo: 'Relatório de Atividades',
    dataEntrega: '',
    status: 'No Prazo'
  })

  const filtered = entregas.filter(e => {
    const matchTec = selectedTecnico === 'TODOS' || e.tecnico === selectedTecnico
    const matchType = selectedType === 'TODOS' || e.tipo === selectedType
    return matchTec && matchType
  })

  // Estatísticas das Entregas
  const total = filtered.length
  const noPrazo = filtered.filter(e => e.status === 'No Prazo').length
  const atrasados = filtered.filter(e => e.status === 'Atrasado').length
  const eficiencia = total > 0 ? Math.round((noPrazo / total) * 100) : 0

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const newId = 'ent-' + Date.now()
    setEntregas(prev => [ { id: newId, ...form }, ...prev ])
    setShowAddModal(false)
    setForm(p => ({ ...p, dataEntrega: '' }))
  }

  function deleteEntrega(id: string) {
    setEntregas(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileCheck className="text-red-500" /> Controle de Entregas Semanais
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Substitua a planilha de entregas: gerencie relatórios de atividades semanais e registros de KM.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-red-900/20 active:scale-95"
        >
          <PlusCircle size={18} />
          <span>Lançar Entrega</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Eficiência */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Eficiência de Entregas</span>
            <Award className="text-emerald-500" size={18} />
          </div>
          <div className="my-3">
            <span className="text-3xl font-extrabold text-white">{eficiencia}%</span>
            <span className="text-slate-500 text-xs block mt-1">Entregas feitas no prazo legal</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${eficiencia}%` }} />
          </div>
        </div>

        {/* Total Entregues */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Lançado</span>
          <div className="my-3">
            <span className="text-3xl font-extrabold text-white">{total}</span>
            <span className="text-slate-500 text-xs block mt-1">Registros semanais declarados</span>
          </div>
        </div>

        {/* No Prazo */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Dentro do Prazo</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="my-3">
            <span className="text-3xl font-extrabold text-emerald-400">{noPrazo}</span>
            <span className="text-slate-500 text-xs block mt-1">Relatórios / KM em conformidade</span>
          </div>
        </div>

        {/* Atrasados */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Entregas em Atraso</span>
            <ShieldAlert className="text-red-500" size={16} />
          </div>
          <div className="my-3">
            <span className="text-3xl font-extrabold text-red-400">{atrasados}</span>
            <span className="text-slate-500 text-xs block mt-1">Requer atenção do gestor</span>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 w-full md:max-w-3xl">
          {/* Técnico */}
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedTecnico}
              onChange={(e) => setSelectedTecnico(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
            >
              <option value="TODOS">Todos os Técnicos</option>
              {TECNICOS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div className="w-[180px]">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="Relatório de Atividades">Relatório de Atividades</option>
              <option value="Registro de KM Inicial/Final">Registro de KM</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-slate-400 shrink-0">
          Encontradas: <b>{filtered.length}</b> entregas registradas
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Período Semanal</th>
                <th className="py-4 px-6">Técnico</th>
                <th className="py-4 px-6">Tipo da Entrega</th>
                <th className="py-4 px-6 text-center">Data/Hora da Entrega</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-950/20 transition-colors text-sm">
                  {/* Período */}
                  <td className="py-4 px-6 font-semibold text-slate-300">
                    {e.periodo}
                  </td>

                  {/* Técnico */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-850 flex items-center justify-center font-bold text-[9px] text-red-500 border border-slate-800">
                        {e.tecnico.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <span className="font-semibold text-slate-200">{e.tecnico}</span>
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="py-4 px-6 font-medium text-slate-400">
                    {e.tipo}
                  </td>

                  {/* Data Entrega */}
                  <td className="py-4 px-6 text-center font-medium text-slate-300">
                    {e.dataEntrega || 'Não Entregue'}
                  </td>

                  {/* Status */}
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      e.status === 'No Prazo'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {e.status === 'No Prazo' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      {e.status}
                    </span>
                  </td>

                  {/* Ação */}
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => deleteEntrega(e.id)}
                      className="text-xs text-slate-500 hover:text-red-400 font-semibold px-2 py-1 hover:bg-slate-950/40 rounded transition-colors"
                      title="Deletar registro"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-medium">
                    Nenhum registro de entrega encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-white">
            <h2 className="text-lg font-bold mb-1">Lançar Nova Entrega</h2>
            <p className="text-slate-400 text-xs mb-5">Informe se o técnico entregou os relatórios/KM no prazo legal.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Técnico</label>
                <select
                  value={form.tecnico}
                  onChange={(e) => setForm(p => ({ ...p, tecnico: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                >
                  {TECNICOS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Período Semanal</label>
                <select
                  value={form.periodo}
                  onChange={(e) => setForm(p => ({ ...p, periodo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                >
                  {PERIODS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tipo da Entrega</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm(p => ({ ...p, tipo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                >
                  <option value="Relatório de Atividades">Relatório de Atividades</option>
                  <option value="Registro de KM Inicial/Final">Registro de KM Inicial/Final</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Data/Hora da Entrega</label>
                  <input
                    type="text"
                    required
                    placeholder="DD/MM/AAAA HH:MM"
                    value={form.dataEntrega}
                    onChange={(e) => setForm(p => ({ ...p, dataEntrega: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                  >
                    <option value="No Prazo">No Prazo</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-colors border border-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold text-sm transition-all shadow-lg shadow-red-900/20"
                >
                  Registrar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
