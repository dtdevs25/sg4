'use client'

import { useState, useEffect, useRef, useTransition, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  AlertTriangle, Filter, Search, Eye, UploadCloud,
  Loader2, X, PlusCircle, CheckCircle, Clock, Trash2,
  FileSpreadsheet, ListTodo, CheckCircle2, PlayCircle
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getTecnicos } from '@/app/actions/tecnicos'
import {
  getNaoConformidades,
  upsertNaoConformidadesBatch,
  addNaoConformidadeUpdate,
  updateNaoConformidadeStatus,
  deleteNaoConformidade
} from '@/app/actions/naoConformidades'

type MesKey = 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun' | 'jul' | 'ago' | 'set' | 'out' | 'nov' | 'dez'

const MES_MAP: Record<MesKey, string> = {
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

const MONTH_KEYS = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

type UpdateItem = {
  date: string
  text: string
  author: string
}

type NaoConformidadeItem = {
  id: string
  originalId: string
  executor: string
  tecnicoId: string | null
  pergunta: string
  resposta: string
  classificacao: string
  compl1: string
  rCompl1: string
  localidade: string
  base: string
  questionario: string
  dataAbertura: string | null
  status: 'ABERTO' | 'EM_ANDAMENTO' | 'RESOLVIDO'
  updates: UpdateItem[]
  importadoEm: string
  tecnico?: {
    id: string
    nome: string
    fotoUrl: string | null
    ativo: boolean
  }
}

const PURPLE = '#660099'
const PURPLE_BG = 'rgba(102,0,153,0.06)'

function parseExcelDate(val: any): Date | null {
  if (val === undefined || val === null || val === '') return null
  
  if (val instanceof Date) return val
  
  const num = Number(val)
  if (!isNaN(num) && num > 20000) {
    return new Date(Math.round((num - 25569) * 86400 * 1000))
  }
  
  const str = String(val).trim()
  if (str.includes('/')) {
    const parts = str.split('/')
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year = parseInt(parts[2], 10)
      const date = new Date(Date.UTC(year, month, day))
      if (!isNaN(date.getTime())) return date
    }
  } else if (str.includes('-')) {
    const parts = str.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const date = new Date(Date.UTC(year, month, day))
      if (!isNaN(date.getTime())) return date
    }
  }
  
  const dateParsed = new Date(val)
  if (!isNaN(dateParsed.getTime())) return dateParsed
  
  return null
}

