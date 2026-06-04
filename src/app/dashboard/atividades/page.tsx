'use client'

import { useState } from 'react'
import {
  Activity, Plus, Search, CheckCircle, Clock, Trash2, Sparkles, X
} from 'lucide-react'
import { useSession } from 'next-auth/react'

// Dados reais da planilha "GESTÃO DAS ATIVIDADES"
const INITIAL_ATIVIDADES = [
  { id: 'act-1', data: '02/01/2026', responsavel: 'ANTONIO CARLOS JUNIOR DIAS', descricao: 'Planejamento das atividades, leitura de e-mail e elaboração do plano semanal.', equipe: 'Não se aplica', categoria: 'ADMINISTRATIVA', local: 'Base Humaitá', cidade: 'São José dos Campos', estado: 'SP', status: 'CONCLUÍDO', observacao: '' },
  { id: 'act-2', data: '02/01/2026', responsavel: 'ANTONIO CARLOS JUNIOR DIAS', descricao: 'Inspeção de segurança em campo.', equipe: 'Não se aplica', categoria: 'INSPEÇÃO DE SEGURANÇA', local: 'No município', cidade: 'Lorena', estado: 'SP', status: 'PENDENTE', observacao: 'Não foi encontrada nenhuma equipe para realizar a inspeção.' },
  { id: 'act-3', data: '02/01/2026', responsavel: 'ANTONIO CARLOS JUNIOR DIAS', descricao: 'Inspeção de segurança em campo.', equipe: 'Não se aplica', categoria: 'INSPEÇÃO DE SEGURANÇA', local: 'No município', cidade: 'Guaratinguetá', estado: 'SP', status: 'PENDENTE', observacao: 'Não foi encontrada nenhuma equipe para realizar a inspeção.' },
  { id: 'act-4', data: '02/01/2026', responsavel: 'DANIEL JOSÉ GREGORIO JUNIOR', descricao: 'Planejamento das atividades, leitura de e-mails, relatórios semanais.', equipe: 'Não se aplica', categoria: 'ADMINISTRATIVA', local: 'Base', cidade: 'Bauru', estado: 'SP', status: 'CONCLUÍDO', observacao: '' },
  { id: 'act-5', data: '02/01/2026', responsavel: 'DANIEL JOSÉ GREGORIO JUNIOR', descricao: 'Inspeção de segurança em campo de equipe própria.', equipe: 'Equipe própria', categoria: 'INSPEÇÃO DE SEGURANÇA', local: 'Na localidade', cidade: 'Bauru', estado: 'SP', status: 'CONCLUÍDO', observacao: 'Realizada com sucesso.' },
  { id: 'act-6', data: '02/01/2026', responsavel: 'KARINE NOVAES ASSEM', descricao: 'DSS - Diálogo de Segurança e Saúde sobre Trabalho em Altura.', equipe: 'Equipe terceirizada', categoria: 'GESTÃO DSS', local: 'Planta Leste', cidade: 'Vitória', estado: 'ES', status: 'CONCLUÍDO', observacao: '' },
]

const TECNICOS = [
  'ANTONIO CARLOS JUNIOR DIAS', 'DANIEL JOSÉ GREGORIO JUNIOR', 'DJONATÊ CRUZ DOS SANTOS',
  'JONAS RODRIGUES PEREIRA', 'KARINE NOVAES ASSEM', 'LUIS CLAUDIO SOARES',
  'ROGÉRIO LIMA DA SILVA', 'ROSICLEIDE FERNANDES SANTOS DAVINO', 'SAMUEL DA SILVA SANTOS',
  'DARA AMORIM SILVA DE LIMA'
]

const CATEGORIES = [
  'ADMINISTRATIVA', 'INSPEÇÃO DE SEGURANÇA', 'GESTÃO DSS', 'REUNIÃO DE ALINHAMENTO', 'TREINAMENTO'
]

