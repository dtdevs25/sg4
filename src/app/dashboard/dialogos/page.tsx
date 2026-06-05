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



type MesKey = 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun' | 'jul' | 'ago' | 'set' | 'out' | 'nov' | 'dez'

export default function DialogosPage() {
  const [data, setData] = useState(INITIAL_DIALOGOS)
  const [selectedMonths, setSelectedMonths] = useState<MesKey[]>(['abr'])
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const targetMeta = 8 // Meta de DSS da planilha (8/mês)

  const filtered = data.filter(t => t.nome.toLowerCase().includes(search.toLowerCase()))

  const totalRealizado = filtered.reduce((acc, curr) => {
    return acc + selectedMonths.reduce((sum, m) => sum + curr[m], 0)
  }, 0)
  const totalMeta = filtered.length * targetMeta * (selectedMonths.length || 1)
  const pctRealizado = totalMeta > 0 ? Math.round((totalRealizado / totalMeta) * 100) : 0

  function saveEdit(id: string) {
    if (selectedMonths.length === 1) {
      setData(prev => prev.map(t => t.id === id ? { ...t, [selectedMonths[0]]: editValue } : t))
    } else {
      alert("Selecione apenas 1 mês para editar os valores na tabela.")
    }
    setEditingId(null)
  }

  function handleDelete(id: string) {
    setData(prev => prev.filter(t => t.id !== id))
    setDeleteConfirmId(null)
  }

  const MONTHS_LIST = [
    { key: 'jan', label: 'Jan' }, { key: 'fev', label: 'Fev' },
    { key: 'mar', label: 'Mar' }, { key: 'abr', label: 'Abr' },
    { key: 'mai', label: 'Mai' }, { key: 'jun', label: 'Jun' },
    { key: 'jul', label: 'Jul' }, { key: 'ago', label: 'Ago' },
    { key: 'set', label: 'Set' }, { key: 'out', label: 'Out' },
    { key: 'nov', label: 'Nov' }, { key: 'dez', label: 'Dez' }
  ];

  function toggleMonth(m: MesKey) {
    setSelectedMonths(prev => 
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    )
    setEditingId(null)
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
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                textAlign: 'left',
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{selectedMonths.length > 0 ? selectedMonths.map(m => MONTHS_LIST.find(x => x.key === m)?.label).join(', ') : 'Nenhum mês selecionado'}</span>
              <span style={{ fontSize: 10 }}>▼</span>
            </button>
            
            {isMonthDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }}>
                {MONTHS_LIST.map(m => (
                  <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedMonths.includes(m.key as MesKey)} 
                      onChange={() => toggleMonth(m.key as MesKey)} 
                      style={{ accentColor: '#660099' }}
                    />
                    <span style={{ fontSize: 13, color: '#334155' }}>{m.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card de Estatística */}
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Atingimento do Período</span>
            <span style={{ background: 'rgba(102,0,153,0.1)', color: '#660099', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
              {selectedMonths.length} MÊS(ES)
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* ── Tabela de Lançamentos ── */}
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
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Meta do Período</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Realizado</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const realizado = selectedMonths.reduce((sum, m) => sum + t[m], 0)
                  const meta = targetMeta * (selectedMonths.length || 1)
                  const isCompleted = realizado >= meta
                  const hasStarted = realizado > 0

                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>{t.nome}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{meta}</td>
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
                          <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{realizado}/{meta}</span>
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
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                              onClick={() => { setEditingId(t.id); setEditValue(realizado) }}
                              title="Editar"
                              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(t.id)}
                              title="Excluir"
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 color="#ef4444" size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Excluir Registro</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            
            <p style={{ margin: '0 0 24px 0', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
              Você tem certeza que deseja excluir as informações deste técnico no Diálogo de Segurança? Todos os dados vinculados a ele serão perdidos.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
