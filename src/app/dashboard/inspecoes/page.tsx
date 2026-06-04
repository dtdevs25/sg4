'use client'

import { useState } from 'react'
import {
  ClipboardCheck, Calendar, Filter, User,
  CheckCircle2, AlertTriangle, PlayCircle, Search
} from 'lucide-react'

// Dados reais compilados
const INITIAL_INSPECOES = [
  { id: '1', nome: 'Antonio Carlos Junior Dias', admissao: '05/08/2025', jan: 20, fev: 20, mar: 16, abr: 18, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '2', nome: 'Daniel José Gregorio Junior', admissao: '05/08/2025', jan: 23, fev: 22, mar: 25, abr: 22, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '3', nome: 'Dara Amorim Silva de Lima', admissao: '23/03/2026', jan: 0, fev: 0, mar: 0, abr: 5, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '4', nome: 'Djonatê Cruz dos Santos', admissao: '05/08/2025', jan: 20, fev: 21, mar: 20, abr: 5, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '5', nome: 'Jonas Rodrigues Pereira', admissao: '18/09/2025', jan: 20, fev: 20, mar: 21, abr: 21, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '6', nome: 'Karine Novaes Assem', admissao: '05/08/2025', jan: 20, fev: 22, mar: 20, abr: 21, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '7', nome: 'Luis Claudio Soares', admissao: '02/02/2026', jan: 0, fev: 1, mar: 19, abr: 21, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '8', nome: 'Rogério Lima da Silva', admissao: '12/04/2025', jan: 20, fev: 20, mar: 20, abr: 0, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '9', nome: 'Rosicleide Fernandes Santos Davino', admissao: '05/08/2025', jan: 25, fev: 21, mar: 24, abr: 18, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '10', nome: 'Samuel da Silva Santos', admissao: '05/08/2025', jan: 0, fev: 2, mar: 0, abr: 2, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
]

type MesKey = 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun' | 'jul' | 'ago' | 'set' | 'out' | 'nov' | 'dez'

export default function InspecoesPage() {
  const [data, setData] = useState(INITIAL_INSPECOES)
  const [selectedMonth, setSelectedMonth] = useState<MesKey>('abr')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)
  
  const targetMeta = 20

  const filtered = data.filter(t => t.nome.toLowerCase().includes(search.toLowerCase()))

  const totalRealizado = filtered.reduce((acc, curr) => acc + curr[selectedMonth], 0)
  const totalMeta = filtered.length * targetMeta
  const pctRealizado = totalMeta > 0 ? Math.round((totalRealizado / totalMeta) * 100) : 0

  function startEdit(id: string, currentValue: number) {
    setEditingId(id)
    setEditValue(currentValue)
  }

  function saveEdit(id: string) {
    setData(prev => prev.map(t => t.id === id ? { ...t, [selectedMonth]: editValue } : t))
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
            <ClipboardCheck color="#660099" size={22} />
            Inspeções de Segurança
          </h1>
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
            Gerencie e acompanhe as metas mensais
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        
        {/* Filtro de Meses */}
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, gridColumn: 'span 2' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Selecionar Período</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { key: 'jan', label: 'Janeiro' }, { key: 'fev', label: 'Fevereiro' },
              { key: 'mar', label: 'Março' }, { key: 'abr', label: 'Abril' },
              { key: 'mai', label: 'Maio' }, { key: 'jun', label: 'Junho' },
              { key: 'jul', label: 'Julho' }, { key: 'ago', label: 'Agosto' },
              { key: 'set', label: 'Setembro' }, { key: 'out', label: 'Outubro' },
              { key: 'nov', label: 'Novembro' }, { key: 'dez', label: 'Dezembro' }
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
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Atingimento do Mês</span>
            <span style={{ background: 'rgba(102,0,153,0.1)', color: '#660099', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
              {selectedMonth}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{totalRealizado}</span>
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>/ {totalMeta} insp.</span>
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
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Meta Mensal</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Realizado</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Progresso</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const realizado = t[selectedMonth]
                  const statusPct = Math.round((realizado / targetMeta) * 100)
                  const isCompleted = realizado >= targetMeta
                  const hasStarted = realizado > 0

                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f5f9', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                            {t.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>{t.nome}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Admissão: {t.admissao}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
                        {targetMeta}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        {editingId === t.id ? (
                          <input type="number" value={editValue} min={0} max={100} onChange={(e) => setEditValue(Number(e.target.value))} style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #e2e8f0', textAlign: 'center' }} />
                        ) : (
                          <span style={{ fontSize: 14, fontWeight: 800, color: isCompleted ? '#10b981' : hasStarted ? '#f59e0b' : '#64748b' }}>{realizado}</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 150 }}>
                          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                            <div style={{ background: isCompleted ? '#10b981' : hasStarted ? '#f59e0b' : '#64748b', height: '100%', width: `${Math.min(statusPct, 100)}%` }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', width: 30, textAlign: 'right' }}>{statusPct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        {isCompleted ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                            <CheckCircle2 size={12} /> Completo
                          </span>
                        ) : hasStarted ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                            <PlayCircle size={12} /> Andamento
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                            <AlertTriangle size={12} /> Aguardando
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {editingId === t.id ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => saveEdit(t.id)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                            <button onClick={() => setEditingId(null)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cancela</button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(t.id, realizado)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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
    </div>
  )
}