export default function NaoConformidadesPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const userTecnicoId = (session?.user as any)?.tecnicoId
  const isTst = userRole === 'TST'
  const isMasterOrAdmin = userRole === 'MASTER' || userRole === 'ADMIN'

  const [activeTab, setActiveTab] = useState<'consolidado' | 'arkium'>('consolidado')
  const [data, setData] = useState<NaoConformidadeItem[]>([])
  const [tecnicos, setTecnicos] = useState<any[]>([])

  // Global Period Filters
  const [selectedMonths, setSelectedMonths] = useState<MesKey[]>(
    ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].slice(0, new Date().getMonth() + 1) as MesKey[]
  )
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(new Date().getFullYear())

  // Consolidado state
  const [consolidadoSearch, setConsolidadoSearch] = useState('')
  const [currentPageConsolidado, setCurrentPageConsolidado] = useState(1)
  const itemsPerPageConsolidado = 10

  // Arkium list state
  const [arkiumSearch, setArkiumSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ABERTO' | 'EM_ANDAMENTO' | 'RESOLVIDO'>('ALL')
  const [classFilter, setClassFilter] = useState('ALL')
  const [tecnicoFilter, setTecnicoFilter] = useState('ALL')
  const [currentPageArkium, setCurrentPageArkium] = useState(1)
  const itemsPerPageArkium = 10

  // Global states
  const [showInactive, setShowInactive] = useState(false)

  // Modal / Detail States
  const [selectedItem, setSelectedItem] = useState<NaoConformidadeItem | null>(null)
  const [newUpdateText, setNewUpdateText] = useState('')
  const [modalStatus, setModalStatus] = useState<'ABERTO' | 'EM_ANDAMENTO' | 'RESOLVIDO'>('ABERTO')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Upload States
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const [importingFileName, setImportingFileName] = useState('')
  const [importResultMsg, setImportResultMsg] = useState('')
  const [isDoneImporting, setIsDoneImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pending, startTransition] = useTransition()

  // Load Data
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    startTransition(async () => {
      const [ncRes, tecRes] = await Promise.all([
        getNaoConformidades(),
        getTecnicos()
      ])

      if (ncRes.success && ncRes.data) {
        setData(ncRes.data as any[])
      }
      if (tecRes.success && tecRes.data) {
        setTecnicos(tecRes.data)
      }
    })
  }

  // Years list dynamic helper
  const anosDisponiveis = useMemo(() => {
    const years = Array.from(
      new Set(
        data
          .map(item => (item.dataAbertura ? new Date(item.dataAbertura).getUTCFullYear() : null))
          .filter(Boolean)
      )
    )
    if (!years.includes(new Date().getFullYear())) {
      years.push(new Date().getFullYear())
    }
    return years.sort((a, b) => (b as number) - (a as number)) as number[]
  }, [data])

  // Month Click Handler with double click shortcut to select single month
  const clickTimeout = useRef<NodeJS.Timeout | null>(null)
  const handleMonthClick = (m: MesKey) => {
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current)
      clickTimeout.current = null
      setSelectedMonths([m])
    } else {
      clickTimeout.current = setTimeout(() => {
        clickTimeout.current = null
        setSelectedMonths(prev => {
          if (prev.length === 1 && prev.includes(m)) {
            return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
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

  // Filter helper: check if date falls in selected months and year
  const isDateInPeriod = (dateStr: string | null) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return false

    const y = d.getUTCFullYear()
    const mKey = MONTH_KEYS[d.getUTCMonth() + 1]

    if (selectedYear !== 'ALL' && y !== selectedYear) return false
    if (!selectedMonths.includes(mKey as MesKey)) return false
    return true
  }

  // Helper to extract classifications for dropdown
  const classifications = useMemo(() => {
    return Array.from(new Set(data.map(i => i.classificacao).filter(Boolean))).sort()
  }, [data])

  // Filtered Non-Conformities list for the Arkium Tab
  const filteredArkiumRaw = useMemo(() => {
    return data.filter(item => {
      // 0. Security for TST role
      if (isTst) {
        if (!userTecnicoId) return false
        if (item.tecnicoId !== userTecnicoId) return false
      }

      // 1. Inactive technician filter
      if (!showInactive && item.tecnico && item.tecnico.ativo === false) return false

      // 2. Period filter
      if (!isDateInPeriod(item.dataAbertura)) return false

      return true
    })
  }, [data, selectedMonths, selectedYear, showInactive, isTst, userTecnicoId])

  // UI Stats for Arkium Tab
  const statsArkium = useMemo(() => {
    const total = filteredArkiumRaw.length
    const abertas = filteredArkiumRaw.filter(i => i.status === 'ABERTO').length
    const andamento = filteredArkiumRaw.filter(i => i.status === 'EM_ANDAMENTO').length
    const resolvidas = filteredArkiumRaw.filter(i => i.status === 'RESOLVIDO').length
    return { total, abertas, andamento, resolvidas }
  }, [filteredArkiumRaw])

  // Final search and dropdown filters applied to Arkium list
  const filteredArkium = useMemo(() => {
    return filteredArkiumRaw.filter(item => {
      // Search
      const query = arkiumSearch.toLowerCase()
      const matchesSearch =
        (item.originalId || '').toLowerCase().includes(query) ||
        (item.executor || '').toLowerCase().includes(query) ||
        (item.questionario || '').toLowerCase().includes(query) ||
        (item.pergunta || '').toLowerCase().includes(query) ||
        (item.rCompl1 || '').toLowerCase().includes(query)

      // Status
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter

      // Classification
      const matchesClass = classFilter === 'ALL' || item.classificacao === classFilter

      // Technician
      const matchesTecnico = tecnicoFilter === 'ALL' || item.tecnicoId === tecnicoFilter

      return matchesSearch && matchesStatus && matchesClass && matchesTecnico
    }).sort((a, b) => {
      const timeA = a.dataAbertura ? new Date(a.dataAbertura).getTime() : 0
      const timeB = b.dataAbertura ? new Date(b.dataAbertura).getTime() : 0
      return timeB - timeA
    })
  }, [filteredArkiumRaw, arkiumSearch, statusFilter, classFilter, tecnicoFilter])

  // Pagination for Arkium Tab
  const totalPagesArkium = Math.ceil(filteredArkium.length / itemsPerPageArkium)
  const paginatedArkium = useMemo(() => {
    return filteredArkium.slice((currentPageArkium - 1) * itemsPerPageArkium, currentPageArkium * itemsPerPageArkium)
  }, [filteredArkium, currentPageArkium])

  // --- Consolidado / Matrix calculations ---
  const consolidadoData = useMemo(() => {
    const visibleTecnicos = tecnicos.filter(t => showInactive ? true : t.ativo !== false)

    return visibleTecnicos.map(t => {
      // Find all NCs for this technician in the selected period
      const tNCs = data.filter(nc => nc.tecnicoId === t.id && isDateInPeriod(nc.dataAbertura))
      
      const abertas = tNCs.filter(nc => nc.status === 'ABERTO').length
      const andamento = tNCs.filter(nc => nc.status === 'EM_ANDAMENTO').length
      const resolvidas = tNCs.filter(nc => nc.status === 'RESOLVIDO').length
      const total = tNCs.length

      return {
        id: t.id,
        nome: t.nome,
        fotoUrl: t.fotoUrl,
        ativo: t.ativo,
        admissao: t.admissao ? new Date(t.admissao).toLocaleDateString('pt-BR') : '-',
        abertas,
        andamento,
        resolvidas,
        total
      }
    }).filter(t => {
      // Search filter
      const matchesSearch = t.nome.toLowerCase().includes(consolidadoSearch.toLowerCase())
      // If hiding inactive, only active or those with some data
      const matchesActivity = showInactive ? true : (t.ativo || t.total > 0)
      return matchesSearch && matchesActivity
    }).sort((a, b) => b.total - a.total)
  }, [tecnicos, data, selectedMonths, selectedYear, showInactive, consolidadoSearch])

  // Overall totals for Consolidado statistics
  const statsConsolidado = useMemo(() => {
    let abertas = 0
    let andamento = 0
    let resolvidas = 0
    let total = 0

    consolidadoData.forEach(t => {
      abertas += t.abertas
      andamento += t.andamento
      resolvidas += t.resolvidas
      total += t.total
    })

    return { abertas, andamento, resolvidas, total }
  }, [consolidadoData])

  // Pagination for Consolidado
  const totalPagesConsolidado = Math.ceil(consolidadoData.length / itemsPerPageConsolidado)
  const paginatedConsolidado = useMemo(() => {
    return consolidadoData.slice((currentPageConsolidado - 1) * itemsPerPageConsolidado, currentPageConsolidado * itemsPerPageConsolidado)
  }, [consolidadoData, currentPageConsolidado])

  const totalsTecnicos = useMemo(() => {
    return {
      ativos: tecnicos.filter(t => t.ativo !== false).length,
      inativos: tecnicos.filter(t => t.ativo === false).length
    }
  }, [tecnicos])

  // Excel Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setIsDoneImporting(false)
    setImportingFileName(file.name)
    setImportProgress('Lendo planilha...')

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        setImportProgress('Lendo células...')
        const buffer = evt.target?.result as ArrayBuffer
        const wb = XLSX.read(buffer, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        if (!sheetName) throw new Error("Planilha vazia ou sem abas.")

        setImportProgress('Processando linhas...')
        const worksheet = wb.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

        if (jsonData.length === 0) {
          throw new Error("Nenhum dado encontrado na planilha.")
        }

        const firstRow = jsonData[0]
        const rowKeys = Object.keys(firstRow)
        const findMatch = (keysList: string[]) => {
          for (const k of keysList) {
            const match = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, ''))
            if (match) return match
          }
          return null
        }

        const matchedKeys = {
          id: findMatch(['Id', 'ID', 'Identificador']),
          executor: findMatch(['Executor', 'COLABORADOR', 'Exec.']),
          responsavel: findMatch(['Responsável', 'Responsavel', 'Responsável/executor', 'Responsavel/executor']),
          pergunta: findMatch(['Pergunta', 'Questão']),
          resposta: findMatch(['Resposta']),
          classificacao: findMatch(['Classificação', 'Classificacao', 'Gravidade']),
          localidade: findMatch(['Localidade', 'Cidade']),
          base: findMatch(['Base', 'Unidade']),
          questionario: findMatch(['Questionário', 'Questionario', 'Checklist']),
          compl1: findMatch(['Compl. 1', 'Compl1']),
          rCompl1: findMatch(['R. Compl. 1', 'R. Compl1', 'R.Compl.1', 'RCompl1', 'Detalhamento'])
        }

        const dataAberturaKey = findMatch(['Data Abertura', 'DataAbertura', 'Abertura'])

        setImportProgress('Validando registros...')
        const itemsToUpsert = jsonData
          .filter(row => {
            const idVal = row[matchedKeys.id || 'Id']
            return idVal !== undefined && idVal !== null && String(idVal).trim() !== ''
          })
          .map(row => {
            const originalId = String(row[matchedKeys.id || 'Id'])
            const executor = String(row[matchedKeys.executor || 'Executor'] || '')
            const responsavel = String(row[matchedKeys.responsavel || 'Responsável'] || '')
            const pergunta = String(row[matchedKeys.pergunta || 'Pergunta'] || '')
            const resposta = String(row[matchedKeys.resposta || 'Resposta'] || '')
            const classificacao = String(row[matchedKeys.classificacao || 'Classificação'] || '')
            const compl1 = String(row[matchedKeys.compl1 || 'Compl. 1'] || '')
            const rCompl1 = String(row[matchedKeys.rCompl1 || 'R. Compl. 1'] || '')
            const localidade = String(row[matchedKeys.localidade || 'Localidade'] || '')
            const base = String(row[matchedKeys.base || 'Base'] || '')
            const questionario = String(row[matchedKeys.questionario || 'Questionário'] || '')

            const rawDate = dataAberturaKey ? row[dataAberturaKey] : null
            const parsedDate = parseExcelDate(rawDate)

            return {
              originalId,
              executor,
              responsavel,
              pergunta,
              resposta,
              classificacao,
              compl1,
              rCompl1,
              localidade,
              base,
              questionario,
              dataAbertura: parsedDate ? parsedDate.toISOString() : null
            }
          })

        setImportProgress(`Enviando registros mapeados...`)
        const res = await upsertNaoConformidadesBatch(itemsToUpsert)

        if (res.success) {
          setImportResultMsg(`Importação concluída! ${res.inseridos} registros vinculados a nossos técnicos foram importados e ${res.atualizados} foram atualizados. Registros de terceiros foram ignorados.`)
          await loadData()
        } else {
          setImportResultMsg(`Erro ao salvar no banco de dados: ${res.error}`)
        }
        setIsDoneImporting(true)
      } catch (err: any) {
        setIsImporting(false)
        alert("Erro ao processar planilha: " + err.message)
      }
    }

    reader.onerror = () => {
      setIsImporting(false)
      alert("Não foi possível ler o arquivo.")
    }

    reader.readAsArrayBuffer(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handle updates modal
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || !newUpdateText.trim()) return

    startTransition(async () => {
      const res = await addNaoConformidadeUpdate(selectedItem.id, newUpdateText, modalStatus)
      if (res.success && res.data) {
        setSelectedItem(res.data as any)
        setNewUpdateText('')
        await loadData()
      } else {
        alert("Erro ao salvar atualização: " + res.error)
      }
    })
  }

  const handleStatusChange = async (newStatus: 'ABERTO' | 'EM_ANDAMENTO' | 'RESOLVIDO') => {
    if (!selectedItem) return
    setModalStatus(newStatus)
    startTransition(async () => {
      const res = await updateNaoConformidadeStatus(selectedItem.id, newStatus)
      if (res.success && res.data) {
        setSelectedItem(res.data as any)
        await loadData()
      } else {
        alert("Erro ao atualizar status: " + res.error)
      }
    })
  }

  const handleDeleteItem = (id: string) => {
    startTransition(async () => {
      const res = await deleteNaoConformidade(id)
      if (res.success) {
        setDeleteConfirmId(null)
        setSelectedItem(null)
        await loadData()
      } else {
        alert("Erro ao excluir: " + res.error)
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Overlay de Importação */}
      {isImporting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '40px 48px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)', maxWidth: 460, width: '90%',
            textAlign: 'center'
          }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(102,0,153,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isDoneImporting ? (
                <CheckCircle size={32} color="#10b981" />
              ) : (
                <Loader2 size={32} color={PURPLE} style={{ animation: 'spin 1s linear infinite' }} />
              )}
            </div>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>
                {isDoneImporting ? 'Importação Concluída!' : 'Processando Planilha'}
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                {importingFileName}
              </p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isDoneImporting ? '#1e293b' : PURPLE, lineHeight: 1.5 }}>
                {isDoneImporting ? importResultMsg : importProgress}
              </p>
            </div>

            {isDoneImporting && (
              <button
                onClick={() => { setIsImporting(false); setIsDoneImporting(false); }}
                style={{
                  padding: '10px 24px', background: PURPLE, color: '#fff',
                  borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Continuar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header e Abas */}
      <div style={{
        background: '#fff', borderRadius: 10, border: '1px solid #f1f5f9',
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
            <AlertTriangle color={PURPLE} size={22} />
            Não Conformidades Arkium
          </h1>
        </div>

        <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 8, gap: 4 }}>
          <button
            onClick={() => { setActiveTab('consolidado'); setCurrentPageConsolidado(1); }}
            style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
              background: activeTab === 'consolidado' ? '#fff' : 'transparent',
              color: activeTab === 'consolidado' ? PURPLE : '#64748b',
              boxShadow: activeTab === 'consolidado' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Visão Consolidada
          </button>
          <button
            onClick={() => { setActiveTab('arkium'); setCurrentPageArkium(1); }}
            style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
              background: activeTab === 'arkium' ? '#fff' : 'transparent',
              color: activeTab === 'arkium' ? PURPLE : '#64748b',
              boxShadow: activeTab === 'arkium' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Estratificação Arkium
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: VISÃO CONSOLIDADA
      ======================================================== */}
      {activeTab === 'consolidado' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* Period selector */}
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
                    const isSelected = selectedMonths.includes(m.key as MesKey)
                    return (
                      <button
                        key={m.key}
                        onClick={() => handleMonthClick(m.key as MesKey)}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 6,
                          border: isSelected ? `1px solid ${PURPLE}` : '1px solid #e2e8f0',
                          background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc',
                          color: isSelected ? PURPLE : '#64748b',
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
                    const isSelected = selectedMonths.includes(m.key as MesKey)
                    return (
                      <button
                        key={m.key}
                        onClick={() => handleMonthClick(m.key as MesKey)}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 6,
                          border: isSelected ? `1px solid ${PURPLE}` : '1px solid #e2e8f0',
                          background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc',
                          color: isSelected ? PURPLE : '#64748b',
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

            {/* Consolidado Stats Card */}
            <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Resumo do Período</span>
                <span style={{ background: 'rgba(102,0,153,0.1)', color: PURPLE, fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                  {selectedMonths.length} MÊS(ES)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Total Aberto</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{statsConsolidado.abertas}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Em Andamento</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#d97706' }}>{statsConsolidado.andamento}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Resolvidas</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{statsConsolidado.resolvidas}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Total Geral</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#334155' }}>{statsConsolidado.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search bar & active count */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ position: 'relative', width: 300 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filtrar por técnico..."
                  value={consolidadoSearch}
                  onChange={(e) => setConsolidadoSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 700, color: '#475569', background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span>Ativos: <span style={{ color: '#10b981' }}>{totalsTecnicos.ativos}</span></span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>Inativos: <span style={{ color: '#ef4444' }}>{totalsTecnicos.inativos}</span></span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ cursor: 'pointer' }} />
                  Mostrar inativos
                </label>
              </div>
            </div>

            {/* Matrix Table */}
            <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Aberto</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Em Andamento</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Resolvido</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Total</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                          <Loader2 size={24} color={PURPLE} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                          Carregando dados...
                        </td>
                      </tr>
                    ) : paginatedConsolidado.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Nenhum técnico encontrado.</td></tr>
                    ) : (
                      paginatedConsolidado.map(t => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {t.fotoUrl ? (
                                <img src={t.fotoUrl} alt={t.nome} style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', objectFit: 'cover', border: '2px solid #f1f5f9' }} />
                              ) : (
                                <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', background: '#f1f5f9', color: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
                                  {t.nome.split(' ').map((n: string) => n && n[0]).slice(0, 2).join('')}
                                </div>
                              )}
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>
                                  {t.nome}
                                  {t.ativo === false && (
                                    <span style={{ marginLeft: 8, padding: '2px 6px', background: '#fee2e2', color: '#ef4444', borderRadius: 4, fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>Inativo</span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Admissão: {t.admissao}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: t.abertas > 0 ? '#ef4444' : '#64748b' }}>
                            {t.abertas}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: t.andamento > 0 ? '#d97706' : '#64748b' }}>
                            {t.andamento}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: t.resolvidas > 0 ? '#10b981' : '#64748b' }}>
                            {t.resolvidas}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#334155' }}>
                            {t.total}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                setTecnicoFilter(t.id)
                                setActiveTab('arkium')
                              }}
                              style={{
                                padding: '6px 12px', background: PURPLE_BG, color: PURPLE, border: 'none',
                                borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                              }}
                            >
                              Ver Ocorrências
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Consolidado */}
            {totalPagesConsolidado > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#fff', borderRadius: 10
              }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  Mostrando página {currentPageConsolidado} de {totalPagesConsolidado} ({consolidadoData.length} técnicos)
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={currentPageConsolidado === 1}
                    onClick={() => setCurrentPageConsolidado(prev => Math.max(prev - 1, 1))}
                    style={{
                      padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6,
                      background: '#fff', fontSize: 13, cursor: currentPageConsolidado === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPageConsolidado === 1 ? 0.5 : 1
                    }}
                  >
                    Anterior
                  </button>
                  <button
                    disabled={currentPageConsolidado === totalPagesConsolidado}
                    onClick={() => setCurrentPageConsolidado(prev => Math.min(prev + 1, totalPagesConsolidado))}
                    style={{
                      padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6,
                      background: '#fff', fontSize: 13, cursor: currentPageConsolidado === totalPagesConsolidado ? 'not-allowed' : 'pointer',
                      opacity: currentPageConsolidado === totalPagesConsolidado ? 0.5 : 1
                    }}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================
          TAB 2: ESTRATIFICAÇÃO ARKIUM (LIST & IMPORT)
      ======================================================== */}
      {activeTab === 'arkium' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Stats Cards */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #64748b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
                <ListTodo size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Total</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{statsArkium.total}</div>
            </div>

            <div style={{ flex: 1, background: '#fff', border: '1px solid #fee2e2', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c' }}>
                <AlertTriangle size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Abertos</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{statsArkium.abertas}</div>
            </div>

            <div style={{ flex: 1, background: '#fff', border: '1px solid #fef3c7', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #d97706' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309' }}>
                <Clock size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Em Andamento</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#d97706', lineHeight: 1 }}>{statsArkium.andamento}</div>
            </div>

            <div style={{ flex: 1, background: '#fff', border: '1px solid #d1fae5', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#047857' }}>
                <CheckCircle2 size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Resolvidos</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{statsArkium.resolvidas}</div>
            </div>
          </div>

          {/* Grid de Filtros e Upload Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* Period selector */}
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
                    const isSelected = selectedMonths.includes(m.key as MesKey)
                    return (
                      <button
                        key={m.key}
                        onClick={() => handleMonthClick(m.key as MesKey)}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 6,
                          border: isSelected ? `1px solid ${PURPLE}` : '1px solid #e2e8f0',
                          background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc',
                          color: isSelected ? PURPLE : '#64748b',
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
                    const isSelected = selectedMonths.includes(m.key as MesKey)
                    return (
                      <button
                        key={m.key}
                        onClick={() => handleMonthClick(m.key as MesKey)}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 6,
                          border: isSelected ? `1px solid ${PURPLE}` : '1px solid #e2e8f0',
                          background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc',
                          color: isSelected ? PURPLE : '#64748b',
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

            {/* Uploader Card */}
            {isMasterOrAdmin && (
              <div style={{
                background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 10,
                padding: '16px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12
              }}>
                <div style={{ width: 44, height: 44, background: 'rgba(102,0,153,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileSpreadsheet color={PURPLE} size={22} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Importar Não Conformidades</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Excel (.xls ou .xlsx)</div>
                </div>
                <input type="file" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: PURPLE, color: '#fff', border: 'none', padding: '8px 20px',
                    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 2
                  }}
                >
                  <UploadCloud size={14} />
                  Selecionar Arquivo
                </button>
              </div>
            )}
          </div>

          {/* Ocorrências Table area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filter controls row */}
            <div style={{
              background: '#fff', borderRadius: 10, border: '1px solid #f1f5f9',
              padding: 16, display: 'flex', flexDirection: 'column', gap: 12
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Buscar por código, executor ou pergunta..."
                    value={arkiumSearch}
                    onChange={(e) => { setArkiumSearch(e.target.value); setCurrentPageArkium(1); }}
                    style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  />
                </div>

                {/* Status selector */}
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value as any); setCurrentPageArkium(1); }}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', outline: 'none', background: '#fff' }}
                >
                  <option value="ALL">Todas as situações</option>
                  <option value="ABERTO">Aberto</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="RESOLVIDO">Resolvido</option>
                </select>

                {/* Gravidade selector */}
                <select
                  value={classFilter}
                  onChange={e => { setClassFilter(e.target.value); setCurrentPageArkium(1); }}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', outline: 'none', background: '#fff' }}
                >
                  <option value="ALL">Todas as gravidades</option>
                  {classifications.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Técnico filter */}
                {isMasterOrAdmin && (
                  <select
                    value={tecnicoFilter}
                    onChange={e => { setTecnicoFilter(e.target.value); setCurrentPageArkium(1); }}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', outline: 'none', background: '#fff' }}
                  >
                    <option value="ALL">Todos os técnicos</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ cursor: 'pointer' }} />
                  Mostrar técnicos inativos
                </label>
              </div>
            </div>

            {/* Arkium Table */}
            <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Cód. Arkium</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data Abertura</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Executor / Técnico</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Questionário / Pergunta</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Localidade</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Gravidade</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Situação</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                          <Loader2 size={24} color={PURPLE} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                          Carregando dados...
                        </td>
                      </tr>
                    ) : paginatedArkium.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Nenhuma não conformidade encontrada para os filtros selecionados.</td></tr>
                    ) : (
                      paginatedArkium.map(item => {
                        const dateLabel = item.dataAbertura
                          ? new Date(item.dataAbertura).toLocaleDateString('pt-BR')
                          : '-'

                        let statusBadge = { bg: '#fee2e2', text: '#ef4444', label: 'Aberto' }
                        if (item.status === 'EM_ANDAMENTO') {
                          statusBadge = { bg: '#fef3c7', text: '#d97706', label: 'Em Andamento' }
                        } else if (item.status === 'RESOLVIDO') {
                          statusBadge = { bg: '#d1fae5', text: '#10b981', label: 'Resolvido' }
                        }

                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: item.status === 'ABERTO' ? '#fefce8' : '#fff' }}>
                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                              #{item.originalId}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#475569' }}>
                              {dateLabel}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{item.executor}</div>
                              {item.tecnico && (
                                <div style={{ fontSize: 10, color: PURPLE, fontWeight: 600, marginTop: 2 }}>
                                  🔗 {item.tecnico.nome}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, maxWidth: 300 }}>
                              <div style={{ fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.questionario}</div>
                              <div style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{item.pergunta}</div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                              {item.localidade || '-'}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12 }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                                background: item.classificacao?.toLowerCase().includes('grave') ? '#fef2f2' : '#f8fafc',
                                color: item.classificacao?.toLowerCase().includes('grave') ? '#ef4444' : '#64748b',
                                border: `1px solid ${item.classificacao?.toLowerCase().includes('grave') ? '#fecaca' : '#e2e8f0'}`
                              }}>
                                {item.classificacao || 'Normal'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12, textAlign: 'center' }}>
                              <span style={{
                                padding: '4px 10px', borderRadius: 20, fontWeight: 700,
                                background: statusBadge.bg, color: statusBadge.text
                              }}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <button
                                onClick={() => { setSelectedItem(item); setModalStatus(item.status); }}
                                style={{
                                  padding: 6, background: PURPLE_BG, color: PURPLE, border: 'none',
                                  borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                                  transition: 'all 0.15s'
                                }}
                              >
                                <Eye size={15} />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Arkium */}
            {totalPagesArkium > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#fff', borderRadius: 10
              }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  Mostrando página {currentPageArkium} de {totalPagesArkium} ({filteredArkium.length} itens)
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={currentPageArkium === 1}
                    onClick={() => setCurrentPageArkium(prev => Math.max(prev - 1, 1))}
                    style={{
                      padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6,
                      background: '#fff', fontSize: 13, cursor: currentPageArkium === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPageArkium === 1 ? 0.5 : 1
                    }}
                  >
                    Anterior
                  </button>
                  <button
                    disabled={currentPageArkium === totalPagesArkium}
                    onClick={() => setCurrentPageArkium(prev => Math.min(prev + 1, totalPagesArkium))}
                    style={{
                      padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6,
                      background: '#fff', fontSize: 13, cursor: currentPageArkium === totalPagesArkium ? 'not-allowed' : 'pointer',
                      opacity: currentPageArkium === totalPagesArkium ? 0.5 : 1
                    }}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL DE DETALHES ==================== */}
      {selectedItem && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '90%', maxWidth: 750,
            maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Não Conformidade #{selectedItem.originalId}
                </h3>
                <span style={{ fontSize: 12, color: PURPLE, fontWeight: 600 }}>
                  {selectedItem.questionario}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Info Grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16, background: '#f8fafc', borderRadius: 10, padding: 16
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Data Abertura</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                    {selectedItem.dataAbertura ? new Date(selectedItem.dataAbertura).toLocaleDateString('pt-BR') : '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Localidade / Base</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                    {selectedItem.localidade} ({selectedItem.base})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Executor da Planilha</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                    {selectedItem.executor}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Técnico Vinculado</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: PURPLE, marginTop: 2 }}>
                    {selectedItem.tecnico ? selectedItem.tecnico.nome : 'Nenhum'}
                  </div>
                </div>
              </div>

              {/* QA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ borderLeft: `3px solid ${PURPLE}`, paddingLeft: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Pergunta</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>
                    {selectedItem.pergunta}
                  </div>
                </div>

                <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Detalhamento da Ocorrência (R. Compl 1)</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#b91c1c', marginTop: 2 }}>
                    {selectedItem.rCompl1 || 'Não informado'}
                  </div>
                </div>
              </div>

              {/* Update Timeline */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: '0 0 16px 0' }}>
                  Histórico de Atualizações
                </h4>

                {(!selectedItem.updates || selectedItem.updates.length === 0) ? (
                  <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', margin: '0 0 16px 0' }}>
                    Nenhuma ação registrada ainda.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                    {selectedItem.updates.map((up, idx) => (
                      <div key={idx} style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid #cbd5e1' }}>
                        <div style={{
                          position: 'absolute', left: -6, top: 4, width: 10, height: 10,
                          borderRadius: '50%', background: PURPLE
                        }} />
                        <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                          {up.text}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          Por <strong>{up.author}</strong> em {new Date(up.date).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleAddUpdate} style={{
                  display: 'flex', flexDirection: 'column', gap: 12,
                  background: '#f8fafc', padding: 16, borderRadius: 10
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                      Registrar Ação / Atualização
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Situação:</span>
                      <select
                        value={modalStatus}
                        onChange={e => handleStatusChange(e.target.value as any)}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', background: '#fff' }}
                      >
                        <option value="ABERTO">Aberto</option>
                        <option value="EM_ANDAMENTO">Em Andamento</option>
                        <option value="RESOLVIDO">Resolvido</option>
                      </select>
                    </div>
                  </div>

                  <textarea
                    value={newUpdateText}
                    onChange={e => setNewUpdateText(e.target.value)}
                    placeholder="Descreva a ação tomada (ex. Enviei e-mail solicitando correção ao responsável...)"
                    required
                    rows={3}
                    style={{
                      width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1',
                      fontSize: 13, outline: 'none', resize: 'vertical'
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={pending}
                      style={{
                        padding: '8px 18px', background: PURPLE, color: '#fff', border: 'none',
                        borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6
                      }}
                    >
                      <PlusCircle size={14} />
                      Adicionar Ação
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottomLeftRadius: 16, borderBottomRightRadius: 16
            }}>
              {isMasterOrAdmin ? (
                deleteConfirmId === selectedItem.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>Confirma exclusão?</span>
                    <button
                      onClick={() => handleDeleteItem(selectedItem.id)}
                      style={{ padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      style={{ padding: '4px 10px', background: '#cbd5e1', color: '#475569', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(selectedItem.id)}
                    style={{
                      background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600
                    }}
                  >
                    <Trash2 size={14} />
                    Excluir Registro
                  </button>
                )
              ) : <div />}

              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  padding: '8px 18px', border: '1px solid #cbd5e1', borderRadius: 8,
                  fontSize: 13, fontWeight: 700, background: '#fff', color: '#475569', cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
