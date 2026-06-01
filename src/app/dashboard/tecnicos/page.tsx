'use client'

import { useState } from 'react'
import {
  Users, UserPlus, Search, Edit2, ShieldAlert,
  CheckCircle, XCircle, Mail, Phone, Calendar, ArrowUpDown, ChevronRight
} from 'lucide-react'

// Dados reais da planilha com dados extras fictícios de contato para visualização rica
const INITIAL_TECNICOS = [
  { id: '1', nome: 'Antonio Carlos Junior Dias', email: 'antonio.dias@sg4.com.br', telefone: '(11) 98765-4321', cargo: 'Técnico de Segurança do Trabalho Sênior', admissao: '05/08/2025', ativo: true },
  { id: '2', nome: 'Daniel José Gregorio Junior', email: 'daniel.junior@sg4.com.br', telefone: '(11) 97654-3210', cargo: 'Técnico de Segurança do Trabalho Sênior', admissao: '05/08/2025', ativo: true },
  { id: '3', nome: 'Dara Amorim Silva de Lima', email: 'dara.lima@sg4.com.br', telefone: '(11) 96543-2109', cargo: 'Técnica de Segurança do Trabalho Júnior', admissao: '23/03/2026', ativo: true },
  { id: '4', nome: 'Djonatê Cruz dos Santos', email: 'djonate.santos@sg4.com.br', telefone: '(11) 95432-1098', cargo: 'Técnico de Segurança do Trabalho Pleno', admissao: '05/08/2025', ativo: true },
  { id: '5', nome: 'Jonas Rodrigues Pereira', email: 'jonas.pereira@sg4.com.br', telefone: '(11) 94321-0987', cargo: 'Técnico de Segurança do Trabalho Pleno', admissao: '18/09/2025', ativo: true },
  { id: '6', nome: 'Karine Novaes Assem', email: 'karine.assem@sg4.com.br', telefone: '(11) 93210-9876', cargo: 'Técnica de Segurança do Trabalho Sênior', admissao: '05/08/2025', ativo: true },
  { id: '7', nome: 'Luis Claudio Soares', email: 'luis.soares@sg4.com.br', telefone: '(11) 92109-8765', cargo: 'Técnico de Segurança do Trabalho Júnior', admissao: '02/02/2026', ativo: true },
  { id: '8', nome: 'Rogério Lima da Silva', email: 'rogerio.silva@sg4.com.br', telefone: '(11) 91098-7654', cargo: 'Técnico de Segurança do Trabalho Pleno', admissao: '12/04/2025', ativo: true },
  { id: '9', nome: 'Rosicleide Fernandes Santos Davino', email: 'rosicleide.davino@sg4.com.br', telefone: '(11) 90987-6543', cargo: 'Técnica de Segurança do Trabalho Sênior', admissao: '05/08/2025', ativo: true },
  { id: '10', nome: 'Samuel da Silva Santos', email: 'samuel.santos@sg4.com.br', telefone: '(11) 99876-5432', cargo: 'Técnico de Segurança do Trabalho Júnior', admissao: '05/08/2025', ativo: true },
]

