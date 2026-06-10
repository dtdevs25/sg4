'use client'

import { useState } from 'react'
import {
  Activity, Plus, Search, CheckCircle, Clock, Trash2, Sparkles, X,
  FileCheck, Calendar, Filter, User, CheckCircle2,
  AlertTriangle, PlusCircle, Award, ShieldAlert
} from 'lucide-react'
import { useSession } from 'next-auth/react'

// --- DADOS MOCK (ATIVIDADES) ---
const INITIAL_ATIVIDADES = [
  { id: 'act-1', data: '02/01/2026', responsavel: 'ANTONIO CARLOS JUNIOR DIAS', descricao: 'Planejamento das atividades, leitura de e-mail e elaboração do plano semanal.', equipe: 'Não se aplica', categoria: 'ADMINISTRATIVA', local: 'Base Humaitá', cidade: 'São José dos Campos', estado: 'SP', status: 'CONCLUÍDO', observacao: '' },
  { id: 'act-2', data: '02/01/2026', responsavel: 'ANTONIO CARLOS JUNIOR DIAS', descricao: 'Inspeção de segurança em campo.', equipe: 'Não se aplica', categoria: 'INSPEÇÃO DE SEGURANÇA', local: 'No município', cidade: 'Lorena', estado: 'SP', status: 'PENDENTE', observacao: 'Não foi encontrada nenhuma equipe para realizar a inspeção.' },
  { id: 'act-3', data: '02/01/2026', responsavel: 'ANTONIO CARLOS JUNIOR DIAS', descricao: 'Inspeção de segurança em campo.', equipe: 'Não se aplica', categoria: 'INSPEÇÃO DE SEGURANÇA', local: 'No município', cidade: 'Guaratinguetá', estado: 'SP', status: 'PENDENTE', observacao: 'Não foi encontrada nenhuma equipe para realizar a inspeção.' },
  { id: 'act-4', data: '02/01/2026', responsavel: 'DANIEL JOSÉ GREGORIO JUNIOR', descricao: 'Planejamento das atividades, leitura de e-mails, relatórios semanais.', equipe: 'Não se aplica', categoria: 'ADMINISTRATIVA', local: 'Base', cidade: 'Bauru', estado: 'SP', status: 'CONCLUÍDO', observacao: '' },
]

