'use client'

import { useState } from 'react'
import {
  Users, UserPlus, Search, Edit2, Mail, Phone, Calendar, Trash2
} from 'lucide-react'

// Dados reais da planilha
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
    nome: '', email: '', telefone: '',
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
      nome: '', email: '', telefone: '',
      cargo: 'Técnico de Segurança do Trabalho Pleno',
      admissao: new Date().toLocaleDateString('pt-BR'),
      ativo: true,
    })
    setShowModal(true)
  }

  function handleOpenEdit(tecnico: typeof INITIAL_TECNICOS[0]) {
    setIsEditing(tecnico.id)
    setForm({
      nome: tecnico.nome, email: tecnico.email, telefone: tecnico.telefone,
      cargo: tecnico.cargo, admissao: tecnico.admissao, ativo: tecnico.ativo,
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
            <Users color="#e53935" size={22} />
            Equipe de Técnicos
          </h1>
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
            Gerencie os profissionais de campo
          </span>
        </div>
        
        <button
          onClick={handleOpenAdd}
          style={{
            background: '#e53935',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(229,57,53,0.3)',
          }}
        >
          <UserPlus size={16} />
          Novo Técnico
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar técnico, e-mail ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
          />
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          <span>Total: <b>{tecnicos.length}</b></span>
          <span style={{ margin: '0 8px' }}>•</span>
          <span>Ativos: <b style={{ color: '#10b981' }}>{tecnicos.filter(t => t.ativo).length}</b></span>
        </div>
      </div>

      {/* ── Tabela de Técnicos ── */}
      <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Contato</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Admissão</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tecnico => (
                <tr key={tecnico.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: tecnico.ativo ? 1 : 0.6 }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f5f9', color: '#e53935', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                        {tecnico.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>{tecnico.nome}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{tecnico.cargo}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Mail size={12} /> {tecnico.email}</div>
                    <div style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} /> {tecnico.telefone}</div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#475569', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12} /> {tecnico.admissao}</div>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <span style={{ 
                      display: 'inline-block', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                      background: tecnico.ativo ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: tecnico.ativo ? '#10b981' : '#ef4444'
                    }}>
                      {tecnico.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button onClick={() => handleOpenEdit(tecnico)} style={{ background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 8 }}>Editar</button>
                    <button onClick={() => toggleStatus(tecnico.id)} style={{ background: 'transparent', border: '1px solid #e2e8f0', color: tecnico.ativo ? '#ef4444' : '#10b981', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {tecnico.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 500, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginTop: 0, marginBottom: 4 }}>
              {isEditing ? 'Editar Técnico' : 'Novo Técnico'}
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Preencha os dados do técnico de segurança do trabalho.</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Nome Completo</label>
                <input type="text" required value={form.nome} onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>E-mail Profissional</label>
                <input type="email" required value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Telefone</label>
                  <input type="text" value={form.telefone} onChange={(e) => setForm(p => ({ ...p, telefone: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Admissão</label>
                  <input type="text" value={form.admissao} onChange={(e) => setForm(p => ({ ...p, admissao: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Cargo</label>
                <select value={form.cargo} onChange={(e) => setForm(p => ({ ...p, cargo: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff' }}>
                  <option value="Técnico de Segurança do Trabalho Júnior">Técnico Júnior</option>
                  <option value="Técnico de Segurança do Trabalho Pleno">Técnico Pleno</option>
                  <option value="Técnico de Segurança do Trabalho Sênior">Técnico Sênior</option>
                  <option value="Coordenador de Segurança do Trabalho">Coordenador TST</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#e53935', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
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
