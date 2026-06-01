'use client'

import { useState } from 'react'
import {
  Activity, Plus, Calendar, Search, MapPin, Tag,
  CheckCircle, Clock, XCircle, ArrowRightLeft, Sparkles, Filter, Trash2
} from 'lucide-react'

// Dados reais e exatos da planilha "GESTÃO DAS ATIVIDADES"
const INITIAL_ATIVIDADES = [
  { id: 'act-1', data: '02/01/2026', responsavel: 'ANTONIO CARLOS JUNIOR DIAS', descricao: 'Planejamento das atividades, leitura de e-mail e elaboração do plano semanal.', equipe: 'Não se aplica', categoria: 'ADMINISTRATIVA', local: 'Base Humaitá', cidade: 'São José dos Campos', estado: 'SP', status: 'CONCLUÍDO', observacao: '' },
  { id: 'act-2', data: '02/01/2026', responsavel: 'ANTONIO CARLOS JUNIOR DIAS', descricao: 'Inspeção de segurança em campo.', equipe: 'Não se aplica', categoria: 'INSPEÇÃO DE SEGURANÇA', local: 'No município', cidade: 'Lorena', estado: 'SP', status: 'PENDENTE', observacao: 'Não foi encontrada nenhuma equipe para realizar a inspeção.' },
  { id: 'act-3', data: '02/01/2026', responsavel: 'ANTONIO CARLOS JUNIOR DIAS', descricao: 'Inspeção de segurança em campo.', equipe: 'Não se aplica', categoria: 'INSPEÇÃO DE SEGURANÇA', local: 'No município', cidade: 'Guaratinguetá', estado: 'SP', status: 'PENDENTE', observacao: 'Não foi encontrada nenhuma equipe para realizar a inspeção.' },
  { id: 'act-4', data: '02/01/2026', responsavel: 'DANIEL JOSÉ GREGORIO JUNIOR', descricao: 'Planejamento das atividades, leitura de e-mails, relatórios semanais.', equipe: 'Não se aplica', categoria: 'ADMINISTRATIVA', local: 'Base', cidade: 'Bauru', estado: 'SP', status: 'CONCLUÍDO', observacao: '' },
  { id: 'act-5', data: '02/01/2026', responsavel: 'DANIEL JOSÉ GREGORIO JUNIOR', descricao: 'Inspeção de segurança em campo de equipe própria.', equipe: 'Equipe própria', categoria: 'INSPEÇÃO DE SEGURANÇA', local: 'Na localidade', cidade: 'Bauru', estado: 'SP', status: 'CONCLUÍDO', observacao: 'Realizada com sucesso.' },
  { id: 'act-6', data: '02/01/2026', responsavel: 'KARINE NOVAES ASSEM', descricao: 'DDS - Diálogo Diário de Segurança sobre Trabalho em Altura.', equipe: 'Equipe terceirizada', categoria: 'GESTÃO DSS', local: 'Planta Leste', cidade: 'Vitória', estado: 'ES', status: 'CONCLUÍDO', observacao: '' },
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

const CATEGORIES = [
  'ADMINISTRATIVA',
  'INSPEÇÃO DE SEGURANÇA',
  'GESTÃO DSS',
  'REUNIÃO DE ALINHAMENTO',
  'TREINAMENTO'
]

export default function AtividadesPage() {
  const [atividades, setAtividades] = useState(INITIAL_ATIVIDADES)
  const [search, setSearch] = useState('')
  const [filterResponsavel, setFilterResponsavel] = useState('TODOS')
  const [filterCategoria, setFilterCategoria] = useState('TODOS')
  const [showAddModal, setShowAddModal] = useState(false)

  // Form de Lançamento
  const [form, setForm] = useState({
    data: new Date().toLocaleDateString('pt-BR'),
    responsavel: 'ANTONIO CARLOS JUNIOR DIAS',
    descricao: '',
    equipe: 'Não se aplica',
    categoria: 'INSPEÇÃO DE SEGURANÇA',
    local: '',
    cidade: '',
    estado: 'SP',
    status: 'CONCLUÍDO',
    observacao: ''
  })

  const filtered = atividades.filter(act => {
    const matchSearch = act.descricao.toLowerCase().includes(search.toLowerCase()) ||
                        act.local.toLowerCase().includes(search.toLowerCase()) ||
                        act.cidade.toLowerCase().includes(search.toLowerCase())
    const matchResp = filterResponsavel === 'TODOS' || act.responsavel === filterResponsavel
    const matchCat = filterCategoria === 'TODOS' || act.categoria === filterCategoria
    return matchSearch && matchResp && matchCat
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const newId = 'act-' + Date.now()
    setAtividades(prev => [ { id: newId, ...form }, ...prev ])
    setShowAddModal(false)
    setForm(p => ({ ...p, descricao: '', local: '', cidade: '', observacao: '' }))
  }

  function toggleStatus(id: string) {
    setAtividades(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, status: a.status === 'CONCLUÍDO' ? 'PENDENTE' : 'CONCLUÍDO' }
      }
      return a
    }))
  }

  function deleteAct(id: string) {
    setAtividades(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-red-500" /> Registro de Atividades Operacionais
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Substitua a planilha de atividades diárias: gerencie tarefas de planejamento, inspeções em campo e DSS.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-red-900/20 active:scale-95"
        >
          <Plus size={18} />
          <span>Lançar Atividade</span>
        </button>
      </div>

      {/* Filters Panel */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col xl:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 w-full xl:max-w-4xl">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por descrição, local ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
            />
          </div>

          {/* Responsável */}
          <div className="w-[200px]">
            <select
              value={filterResponsavel}
              onChange={(e) => setFilterResponsavel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 focus:outline-none"
            >
              <option value="TODOS">Todos os Técnicos</option>
              {TECNICOS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div className="w-[180px]">
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 focus:outline-none"
            >
              <option value="TODOS">Todas as Categorias</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="text-xs text-slate-400 shrink-0">
          Encontradas: <b>{filtered.length}</b> atividades operacionais
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Data</th>
                <th className="py-4 px-6">Responsável</th>
                <th className="py-4 px-6">Descrição da Atividade</th>
                <th className="py-4 px-6">Equipe</th>
                <th className="py-4 px-6">Categoria</th>
                <th className="py-4 px-6">Localidade (Cidade/UF)</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((act) => (
                <tr key={act.id} className="hover:bg-slate-950/20 transition-colors text-sm">
                  {/* Data */}
                  <td className="py-4 px-6 font-semibold text-slate-300">
                    {act.data}
                  </td>

                  {/* Responsável */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-850 flex items-center justify-center font-bold text-[9px] text-red-500 border border-slate-800">
                        {act.responsavel.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <span className="font-semibold text-slate-200">{act.responsavel}</span>
                    </div>
                  </td>

                  {/* Descrição */}
                  <td className="py-4 px-6 max-w-[280px]">
                    <p className="text-slate-300 text-xs font-medium leading-relaxed line-clamp-2" title={act.descricao}>
                      {act.descricao}
                    </p>
                    {act.observacao && (
                      <p className="text-[10px] text-red-400 italic mt-1 leading-snug">
                        Obs: {act.observacao}
                      </p>
                    )}
                  </td>

                  {/* Equipe */}
                  <td className="py-4 px-6 text-slate-400 text-xs font-semibold">
                    {act.equipe}
                  </td>

                  {/* Categoria */}
                  <td className="py-4 px-6">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                      act.categoria === 'GESTÃO DSS' ? 'bg-red-500/10 text-red-400' :
                      act.categoria === 'INSPEÇÃO DE SEGURANÇA' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {act.categoria}
                    </span>
                  </td>

                  {/* Localidade */}
                  <td className="py-4 px-6">
                    <span className="text-slate-300 font-medium block text-xs">{act.local}</span>
                    <span className="text-[10px] text-slate-500">{act.cidade} / {act.estado}</span>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => toggleStatus(act.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
                        act.status === 'CONCLUÍDO'
                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      {act.status === 'CONCLUÍDO' ? <CheckCircle size={12} /> : <Clock size={12} />}
                      {act.status}
                    </button>
                  </td>

                  {/* Ações */}
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => toggleStatus(act.id)}
                        className="text-xs text-slate-400 hover:text-white font-semibold transition-colors bg-slate-850 px-2 py-1 rounded border border-slate-800"
                      >
                        Tog Status
                      </button>
                      <button
                        onClick={() => deleteAct(act.id)}
                        className="text-xs text-slate-500 hover:text-red-400 p-1 hover:bg-white/5 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-white">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Sparkles className="text-red-500" /> Lançar Atividade Operacional
            </h2>
            <p className="text-slate-400 text-xs mb-5">Preencha os campos exatos do registro diário de atividades.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Data</label>
                  <input
                    type="text"
                    required
                    value={form.data}
                    onChange={(e) => setForm(p => ({ ...p, data: e.target.value }))}
                    placeholder="DD/MM/AAAA"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Responsável</label>
                  <select
                    value={form.responsavel}
                    onChange={(e) => setForm(p => ({ ...p, responsavel: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                  >
                    {TECNICOS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descrição da Atividade</label>
                <textarea
                  required
                  rows={2}
                  value={form.descricao}
                  onChange={(e) => setForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Ex: Inspeção de segurança em campo em equipe própria de rede externa..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Equipe</label>
                  <select
                    value={form.equipe}
                    onChange={(e) => setForm(p => ({ ...p, equipe: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                  >
                    <option value="Não se aplica">Não se aplica</option>
                    <option value="Equipe própria">Equipe própria</option>
                    <option value="Equipe terceirizada">Equipe terceirizada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm(p => ({ ...p, categoria: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Local</label>
                  <input
                    type="text"
                    required
                    value={form.local}
                    onChange={(e) => setForm(p => ({ ...p, local: e.target.value }))}
                    placeholder="Ex: Base"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cidade</label>
                  <input
                    type="text"
                    required
                    value={form.cidade}
                    onChange={(e) => setForm(p => ({ ...p, cidade: e.target.value }))}
                    placeholder="Bauru"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">UF (Estado)</label>
                  <input
                    type="text"
                    required
                    value={form.estado}
                    onChange={(e) => setForm(p => ({ ...p, estado: e.target.value }))}
                    placeholder="SP"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status Inicial</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                  >
                    <option value="CONCLUÍDO">CONCLUÍDO</option>
                    <option value="PENDENTE">PENDENTE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Observações (opcional)</label>
                  <input
                    type="text"
                    value={form.observacao}
                    onChange={(e) => setForm(p => ({ ...p, observacao: e.target.value }))}
                    placeholder="Detalhamento ou justificativa..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:border-red-500 focus:outline-none"
                  />
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
                  Registrar Atividade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