// --- DADOS MOCK (ENTREGAS) ---
const INITIAL_ENTREGAS = [
  { id: '1', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '02/03/2026 a 06/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '09/03/2026 14:05', status: 'Atrasado' },
  { id: '2', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '02/03/2026 a 06/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '09/03/2026 09:12', status: 'No Prazo' },
  { id: '7', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '02/03/2026 a 06/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '09/03/2026 08:28', status: 'No Prazo' },
  { id: '8', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '02/03/2026 a 06/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '09/03/2026 07:36', status: 'No Prazo' },
]

const TECNICOS = [
  'ANTONIO CARLOS JUNIOR DIAS', 'DANIEL JOSÉ GREGORIO JUNIOR', 'DJONATÊ CRUZ DOS SANTOS',
  'JONAS RODRIGUES PEREIRA', 'KARINE NOVAES ASSEM', 'LUIS CLAUDIO SOARES',
  'ROGÉRIO LIMA DA SILVA', 'ROSICLEIDE FERNANDES SANTOS DAVINO', 'SAMUEL DA SILVA SANTOS',
  'DARA AMORIM SILVA DE LIMA'
]

const CATEGORIES = ['ADMINISTRATIVA', 'INSPEÇÃO DE SEGURANÇA', 'GESTÃO DSS', 'REUNIÃO DE ALINHAMENTO', 'TREINAMENTO']
const PERIODS = ['02/03/2026 a 06/03/2026', '09/03/2026 a 13/03/2026', '16/03/2026 a 20/03/2026', '23/03/2026 a 27/03/2026']

export default function AtividadesEntregasPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [activeTab, setActiveTab] = useState<'atividades' | 'entregas'>('atividades')

  // --- ESTADO: ATIVIDADES ---
  const [atividades, setAtividades] = useState(INITIAL_ATIVIDADES)
  const [searchAct, setSearchAct] = useState('')
  const [filterRespAct, setFilterRespAct] = useState('TODOS')
  const [filterCatAct, setFilterCatAct] = useState('TODOS')
  const [showAddAct, setShowAddAct] = useState(false)
  const [formAct, setFormAct] = useState({
    data: new Date().toLocaleDateString('pt-BR'), responsavel: 'ANTONIO CARLOS JUNIOR DIAS',
    descricao: '', equipe: 'Não se aplica', categoria: 'INSPEÇÃO DE SEGURANÇA',
    local: '', cidade: '', estado: 'SP', status: 'CONCLUÍDO', observacao: ''
  })

  const filteredAct = atividades.filter(act => {
    const matchSearch = act.descricao.toLowerCase().includes(searchAct.toLowerCase()) || act.local.toLowerCase().includes(searchAct.toLowerCase()) || act.cidade.toLowerCase().includes(searchAct.toLowerCase())
    const matchResp = filterRespAct === 'TODOS' || act.responsavel === filterRespAct
    const matchCat = filterCatAct === 'TODOS' || act.categoria === filterCatAct
    return matchSearch && matchResp && matchCat
  })

  function handleCreateAct(e: React.FormEvent) {
    e.preventDefault()
    setAtividades(prev => [ { id: 'act-' + Date.now(), ...formAct }, ...prev ])
    setShowAddAct(false)
    setFormAct(p => ({ ...p, descricao: '', local: '', cidade: '', observacao: '' }))
  }

  // --- ESTADO: ENTREGAS ---
  const [entregas, setEntregas] = useState(INITIAL_ENTREGAS)
  const [selectedTecnicoEnt, setSelectedTecnicoEnt] = useState('TODOS')
  const [selectedTypeEnt, setSelectedTypeEnt] = useState('TODOS')
  const [showAddEnt, setShowAddEnt] = useState(false)
  const [formEnt, setFormEnt] = useState({
    tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '23/03/2026 a 27/03/2026',
    tipo: 'Relatório de Atividades', dataEntrega: '', status: 'No Prazo'
  })

  const filteredEnt = entregas.filter(e => {
    const matchTec = selectedTecnicoEnt === 'TODOS' || e.tecnico === selectedTecnicoEnt
    const matchType = selectedTypeEnt === 'TODOS' || e.tipo === selectedTypeEnt
    return matchTec && matchType
  })

  const totalEnt = filteredEnt.length
  const noPrazoEnt = filteredEnt.filter(e => e.status === 'No Prazo').length
  const atrasadosEnt = filteredEnt.filter(e => e.status === 'Atrasado').length
  const eficienciaEnt = totalEnt > 0 ? Math.round((noPrazoEnt / totalEnt) * 100) : 0

  function handleCreateEnt(e: React.FormEvent) {
    e.preventDefault()
    setEntregas(prev => [ { id: 'ent-' + Date.now(), ...formEnt }, ...prev ])
    setShowAddEnt(false)
    setFormEnt(p => ({ ...p, dataEntrega: '' }))
  }

  return (
    <div className="flex flex-col gap-[24px] pb-[40px]">
      {/* CABEÇALHO UNIFICADO */}
      <div className="bg-white rounded-[10px] border border-[#f1f5f9] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-[14px_20px] flex items-center justify-between flex-wrap gap-[16px]">
        <div className="flex items-baseline gap-[10px]">
          <h1 className="text-[20px] font-extrabold text-[#1e293b] m-0 flex items-center gap-[8px]">
            <Activity color="#660099" size={22} />
            Gestão Operacional e Entregas
          </h1>
        </div>

        <div className="flex bg-[#f1f5f9] p-[4px] rounded-[8px] gap-[4px] overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab('atividades')}
            className={`whitespace-nowrap px-[16px] py-[6px] rounded-[6px] border-none cursor-pointer text-[13px] font-bold transition-all duration-200 ${activeTab === 'atividades' ? 'bg-white text-[#660099] shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'bg-transparent text-[#64748b]'}`}
          >
            Atividades Diárias
          </button>
          <button
            onClick={() => setActiveTab('entregas')}
            className={`whitespace-nowrap px-[16px] py-[6px] rounded-[6px] border-none cursor-pointer text-[13px] font-bold transition-all duration-200 ${activeTab === 'entregas' ? 'bg-white text-[#660099] shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'bg-transparent text-[#64748b]'}`}
          >
            Controle de Entregas
          </button>
        </div>

        {activeTab === 'atividades' ? (
          <button onClick={() => setShowAddAct(true)} style={{ background: '#660099', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Plus size={16} /> Lançar Atividade
          </button>
        ) : (
          <button onClick={() => setShowAddEnt(true)} style={{ background: '#660099', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <PlusCircle size={16} /> Lançar Entrega
          </button>
        )}
      </div>

      {/* --- CONTEÚDO ATIVIDADES --- */}
      {activeTab === 'atividades' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Filtros Atividades */}
          <div className="flex flex-col lg:flex-row items-center justify-between bg-white p-[12px_20px] rounded-[10px] border border-[#f1f5f9] flex-wrap gap-[12px]">
            <div className="flex flex-wrap gap-[12px] flex-1 w-full lg:w-auto">
              <div className="relative min-w-[200px] flex-1">
                <Search size={16} className="absolute left-[12px] top-[10px] text-[#94a3b8]" />
                <input type="text" placeholder="Buscar por descrição, local..." value={searchAct} onChange={(e) => setSearchAct(e.target.value)} className="w-full p-[8px_16px_8px_36px] rounded-[8px] border border-[#e2e8f0] text-[13px] outline-none" />
              </div>
              <select value={filterRespAct} disabled={role === 'TST'} onChange={(e) => setFilterRespAct(e.target.value)} style={{ width: 220, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#64748b' }}>
                <option value="TODOS">Todos os Técnicos</option>
                {TECNICOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filterCatAct} onChange={(e) => setFilterCatAct(e.target.value)} style={{ width: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#64748b' }}>
                <option value="TODOS">Todas as Categorias</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="text-[13px] text-[#64748b]">Encontradas: <b>{filteredAct.length}</b> atividades</div>
          </div>

          <div className="bg-white border border-[#f1f5f9] rounded-[10px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left min-w-[800px]">
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Responsável</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Descrição</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Categoria</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                    {role !== 'TST' && <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Excluir</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAct.map(act => (
                    <tr key={act.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>{act.data}</td>
                      <td style={{ padding: '14px 20px' }}><div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{act.responsavel}</div></td>
                      <td style={{ padding: '14px 20px', maxWidth: 300 }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.descricao}</p>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, background: '#f1f5f9', color: '#64748b' }}>{act.categoria}</span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <button onClick={() => setAtividades(prev => prev.map(a => a.id === act.id ? { ...a, status: a.status === 'CONCLUÍDO' ? 'PENDENTE' : 'CONCLUÍDO' } : a))} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 12, border: 'none', background: act.status === 'CONCLUÍDO' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: act.status === 'CONCLUÍDO' ? '#10b981' : '#f59e0b', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                          {act.status}
                        </button>
                      </td>
                      {role !== 'TST' && (
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <button onClick={() => setAtividades(prev => prev.filter(a => a.id !== act.id))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- CONTEÚDO ENTREGAS --- */}
      {activeTab === 'entregas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[20px]">
            <div className="bg-white border border-[#f1f5f9] rounded-[10px] p-[20px] flex flex-col justify-between">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Eficiência</span>
                <Award color="#10b981" size={18} />
              </div>
              <div style={{ margin: '12px 0' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{eficienciaEnt}%</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Entregas no prazo legal</div>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{ background: '#10b981', height: '100%', width: `${eficienciaEnt}%` }} />
              </div>
            </div>
            <div className="bg-white border border-[#f1f5f9] rounded-[10px] p-[20px] flex flex-col justify-between">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Atrasados</span>
                <ShieldAlert color="#ef4444" size={16} />
              </div>
              <div style={{ margin: '12px 0' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{atrasadosEnt}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Requer atenção do gestor</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between bg-white p-[12px_20px] rounded-[10px] border border-[#f1f5f9] flex-wrap gap-[12px]">
            <div className="flex flex-wrap gap-[12px] flex-1 w-full md:w-auto">
              <select value={selectedTecnicoEnt} disabled={role === 'TST'} onChange={(e) => setSelectedTecnicoEnt(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#64748b', fontWeight: 600 }}>
                <option value="TODOS">Todos os Técnicos</option>
                {TECNICOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="text-[13px] text-[#64748b]">Encontradas: <b>{filteredEnt.length}</b> entregas</div>
          </div>

          <div className="bg-white border border-[#f1f5f9] rounded-[10px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left min-w-[700px]">
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Período</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Tipo</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Data da Entrega</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                    {role !== 'TST' && <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredEnt.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>{e.periodo}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: '#334155' }}>{e.tecnico}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#475569', fontWeight: 500 }}>{e.tipo}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{e.dataEntrega || '—'}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: e.status === 'No Prazo' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: e.status === 'No Prazo' ? '#10b981' : '#ef4444' }}>
                          {e.status}
                        </span>
                      </td>
                      {role !== 'TST' && (
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <button onClick={() => setEntregas(prev => prev.filter(x => x.id !== e.id))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAIS DE INSERÇÃO SIMPLIFICADOS (Atividades e Entregas) --- */}
      {showAddAct && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px] p-[16px]">
          <div className="bg-white rounded-[16px] w-full max-w-[600px] p-[24px]">
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20 }}>Lançar Atividade</h2>
            <form onSubmit={handleCreateAct} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>Descrição</label>
                <textarea required value={formAct.descricao} onChange={(e) => setFormAct(p => ({...p, descricao: e.target.value}))} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowAddAct(false)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700 }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: 12, background: '#660099', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700 }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddEnt && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px] p-[16px]">
          <div className="bg-white rounded-[16px] w-full max-w-[500px] p-[24px]">
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20 }}>Lançar Entrega</h2>
            <form onSubmit={handleCreateEnt} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>Data da Entrega</label>
                <input required value={formEnt.dataEntrega} onChange={(e) => setFormEnt(p => ({...p, dataEntrega: e.target.value}))} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowAddEnt(false)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700 }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: 12, background: '#660099', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700 }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
