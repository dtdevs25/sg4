'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import {
  CalendarDays, CheckCircle2, Clock, XCircle,
  PlusCircle, Search, Sparkles, X, Edit2, Trash2, Loader2, Save, FileText, Printer, FileEdit, FileCode2
} from 'lucide-react'
import { getReunioes, createReuniaoLote, updateReuniaoItem, deleteReuniaoItem } from '@/app/actions/reunioes'
import { getAtas, upsertAta } from '@/app/actions/atas'
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

type AtaData = {
  id: string
  data: Date | string
  assunto: string
  conteudo: string
}

export default function ReunioesPage() {
  const { data: session } = useSession()
  const isMasterOrAdmin = (session?.user as any)?.role === 'MASTER' || (session?.user as any)?.role === 'ADMIN'

  const [activeTab, setActiveTab] = useState<'presenca' | 'atas'>('presenca')

  const [logs, setLogs] = useState<ReuniaoData[]>([])
  const [atas, setAtas] = useState<AtaData[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  
  const [search, setSearch] = useState('')
  const [selectedMonths, setSelectedMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Modais de Presença
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

  // Editor de Atas
  const [editingAta, setEditingAta] = useState<{data: string, assunto: string} | null>(null)
  const [ataContent, setAtaContent] = useState('')
  const [printData, setPrintData] = useState<{dataObj: any, ata: AtaData | null, presencas: ReuniaoData[]} | null>(null)

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
  }, [selectedYear])

  async function loadData() {
    setLoading(true)
    const [resReunioes, resAtas] = await Promise.all([
      getReunioes(selectedYear),
      getAtas(selectedYear)
    ])
    
    if (resReunioes.success && resReunioes.data) {
      setLogs(resReunioes.data)
    }
    if (resAtas.success && resAtas.data) {
      setAtas(resAtas.data)
    }
    setLoading(false)
  }

  const clickTimeout = useRef<NodeJS.Timeout | null>(null)

  function handleMonthClick(m: number) {
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current)
      clickTimeout.current = null
      setSelectedMonths([m])
    } else {
      clickTimeout.current = setTimeout(() => {
        clickTimeout.current = null
        setSelectedMonths(prev => {
          if (prev.length === 1 && prev.includes(m)) {
            return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          }
          if (prev.includes(m)) {
            return prev.filter(x => x !== m)
          } else {
            return [...prev, m]
          }
        })
      }, 250)
    }
  }

  // Filtragem
  const filteredLogs = logs.filter(l => {
    const jsDate = new Date(l.data)
    const m = jsDate.getUTCMonth() + 1
    const matchMonth = selectedMonths.includes(m)
    return matchMonth
  })

  const searchedLogs = filteredLogs.filter(l => {
    return l.tecnico.nome.toLowerCase().includes(search.toLowerCase()) || 
           (l.motivo || '').toLowerCase().includes(search.toLowerCase()) || 
           (l.assunto || '').toLowerCase().includes(search.toLowerCase())
  })

  // Agrupamento de Reuniões Únicas (Data + Assunto)
  const uniqueMeetingsMap = new Map<string, {data: string, assunto: string, rawData: Date, count: number}>()
  filteredLogs.forEach(l => {
    const dt = new Date(l.data).toISOString()
    const ast = l.assunto || 'Reunião'
    const key = dt + '|' + ast
    if (!uniqueMeetingsMap.has(key)) {
      uniqueMeetingsMap.set(key, { data: dt, assunto: ast, rawData: new Date(l.data), count: 1 })
    } else {
      uniqueMeetingsMap.get(key)!.count++
    }
  })
  const uniqueMeetings = Array.from(uniqueMeetingsMap.values()).sort((a, b) => b.rawData.getTime() - a.rawData.getTime())
  const searchedMeetings = uniqueMeetings.filter(m => m.assunto.toLowerCase().includes(search.toLowerCase()))

  // Estatísticas Presença
  const totalMeetings = uniqueMeetings.length
  const totalPresences = filteredLogs.filter(l => l.presenca === 'PRESENTE').length
  const totalPunctual = filteredLogs.filter(l => l.pontualidade === 'PONTUAL').length
  const totalAtrasados = filteredLogs.filter(l => l.pontualidade === 'ATRASADO').length
  const totalAusentes = filteredLogs.filter(l => l.presenca === 'AUSENTE').length
  const totalRegistrations = filteredLogs.length

  const presenceRate = totalRegistrations > 0 ? Math.round((totalPresences / totalRegistrations) * 100) : 0
  const punctualityRate = totalPresences > 0 ? Math.round((totalPunctual / totalPresences) * 100) : 0

  // ─── ACTIONS ───

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
        loadData()
      } else {
        alert("Erro ao excluir.")
      }
    })
  }

  function openAtaEditor(dt: string, ast: string) {
    const existingAta = atas.find(a => new Date(a.data).toISOString() === dt && a.assunto === ast)
    setEditingAta({ data: dt, assunto: ast })
    setAtaContent(existingAta?.conteudo || '')
  }

  function handleSaveAta() {
    if (!editingAta) return
    startTransition(async () => {
      const res = await upsertAta(editingAta.data, editingAta.assunto, ataContent)
      if (res.success) {
        setEditingAta(null)
        loadData()
      } else {
        alert("Erro ao salvar a ata.")
      }
    })
  }

  function openPrintPdf(dt: string, ast: string) {
    const existingAta = atas.find(a => new Date(a.data).toISOString() === dt && a.assunto === ast)
    const presencas = filteredLogs.filter(l => new Date(l.data).toISOString() === dt && (l.assunto || 'Reunião') === ast)
    setPrintData({
      dataObj: { dt, ast, dateFmt: new Date(dt).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) },
      ata: existingAta || null,
      presencas
    })
    // Aguarda o state renderizar o layout escondido e chama window.print()
    setTimeout(() => {
      window.print()
      setPrintData(null)
    }, 500)
  }

  // Comandos de Rich Text
  function execCmd(command: string, arg?: string) {
    document.execCommand(command, false, arg)
    document.getElementById('editor')?.focus()
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          @page { margin: 1cm; }
        }
      `}</style>

      {/* --- ÁREA DE IMPRESSÃO (INVISÍVEL EM TELA) --- */}
      {printData && (
        <div id="print-section" style={{ display: 'none', fontFamily: 'Arial, sans-serif', color: '#000', background: '#fff' }}>
          <div style={{ borderBottom: '2px solid #660099', paddingBottom: 20, marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, color: '#660099' }}>Ata de Reunião</h1>
              <h2 style={{ margin: '5px 0 0 0', fontSize: 18, color: '#333' }}>{printData.dataObj.ast}</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 'bold' }}>Data da Reunião</div>
              <div style={{ fontSize: 16 }}>{printData.dataObj.dateFmt}</div>
            </div>
          </div>

          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: 16, borderBottom: '1px solid #ccc', paddingBottom: 5, marginBottom: 15 }}>Tópicos Abordados</h3>
            {printData.ata?.conteudo ? (
              <div dangerouslySetInnerHTML={{ __html: printData.ata.conteudo }} style={{ lineHeight: 1.6, fontSize: 14 }} />
            ) : (
              <p style={{ fontStyle: 'italic', color: '#666' }}>Nenhuma ata redigida para esta reunião.</p>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: 16, borderBottom: '1px solid #ccc', paddingBottom: 5, marginBottom: 15 }}>Controle de Presença</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: 8, border: '1px solid #ccc', textAlign: 'left' }}>Técnico</th>
                  <th style={{ padding: 8, border: '1px solid #ccc', textAlign: 'center' }}>Presença</th>
                  <th style={{ padding: 8, border: '1px solid #ccc', textAlign: 'center' }}>Pontualidade</th>
                  <th style={{ padding: 8, border: '1px solid #ccc', textAlign: 'left' }}>Observação</th>
                </tr>
              </thead>
              <tbody>
                {printData.presencas.map(p => (
                  <tr key={p.id}>
                    <td style={{ padding: 8, border: '1px solid #ccc' }}>{p.tecnico.nome}</td>
                    <td style={{ padding: 8, border: '1px solid #ccc', textAlign: 'center', color: p.presenca === 'PRESENTE' ? 'green' : 'red' }}>{p.presenca}</td>
                    <td style={{ padding: 8, border: '1px solid #ccc', textAlign: 'center' }}>{p.pontualidade.replace('_', ' ')}</td>
                    <td style={{ padding: 8, border: '1px solid #ccc' }}>{p.motivo || p.observacao || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TELA PRINCIPAL --- */}
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

          <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 8, gap: 4 }}>
            <button
              onClick={() => setActiveTab('presenca')}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                background: activeTab === 'presenca' ? '#fff' : 'transparent',
                color: activeTab === 'presenca' ? '#660099' : '#64748b',
                boxShadow: activeTab === 'presenca' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Presença e Assiduidade
            </button>
            <button
              onClick={() => setActiveTab('atas')}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                background: activeTab === 'atas' ? '#fff' : 'transparent',
                color: activeTab === 'atas' ? '#660099' : '#64748b',
                boxShadow: activeTab === 'atas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Atas de Reunião
            </button>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {MONTHS_LIST.slice(0, 6).map(m => {
                  const isSelected = selectedMonths.includes(m.key)
                  return (
                    <button
                      key={m.key}
                      onClick={() => handleMonthClick(m.key)}
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
                      onClick={() => handleMonthClick(m.key)}
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
          
          {activeTab === 'presenca' && isMasterOrAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: '#660099', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px',
                fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              }}
            >
              <PlusCircle size={16} />
              Nova Reunião (Lote)
            </button>
          )}
        </div>

        {/* ── CONTEÚDO: PRESENÇA ── */}
        {activeTab === 'presenca' && (
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
                    {searchedLogs.map(l => (
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
                                onClick={() => { setEditingItem(l); setEditPresenca(l.presenca); setEditPontualidade(l.pontualidade); setEditJustificada(l.justificada); setEditMotivo(l.motivo || ''); setEditObservacao(l.observacao || ''); }}
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
                    {searchedLogs.length === 0 && (
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
        )}

        {/* ── CONTEÚDO: ATAS ── */}
        {activeTab === 'atas' && (
          <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Eventos Registrados ({searchedMeetings.length})</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {searchedMeetings.map(m => {
                const temAta = atas.some(a => new Date(a.data).toISOString() === m.data && a.assunto === m.assunto)
                
                return (
                  <div key={m.data + m.assunto} style={{ padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', background: temAta ? '#f8fafc' : '#fff', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{m.assunto}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{m.rawData.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} • {m.count} Participantes</div>
                      </div>
                      {temAta && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openPrintPdf(m.data, m.assunto)} style={{ background: '#f1f5f9', color: '#660099', border: 'none', padding: '6px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Gerar PDF">
                            <Printer size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => openAtaEditor(m.data, m.assunto)}
                      style={{ width: '100%', background: temAta ? '#e2e8f0' : '#660099', color: temAta ? '#475569' : '#fff', border: 'none', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                    >
                      {temAta ? (
                        <><FileEdit size={16} /> Editar Ata</>
                      ) : (
                        <><FileCode2 size={16} /> Redigir Ata</>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
            {searchedMeetings.length === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                Nenhuma reunião foi criada neste período. Crie uma nova reunião na aba "Presença".
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODAIS COMUNS --- */}

      {/* Editor de Ata */}
      {editingAta && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.8)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>Redigir Ata de Reunião</h2>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{editingAta.assunto} - {new Date(editingAta.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</div>
              </div>
              <button onClick={() => setEditingAta(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding: 24, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              {/* Barra de Ferramentas Simples */}
              <div style={{ display: 'flex', gap: 6, background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <button type="button" onClick={() => execCmd('bold')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>B</button>
                <button type="button" onClick={() => execCmd('italic')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', fontStyle: 'italic', cursor: 'pointer' }}>I</button>
                <button type="button" onClick={() => execCmd('underline')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', textDecoration: 'underline', cursor: 'pointer' }}>U</button>
                <div style={{ width: 1, background: '#cbd5e1', margin: '0 6px' }} />
                <button type="button" onClick={() => execCmd('insertUnorderedList')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>• Lista</button>
                <button type="button" onClick={() => execCmd('insertOrderedList')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>1. Num</button>
              </div>

              {/* Área de Edição Rich Text */}
              <div
                id="editor"
                contentEditable
                onInput={(e) => setAtaContent(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: ataContent }}
                style={{
                  flex: 1, minHeight: 300, padding: 16, borderRadius: 8, border: '1px solid #cbd5e1',
                  outline: 'none', fontSize: 14, color: '#334155', lineHeight: 1.6, overflowY: 'auto'
                }}
              />
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
              <button type="button" disabled={pending} onClick={() => setEditingAta(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" disabled={pending} onClick={handleSaveAta} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#660099', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                Salvar Ata
              </button>
            </div>
          </div>
        </div>
      )}

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
                Isso criará a estrutura da reunião para todos os TSTs ativos. Depois, você poderá redigir a ata na aba "Atas de Reunião".
              </p>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Data da Reunião</label>
                <input type="date" required value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Assunto Principal</label>
                <input type="text" required value={meetingAssunto} onChange={(e) => setMeetingAssunto(e.target.value)} placeholder="Ex: Alinhamento de Fardamentos" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#660099', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {pending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
                  Criar Reunião
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
                <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{editingItem.tecnico.nome}</span>
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
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setEditingItem(null)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#660099', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  )
}
