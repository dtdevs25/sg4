'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import {
  FileText, Plus, Search, Calendar, ChevronRight, Filter,
  AlertTriangle, UploadCloud, Trash2, Camera, MapPin, Loader2, PlayCircle, Eye, Printer, Edit3
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import {
  getAtividadesRelatorio, addAtividade, deleteAtividade, updateAtividade, uploadFotoRelatorio, getAtividadesForPrint
} from '@/app/actions/relatorios'
import { optimizeTextWithAI } from '@/app/actions/ai'
import { getTecnicos } from '@/app/actions/tecnicos'
import { gerarPdfRelatorio } from '@/app/utils/generateRelatorioPdf'

const MES_MAP: Record<string, string> = {
  jan: 'JANEIRO', fev: 'FEVEREIRO', mar: 'MARCO', abr: 'ABRIL', mai: 'MAIO', jun: 'JUNHO',
  jul: 'JULHO', ago: 'AGOSTO', set: 'SETEMBRO', out: 'OUTUBRO', nov: 'NOVEMBRO', dez: 'DEZEMBRO'
}

const MONTHS_LIST = [
  { key: 'jan', label: 'Jan' }, { key: 'fev', label: 'Fev' },
  { key: 'mar', label: 'Mar' }, { key: 'abr', label: 'Abr' },
  { key: 'mai', label: 'Mai' }, { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' }, { key: 'ago', label: 'Ago' },
  { key: 'set', label: 'Set' }, { key: 'out', label: 'Out' },
  { key: 'nov', label: 'Nov' }, { key: 'dez', label: 'Dez' }
]

export default function RelatoriosAtividadesPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [selectedMonths, setSelectedMonths] = useState<string[]>(['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const [todasAtividades, setTodasAtividades] = useState<any[]>([])
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pending, startTransition] = useTransition()
  const [aiLoading, setAiLoading] = useState(false)

  // Modals
  const [showNovaAtividade, setShowNovaAtividade] = useState(false)
  const [showEditModal, setShowEditModal] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null)
  const [showGerarPdfModal, setShowGerarPdfModal] = useState(false)

  // Forms
  const [formAtiv, setFormAtiv] = useState({ tecnicoId: '', data: '', empresa: '', projeto: '', local: '', cidadeUf: '', descricao: '', fotoBase64: '', fileName: '', contentType: '' })
  const [formEdit, setFormEdit] = useState({ data: '', empresa: '', projeto: '', local: '', cidadeUf: '', descricao: '', fotoBase64: '', fileName: '', contentType: '' })
  const [formPdf, setFormPdf] = useState({ empresa: '', tecnicoId: '', mes: new Date().getMonth() + 1 })

  useEffect(() => {
    loadData()
  }, [selectedYear])

  useEffect(() => {
    if (role) {
      getTecnicos().then(res => {
        if (res.success && res.data) {
          setTecnicos(res.data)
        }
      })
    }
  }, [role])

  async function loadData() {
    setLoading(true)
    try {
      // Busca todas do ano para filtrar localmente pelos meses selecionados
      const promises = Array.from({ length: 12 }).map((_, i) => getAtividadesRelatorio(i + 1, selectedYear))
      const results = await Promise.all(promises)
      const all = results.flat()
      setTodasAtividades(all)
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
      setTodasAtividades([])
    } finally {
      setLoading(false)
    }
  }

  // Filtragem local baseada nos meses selecionados
  const atividades = todasAtividades.filter(a => {
    const dataAtiv = new Date(a.data)
    const monthIndex = dataAtiv.getUTCMonth()
    const monthKey = MONTHS_LIST[monthIndex].key
    return selectedMonths.includes(monthKey)
  })

  const filteredAtividades = atividades.filter(a => {
    const term = search.toLowerCase()
    return (a.tecnico?.nome?.toLowerCase() || '').includes(term) ||
           (a.empresa?.toLowerCase() || '').includes(term) ||
           (a.projeto?.toLowerCase() || '').includes(term) ||
           (a.local?.toLowerCase() || '').includes(term)
  })

  // Extract unique companies for the PDF generation dropdown
  const empresasDisponiveis = Array.from(new Set(todasAtividades.map(a => a.empresa)))
  const totalAtividades = atividades.length
  const empresasAtendidas = Array.from(new Set(atividades.map(a => a.empresa))).length

  const clickTimeout = useRef<NodeJS.Timeout | null>(null)
  function handleMonthClick(m: string) {
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current)
      clickTimeout.current = null
      setSelectedMonths([m])
    } else {
      clickTimeout.current = setTimeout(() => {
        clickTimeout.current = null
        setSelectedMonths(prev => {
          if (prev.length === 1 && prev.includes(m)) {
            return MONTHS_LIST.map(x => x.key)
          }
          if (prev.includes(m)) return prev.filter(x => x !== m)
          return [...prev, m]
        })
      }, 250)
    }
  }

  // --- Handlers ---
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, setForm: Function) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm((prev: any) => ({
        ...prev,
        fotoBase64: ev.target?.result as string,
        fileName: file.name,
        contentType: file.type
      }))
    }
    reader.readAsDataURL(file)
  }

  async function handleAddAtividade(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      let fotoUrl = undefined
      if (formAtiv.fotoBase64) {
        const up = await uploadFotoRelatorio(formAtiv.fotoBase64, formAtiv.fileName, formAtiv.contentType)
        if (up.success) fotoUrl = up.url
        else return alert('Erro no upload da foto')
      }

      const tId = role === 'TST' ? (session?.user as any).tecnicoId : formAtiv.tecnicoId
      if (!tId) return alert('Selecione o técnico')

      const res = await addAtividade({
        tecnicoId: tId,
        data: new Date(formAtiv.data + 'T12:00:00Z'),
        empresa: formAtiv.empresa,
        projeto: formAtiv.projeto,
        local: formAtiv.local,
        cidadeUf: formAtiv.cidadeUf,
        descricao: formAtiv.descricao,
        fotoUrl
      })

      if (res.success) {
        setShowNovaAtividade(false)
        setFormAtiv({ tecnicoId: '', data: '', empresa: '', projeto: '', local: '', cidadeUf: '', descricao: '', fotoBase64: '', fileName: '', contentType: '' })
        loadData()
      } else {
        alert(res.error)
      }
    })
  }

  async function handleEditAtividade(e: React.FormEvent) {
    e.preventDefault()
    if (!showEditModal) return

    startTransition(async () => {
      let fotoUrl = undefined
      if (formEdit.fotoBase64) {
        const up = await uploadFotoRelatorio(formEdit.fotoBase64, formEdit.fileName, formEdit.contentType)
        if (up.success) fotoUrl = up.url
        else return alert('Erro no upload da nova foto')
      }

      const res = await updateAtividade(showEditModal.id, {
        data: new Date(formEdit.data + 'T12:00:00Z'),
        empresa: formEdit.empresa,
        projeto: formEdit.projeto,
        local: formEdit.local,
        cidadeUf: formEdit.cidadeUf,
        descricao: formEdit.descricao,
        fotoUrl: fotoUrl
      })

      if (res.success) {
        setShowEditModal(null)
        loadData()
      } else {
        alert(res.error)
      }
    })
  }

  async function handleDeleteConfirm() {
    if (!showDeleteModal) return
    startTransition(async () => {
      const res = await deleteAtividade(showDeleteModal)
      if (res.success) loadData()
      else alert(res.error)
      setShowDeleteModal(null)
    })
  }

  function openEdit(a: any) {
    setFormEdit({
      data: new Date(a.data).toISOString().split('T')[0],
      empresa: a.empresa,
      projeto: a.projeto,
      local: a.local,
      cidadeUf: a.cidadeUf,
      descricao: a.descricao,
      fotoBase64: '', fileName: '', contentType: ''
    })
    setShowEditModal(a)
  }

  async function handleOptimizeText(isEdit: boolean) {
    const textToOptimize = isEdit ? formEdit.descricao : formAtiv.descricao
    if (!textToOptimize || textToOptimize.trim().length === 0) return

    setAiLoading(true)
    const res = await optimizeTextWithAI(textToOptimize)
    setAiLoading(false)

    if (res.success && res.text) {
      if (isEdit) {
        setFormEdit(p => ({...p, descricao: res.text}))
      } else {
        setFormAtiv(p => ({...p, descricao: res.text}))
      }
    } else {
      alert(res.error || 'Erro ao otimizar o texto.')
    }
  }

  async function handleGeneratePdf() {
    if (!formPdf.empresa || (role !== 'TST' && !formPdf.tecnicoId)) {
      alert('Selecione todos os campos obrigatórios')
      return
    }
    
    try {
      setLoading(true)
      const data = await getAtividadesForPrint(formPdf.mes, selectedYear, formPdf.empresa, formPdf.tecnicoId)
      
      let elaborador = 'Não Identificado'
      if (role === 'TST') {
        elaborador = (session?.user as any)?.nome || 'TST'
      } else {
        const tecnicoData = tecnicos.find(t => t.id === formPdf.tecnicoId)
        if (tecnicoData) elaborador = tecnicoData.nome
      }

      await gerarPdfRelatorio(data, {
        mes: formPdf.mes,
        ano: selectedYear,
        empresa: formPdf.empresa,
        elaborador
      })

      setShowGerarPdfModal(false)
    } catch (err) {
      console.error(err)
      alert('Erro ao gerar o PDF.')
    } finally {
      setLoading(false)
    }
  }

  // --- Render ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      
      {/* HEADER */}
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
            <FileText color="#660099" size={22} />
            Lançamento de Atividades (Relatórios)
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => setShowGerarPdfModal(true)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.3)', fontSize: 13 }}>
            <Printer size={16} /> Gerar PDF
          </button>
          <button onClick={() => setShowNovaAtividade(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)', fontSize: 13 }}>
            <Plus size={16} /> Lançar Atividade
          </button>
        </div>
      </div>

      {/* DASHBOARD CONSOLIDADO & FILTROS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        
        {/* FILTROS DE MESES E ANO */}
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Selecionar Período</span>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none', cursor: 'pointer' }}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
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
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                      userSelect: 'none'
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
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                      userSelect: 'none'
                    }}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* CARD CONSOLIDADO */}
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Consolidado do Período</span>
            <span style={{ background: 'rgba(102,0,153,0.1)', color: '#660099', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
              {selectedMonths.length} MÊS(ES)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{totalAtividades}</span>
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>atividades</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
            <span>Empresas Atendidas: <b style={{ color: '#1e293b' }}>{empresasAtendidas}</b></span>
          </div>
        </div>
      </div>

      {/* TABELA GERAL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Search Bar matching other modules */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative', width: 300 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Filtrar atividades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <tr>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>DATA</th>
                  {(role === 'MASTER' || role === 'ADMIN') && (
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>TÉCNICO</th>
                  )}
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>EMPRESA / PROJETO</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>LOCAL / DESCRIÇÃO</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' }}>FOTO</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center' }}><Loader2 className="animate-spin inline" color="#660099" size={32} /></td></tr>
              ) : filteredAtividades.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Nenhuma atividade registrada.</td></tr>
              ) : filteredAtividades.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    {new Date(a.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                  </td>
                  {(role === 'MASTER' || role === 'ADMIN') && (
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#660099' }}>
                          {a.tecnico?.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{a.tecnico?.nome}</span>
                      </div>
                    </td>
                  )}
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{a.empresa}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{a.projeto}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#660099', marginBottom: 4 }}><MapPin size={12} className="inline mr-1"/> {a.local} - {a.cidadeUf}</div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, maxWidth: 400 }}>{a.descricao}</div>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    {a.fotoUrl ? (
                      <img src={a.fotoUrl.replace('//sg4-relatorios', '/sg4-relatorios')} alt="Foto" onClick={() => setShowPhotoModal(a.fotoUrl.replace('//sg4-relatorios', '/sg4-relatorios'))} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', margin: '0 auto', border: '1px solid #e2e8f0' }} />
                    ) : (
                      <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '4px 8px', borderRadius: 12, fontWeight: 700, textTransform: 'uppercase' }}>S/F</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button onClick={() => openEdit(a)} style={{ background: 'transparent', border: 'none', color: '#660099', cursor: 'pointer', padding: 4 }} title="Editar">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => setShowDeleteModal(a.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* MODAL NOVA ATIVIDADE */}
      {showNovaAtividade && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ 
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600,
            display: 'flex', flexDirection: 'column',
            maxHeight: '90vh', overflow: 'hidden'
          }}>
            {/* Modal Header Fixo Roxo */}
            <div style={{
              background: '#660099', padding: '20px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, zIndex: 10
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Lançar Nova Atividade</h2>
              <button onClick={() => setShowNovaAtividade(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>X</button>
            </div>
            
            {/* Modal Body com Scroll */}
            <div style={{ padding: 24, overflowY: 'auto' }}>
              <form onSubmit={handleAddAtividade} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {(role === 'MASTER' || role === 'ADMIN') && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Técnico Responsável</label>
                    <select required value={formAtiv.tecnicoId} onChange={(e) => setFormAtiv(p => ({...p, tecnicoId: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                      <option value="">Selecione...</option>
                      {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Empresa Cliente</label>
                    <input required placeholder="Ex: Vivo S/A" value={formAtiv.empresa} onChange={e => setFormAtiv(p => ({...p, empresa: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Projeto / Área</label>
                    <input required placeholder="Ex: Infraestrutura" value={formAtiv.projeto} onChange={e => setFormAtiv(p => ({...p, projeto: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Data da Atividade</label>
                    <input type="date" required value={formAtiv.data} onChange={e => setFormAtiv(p => ({...p, data: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Cidade / UF</label>
                    <input required placeholder="Ex: João Pessoa/PB" value={formAtiv.cidadeUf} onChange={e => setFormAtiv(p => ({...p, cidadeUf: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Local (Nome do Prédio/Site)</label>
                  <input required placeholder="Ex: Base Vivo, Cristo Redentor" value={formAtiv.local} onChange={e => setFormAtiv(p => ({...p, local: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 700 }}>Descrição / Relato da Atividade</label>
                    <button 
                      type="button" 
                      onClick={() => handleOptimizeText(false)}
                      disabled={aiLoading}
                      style={{ 
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', 
                        borderRadius: 6, border: 'none', background: '#f3e8ff', color: '#7e22ce',
                        cursor: aiLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 
                      }}
                    >
                      {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <span>✨ Corrigir com IA</span>}
                    </button>
                  </div>
                  <textarea required rows={3} placeholder="O que foi feito?" value={formAtiv.descricao} onChange={e => setFormAtiv(p => ({...p, descricao: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', resize: 'none' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Registro Fotográfico (Opcional)</label>
                  {formAtiv.fotoBase64 ? (
                    <div style={{ marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                      <img src={formAtiv.fotoBase64} alt="Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                      <button type="button" onClick={() => setFormAtiv(p => ({...p, fotoBase64: ''}))} style={{ background: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: 6, border: 'none', fontWeight: 600 }}>Remover</button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => document.getElementById('fotoUploadInput')?.click()}
                      style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: '24px 20px', cursor: 'pointer', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                    >
                      <UploadCloud color="#64748b" size={28} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Clique para escolher uma imagem</span>
                    </div>
                  )}
                  <input id="fotoUploadInput" type="file" accept="image/*" onChange={e => handleFileChange(e, setFormAtiv)} style={{ display: 'none' }} />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button type="button" onClick={() => setShowNovaAtividade(false)} style={{ flex: 1, padding: '12px', background: '#e2e8f0', color: '#475569', borderRadius: 8, fontWeight: 700, border: 'none' }}>Cancelar</button>
                  <button type="submit" disabled={pending} style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', opacity: pending ? 0.7 : 1 }}>
                    {pending ? 'Salvando...' : 'Salvar Atividade'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR ATIVIDADE */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ 
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600,
            display: 'flex', flexDirection: 'column',
            maxHeight: '90vh', overflow: 'hidden'
          }}>
            <div style={{
              background: '#660099', padding: '20px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, zIndex: 10
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Editar Atividade</h2>
              <button onClick={() => setShowEditModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16, fontWeight: 'bold' }}>X</button>
            </div>
            
            <div style={{ padding: 24, overflowY: 'auto' }}>
              <form onSubmit={handleEditAtividade} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Empresa Cliente</label>
                  <input required value={formEdit.empresa} onChange={e => setFormEdit(p => ({...p, empresa: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Projeto / Área</label>
                  <input required value={formEdit.projeto} onChange={e => setFormEdit(p => ({...p, projeto: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Data da Atividade</label>
                  <input type="date" required value={formEdit.data} onChange={e => setFormEdit(p => ({...p, data: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Cidade / UF</label>
                  <input required value={formEdit.cidadeUf} onChange={e => setFormEdit(p => ({...p, cidadeUf: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Local</label>
                <input required value={formEdit.local} onChange={e => setFormEdit(p => ({...p, local: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Descrição</label>
                  <button 
                    type="button" 
                    onClick={() => handleOptimizeText(true)}
                    disabled={aiLoading}
                    style={{ 
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', 
                      borderRadius: 6, border: 'none', background: '#f3e8ff', color: '#7e22ce',
                      cursor: aiLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 
                    }}
                  >
                    {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <span>✨ Corrigir com IA</span>}
                  </button>
                </div>
                <textarea required rows={3} value={formEdit.descricao} onChange={e => setFormEdit(p => ({...p, descricao: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', resize: 'none' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Alterar Foto (Opcional)</label>
                {showEditModal.fotoUrl && !formEdit.fotoBase64 && (
                  <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={showEditModal.fotoUrl.replace('//sg4-relatorios', '/sg4-relatorios')} alt="Atual" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Imagem Atual</span>
                      <button type="button" onClick={() => { const input = document.getElementById('editAtivPic') as HTMLInputElement; input?.click() }} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Trocar Imagem</button>
                    </div>
                  </div>
                )}
                {formEdit.fotoBase64 && (
                  <div style={{ marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <img src={formEdit.fotoBase64} alt="Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                    <button type="button" onClick={() => setFormEdit(p => ({...p, fotoBase64: ''}))} style={{ background: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: 6, border: 'none', fontWeight: 600 }}>Remover</button>
                  </div>
                )}
                {(!showEditModal.fotoUrl && !formEdit.fotoBase64) && (
                   <div 
                     onClick={() => document.getElementById('editAtivPic')?.click()}
                     style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: '24px 20px', cursor: 'pointer', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                   >
                     <UploadCloud color="#64748b" size={28} />
                     <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Clique para escolher nova imagem</span>
                   </div>
                )}
                <input id="editAtivPic" type="file" accept="image/*" onChange={e => handleFileChange(e, setFormEdit)} style={{ display: 'none' }} />
              </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button type="button" disabled={pending} onClick={() => setShowEditModal(null)} style={{ flex: 1, padding: '12px', background: '#e2e8f0', color: '#475569', borderRadius: 8, fontWeight: 700, border: 'none' }}>Cancelar</button>
                  <button type="submit" disabled={pending} style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', opacity: pending ? 0.7 : 1 }}>
                    {pending ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GERAR PDF */}
      {showGerarPdfModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Printer color="#22c55e" /> Gerar Relatório PDF</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {(role === 'MASTER' || role === 'ADMIN') && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>De qual técnico?</label>
                  <select value={formPdf.tecnicoId} onChange={(e) => setFormPdf(p => ({...p, tecnicoId: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                    <option value="">Selecione um técnico...</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>De qual Mês?</label>
                <select value={formPdf.mes} onChange={(e) => setFormPdf(p => ({...p, mes: Number(e.target.value)}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                  {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>De qual Empresa?</label>
                <select value={formPdf.empresa} onChange={(e) => setFormPdf(p => ({...p, empresa: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                  <option value="">Selecione a empresa...</option>
                  {empresasDisponiveis.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                {empresasDisponiveis.length === 0 && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Nenhuma empresa encontrada no sistema.</p>}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button onClick={() => setShowGerarPdfModal(false)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button 
                  onClick={handleGeneratePdf}
                  disabled={loading}
                  style={{ flex: 1, padding: 12, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Gerar PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertTriangle size={32} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 10 }}>Confirmar Exclusão</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>Ação irreversível.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button disabled={pending} onClick={() => setShowDeleteModal(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Cancelar</button>
              <button disabled={pending} onClick={handleDeleteConfirm} style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pending ? <Loader2 className="animate-spin" size={18} /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Foto */}
      {showPhotoModal && (
        <div onClick={() => setShowPhotoModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <img src={showPhotoModal} alt="Foto" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}
