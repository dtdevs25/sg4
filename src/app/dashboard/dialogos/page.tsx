'use client'

import { useState } from 'react'
import {
  MessageSquare, Calendar, ShieldCheck, HelpCircle,
  TrendingUp, Search, Plus, Trash2, Edit
} from 'lucide-react'

// Dados reais compilados da aba "GESTÃO DE DSS - TIME TST SG4"
const INITIAL_DIALOGOS = [
  { id: '1', nome: 'Antonio Carlos Junior Dias', jan: 8, fev: 8, mar: 8, abr: 8, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '2', nome: 'Daniel José Gregorio Junior', jan: 8, fev: 8, mar: 8, abr: 20, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '3', nome: 'Dara Amorim Silva de Lima', jan: 0, fev: 0, mar: 0, abr: 3, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '4', nome: 'Djonatê Cruz dos Santos', jan: 8, fev: 8, mar: 8, abr: 3, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '5', nome: 'Jonas Rodrigues Pereira', jan: 9, fev: 8, mar: 8, abr: 3, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '6', nome: 'Karine Novaes Assem', jan: 8, fev: 9, mar: 13, abr: 10, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '7', nome: 'Luis Claudio Soares', jan: 0, fev: 3, mar: 8, abr: 8, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '8', nome: 'Rogério Lima da Silva', jan: 9, fev: 8, mar: 9, abr: 3, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '9', nome: 'Rosicleide Fernandes Santos Davino', jan: 16, fev: 14, mar: 18, abr: 14, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '10', nome: 'Samuel da Silva Santos', jan: 0, fev: 2, mar: 0, abr: 2, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
]

// Lista de temas sugeridos de DSS
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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)
  
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
            <MessageSquare color="#660099" size={22} />
            Diálogo Semanal de Segurança
          </h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        
        {/* Filtro de Meses e Ano */}
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Selecionar Período</span>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none' }}>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { key: 'jan', label: 'Jan' }, { key: 'fev', label: 'Fev' },
              { key: 'mar', label: 'Mar' }, { key: 'abr', label: 'Abr' },
              { key: 'mai', label: 'Mai' }, { key: 'jun', label: 'Jun' },
              { key: 'jul', label: 'Jul' }, { key: 'ago', label: 'Ago' },
              { key: 'set', label: 'Set' }, { key: 'out', label: 'Out' },
              { key: 'nov', label: 'Nov' }, { key: 'dez', label: 'Dez' }
            ].map(m => (
              <button
                key={m.key}
                onClick={() => { setSelectedMonth(m.key as MesKey); setEditingId(null) }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: selectedMonth === m.key ? '1px solid #660099' : '1px solid #e2e8f0',
                  background: selectedMonth === m.key ? '#660099' : '#f8fafc',
                  color: selectedMonth === m.key ? '#fff' : '#64748b',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card de Estatística */}
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Atingimento de DSS</span>
            <span style={{ background: 'rgba(102,0,153,0.1)', color: '#660099', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
              {selectedMonth}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{totalRealizado}</span>
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>/ {totalMeta} DSS</span>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ background: '#660099', height: '100%', width: `${Math.min(pctRealizado, 100)}%`, transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
            <span>Atingimento: <b style={{ color: '#1e293b' }}>{pctRealizado}%</b></span>
            <span>Meta: {targetMeta} / técnico</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        
        {/* ── Tabela de Lançamentos ── */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
            <div style={{ position: 'relative', width: 300 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Filtrar por técnico..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Meta</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Realizado</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const realizado = t[selectedMonth]
                    const isCompleted = realizado >= targetMeta
                    const hasStarted = realizado > 0

                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>{t.nome}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{targetMeta}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          {editingId === t.id ? (
                            <input type="number" value={editValue} min={0} onChange={(e) => setEditValue(Number(e.target.value))} style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #e2e8f0', textAlign: 'center' }} />
                          ) : (
                            <span style={{ fontSize: 14, fontWeight: 800, color: isCompleted ? '#10b981' : hasStarted ? '#f59e0b' : '#64748b' }}>{realizado}</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          {isCompleted ? (
                            <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Completo</span>
                          ) : hasStarted ? (
                            <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{realizado}/{targetMeta}</span>
                          ) : (
                            <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Aguardando</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          {editingId === t.id ? (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <button onClick={() => saveEdit(t.id)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                              <button onClick={() => setEditingId(null)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cancela</button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingId(t.id); setEditValue(realizado) }} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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

        {/* Sugestões de Temas */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck color="#660099" size={20} />
            Temas Sugeridos para DSS
          </h2>
          
          <form onSubmit={handleAddTopic} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <input type="text" placeholder="Ex: Prevenção de choques..." value={newTopic} onChange={e => setNewTopic(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff' }}>
                <option value="EPI">EPI</option>
                <option value="NRs">NRs</option>
                <option value="Saúde">Saúde</option>
                <option value="Procedimento">Procedimento</option>
                <option value="Emergência">Emergência</option>
              </select>
              <button type="submit" style={{ padding: '0 16px', borderRadius: 8, border: 'none', background: '#1e293b', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} /> Add
              </button>
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topics.map(t => (
              <div key={t.id} style={{ padding: 12, borderRadius: 8, border: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#660099', textTransform: 'uppercase' }}>{t.categoria}</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, fontWeight: 600, color: '#334155', lineHeight: 1.4 }}>{t.tema}</p>
                </div>
                <button onClick={() => handleDeleteTopic(t.id)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
