'use client'

import { useState } from 'react'
import {
  Calendar as CalendarIcon, Clock, MapPin, User,
  Plus, CheckCircle2, AlertCircle, Trash2, Search, X
} from 'lucide-react'
import { useSession } from 'next-auth/react'

const INITIAL_SCHEDULE = [
  { id: 'sch-1', tecnico: 'Rosicleide Fernandes', titulo: 'Treinamento de NR-35 (Trabalho em Altura)', local: 'Centro de Treinamento - Sala B', data: '05/06/2026', hora: '08:30', status: 'Pendente', prioridade: 'Alta' },
  { id: 'sch-2', tecnico: 'Daniel José Gregorio', titulo: 'Auditoria de Conformidade Geral', local: 'Galpão Logístico Sul', data: '08/06/2026', hora: '10:00', status: 'Pendente', prioridade: 'Alta' },
  { id: 'sch-3', tecnico: 'Karine Novaes Assem', titulo: 'Inspeção Periódica de Vasos de Pressão', local: 'Planta Industrial - Área 4', data: '12/06/2026', hora: '14:00', status: 'Pendente', prioridade: 'Média' },
  { id: 'sch-4', tecnico: 'Jonas Rodrigues Pereira', titulo: 'Integração de Novos Funcionários Terceirizados', local: 'Auditório Principal', data: '15/06/2026', hora: '09:00', status: 'Concluído', prioridade: 'Baixa' },
  { id: 'sch-5', tecnico: 'Antonio Carlos Junior', titulo: 'Simulado de Abandono de Área e Incêndio', local: 'Área Comum Externa', data: '18/06/2026', hora: '15:30', status: 'Pendente', prioridade: 'Alta' },
]

export default function ProgramacaoPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  
  const [form, setForm] = useState({
    tecnico: 'Antonio Carlos Junior',
    titulo: '', local: '', data: '', hora: '',
    status: 'Pendente', prioridade: 'Média'
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
      titulo: '', local: '', data: '', hora: '',
      status: 'Pendente', prioridade: 'Média'
    })
  }

  function toggleStatus(id: string) {
    setSchedule(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'Concluído' ? 'Pendente' : 'Concluído' } : s))
  }

  function deleteSchedule(id: string) {
    setSchedule(prev => prev.filter(s => s.id !== id))
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
            <CalendarIcon color="#660099" size={22} />
            Programação e Agenda
          </h1>
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
            Planejamento de treinamentos e inspeções
          </span>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#660099', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(102,0,153,0.3)',
          }}
        >
          <Plus size={16} />
          Agendar Evento
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar evento, técnico, local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
          />
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Total agendado: <b>{filtered.length}</b> compromissos</div>
      </div>

      {/* Tabela de Programação */}
      <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data / Hora</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Título do Evento</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Local</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status / Prioridade</th>
                {role !== 'TST' && <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: item.status === 'Concluído' ? 0.6 : 1 }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}><CalendarIcon size={14} /> {item.data}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}><Clock size={12} /> {item.hora}</div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155', maxWidth: 250, lineHeight: 1.4 }}>
                    {item.titulo}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={14} color="#94a3b8" /> {item.local}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                        {item.tecnico.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{item.tecnico}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                      <button onClick={() => toggleStatus(item.id)} style={{ padding: '4px 8px', borderRadius: 12, border: 'none', background: item.status === 'Concluído' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: item.status === 'Concluído' ? '#10b981' : '#f59e0b', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {item.status === 'Concluído' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {item.status}
                      </button>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: item.prioridade === 'Alta' ? '#660099' : item.prioridade === 'Média' ? '#f59e0b' : '#3b82f6' }}>
                        Pri: {item.prioridade}
                      </span>
                    </div>
                  </td>
                  {role !== 'TST' && (
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <button onClick={() => deleteSchedule(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title="Excluir Evento">
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
          <div style={{ background: '#fff', borderRadius: 16, width: 500, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>Agendar Novo Evento</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Título do Evento</label>
                <input type="text" required value={form.titulo} onChange={(e) => setForm(p => ({ ...p, titulo: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Técnico Responsável</label>
                <select value={form.tecnico} disabled={role === 'TST'} onChange={(e) => setForm(p => ({ ...p, tecnico: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: role === 'TST' ? '#f1f5f9' : '#fff' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Data</label>
                  <input type="text" required placeholder="DD/MM/AAAA" value={form.data} onChange={(e) => setForm(p => ({ ...p, data: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Hora</label>
                  <input type="text" required placeholder="HH:MM" value={form.hora} onChange={(e) => setForm(p => ({ ...p, hora: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Local / Planta</label>
                  <input type="text" required value={form.local} onChange={(e) => setForm(p => ({ ...p, local: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Prioridade</label>
                  <select value={form.prioridade} onChange={(e) => setForm(p => ({ ...p, prioridade: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff' }}>
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#660099', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
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