export default function AtividadesPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [atividades, setAtividades] = useState(INITIAL_ATIVIDADES)
  const [search, setSearch] = useState('')
  const [filterResponsavel, setFilterResponsavel] = useState('TODOS')
  const [filterCategoria, setFilterCategoria] = useState('TODOS')
  const [showAddModal, setShowAddModal] = useState(false)

  const [form, setForm] = useState({
    data: new Date().toLocaleDateString('pt-BR'),
    responsavel: 'ANTONIO CARLOS JUNIOR DIAS',
    descricao: '', equipe: 'Não se aplica', categoria: 'INSPEÇÃO DE SEGURANÇA',
    local: '', cidade: '', estado: 'SP', status: 'CONCLUÍDO', observacao: ''
  })

  const filtered = atividades.filter(act => {
    const matchSearch = act.descricao.toLowerCase().includes(search.toLowerCase()) || act.local.toLowerCase().includes(search.toLowerCase()) || act.cidade.toLowerCase().includes(search.toLowerCase())
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
    setAtividades(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'CONCLUÍDO' ? 'PENDENTE' : 'CONCLUÍDO' } : a))
  }

  function deleteAct(id: string) {
    setAtividades(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

      {/* ── Cabeçalho Padronizado ── */}
      <div style={{
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity color="#e53935" size={22} />
            Atividades Operacionais
          </h1>
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
            Registro diário de tarefas e inspeções
          </span>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(229,57,53,0.3)',
          }}
        >
          <Plus size={16} />
          Lançar Atividade
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1 }}>
          <div style={{ position: 'relative', minWidth: 200, flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
            <input type="text" placeholder="Buscar por descrição, local..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
          </div>
          <select value={filterResponsavel} disabled={role === 'TST'} onChange={(e) => setFilterResponsavel(e.target.value)} style={{ width: 220, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#64748b' }}>
            <option value="TODOS">Todos os Técnicos</option>
            {TECNICOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)} style={{ width: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#64748b' }}>
            <option value="TODOS">Todas as Categorias</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Encontradas: <b>{filtered.length}</b> atividades</div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Responsável</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Descrição</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Categoria</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Localidade</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                {role !== 'TST' && <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Excluir</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(act => (
                <tr key={act.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>{act.data}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', color: '#e53935', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                        {act.responsavel.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{act.responsavel}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', maxWidth: 300 }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.descricao}</p>
                    {act.observacao && <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#e53935', fontStyle: 'italic' }}>Obs: {act.observacao}</p>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, background: act.categoria === 'GESTÃO DSS' ? 'rgba(229,57,53,0.1)' : act.categoria === 'INSPEÇÃO DE SEGURANÇA' ? 'rgba(245,158,11,0.1)' : '#f1f5f9', color: act.categoria === 'GESTÃO DSS' ? '#e53935' : act.categoria === 'INSPEÇÃO DE SEGURANÇA' ? '#f59e0b' : '#64748b' }}>
                      {act.categoria}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{act.local}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{act.cidade} / {act.estado}</div>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <button onClick={() => toggleStatus(act.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 12, border: 'none', background: act.status === 'CONCLUÍDO' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: act.status === 'CONCLUÍDO' ? '#10b981' : '#f59e0b', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                      {act.status === 'CONCLUÍDO' ? <CheckCircle size={12} /> : <Clock size={12} />}
                      {act.status}
                    </button>
                  </td>
                  {role !== 'TST' && (
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <button onClick={() => deleteAct(act.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title="Excluir Atividade">
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

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 600, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles color="#e53935" size={20} /> Lançar Atividade
              </h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Data</label>
                  <input type="text" required value={form.data} onChange={(e) => setForm(p => ({ ...p, data: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Responsável</label>
                  <select value={form.responsavel} disabled={role === 'TST'} onChange={(e) => setForm(p => ({ ...p, responsavel: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: role === 'TST' ? '#f1f5f9' : '#fff' }}>
                    {TECNICOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Descrição da Atividade</label>
                <textarea required rows={2} value={form.descricao} onChange={(e) => setForm(p => ({ ...p, descricao: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', resize: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Equipe</label>
                  <select value={form.equipe} onChange={(e) => setForm(p => ({ ...p, equipe: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff' }}>
                    <option value="Não se aplica">Não se aplica</option>
                    <option value="Equipe própria">Equipe própria</option>
                    <option value="Equipe terceirizada">Equipe terceirizada</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Categoria</label>
                  <select value={form.categoria} onChange={(e) => setForm(p => ({ ...p, categoria: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Local</label>
                  <input type="text" required value={form.local} onChange={(e) => setForm(p => ({ ...p, local: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Cidade</label>
                  <input type="text" required value={form.cidade} onChange={(e) => setForm(p => ({ ...p, cidade: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>UF</label>
                  <input type="text" required value={form.estado} onChange={(e) => setForm(p => ({ ...p, estado: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#e53935', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
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