export default function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState(INITIAL_TECNICOS)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  
  // Form state
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: 'Técnico de Segurança do Trabalho Pleno',
    admissao: new Date().toLocaleDateString('pt-BR'),
    ativo: true,
  })

  const filtered = tecnicos.filter(t => 
    t.nome.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    t.cargo.toLowerCase().includes(search.toLowerCase())
  )

  function handleOpenAdd() {
    setIsEditing(null)
    setForm({
      nome: '',
      email: '',
      telefone: '',
      cargo: 'Técnico de Segurança do Trabalho Pleno',
      admissao: new Date().toLocaleDateString('pt-BR'),
      ativo: true,
    })
    setShowModal(true)
  }

  function handleOpenEdit(tecnico: typeof INITIAL_TECNICOS[0]) {
    setIsEditing(tecnico.id)
    setForm({
      nome: tecnico.nome,
      email: tecnico.email,
      telefone: tecnico.telefone,
      cargo: tecnico.cargo,
      admissao: tecnico.admissao,
      ativo: tecnico.ativo,
    })
    setShowModal(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.email) return

    if (isEditing) {
      setTecnicos(prev => prev.map(t => t.id === isEditing ? { ...t, ...form } : t))
    } else {
      const newId = (tecnicos.length + 1).toString()
      setTecnicos(prev => [...prev, { id: newId, ...form }])
    }
    setShowModal(false)
  }

  function toggleStatus(id: string) {
    setTecnicos(prev => prev.map(t => t.id === id ? { ...t, ativo: !t.ativo } : t))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-red-500" /> Equipe de Técnicos
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie os profissionais de campo e monitore seus cadastros</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-red-900/20 active:scale-95"
        >
          <UserPlus size={18} />
          <span>Novo Técnico</span>
        </button>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-xs">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar técnico, e-mail ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-white text-sm focus:border-red-500 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Total: <b>{tecnicos.length}</b> técnicos</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
          <span>Ativos: <b className="text-emerald-400">{tecnicos.filter(t => t.ativo).length}</b></span>
        </div>
      </div>

      {/* Grid de Técnicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((tecnico) => (
          <div
            key={tecnico.id}
            className={`group bg-white border transition-all duration-300 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700/80 hover:shadow-xl hover:shadow-slate-950/50 ${
              tecnico.ativo ? 'border-slate-200/80' : 'border-red-950/40 opacity-70'
            }`}
          >
            <div className="space-y-4">
              {/* Header do Card */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-850 to-slate-800 border border-slate-200 flex items-center justify-center font-bold text-red-500 text-base shadow-inner">
                    {tecnico.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-400 transition-colors line-clamp-1">
                      {tecnico.nome}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium line-clamp-1">{tecnico.cargo}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleStatus(tecnico.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                    tecnico.ativo 
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                      : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  }`}
                >
                  {tecnico.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </div>

              {/* Informações de contato */}
              <div className="space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-slate-500 shrink-0" />
                  <span className="truncate">{tecnico.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-500 shrink-0" />
                  <span>{tecnico.telefone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-500 shrink-0" />
                  <span>Admissão: {tecnico.admissao}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-5 border-t border-slate-200 pt-3">
              <button
                onClick={() => handleOpenEdit(tecnico)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
              >
                <Edit2 size={13} />
                <span>Editar</span>
              </button>
              <button
                onClick={() => toggleStatus(tecnico.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  tecnico.ativo
                    ? 'border-red-950/40 text-red-400 bg-red-950/10 hover:bg-red-950/20'
                    : 'border-emerald-950/40 text-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20'
                }`}
              >
                {tecnico.ativo ? 'Desativar' : 'Reativar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
          
          <div className="relative bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl shadow-slate-200 animate-in fade-in zoom-in-95 duration-200 text-white">
            <h2 className="text-lg font-bold mb-1">
              {isEditing ? 'Editar Técnico' : 'Novo Técnico'}
            </h2>
            <p className="text-slate-500 text-xs mb-5">Preencha os dados do técnico de segurança do trabalho.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome do técnico"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-red-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail Profissional</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="exemplo@sg4.com.br"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-red-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Telefone</label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => setForm(p => ({ ...p, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-red-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Admissão</label>
                  <input
                    type="text"
                    value={form.admissao}
                    onChange={(e) => setForm(p => ({ ...p, admissao: e.target.value }))}
                    placeholder="DD/MM/AAAA"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-red-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cargo</label>
                <select
                  value={form.cargo}
                  onChange={(e) => setForm(p => ({ ...p, cargo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-red-500 focus:outline-none transition-colors appearance-none"
                >
                  <option value="Técnico de Segurança do Trabalho Júnior">Técnico Júnior</option>
                  <option value="Técnico de Segurança do Trabalho Pleno">Técnico Pleno</option>
                  <option value="Técnico de Segurança do Trabalho Sênior">Técnico Sênior</option>
                  <option value="Coordenador de Segurança do Trabalho">Coordenador TST</option>
                </select>
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
                  {isEditing ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
