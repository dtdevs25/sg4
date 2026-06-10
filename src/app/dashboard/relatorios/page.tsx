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
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modals
  const [showNovaAtividade, setShowNovaAtividade] = useState(false)
  const [showEditModal, setShowEditModal] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null)
  const [showGerarPdfModal, setShowGerarPdfModal] = useState(false)
  const [showTecnicoDropdown, setShowTecnicoDropdown] = useState(false)
  const [showGraficoModal, setShowGraficoModal] = useState(false)
  const [selectedMesGrafico, setSelectedMesGrafico] = useState<number | null>(null)

  // Forms
  const [formAtiv, setFormAtiv] = useState({ tecnicoId: '', data: '', empresa: 'Telefônica Brasil S.A', projeto: 'VIVO', local: '', cidadeUf: '', descricao: '', fotoBase64: '', fileName: '', contentType: '' })
  const [formEdit, setFormEdit] = useState({ data: '', empresa: '', projeto: '', local: '', cidadeUf: '', descricao: '', fotoBase64: '', fileName: '', contentType: '' })
  const [formPdf, setFormPdf] = useState({ empresa: '', tecnicoId: '', mes: new Date().getMonth() + 1, ano: new Date().getFullYear() })

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
  }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedMonths, selectedYear])

  const totalPages = Math.ceil(filteredAtividades.length / itemsPerPage)
  const paginatedAtividades = filteredAtividades.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Extract unique companies for the PDF generation dropdown
  const empresasDisponiveis = Array.from(new Set(todasAtividades.map(a => a.empresa)))
  const totalAtividades = filteredAtividades.length
  const percentualDoTotal = todasAtividades.length > 0 ? Math.round((totalAtividades / todasAtividades.length) * 100) : 0

  // Aplica o mesmo filtro de busca no total do ano (para o gráfico respeitar a pessoa filtrada)
  const todasFiltradas = search.trim()
    ? todasAtividades.filter(a => {
        const term = search.toLowerCase()
        return (a.tecnico?.nome?.toLowerCase() || '').includes(term) ||
               (a.empresa?.toLowerCase() || '').includes(term) ||
               (a.projeto?.toLowerCase() || '').includes(term) ||
               (a.local?.toLowerCase() || '').includes(term)
      })
    : todasAtividades

  // Dados para o gráfico mês a mês (respeitando filtro de busca)
  const dadosPorMes = MONTHS_LIST.map((m, i) => ({
    label: m.label,
    count: todasFiltradas.filter(a => new Date(a.data).getUTCMonth() === i).length
  }))
  const maxContagem = Math.max(...dadosPorMes.map(d => d.count), 1)


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
        setFormAtiv({ tecnicoId: '', data: '', empresa: 'Telefônica Brasil S.A', projeto: 'VIVO', local: '', cidadeUf: '', descricao: '', fotoBase64: '', fileName: '', contentType: '' })
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
    if (role !== 'TST' && !formPdf.tecnicoId) {
      alert('Selecione todos os campos obrigatórios')
      return
    }
    
    try {
      setLoading(true)
      const data = await getAtividadesForPrint(formPdf.mes, formPdf.ano, 'VIVO', formPdf.tecnicoId)
      
      let elaborador = 'Não Identificado'
      if (role === 'TST') {
        elaborador = (session?.user as any)?.nome || 'TST'
      } else {
        const tecnicoData = tecnicos.find(t => t.id === formPdf.tecnicoId)
        if (tecnicoData) elaborador = tecnicoData.nome
      }

      await gerarPdfRelatorio(data, {
        mes: formPdf.mes,
        ano: formPdf.ano,
        empresa: 'VIVO',
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
    <div className="flex flex-col gap-[24px] pb-[40px]">
      
      {/* HEADER */}
      <div className="bg-white rounded-[10px] border border-[#f1f5f9] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-[14px_20px] flex items-center justify-between flex-wrap gap-[16px]">
        <div className="flex items-baseline gap-[10px]">
          <h1 className="text-[20px] font-extrabold text-[#1e293b] m-0 flex items-center gap-[8px]">
            <FileText color="#660099" size={22} />
            Lançamento de Atividades (Relatórios)
          </h1>
        </div>
        <div className="flex gap-[12px] items-center w-full md:w-auto overflow-x-auto">
          <button onClick={() => setShowGerarPdfModal(true)} className="bg-[#22c55e] text-white border-none p-[8px_16px] rounded-[8px] font-bold flex items-center gap-[8px] cursor-pointer shadow-[0_4px_12px_rgba(34,197,94,0.3)] text-[13px] whitespace-nowrap">
            <Printer size={16} /> Gerar PDF
          </button>
          <button onClick={() => setShowNovaAtividade(true)} className="bg-[#3b82f6] text-white border-none p-[8px_16px] rounded-[8px] font-bold flex items-center gap-[8px] cursor-pointer shadow-[0_4px_12px_rgba(59,130,246,0.3)] text-[13px] whitespace-nowrap">
            <Plus size={16} /> Lançar Atividade
          </button>
        </div>
      </div>

      {/* DASHBOARD CONSOLIDADO & FILTROS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
        
        {/* FILTROS DE MESES E ANO */}
        <div className="bg-white border border-[#f1f5f9] rounded-[10px] p-[20px] flex flex-col gap-[12px] lg:col-span-2">
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
        <div
          onClick={() => setShowGraficoModal(true)}
          className="bg-white border border-[#f1f5f9] rounded-[10px] p-[16px_20px] flex flex-col justify-center cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(102,0,153,0.15)]"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Consolidado do Período</span>
            <span style={{ background: 'rgba(102,0,153,0.1)', color: '#660099', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
              {selectedMonths.length} MÊS(ES)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{totalAtividades}</span>
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>atividades</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${percentualDoTotal}%`, height: '100%', background: 'linear-gradient(90deg, #660099, #9333ea)', borderRadius: 99, transition: 'width 0.5s' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#660099', whiteSpace: 'nowrap' }}>{percentualDoTotal}% do ano</span>
          </div>
          <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, fontWeight: 600 }}>📊 Clique para ver gráfico mês a mês</span>
        </div>
      </div>

      {/* TABELA GERAL */}
      <div className="flex flex-col gap-[16px]">
        {/* Search Bar matching other modules */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-white p-[12px_20px] rounded-[10px] border border-[#f1f5f9] gap-[16px]">
          <div className="relative w-full md:w-[300px]">
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

        <div className="bg-white border border-[#f1f5f9] rounded-[10px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-left min-w-[1000px]">
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
              ) : paginatedAtividades.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Nenhuma atividade registrada.</td></tr>
              ) : paginatedAtividades.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    {new Date(a.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                  </td>
                  {(role === 'MASTER' || role === 'ADMIN') && (
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {a.tecnico?.fotoUrl ? (
                          <img src={a.tecnico.fotoUrl} alt={a.tecnico.nome} style={{ width: 56, height: 56, flexShrink: 0, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e9d5ff' }} />
                        ) : (
                          <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #660099, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                            {a.tecnico?.nome.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{a.tecnico?.nome}</span>
                          {a.tecnico?.admissao && (
                            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Admissão: {new Date(a.tecnico.admissao).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
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
                      <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '4px 8px', borderRadius: 12, fontWeight: 700, textTransform: 'uppercase' }}>NÃO SE APLICA</span>
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
        
        {/* PAGINATION CONTROLS */}
        {filteredAtividades.length > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between p-[16px_20px] bg-[#f8fafc] border-t border-[#f1f5f9] gap-[16px]">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                Mostrando de {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredAtividades.length)} de {filteredAtividades.length} atividades
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', cursor: 'pointer' }}
              >
                <option value={10}>10 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
            
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f1f5f9' : '#fff', color: currentPage === 1 ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 700, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f1f5f9' : '#fff', color: currentPage === totalPages ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 700, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* MODAL NOVA ATIVIDADE */}
      {showNovaAtividade && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px] p-[20px]">
          <div className="bg-white rounded-[16px] w-full max-w-[600px] flex flex-col max-h-[90vh] overflow-hidden">
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
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Técnico Responsável</label>
                    <div
                      onClick={() => setShowTecnicoDropdown(v => !v)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${showTecnicoDropdown ? '#660099' : '#cbd5e1'}`, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', gap: 10, boxShadow: showTecnicoDropdown ? '0 0 0 3px rgba(102,0,153,0.1)' : 'none', transition: 'all 0.2s' }}
                    >
                      {formAtiv.tecnicoId ? (() => {
                        const t = tecnicos.find(x => x.id === formAtiv.tecnicoId)
                        return t ? (<>{t.fotoUrl ? (<img src={t.fotoUrl} alt={t.nome} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />) : (<div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#660099,#9333ea)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff', flexShrink:0 }}>{t.nome.substring(0,2).toUpperCase()}</div>)}<span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{t.nome}</span></>) : null
                      })() : (<span style={{ fontSize: 13, color: '#94a3b8' }}>Selecione um técnico...</span>)}
                      <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 12 }}>{showTecnicoDropdown ? '▲' : '▼'}</span>
                    </div>
                    {showTecnicoDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, maxHeight: 240, overflowY: 'auto' }}>
                        {tecnicos.filter(t => t.ativo).map(t => (
                          <div key={t.id} onClick={() => { setFormAtiv(p => ({...p, tecnicoId: t.id})); setShowTecnicoDropdown(false) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: formAtiv.tecnicoId === t.id ? 'rgba(102,0,153,0.06)' : '#fff', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(102,0,153,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = formAtiv.tecnicoId === t.id ? 'rgba(102,0,153,0.06)' : '#fff')}
                          >
                            {t.fotoUrl ? (<img src={t.fotoUrl} alt={t.nome} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e9d5ff', flexShrink: 0 }} />) : (<div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#660099,#9333ea)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#fff', flexShrink:0 }}>{t.nome.substring(0,2).toUpperCase()}</div>)}
                            <div><div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{t.nome}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{t.cargo || 'Técnico de Segurança'}</div></div>
                            {formAtiv.tecnicoId === t.id && <span style={{ marginLeft:'auto', color:'#660099', fontWeight:800 }}>✓</span>}
                          </div>
                        ))}
                        {tecnicos.filter(t => t.ativo).length === 0 && (<div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Nenhum técnico ativo encontrado.</div>)}
                      </div>
                    )}
                    <input type="hidden" required value={formAtiv.tecnicoId} onChange={() => {}} />
                  </div>
                )}

                {role === 'TST' && tecnicos.length > 0 && (() => {
                  const t = tecnicos[0]
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(102,0,153,0.04)', border: '1px solid rgba(102,0,153,0.15)', borderRadius: 10 }}>
                      {t.fotoUrl ? (
                        <img src={t.fotoUrl} alt={t.nome} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e9d5ff', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#660099,#9333ea)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#fff', flexShrink:0 }}>{t.nome.substring(0,2).toUpperCase()}</div>
                      )}
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{t.nome}</div>
                        <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>{t.cargo || 'Técnico de Segurança do Trabalho'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Atividade será registrada em seu nome</div>
                      </div>
                    </div>
                  )
                })()}

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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button type="button" onClick={() => document.getElementById('fotoGaleriaInput')?.click()}
                        style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: '18px 12px', cursor: 'pointer', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                      >
                        <UploadCloud color="#64748b" size={24} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Galeria</span>
                      </button>
                      <button type="button" onClick={() => document.getElementById('fotoCameraInput')?.click()}
                        style={{ border: '2px dashed #7c3aed', borderRadius: 8, padding: '18px 12px', cursor: 'pointer', background: 'rgba(124,58,237,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                      >
                        <Camera color="#7c3aed" size={24} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed' }}>Câmera</span>
                      </button>
                    </div>
                  )}
                  <input id="fotoGaleriaInput" type="file" accept="image/*" onChange={e => handleFileChange(e, setFormAtiv)} style={{ display: 'none' }} />
                  <input id="fotoCameraInput" type="file" accept="image/*" capture="environment" onChange={e => handleFileChange(e, setFormAtiv)} style={{ display: 'none' }} />
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
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px] p-[20px]">
          <div className="bg-white rounded-[16px] w-full max-w-[600px] flex flex-col max-h-[90vh] overflow-hidden">
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
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px] p-[20px]">
          <div className="bg-white rounded-[16px] w-full max-w-[450px] flex flex-col max-h-[90vh] overflow-hidden">
            <div style={{
              background: '#660099', padding: '20px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, zIndex: 10
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Gerar Relatório PDF</h2>
              <button onClick={() => setShowGerarPdfModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16, fontWeight: 'bold' }}>X</button>
            </div>
            
            <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {(role === 'MASTER' || role === 'ADMIN') && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>De qual técnico?</label>
                  <select value={formPdf.tecnicoId} onChange={(e) => setFormPdf(p => ({...p, tecnicoId: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                    <option value="">Selecione um técnico...</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>De qual Mês?</label>
                  <select value={formPdf.mes} onChange={(e) => setFormPdf(p => ({...p, mes: Number(e.target.value)}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                    {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>De qual Ano?</label>
                  <select value={formPdf.ano} onChange={(e) => setFormPdf(p => ({...p, ano: Number(e.target.value)}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px] p-[20px]">
          <div className="bg-white rounded-[16px] w-full max-w-[400px] p-[24px] text-center">
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
        <div onClick={() => setShowPhotoModal(null)} className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(0,0,0,0.8)] backdrop-blur-[4px] p-[20px] cursor-pointer">
          <img src={showPhotoModal} alt="Foto" className="max-w-full max-h-[90vh] rounded-[8px] object-contain cursor-default" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Modal Gráfico Mês a Mês */}
      {showGraficoModal && (() => {
        // Dados do pizza (quando um mês está selecionado)
        const mesAtividades = selectedMesGrafico !== null
          ? todasFiltradas.filter(a => new Date(a.data).getUTCMonth() === selectedMesGrafico)
          : []
        const totalMes = mesAtividades.length
        const byTecnico = mesAtividades.reduce((acc: Record<string, number>, a: any) => {
          const nome = a.tecnico?.nome || 'Sem técnico'
          acc[nome] = (acc[nome] || 0) + 1
          return acc
        }, {})
        const slices = Object.entries(byTecnico).sort((a, b) => b[1] - a[1])
        const COLORS = ['#660099','#9333ea','#06b6d4','#f59e0b','#ef4444','#22c55e','#3b82f6','#ec4899','#8b5cf6','#14b8a6']

        // Função para calcular arcos SVG do gráfico de pizza
        const buildPie = () => {
          if (totalMes === 0) return []
          let cumAngle = -Math.PI / 2
          const cx = 100, cy = 100, r = 90
          return slices.map(([nome, count], i) => {
            const angle = (count / totalMes) * 2 * Math.PI
            const x1 = cx + r * Math.cos(cumAngle)
            const y1 = cy + r * Math.sin(cumAngle)
            cumAngle += angle
            const x2 = cx + r * Math.cos(cumAngle)
            const y2 = cy + r * Math.sin(cumAngle)
            const largeArc = angle > Math.PI ? 1 : 0
            const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
            return { d, color: COLORS[i % COLORS.length], nome, count, pct: Math.round((count / totalMes) * 100) }
          })
        }
        const pieSlices = buildPie()

        return (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px] p-[20px]">
            <div className="bg-white rounded-[16px] w-full max-w-[700px] flex flex-col max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div style={{ background: '#660099', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>
                      {selectedMesGrafico !== null
                        ? `🍕 ${MONTHS_LIST[selectedMesGrafico].label} — Por Técnico`
                        : '📊 Evolução Mês a Mês'}
                    </h2>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                      {selectedMesGrafico !== null
                        ? `${totalMes} atividade${totalMes !== 1 ? 's' : ''} em ${MONTHS_LIST[selectedMesGrafico].label}/${selectedYear}`
                        : `Atividades por mês em ${selectedYear}`}
                    </span>
                  </div>
                </div>
                <button onClick={() => { setShowGraficoModal(false); setSelectedMesGrafico(null) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 20, fontWeight: 'bold', lineHeight: 1 }}>×</button>
              </div>

              {/* Chart Body */}
              <div style={{ padding: 24, overflowY: 'auto' }}>

                {selectedMesGrafico === null ? (
                  // === BARRAS ===
                  <>
                    <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textAlign: 'center', marginBottom: 12, marginTop: 0 }}>Clique em uma barra para ver o detalhamento por técnico</p>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, marginBottom: 8 }}>
                      {dadosPorMes.map((d, i) => {
                        const isFiltered = selectedMonths.includes(MONTHS_LIST[i].key)
                        const barH = maxContagem > 0 ? Math.round((d.count / maxContagem) * 180) : 0
                        return (
                          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                            onClick={() => d.count > 0 && setSelectedMesGrafico(i)}
                          >
                            <span style={{ fontSize: 10, fontWeight: 800, color: d.count > 0 ? '#660099' : '#cbd5e1' }}>{d.count > 0 ? d.count : ''}</span>
                            <div style={{
                              width: '100%', height: barH || 4, minHeight: 4,
                              background: isFiltered ? 'linear-gradient(180deg,#9333ea,#660099)' : '#e2e8f0',
                              borderRadius: '4px 4px 0 0', transition: 'all 0.2s',
                              cursor: d.count > 0 ? 'pointer' : 'default',
                              boxShadow: isFiltered && d.count > 0 ? '0 2px 8px rgba(102,0,153,0.3)' : 'none',
                              opacity: 1
                            }}
                              onMouseEnter={e => { if (d.count > 0) (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                            />
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                      {dadosPorMes.map((d, i) => (
                        <div key={d.label} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 700, color: selectedMonths.includes(MONTHS_LIST[i].key) ? '#660099' : '#94a3b8' }}>{d.label}</div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'linear-gradient(180deg,#9333ea,#660099)', display: 'inline-block' }} />Meses selecionados</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#e2e8f0', display: 'inline-block' }} />Fora do filtro</span>
                    </div>
                    <div style={{ marginTop: 20, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
                      <div><div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{todasAtividades.length}</div><div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total no ano</div></div>
                      <div><div style={{ fontSize: 22, fontWeight: 800, color: '#660099' }}>{totalAtividades}</div><div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Período filtrado</div></div>
                      <div><div style={{ fontSize: 22, fontWeight: 800, color: '#22c55e' }}>{percentualDoTotal}%</div><div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Do total do ano</div></div>
                    </div>
                  </>
                ) : (
                  // === PIZZA ===
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <button onClick={() => setSelectedMesGrafico(null)}
                      style={{ alignSelf: 'flex-start', background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                      onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                    >
                      ← Voltar para todos os meses
                    </button>
                    {totalMes === 0 ? (
                      <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Nenhuma atividade neste mês.</div>
                    ) : (
                      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {/* SVG Pizza */}
                      <svg width="200" height="200" viewBox="0 0 200 200">
                        {pieSlices.map((s, i) => (
                          <path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth="2" />
                        ))}
                        {/* Centro branco para efeito donut */}
                        <circle cx="100" cy="100" r="42" fill="#fff" />
                        <text x="100" y="96" textAnchor="middle" fontSize="18" fontWeight="800" fill="#1e293b">{totalMes}</text>
                        <text x="100" y="112" textAnchor="middle" fontSize="10" fontWeight="600" fill="#94a3b8">atividades</text>
                      </svg>

                      {/* Legenda */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 200 }}>
                        {pieSlices.map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: `1px solid ${s.color}22` }}>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', flex: 1 }}>{s.nome}</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.count}</span>
                            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, minWidth: 36, textAlign: 'right' }}>{s.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
