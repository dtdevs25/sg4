'use client'

import { getAnosComDados } from '@/app/actions/anos'
import { useState, useEffect, useTransition, useRef } from 'react'
import {
  CalendarDays, CheckCircle2, Clock, XCircle,
  PlusCircle, Search, Sparkles, X, Edit2, Trash2, Loader2, Save, FileText, Printer, FileEdit, FileCode2, Eye
} from 'lucide-react'
import { getReunioes, createReuniaoLote, deleteReuniaoLote, updatePresencasReuniao } from '@/app/actions/reunioes'
import { getAtas, upsertAta, uploadAnexoReuniao, deleteAnexoAta } from '@/app/actions/atas'
import { getTecnicos } from '@/app/actions/tecnicos'
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
    ativo?: boolean
  }
}

type AtaData = {
  id: string
  data: Date | string
  assunto: string
  conteudo: string
  anexoUrl?: string | null
  anexoNome?: string | null
}

export default function ReunioesPage() {
  const { data: session } = useSession()
  const isMasterOrAdmin = (session?.user as any)?.role === 'MASTER' || (session?.user as any)?.role === 'ADMIN'

  const [logs, setLogs] = useState<ReuniaoData[]>([])
  const [atas, setAtas] = useState<AtaData[]>([])
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  
  const [search, setSearch] = useState('')
  const [selectedMonths, setSelectedMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].slice(0, new Date().getMonth() + 1))
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([new Date().getFullYear()])
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(new Date().getFullYear())
  
  // Modais de Presença
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [meetingTimeFim, setMeetingTimeFim] = useState('')
  const [meetingAssunto, setMeetingAssunto] = useState('')
  const [meetingRecorrencia, setMeetingRecorrencia] = useState('none')
  const [meetingDataFim, setMeetingDataFim] = useState('')
  const [meetingIncludeInativos, setMeetingIncludeInativos] = useState(false)
  
  const [deleteConfirmInfo, setDeleteConfirmInfo] = useState<{data: string, assunto: string} | null>(null)

  // Editor de Atas
  const [editingAta, setEditingAta] = useState<{data: string, assunto: string} | null>(null)
  const [ataContent, setAtaContent] = useState('')
  const [ataAnexoNome, setAtaAnexoNome] = useState('')
  const [ataAnexoUrl, setAtaAnexoUrl] = useState('')
  const [ataAnexoBase64, setAtaAnexoBase64] = useState('')
  const [ataAnexoContentType, setAtaAnexoContentType] = useState('')
  // Lista de presença temporária (no modal)
  const [tempPresencas, setTempPresencas] = useState<ReuniaoData[]>([])
  const [showInativosModal, setShowInativosModal] = useState(false)

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
    const [anos, resReunioes, resAtas, resTecnicos] = await Promise.all([
      getAnosComDados(),
      getReunioes(selectedYear === 'ALL' ? undefined : selectedYear),
      getAtas(selectedYear === 'ALL' ? undefined : selectedYear),
      getTecnicos()
    ])
    setAnosDisponiveis(anos)
    
    if (resReunioes.success && resReunioes.data) {
      setLogs(resReunioes.data)
    }
    if (resAtas.success && resAtas.data) {
      setAtas(resAtas.data)
    }
    if (resTecnicos.success && resTecnicos.data) {
      setTecnicos(resTecnicos.data)
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

  // Agrupamento de Reuniões Únicas (Data + Assunto)
  const uniqueMeetingsMap = new Map<string, {data: string, assunto: string, rawData: Date, count: number, presences: number}>()
  filteredLogs.forEach(l => {
    const dt = new Date(l.data).toISOString()
    const ast = l.assunto || 'Reunião'
    const key = dt + '|' + ast
    if (!uniqueMeetingsMap.has(key)) {
      uniqueMeetingsMap.set(key, { data: dt, assunto: ast, rawData: new Date(l.data), count: 1, presences: l.presenca === 'PRESENTE' ? 1 : 0 })
    } else {
      uniqueMeetingsMap.get(key)!.count++
      if (l.presenca === 'PRESENTE') uniqueMeetingsMap.get(key)!.presences++
    }
  })
  const uniqueMeetings = Array.from(uniqueMeetingsMap.values()).sort((a, b) => a.rawData.getTime() - b.rawData.getTime())
  
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
    if (!meetingDate || !meetingTime || !meetingAssunto) return
    startTransition(async () => {
      const res = await createReuniaoLote(meetingDate, meetingTime, meetingTimeFim, meetingAssunto, meetingRecorrencia, meetingDataFim, meetingIncludeInativos)
      if (res.success) {
        setShowCreateModal(false)
        setMeetingDate('')
        setMeetingTime('')
        setMeetingTimeFim('')
        setMeetingAssunto('')
        setMeetingRecorrencia('none')
        setMeetingDataFim('')
        setMeetingIncludeInativos(false)
        loadData()
      } else {
        alert(res.error || "Erro ao criar reuniões")
      }
    })
  }

  function handleDeleteLote() {
    if (!deleteConfirmInfo) return
    startTransition(async () => {
      const res = await deleteReuniaoLote(deleteConfirmInfo.data, deleteConfirmInfo.assunto)
      if (res.success) {
        setDeleteConfirmInfo(null)
        loadData()
      } else {
        alert("Erro ao excluir reunião.")
      }
    })
  }

  function openAtaEditor(dt: string, ast: string) {
    const existingAta = atas.find(a => new Date(a.data).toISOString() === dt && a.assunto === ast)
    setEditingAta({ data: dt, assunto: ast })
    setAtaContent(existingAta?.conteudo || '')
    setAtaAnexoNome(existingAta?.anexoNome || '')
    setAtaAnexoUrl(existingAta?.anexoUrl || '')
    setAtaAnexoBase64('')
    setAtaAnexoContentType('')
    
    const meetingLogs = filteredLogs.filter(l => new Date(l.data).toISOString() === dt && (l.assunto || 'Reunião') === ast)
    
    const combinedPresences = tecnicos.map(tec => {
      const existing = meetingLogs.find(l => l.tecnicoId === tec.id)
      if (existing) {
        return { ...existing, tecnico: { ...existing.tecnico, ativo: tec.ativo } }
      }
      return {
        id: '', // Empty ID means it needs to be created
        tecnicoId: tec.id,
        data: dt,
        assunto: ast,
        presenca: 'AUSENTE' as const,
        pontualidade: 'NAO_SE_APLICA' as const,
        justificada: 'NAO_SE_APLICA' as const,
        motivo: '',
        observacao: '',
        tecnico: {
          nome: tec.nome,
          fotoUrl: tec.fotoUrl,
          ativo: tec.ativo
        }
      }
    })
    
    setTempPresencas(combinedPresences)
    setShowInativosModal(false)
  }

  function handleSaveAta() {
    if (!editingAta) return
    startTransition(async () => {
      let finalAnexoUrl = ataAnexoUrl
      let finalAnexoNome = ataAnexoNome

      if (ataAnexoBase64) {
        const formData = new FormData();
        formData.append('fileData', ataAnexoBase64);
        formData.append('fileName', ataAnexoNome);
        formData.append('contentType', ataAnexoContentType);
        const uploadRes = await uploadAnexoReuniao(formData)
        if (uploadRes.success && uploadRes.url) {
          finalAnexoUrl = uploadRes.url
        } else {
          alert(uploadRes.error || "Erro ao fazer upload do anexo")
          return
        }
      }

      // Salva a ata primeiro
      const editorNode = document.getElementById('editor')
      const contentToSave = editorNode ? editorNode.innerHTML : ataContent
      const ataRes = await upsertAta(editingAta.data, editingAta.assunto, contentToSave, finalAnexoUrl, finalAnexoNome)
      
      // Salva os dados de presença da lista temporária
      const updatesList = tempPresencas.map(tp => ({
        id: tp.id || undefined,
        tecnicoId: tp.tecnicoId,
        presenca: tp.presenca,
        pontualidade: tp.pontualidade,
        justificada: tp.justificada,
        motivo: tp.motivo || '',
        observacao: tp.observacao || ''
      }))
      
      const presRes = await updatePresencasReuniao(editingAta.data, editingAta.assunto, updatesList)

      if (ataRes.success && presRes.success) {
        setEditingAta(null)
        loadData()
      } else {
        alert("Ocorreu um erro ao salvar.")
      }
    })
  }

  async function openPrintPdf(dt: string, ast: string) {
    const existingAta = atas.find(a => new Date(a.data).toISOString() === dt && a.assunto === ast)
    const presencas = filteredLogs.filter(l => new Date(l.data).toISOString() === dt && (l.assunto || 'Reunião') === ast)
    
    try {
      const { gerarPdfAta } = await import('@/app/utils/gerarPdfAta')
      const { fileName, doc } = await gerarPdfAta({
        data: dt,
        assunto: ast,
        conteudo: existingAta?.conteudo || '',
        anexoNome: existingAta?.anexoNome || undefined,
        presencas: presencas.map(p => ({
          tecnico: { nome: p.tecnico.nome },
          presenca: p.presenca,
          pontualidade: p.pontualidade,
          motivo: p.motivo,
          observacao: p.observacao
        }))
      })
      doc.save(fileName)
    } catch (err) {
      console.error(err)
      alert('Erro ao gerar o PDF da ata.')
    }
  }

  function handleAnexoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 50 * 1024 * 1024) {
      alert('Arquivo muito grande. Limite é 50MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setAtaAnexoBase64(ev.target.result as string)
        setAtaAnexoNome(file.name)
        setAtaAnexoContentType(file.type)
        setAtaAnexoUrl('')
      }
    }
    reader.readAsDataURL(file)
  }

  function execCmd(command: string, arg?: string) {
    document.execCommand(command, false, arg)
    document.getElementById('editor')?.focus()
  }

  return (
    <>
      <style>{`
        .reuniao-ata-body { display: flex; flex: 1; overflow: hidden; }
        .reuniao-ata-panel { width: 450px; padding: 0; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; }
        @media (max-width: 768px) {
          .reuniao-ata-body { flex-direction: column; overflow: visible; }
          .reuniao-ata-panel { width: 100%; border-left: none; border-top: 1px solid #e2e8f0; max-height: 60vh; overflow-y: auto; }
        }
      `}</style>




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
              Reuniões e Presenças
            </h1>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {/* Filtro de Meses e Ano */}
          <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Selecionar Período</span>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none' }}>
                <option value="ALL">Todos os Anos</option>
                {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
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
            <input type="text" placeholder="Buscar reuniões por assunto..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
          </div>
          
          {isMasterOrAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: '#660099', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px',
                fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              }}
            >
              <PlusCircle size={16} />
              Agendar Reunião
            </button>
          )}
        </div>

        {/* ── CONTEÚDO: TABELA DE REUNIÕES AGENDADAS ── */}
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
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', width: '120px' }}>Data</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Assunto da Reunião</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Técnicos Presentes</th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Ata Redigida</th>
                    <th style={{ padding: '14px 20px', width: 220, textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedMeetings.map(m => {
                    const ata = atas.find(a => new Date(a.data).toISOString() === m.data && a.assunto === m.assunto)
                    const temAta = !!ata
                    
                    return (
                    <tr key={m.data + m.assunto} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', ...((deleteConfirmInfo?.data === m.data && deleteConfirmInfo?.assunto === m.assunto) ? { background: '#f8fafc' } : {}) }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                          {m.rawData.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{m.assunto}</div>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>{m.presences} / {m.count}</span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        {temAta ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            <CheckCircle2 size={12} /> Sim
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: '#f1f5f9', color: '#64748b' }}>
                            <XCircle size={12} /> Pendente
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          {ata?.anexoUrl && (
                            <a
                              href={ata.anexoUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#2563eb', transition: 'all 0.2s' }}
                              title={`Ver Anexo: ${ata.anexoNome || 'Documento'}`}
                            >
                              <FileText size={16} />
                            </a>
                          )}
                          <button
                            onClick={() => openPrintPdf(m.data, m.assunto)}
                            disabled={pending}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s', opacity: pending ? 0.5 : 1 }}
                            title="Visualizar Ata / PDF"
                          >
                            <Eye size={16} />
                          </button>
                          {isMasterOrAdmin && (
                            <>
                              <button
                                onClick={() => openAtaEditor(m.data, m.assunto)}
                                disabled={pending}
                                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#660099', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700, transition: 'all 0.2s', opacity: pending ? 0.5 : 1 }}
                              >
                                {temAta ? <Edit2 size={14} /> : <FileCode2 size={14} />} 
                                {temAta ? 'Editar' : 'Redigir'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmInfo({ data: m.data, assunto: m.assunto })}
                                disabled={pending}
                                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', transition: 'all 0.2s', opacity: pending ? 0.5 : 1 }}
                                title="Excluir Reunião"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                  {searchedMeetings.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                        Nenhuma reunião agendada encontrada para o período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* --- MODAL CONFIRMAÇÃO EXCLUSÃO --- */}
      {deleteConfirmInfo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#ef4444', margin: '0 0 16px 0' }}>Excluir Reunião?</h2>
            <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
              Você está prestes a excluir a reunião <b>{deleteConfirmInfo.assunto}</b>. Isso removerá as presenças de todos os técnicos e a ata atrelada. Deseja continuar?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button disabled={pending} onClick={() => setDeleteConfirmInfo(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button disabled={pending} onClick={handleDeleteLote} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL REDIGIR ATA E PRESENÇA --- */}
      {editingAta && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.8)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 1000, maxHeight: '95vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ background: '#660099', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Gestão do Evento (Ata & Presenças)</h2>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{editingAta.assunto} • {new Date(editingAta.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</div>
              </div>
              <button onClick={() => setEditingAta(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="reuniao-ata-body">
              
              {/* LADO ESQUERDO: REDIGIR ATA */}
              <div style={{ flex: 1, padding: 24, overflowY: 'auto', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#334155', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><FileCode2 size={16} /> Redigir Ata</h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <button type="button" onClick={() => execCmd('bold')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>B</button>
                  <button type="button" onClick={() => execCmd('italic')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', fontStyle: 'italic', cursor: 'pointer' }}>I</button>
                  <button type="button" onClick={() => execCmd('underline')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', textDecoration: 'underline', cursor: 'pointer' }}>U</button>
                  <div style={{ width: 1, background: '#cbd5e1', margin: '0 6px' }} />
                  <button type="button" onClick={() => execCmd('insertUnorderedList')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>• Lista</button>
                  <button type="button" onClick={() => execCmd('insertOrderedList')} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>1. Num</button>
                </div>

                <div
                  id="editor"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setAtaContent(e.currentTarget.innerHTML)}
                  dangerouslySetInnerHTML={{ __html: ataContent }}
                  style={{
                    flex: 1, minHeight: 250, padding: 16, borderRadius: 8, border: '1px solid #cbd5e1',
                    outline: 'none', fontSize: 14, color: '#334155', lineHeight: 1.6, overflowY: 'auto'
                  }}
                />

                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>Anexo</label>
                  {ataAnexoUrl || ataAnexoNome ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: '10px 16px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                      <FileText size={16} color="#660099" />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{ataAnexoNome}</div>
                        {ataAnexoUrl && <a href={ataAnexoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none' }}>Ver arquivo original</a>}
                      </div>
                      <button type="button" onClick={async () => {
                        if (ataAnexoUrl && editingAta) {
                          if (!confirm('Tem certeza que deseja excluir o anexo do servidor?')) return;
                          const res = await deleteAnexoAta(editingAta.data, editingAta.assunto, ataAnexoUrl);
                          if (res.success) {
                            setAtaAnexoUrl(''); setAtaAnexoNome(''); setAtaAnexoBase64(''); setAtaAnexoContentType('');
                            loadData();
                          } else {
                            alert(res.error || 'Erro ao excluir anexo');
                          }
                        } else {
                          setAtaAnexoUrl(''); setAtaAnexoNome(''); setAtaAnexoBase64(''); setAtaAnexoContentType('');
                        }
                      }} disabled={pending} style={{ padding: '6px 12px', borderRadius: 6, background: '#fee2e2', color: '#ef4444', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 11, opacity: pending ? 0.5 : 1 }}>Remover</button>
                    </div>
                  ) : (
                    <div>
                      <input type="file" id="ataAnexoInput" onChange={handleAnexoChange} style={{ display: 'none' }} />
                      <button type="button" onClick={() => document.getElementById('ataAnexoInput')?.click()} style={{ padding: '10px 16px', borderRadius: 8, border: '1px dashed #64748b', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', width: '100%' }}>Adicionar Arquivo (50MB max)</button>
                    </div>
                  )}
                </div>
              </div>

              {/* LADO DIREITO: LISTA DE PRESENÇA */}
              <div className="reuniao-ata-panel">
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#334155', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} /> Lançar Presenças</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Configure quem participou da reunião.</p>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>
                      <input type="checkbox" checked={showInativosModal} onChange={e => setShowInativosModal(e.target.checked)} />
                      Mostrar inativos
                    </label>
                  </div>
                </div>
                
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {tempPresencas.map((tp, idx) => {
                    const isRealRecord = !!tp.id;
                    if (!showInativosModal && tp.tecnico.ativo === false && !isRealRecord) return null;

                    const isPresente = tp.presenca === 'PRESENTE';
                    const isAusente = tp.presenca === 'AUSENTE';
                    const isAtrasado = tp.pontualidade === 'ATRASADO';
                    const isPontual = tp.pontualidade === 'PONTUAL';

                    const showPontualidade = isPresente;
                    const showJustificada = isAusente || (isPresente && isAtrasado);
                    const showObservacao = isAusente || (isPresente && isAtrasado);

                    return (
                    <div key={tp.tecnicoId} style={{ background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        {tp.tecnico.fotoUrl ? (
                          <img src={tp.tecnico.fotoUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                            {tp.tecnico.nome.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{tp.tecnico.nome}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button 
                            onClick={() => {
                              const newArr = [...tempPresencas];
                              newArr[idx].presenca = 'PRESENTE';
                              if (newArr[idx].pontualidade === 'NAO_SE_APLICA') newArr[idx].pontualidade = 'PONTUAL';
                              if (newArr[idx].pontualidade === 'PONTUAL') {
                                newArr[idx].justificada = 'NAO_SE_APLICA';
                                newArr[idx].motivo = '';
                              }
                              setTempPresencas(newArr);
                            }}
                            style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: tp.presenca === 'PRESENTE' ? '1px solid #10b981' : '1px solid #e2e8f0', background: tp.presenca === 'PRESENTE' ? 'rgba(16,185,129,0.1)' : '#fff', color: tp.presenca === 'PRESENTE' ? '#10b981' : '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          >
                            PRESENTE
                          </button>
                          <button 
                            onClick={() => {
                              const newArr = [...tempPresencas];
                              newArr[idx].presenca = 'AUSENTE';
                              newArr[idx].pontualidade = 'NAO_SE_APLICA';
                              setTempPresencas(newArr);
                            }}
                            style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: tp.presenca === 'AUSENTE' ? '1px solid #ef4444' : '1px solid #e2e8f0', background: tp.presenca === 'AUSENTE' ? 'rgba(239,68,68,0.1)' : '#fff', color: tp.presenca === 'AUSENTE' ? '#ef4444' : '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          >
                            AUSENTE
                          </button>
                        </div>
                        
                        {(showPontualidade || showJustificada) && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            {showPontualidade && (
                              <select 
                                value={tp.pontualidade}
                                onChange={(e) => {
                                  const newArr = [...tempPresencas];
                                  newArr[idx].pontualidade = e.target.value as any;
                                  if (e.target.value === 'PONTUAL') {
                                    newArr[idx].justificada = 'NAO_SE_APLICA';
                                    newArr[idx].motivo = '';
                                  }
                                  setTempPresencas(newArr);
                                }}
                                style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11, fontWeight: 600, color: '#334155' }}
                              >
                                <option value="PONTUAL">Pontual</option>
                                <option value="ATRASADO">Atrasado</option>
                              </select>
                            )}

                            {showJustificada && (
                              <select 
                                value={tp.justificada}
                                onChange={(e) => {
                                  const newArr = [...tempPresencas];
                                  newArr[idx].justificada = e.target.value as any;
                                  setTempPresencas(newArr);
                                }}
                                style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11, fontWeight: 600, color: '#334155' }}
                              >
                                <option value="NAO_SE_APLICA">Justificada? (N/A)</option>
                                <option value="SIM">Sim</option>
                                <option value="NAO">Não</option>
                              </select>
                            )}
                          </div>
                        )}
                        
                        {showObservacao && (
                          <input 
                            type="text" 
                            placeholder="Motivo / Observação..." 
                            value={tp.motivo || tp.observacao || ''}
                            onChange={(e) => {
                              const newArr = [...tempPresencas];
                              newArr[idx].motivo = e.target.value;
                              setTempPresencas(newArr);
                            }}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none' }}
                          />
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
              <button type="button" disabled={pending} onClick={() => setEditingAta(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" disabled={pending} onClick={handleSaveAta} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#660099', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                Salvar Evento Completo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Nova Reunião Lote */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#660099', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlusCircle color="#fff" size={20} />
                Agendar Reunião
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateLote} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Isso criará a estrutura da reunião. Depois, você poderá redigir a ata e lançar a presença dos técnicos individualmente.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Data da Reunião</label>
                  <input type="date" required value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Hora Início</label>
                  <input type="time" required value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Hora Fim</label>
                  <input type="time" value={meetingTimeFim} onChange={(e) => setMeetingTimeFim(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Assunto Principal</label>
                <input type="text" required value={meetingAssunto} onChange={(e) => setMeetingAssunto(e.target.value)} placeholder="Ex: Reunião de Alinhamento Mensal" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Recorrência</label>
                  <select value={meetingRecorrencia} onChange={(e) => setMeetingRecorrencia(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}>
                    <option value="none">Evento Único</option>
                    <option value="diaria">Diária</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
                {meetingRecorrencia !== 'none' && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Data Fim (Recorrência)</label>
                    <input type="date" required value={meetingDataFim} onChange={(e) => setMeetingDataFim(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input 
                  type="checkbox" 
                  id="includeInativos" 
                  checked={meetingIncludeInativos} 
                  onChange={(e) => setMeetingIncludeInativos(e.target.checked)} 
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                <label htmlFor="includeInativos" style={{ fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                  Incluir também os funcionários inativos na lista de presenças
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowCreateModal(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={pending} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#660099', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {pending && <Loader2 size={16} className="animate-spin" />} 
                  Agendar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  )
}
