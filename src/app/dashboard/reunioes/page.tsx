'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  CalendarDays, CheckCircle2, Clock, XCircle,
  PlusCircle, Search, Sparkles, X, Edit2, Trash2, Loader2, Save, FileText
} from 'lucide-react'
import { getReunioes, createReuniaoLote, updateReuniaoItem, deleteReuniaoItem } from '@/app/actions/reunioes'
import { useSession } from 'next-auth/react'

type ReuniaoData = {
  id: string
  tecnicoId: string
  data: Date | string
  assunto: string | null
  presenca: 'PRESENTE' | 'AUSENTE'
  pontualidade: 'PONTUAL' | 'ATRASADO' | 'NAO_SE_APLICA'
  justificada: 'SIM' | 'NAO' | 'NAO_SE_APLICA'
  motivo: string | null
  observacao: string | null
  tecnico: {
    nome: string
    fotoUrl: string | null
  }
}

export default function ReunioesPage() {
  const { data: session } = useSession()
  const isMasterOrAdmin = (session?.user as any)?.role === 'MASTER' || (session?.user as any)?.role === 'ADMIN'

  const [logs, setLogs] = useState<ReuniaoData[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  
  const [search, setSearch] = useState('')
  const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth() + 1])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingAssunto, setMeetingAssunto] = useState('')
  
  const [editingItem, setEditingItem] = useState<ReuniaoData | null>(null)
  const [editPresenca, setEditPresenca] = useState<string>('PRESENTE')
  const [editPontualidade, setEditPontualidade] = useState<string>('PONTUAL')
  const [editJustificada, setEditJustificada] = useState<string>('NAO_SE_APLICA')
  const [editMotivo, setEditMotivo] = useState('')
  const [editObservacao, setEditObservacao] = useState('')

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const MONTHS_LIST = [
    { key: 1, label: 'Jan' }, { key: 2, label: 'Fev' },
    { key: 3, label: 'Mar' }, { key: 4, label: 'Abr' },
    { key: 5, label: 'Mai' }, { key: 6, label: 'Jun' },
    { key: 7, label: 'Jul' }, { key: 8, label: 'Ago' },
    { key: 9, label: 'Set' }, { key: 10, label: 'Out' },
    { key: 11, label: 'Nov' }, { key: 12, label: 'Dez' }
  ]

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const res = await getReunioes()
    if (res.success && res.data) {
      setLogs(res.data)
    }
    setLoading(false)
  }

  function toggleMonth(m: number) {
    setSelectedMonths(prev => {
      if (prev.length === 12 && !prev.includes(m)) return [m] // Se "todos" estavam selecionados, seleciona só um
      if (prev.includes(m)) {
        if (prev.length === 1) return MONTHS_LIST.map(x => x.key) // Voltar todos
        return prev.filter(x => x !== m)
      }
      return [...prev, m]
    })
  }

  const filtered = logs.filter(l => {
    const matchSearch = l.tecnico.nome.toLowerCase().includes(search.toLowerCase()) || 
                       (l.motivo || '').toLowerCase().includes(search.toLowerCase()) || 
                       (l.assunto || '').toLowerCase().includes(search.toLowerCase())
    const jsDate = new Date(l.data)
    const m = jsDate.getUTCMonth() + 1
    const y = jsDate.getUTCFullYear()
    const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(m)
    const matchYear = y === selectedYear
    return matchSearch && matchMonth && matchYear
  })

  // Estatisticas
  const totalMeetings = Array.from(new Set(filtered.map(l => new Date(l.data).toISOString() + l.assunto))).length
  const totalPresences = filtered.filter(l => l.presenca === 'PRESENTE').length
  const totalPunctual = filtered.filter(l => l.pontualidade === 'PONTUAL').length
  const totalAtrasados = filtered.filter(l => l.pontualidade === 'ATRASADO').length
  const totalAusentes = filtered.filter(l => l.presenca === 'AUSENTE').length
  const totalRegistrations = filtered.length

  const presenceRate = totalRegistrations > 0 ? Math.round((totalPresences / totalRegistrations) * 100) : 0
  const punctualityRate = totalPresences > 0 ? Math.round((totalPunctual / totalPresences) * 100) : 0

  function handleCreateLote(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await createReuniaoLote(meetingDate, meetingAssunto)
      if (res.success) {
        setShowCreateModal(false)
        setMeetingDate('')
        setMeetingAssunto('')
        loadData()
      } else {
        alert(res.error || "Erro ao criar reuniões")
      }
    })
  }

  function openEditModal(item: ReuniaoData) {
    setEditingItem(item)
    setEditPresenca(item.presenca)
    setEditPontualidade(item.pontualidade)
    setEditJustificada(item.justificada)
    setEditMotivo(item.motivo || '')
    setEditObservacao(item.observacao || '')
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingItem) return
    startTransition(async () => {
      const res = await updateReuniaoItem(editingItem.id, {
        presenca: editPresenca,
        pontualidade: editPresenca === 'AUSENTE' ? 'NAO_SE_APLICA' : editPontualidade,
        justificada: editPresenca === 'PRESENTE' ? 'NAO_SE_APLICA' : editJustificada,
        motivo: editMotivo,
        observacao: editObservacao
      })
      if (res.success) {
        setEditingItem(null)
        loadData()
      } else {
        alert("Erro ao atualizar.")
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteReuniaoItem(id)
      if (res.success) {
        setDeleteConfirmId(null)
        setLogs(prev => prev.filter(l => l.id !== id))
      } else {
        alert("Erro ao excluir.")
      }
    })
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
            <CalendarDays color="#660099" size={22} />
            Gestão de Reuniões
          </h1>
        </div>
        
        {isMasterOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: '#660099', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px',
              fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(102,0,153,0.3)',
            }}
          >
            <PlusCircle size={16} />
            Nova Reunião
          </button>
        )}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {MONTHS_LIST.slice(0, 6).map(m => {
                const isSelected = selectedMonths.includes(m.key)
                return (
                  <button
                    key={m.key}
                    onClick={() => toggleMonth(m.key)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 6,
                      border: isSelected ? '1px solid #660099' : '1px solid #e2e8f0',
                      background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc',
                      color: isSelected ? '#660099' : '#64748b',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none'
                    }}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {MONTHS_LIST.slice(6, 12).map(m => {
                const isSelected = selectedMonths.includes(m.key)
                return (
                  <button
                    key={m.key}
                    onClick={() => toggleMonth(m.key)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 6,
                      border: isSelected ? '1px solid #660099' : '1px solid #e2e8f0',
                      background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc',
                      color: isSelected ? '#660099' : '#64748b',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none'
                    }}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Card de Estatística */}
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Métricas das Reuniões</span>
            <span style={{ background: 'rgba(102,0,153,0.1)', color: '#660099', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
              {selectedMonths.length === 12 ? 'TODOS' : `${selectedMonths.length} MÊS(ES)`}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Presença Geral</span>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b' }}>{presenceRate}%</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Pontualidade</span>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>{punctualityRate}%</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', fontWeight: 600, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span>Reuniões: <b style={{ color: '#1e293b' }}>{totalMeetings}</b></span>
            <span>Atrasos: <b style={{ color: '#f59e0b' }}>{totalAtrasados}</b></span>
            <span>Ausentes: <b style={{ color: '#660099' }}>{totalAusentes}</b></span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
          <input type="text" placeholder="Buscar técnico, motivo ou assunto..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Encontrados: <b>{filtered.length}</b> registros de presença</div>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" size={32} color="#660099" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', width: '80px' }}>ID / Info</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Presença</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Pontualidade</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Ausência (Justificada)</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Motivo / Obs</th>
                  {isMasterOrAdmin && <th style={{ padding: '14px 20px', width: 100 }}></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', ...((editingItem?.id === l.id || deleteConfirmId === l.id) ? { background: '#f8fafc' } : {}) }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>#{l.id.slice(-5).toUpperCase()}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                        {new Date(l.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={l.assunto || ''}>{l.assunto || 'Reunião'}</div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {l.tecnico.fotoUrl ? (
                          <img src={l.tecnico.fotoUrl} alt={l.tecnico.nome} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                            {l.tecnico.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{l.tecnico.nome}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: l.presenca === 'PRESENTE' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: l.presenca === 'PRESENTE' ? '#10b981' : '#ef4444' }}>
                        {l.presenca === 'PRESENTE' ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {l.presenca}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: l.pontualidade === 'PONTUAL' ? 'rgba(16,185,129,0.1)' : l.pontualidade === 'ATRASADO' ? 'rgba(245,158,11,0.1)' : '#f1f5f9', color: l.pontualidade === 'PONTUAL' ? '#10b981' : l.pontualidade === 'ATRASADO' ? '#f59e0b' : '#64748b' }}>
                        {l.pontualidade === 'PONTUAL' ? <CheckCircle2 size={12} /> : l.pontualidade === 'ATRASADO' ? <Clock size={12} /> : <X size={12} />} 
                        {l.pontualidade.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: l.justificada === 'SIM' ? '#10b981' : l.justificada === 'NAO' ? '#ef4444' : '#94a3b8' }}>
                      {l.justificada.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 12, color: '#64748b' }}>
                      {l.motivo && <div style={{ marginBottom: 4 }}><b style={{ color: '#475569' }}>Motivo:</b> {l.motivo}</div>}
                      {l.observacao && <div><b style={{ color: '#475569' }}>Obs:</b> {l.observacao}</div>}
                      {(!l.motivo && !l.observacao) && <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>—</span>}
                    </td>
                    {isMasterOrAdmin && (
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => openEditModal(l)}
                            disabled={pending}
                            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s', opacity: pending ? 0.5 : 1 }}
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(l.id)}
                            disabled={pending}
                            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', transition: 'all 0.2s', opacity: pending ? 0.5 : 1 }}
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                      Nenhum registro de presença encontrado para o período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar Nova Reunião Lote */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.8)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(102,0,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PlusCircle color="#660099" size={18} />
                </div>
                Nova Reunião Geral
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateLote} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Isso criará uma linha de presença para <b>todos os TSTs ativos</b> no banco de dados na data informada, padronizados como <b style={{color: '#10b981'}}>Presente</b> e <b style={{color: '#10b981'}}>Pontual</b>. Depois, basta editar quem faltou ou atrasou.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Data da Reunião</label>
                <input type="date" required value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Assunto / Tema (Opcional)</label>
                <input type="text" value={meetingAssunto} onChange={(e) => setMeetingAssunto(e.target.value)} placeholder="Ex: Alinhamento de Fardamentos" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#660099', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {pending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
                  Gerar Reunião
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Presença TST */}
      {editingItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.8)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 color="#64748b" size={18} />
                </div>
                Editar Presença
              </h2>
              <button onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, display: 'flex', gap: 16, alignItems: 'center', border: '1px solid #e2e8f0' }}>
                {editingItem.tecnico.fotoUrl ? (
                  <img src={editingItem.tecnico.fotoUrl} alt={editingItem.tecnico.nome} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', border: '1px solid #cbd5e1', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>
                    {editingItem.tecnico.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{editingItem.tecnico.nome}</h4>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Reunião: {new Date(editingItem.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Presença</label>
                  <select value={editPresenca} onChange={(e) => setEditPresenca(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', background: '#fff' }}>
                    <option value="PRESENTE">Presente</option>
                    <option value="AUSENTE">Ausente</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Pontualidade</label>
                  <select disabled={editPresenca === 'AUSENTE'} value={editPontualidade} onChange={(e) => setEditPontualidade(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', background: editPresenca === 'AUSENTE' ? '#f1f5f9' : '#fff' }}>
                    <option value="PONTUAL">Pontual</option>
                    <option value="ATRASADO">Atrasado</option>
                    <option value="NAO_SE_APLICA">N/A</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Ausência Justificada?</label>
                  <select disabled={editPresenca === 'PRESENTE'} value={editJustificada} onChange={(e) => setEditJustificada(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', background: editPresenca === 'PRESENTE' ? '#f1f5f9' : '#fff' }}>
                    <option value="SIM">Sim</option>
                    <option value="NAO">Não</option>
                    <option value="NAO_SE_APLICA">N/A</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Motivo da Ausência / Atraso</label>
                <input type="text" value={editMotivo} onChange={(e) => setEditMotivo(e.target.value)} placeholder="Ex: Atestado médico" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Observação (Opcional)</label>
                <textarea rows={2} value={editObservacao} onChange={(e) => setEditObservacao(e.target.value)} placeholder="Comentários adicionais..." style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setEditingItem(null)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#660099', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 color="#ef4444" size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Excluir Registro</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Ação irreversível.</p>
              </div>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
              Você tem certeza que deseja excluir o registro de presença deste técnico nesta reunião?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setDeleteConfirmId(null)} disabled={pending} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} disabled={pending} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {pending && <Loader2 size={14} className="animate-spin" />}
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
