'use client'

import { useState, useEffect, useRef, useTransition, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  AlertTriangle, Filter, Search, Eye, UploadCloud,
  Loader2, X, PlusCircle, CheckCircle, Clock, Trash2,
  FileSpreadsheet, ListTodo, CheckCircle2, PlayCircle,
  Camera, Image as ImageIcon
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getTecnicos } from '@/app/actions/tecnicos'
import {
  getNaoConformidades,
  upsertNaoConformidadesBatch,
  addNaoConformidadeUpdate,
  addNaoConformidadeUpdatesBatch,
  updateNaoConformidadeStatus,
  deleteNaoConformidade,
  uploadNaoConformidadeEvidencia,
  deleteNaoConformidadeUpdate,
  replaceNaoConformidadeUpdateImage
} from '@/app/actions/naoConformidades'
import { optimizeTextWithAI } from '@/app/actions/ai'
import { getLastImportTime } from '@/app/actions/logs'

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
  actionDate?: string
  fotoUrl?: string | null
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
  audit?: string | null
  status: 'PENDENTE_VENCIDA' | 'PENDENTE_NAO_VENCIDA' | 'EM_ANDAMENTO' | 'RESOLVIDO'
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

function normalizeArkiumStatus(val: string): string {
  if (!val) return ''
  return val.toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function mapArkiumStatus(val: string): 'PENDENTE_VENCIDA' | 'PENDENTE_NAO_VENCIDA' | 'EM_ANDAMENTO' | 'RESOLVIDO' {
  const sNorm = normalizeArkiumStatus(val)

  // Categoria: resolvidos
  if (
    sNorm === 'RESOLVIDA ANTES VENCIMENTO' ||
    sNorm === 'RESOLVIDA APOS VENCIMENTO' ||
    sNorm === 'RESOLVIDA SEM DATA PREVISTA' ||
    sNorm.startsWith('RESOLVIDA') ||
    sNorm.startsWith('RESOLVIDO')
  ) {
    return 'RESOLVIDO'
  }

  // Categoria: PENDENTES EM PROCESSAMENTO
  if (
    sNorm === 'PENDENTE VENCIDA EM PROCESSAMENTO' ||
    sNorm === 'PENDENTE SEM DATA PREVISTA EM PROCESSAMENTO' ||
    sNorm === 'PENDENTE VENCIDA EM ENTREGA' ||
    sNorm === 'PENDENTE NAO VENCIDA EM PROCESSAMENTO' ||
    sNorm.includes('EM PROCESSAMENTO') ||
    sNorm.includes('EM ENTREGA')
  ) {
    return 'EM_ANDAMENTO'
  }

  // Categoria: pendente não vencidos
  if (
    sNorm === 'PENDENTE NAO VENCIDA' ||
    sNorm === 'PENDENTE SEM DATA PREVISTA'
  ) {
    return 'PENDENTE_NAO_VENCIDA'
  }

  // Categoria: pendente vencidos
  if (sNorm === 'PENDENTE VENCIDA') {
    return 'PENDENTE_VENCIDA'
  }

  // Fallback default
  return 'PENDENTE_NAO_VENCIDA'
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
  const [itemsPerPageConsolidado, setItemsPerPageConsolidado] = useState(10)

  // Arkium list state
  const [arkiumSearch, setArkiumSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDENTE_VENCIDA' | 'PENDENTE_NAO_VENCIDA' | 'EM_ANDAMENTO' | 'RESOLVIDO'>('ALL')
  const [classFilter, setClassFilter] = useState('ALL')
  const [tecnicoFilter, setTecnicoFilter] = useState('ALL')
  const [currentPageArkium, setCurrentPageArkium] = useState(1)
  const [itemsPerPageArkium, setItemsPerPageArkium] = useState(10)

  // Global states
  const [showInactive, setShowInactive] = useState(false)
  const [showGraficoModal, setShowGraficoModal] = useState(false)

  // Modal / Detail States
  const [selectedItem, setSelectedItem] = useState<NaoConformidadeItem | null>(null)
  const [newUpdateText, setNewUpdateText] = useState('')
  const [modalStatus, setModalStatus] = useState<'PENDENTE_VENCIDA' | 'PENDENTE_NAO_VENCIDA' | 'EM_ANDAMENTO' | 'RESOLVIDO'>('PENDENTE_NAO_VENCIDA')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Evidence upload & action date states
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0])
  const [fotoBase64, setFotoBase64] = useState<string | null>(null)
  const [fotoName, setFotoName] = useState<string | null>(null)
  const [fotoType, setFotoType] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Custom technician filter dropdown states
  const [showTecnicoFilterDropdown, setShowTecnicoFilterDropdown] = useState(false)
  const tecnicoFilterRef = useRef<HTMLDivElement>(null)

  // Hidden file input refs for camera/gallery
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  
  // State and ref for replacing existing update's image
  const [replacingUpdateDate, setReplacingUpdateDate] = useState<string | null>(null)
  const [updateToDeleteDate, setUpdateToDeleteDate] = useState<string | null>(null)
  const replaceImageInputRef = useRef<HTMLInputElement>(null)

  // Upload States
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const [importingFileName, setImportingFileName] = useState('')
  const [importResultMsg, setImportResultMsg] = useState('')
  const [isDoneImporting, setIsDoneImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lastImport, setLastImport] = useState<{ createdAt: string; userName: string } | null>(null)

  // Batch updates state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchUpdateText, setBatchUpdateText] = useState('')
  const [batchStatus, setBatchStatus] = useState<'PENDENTE_VENCIDA' | 'PENDENTE_NAO_VENCIDA' | 'EM_ANDAMENTO' | 'RESOLVIDO' | ''>('')
  const [batchActionDate, setBatchActionDate] = useState(new Date().toISOString().split('T')[0])
  const [showSelectedPreview, setShowSelectedPreview] = useState(false)

  // AI correction states
  const [isAiLoadingSingle, setIsAiLoadingSingle] = useState(false)
  const [isAiLoadingBatch, setIsAiLoadingBatch] = useState(false)

  const [pending, startTransition] = useTransition()

  // Handle clicking outside the custom technician dropdown filter to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tecnicoFilterRef.current && !tecnicoFilterRef.current.contains(event.target as Node)) {
        setShowTecnicoFilterDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setSelectedIds([])
  }, [arkiumSearch, statusFilter, classFilter, tecnicoFilter, selectedMonths, selectedYear, showInactive, activeTab])

  // Load Data
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    startTransition(async () => {
      const [ncRes, tecRes, importTimeRes] = await Promise.all([
        getNaoConformidades(),
        getTecnicos(),
        getLastImportTime('IMPORTAR_NAO_CONFORMIDADES')
      ])

      if (ncRes.success && ncRes.data) {
        setData(ncRes.data as any[])
      }
      if (tecRes.success && tecRes.data) {
        setTecnicos(tecRes.data)
      }
      if (importTimeRes.success && importTimeRes.data) {
        setLastImport(importTimeRes.data)
      } else if (importTimeRes.success && !importTimeRes.data) {
        setLastImport(null)
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

  // Filtered dataset specifically for stats cards (reflects filters except status filter)
  const filteredForStats = useMemo(() => {
    return filteredArkiumRaw.filter(item => {
      // Search
      const query = arkiumSearch.toLowerCase()
      const matchesSearch =
        (item.originalId || '').toLowerCase().includes(query) ||
        (item.audit || '').toLowerCase().includes(query) ||
        (item.executor || '').toLowerCase().includes(query) ||
        (item.questionario || '').toLowerCase().includes(query) ||
        (item.pergunta || '').toLowerCase().includes(query) ||
        (item.rCompl1 || '').toLowerCase().includes(query)

      // Classification
      const matchesClass = classFilter === 'ALL' || item.classificacao === classFilter

      // Technician
      const matchesTecnico = tecnicoFilter === 'ALL' || item.tecnicoId === tecnicoFilter

      return matchesSearch && matchesClass && matchesTecnico
    })
  }, [filteredArkiumRaw, arkiumSearch, classFilter, tecnicoFilter])

  // UI Stats for Arkium Tab
  const statsArkium = useMemo(() => {
    const total = filteredForStats.length
    const pendentesVencidas = filteredForStats.filter(i => i.status === 'PENDENTE_VENCIDA').length
    const pendentesNaoVencidas = filteredForStats.filter(i => i.status === 'PENDENTE_NAO_VENCIDA').length
    const emProcessamento = filteredForStats.filter(i => i.status === 'EM_ANDAMENTO').length
    const resolvidos = filteredForStats.filter(i => i.status === 'RESOLVIDO').length
    return { total, pendentesVencidas, pendentesNaoVencidas, emProcessamento, resolvidos }
  }, [filteredForStats])

  // Final search and dropdown filters applied to Arkium list
  const filteredArkium = useMemo(() => {
    return filteredArkiumRaw.filter(item => {
      // Search
      const query = arkiumSearch.toLowerCase()
      const matchesSearch =
        (item.originalId || '').toLowerCase().includes(query) ||
        (item.audit || '').toLowerCase().includes(query) ||
        (item.executor || '').toLowerCase().includes(query) ||
        (item.questionario || '').toLowerCase().includes(query) ||
        (item.pergunta || '').toLowerCase().includes(query) ||
        (item.rCompl1 || '').toLowerCase().includes(query)

      // Status
      let matchesStatus = false
      if (statusFilter === 'ALL') {
        matchesStatus = true
      } else {
        matchesStatus = item.status === statusFilter
      }

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
    let visibleTecnicos = tecnicos.filter(t => showInactive ? true : t.ativo !== false)

    // TST só vê o próprio registro
    if (isTst) {
      visibleTecnicos = visibleTecnicos.filter(t => t.id === userTecnicoId)
    }

    return visibleTecnicos.map(t => {
      // Find all NCs for this technician in the selected period
      const tNCs = data.filter(nc => nc.tecnicoId === t.id && isDateInPeriod(nc.dataAbertura))
      
      const pendentesVencidas = tNCs.filter(nc => nc.status === 'PENDENTE_VENCIDA').length
      const pendentesNaoVencidas = tNCs.filter(nc => nc.status === 'PENDENTE_NAO_VENCIDA').length
      const emProcessamento = tNCs.filter(nc => nc.status === 'EM_ANDAMENTO').length
      const resolvidos = tNCs.filter(nc => nc.status === 'RESOLVIDO').length
      const total = tNCs.length

      return {
        id: t.id,
        nome: t.nome,
        fotoUrl: t.fotoUrl,
        ativo: t.ativo,
        admissao: t.admissao ? new Date(t.admissao).toLocaleDateString('pt-BR') : '-',
        pendentesVencidas,
        pendentesNaoVencidas,
        emProcessamento,
        resolvidos,
        total
      }
    }).filter(t => {
      // Search filter
      const matchesSearch = t.nome.toLowerCase().includes(consolidadoSearch.toLowerCase())
      // If hiding inactive, only active or those with some data
      const matchesActivity = showInactive ? true : (t.ativo || t.total > 0)
      return matchesSearch && matchesActivity
    }).sort((a, b) => b.total - a.total)
  }, [tecnicos, data, selectedMonths, selectedYear, showInactive, consolidadoSearch, isTst, userTecnicoId])

  // Overall totals for Consolidado statistics
  const statsConsolidado = useMemo(() => {
    let pendentesVencidas = 0
    let pendentesNaoVencidas = 0
    let emProcessamento = 0
    let resolvidos = 0
    let total = 0

    consolidadoData.forEach(t => {
      pendentesVencidas += t.pendentesVencidas
      pendentesNaoVencidas += t.pendentesNaoVencidas
      emProcessamento += t.emProcessamento
      resolvidos += t.resolvidos
      total += t.total
    })

    return { pendentesVencidas, pendentesNaoVencidas, emProcessamento, resolvidos, total }
  }, [consolidadoData])

  // Pagination for Consolidado
  const totalPagesConsolidado = Math.ceil(consolidadoData.length / itemsPerPageConsolidado)
  const paginatedConsolidado = useMemo(() => {
    return consolidadoData.slice((currentPageConsolidado - 1) * itemsPerPageConsolidado, currentPageConsolidado * itemsPerPageConsolidado)
  }, [consolidadoData, currentPageConsolidado])

  useEffect(() => {
    setCurrentPageConsolidado(1)
  }, [consolidadoSearch, selectedMonths, selectedYear, showInactive])

  useEffect(() => {
    setCurrentPageArkium(1)
  }, [arkiumSearch, statusFilter, classFilter, tecnicoFilter, selectedMonths, selectedYear, showInactive])


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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[]

        if (jsonData.length === 0) {
          throw new Error("Nenhum dado encontrado na planilha.")
        }

        const firstRow = jsonData[0]
        const rowKeys = Object.keys(firstRow)
        const findMatch = (keysList: string[]) => {
          // 1. Try exact normalized match first
          for (const k of keysList) {
            const normalizedK = k.toLowerCase().replace(/[^a-z0-9]/g, '')
            const match = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedK)
            if (match) return match
          }
          // 2. Try substring match (only if candidate key is at least 3 characters to avoid false matches)
          for (const k of keysList) {
            const normalizedK = k.toLowerCase().replace(/[^a-z0-9]/g, '')
            if (normalizedK.length < 3) continue
            const match = rowKeys.find(rk => {
              const normalizedRk = rk.toLowerCase().replace(/[^a-z0-9]/g, '')
              return normalizedRk.includes(normalizedK) || normalizedK.includes(normalizedRk)
            })
            if (match) return match
          }
          return null
        }

        const matchedKeys = {
          id: findMatch(['Id', 'ID', 'Identificador', 'RES_ID', 'RESID']),
          executor: findMatch(['Executor', 'COLABORADOR', 'Exec.', 'Ativo da resposta', 'Ativodaresposta']),
          responsavel: findMatch(['Responsável', 'Responsavel', 'Responsável/executor', 'Responsavel/executor', 'Ativo da resposta', 'Ativodaresposta']),
          pergunta: findMatch(['Pergunta', 'Questão', 'PER_DESCRICAO', 'PERDESCRICAO']),
          resposta: findMatch(['Resposta']),
          classificacao: findMatch(['Classificação', 'Classificacao', 'Gravidade', 'PER_CLASSIFICACAO', 'PERCLASSIFICACAO']),
          localidade: findMatch(['Localidade', 'Cidade']),
          base: findMatch(['Base', 'Unidade', 'NEG_ID', 'NEGID']),
          questionario: findMatch(['Questionário', 'Questionario', 'Checklist']),
          compl1: findMatch(['Compl. 1', 'Compl1', 'RES_COMPL1', 'RESCOMPL1']),
          rCompl1: findMatch(['R. Compl. 1', 'R. Compl1', 'R.Compl.1', 'RCompl1', 'Detalhamento']),
          situacao: findMatch(['Situação', 'Situacao', 'Status', 'Sit.', 'Situacao']),
          // Try direct key name first (covers 'Audit.' exactly), then normalized matches
          audit: rowKeys.find(k => k.trim() === 'Audit.') ||
                 rowKeys.find(k => k.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === 'audit') ||
                 findMatch(['Audit', 'Auditoria', 'HEA_RES_ID', 'HEARESID'])
        }

        // Debug: show what was found for audit key
        console.log('[NC Import] rowKeys:', rowKeys)
        console.log('[NC Import] audit key matched:', matchedKeys.audit)
        if (matchedKeys.audit) console.log('[NC Import] first row audit value:', jsonData[0][matchedKeys.audit])

        const dataAberturaKey = findMatch(['Data Abertura', 'DataAbertura', 'Abertura', 'HEA_DT_ABERTURA', 'HEADTABERTURA'])

        setImportProgress('Validando registros...')
        const itemsToUpsert = jsonData
          .filter(row => {
            const idVal = row[matchedKeys.id || 'Id']
            return idVal !== undefined && idVal !== null && String(idVal).trim() !== ''
          })
          .map(row => {
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
            const rawSituacao = String(row[matchedKeys.situacao || 'Situação'] || '')
            const mappedStatus = mapArkiumStatus(rawSituacao)
            const audit = matchedKeys.audit && row[matchedKeys.audit] != null ? String(row[matchedKeys.audit]).trim() : ''
            
            // Se o originalId vier como '0000000' ou similar e o audit existir, usar o audit como fallback visual
            const originalId = String(row[matchedKeys.id || 'Id'] || '')

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
              audit,
              dataAbertura: parsedDate ? parsedDate.toISOString() : null,
              status: mappedStatus
            }
          })

        setImportProgress(`Enviando registros mapeados...`)
        const res = await upsertNaoConformidadesBatch(itemsToUpsert)

        if (res.success) {
          setImportResultMsg(`Importação concluída! ${res.inseridos} registros vinculados a nossos técnicos foram importados e ${res.atualizados} foram atualizados. Registros de terceiros foram ignorados. [Coluna Audit mapeada: "${matchedKeys.audit || 'Não encontrada'}"]`)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem não deve exceder 5MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = (evt) => {
      setFotoBase64(evt.target?.result as string)
      setFotoName(file.name)
      setFotoType(file.type)
    }
    reader.readAsDataURL(file)
  }

  // Handle updates modal
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || !newUpdateText.trim()) return

    startTransition(async () => {
      let uploadedUrl = ''
      if (fotoBase64) {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('fileData', fotoBase64)
        formData.append('fileName', fotoName || 'foto.jpg')
        formData.append('contentType', fotoType || 'image/jpeg')
        const uploadRes = await uploadNaoConformidadeEvidencia(formData)
        setIsUploading(false)
        if (uploadRes.success && uploadRes.url) {
          uploadedUrl = uploadRes.url
        } else {
          alert("Erro ao fazer upload da foto: " + uploadRes.error)
          return
        }
      }

      const res = await addNaoConformidadeUpdate(selectedItem.id, newUpdateText, modalStatus, actionDate, uploadedUrl)
      if (res.success && res.data) {
        setSelectedItem(res.data as any)
        setNewUpdateText('')
        setFotoBase64(null)
        setFotoName(null)
        setFotoType(null)
        setActionDate(new Date().toISOString().split('T')[0])
        await loadData()
      } else {
        alert("Erro ao salvar atualização: " + res.error)
      }
    })
  }

  const handleBatchUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.length === 0 || !batchUpdateText.trim()) return

    startTransition(async () => {
      let uploadedUrl = ''
      if (fotoBase64) {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('fileData', fotoBase64)
        formData.append('fileName', fotoName || 'foto.jpg')
        formData.append('contentType', fotoType || 'image/jpeg')
        const uploadRes = await uploadNaoConformidadeEvidencia(formData)
        setIsUploading(false)
        if (uploadRes.success && uploadRes.url) {
          uploadedUrl = uploadRes.url
        } else {
          alert("Erro ao fazer upload da foto: " + uploadRes.error)
          return
        }
      }

      const res = await addNaoConformidadeUpdatesBatch(
        selectedIds,
        batchUpdateText,
        batchStatus || undefined,
        batchActionDate,
        uploadedUrl
      )

      if (res.success) {
        setBatchUpdateText('')
        setFotoBase64(null)
        setFotoName(null)
        setFotoType(null)
        setBatchStatus('')
        setBatchActionDate(new Date().toISOString().split('T')[0])
        setSelectedIds([])
        setShowBatchModal(false)
        await loadData()
        alert("Ações registradas em lote com sucesso!")
      } else {
        alert("Erro ao salvar atualizações: " + res.error)
      }
    })
  }

  const handleStatusChange = async (newStatus: 'PENDENTE_VENCIDA' | 'PENDENTE_NAO_VENCIDA' | 'EM_ANDAMENTO' | 'RESOLVIDO') => {
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

  const handleDeleteUpdate = async (updateDate: string) => {
    if (!selectedItem) return

    startTransition(async () => {
      const res = await deleteNaoConformidadeUpdate(selectedItem.id, updateDate)
      if (res.success && res.data) {
        setSelectedItem(res.data as any)
        await loadData()
      } else {
        alert("Erro ao excluir ação: " + res.error)
      }
    })
  }

  const handleReplaceImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedItem || !replacingUpdateDate) return
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem não deve exceder 5MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string
      
      startTransition(async () => {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('fileData', base64)
        formData.append('fileName', file.name)
        formData.append('contentType', file.type)
        
        const uploadRes = await uploadNaoConformidadeEvidencia(formData)
        setIsUploading(false)
        
        if (uploadRes.success && uploadRes.url) {
          const res = await replaceNaoConformidadeUpdateImage(selectedItem.id, replacingUpdateDate, uploadRes.url)
          if (res.success && res.data) {
            setSelectedItem(res.data as any)
            await loadData()
          } else {
            alert("Erro ao associar a nova foto: " + res.error)
          }
        } else {
          alert("Erro ao fazer upload da nova foto: " + uploadRes.error)
        }
        
        setReplacingUpdateDate(null)
        if (replaceImageInputRef.current) replaceImageInputRef.current.value = ''
      })
    }
    reader.readAsDataURL(file)
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
            Não Conformidades
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Selecionar Período</span>
                  {lastImport && (
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                      Última atualização: {new Date(lastImport.createdAt).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
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
            <div 
              onClick={() => setShowGraficoModal(true)}
              style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(102,0,153,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Resumo do Período</span>
                <span style={{ background: 'rgba(102,0,153,0.1)', color: PURPLE, fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                  {selectedMonths.length} MÊS(ES)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Pendentes Vencidas</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{statsConsolidado.pendentesVencidas}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Pendentes N. Vencidas</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#3b82f6' }}>{statsConsolidado.pendentesNaoVencidas}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Em Processamento</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{statsConsolidado.emProcessamento}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Resolvidos</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{statsConsolidado.resolvidos}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Total Geral</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#334155' }}>{statsConsolidado.total}</span>
                </div>
              </div>
              <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginTop: 12, fontWeight: 600, textAlign: 'center' }}>📊 Clique para ver gráfico mês a mês</span>
            </div>
          </div>

          {/* Search bar & active count — oculto para TST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!isTst && (
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
          )}

            {/* Matrix Table */}
            <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Vencidas</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Não Vencidas</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Em Processamento</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Resolvidos</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Total</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending ? (
                      <tr>
                        <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                          <Loader2 size={24} color={PURPLE} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                          Carregando dados...
                        </td>
                      </tr>
                    ) : paginatedConsolidado.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Nenhum técnico encontrado.</td></tr>
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
                          <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: t.pendentesVencidas > 0 ? '#ef4444' : '#64748b' }}>
                            {t.pendentesVencidas}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: t.pendentesNaoVencidas > 0 ? '#3b82f6' : '#64748b' }}>
                            {t.pendentesNaoVencidas}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: t.emProcessamento > 0 ? '#f59e0b' : '#64748b' }}>
                            {t.emProcessamento}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: t.resolvidos > 0 ? '#10b981' : '#64748b' }}>
                            {t.resolvidos}
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
            {consolidadoData.length > 0 && (
              <div style={{
                padding: '16px 20px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                    Mostrando de {(currentPageConsolidado - 1) * itemsPerPageConsolidado + 1} a {Math.min(currentPageConsolidado * itemsPerPageConsolidado, consolidadoData.length)} de {consolidadoData.length} técnicos
                  </span>
                  <select
                    value={itemsPerPageConsolidado}
                    onChange={(e) => {
                      setItemsPerPageConsolidado(Number(e.target.value))
                      setCurrentPageConsolidado(1)
                    }}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', cursor: 'pointer' }}
                  >
                    <option value={10}>10 por página</option>
                    <option value={20}>20 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                  </select>
                </div>
                
                {totalPagesConsolidado > 1 && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setCurrentPageConsolidado(p => Math.max(1, p - 1))}
                      disabled={currentPageConsolidado === 1}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPageConsolidado === 1 ? '#f1f5f9' : '#fff', color: currentPageConsolidado === 1 ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 700, cursor: currentPageConsolidado === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPageConsolidado(p => Math.min(totalPagesConsolidado, p + 1))}
                      disabled={currentPageConsolidado === totalPagesConsolidado}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPageConsolidado === totalPagesConsolidado ? '#f1f5f9' : '#fff', color: currentPageConsolidado === totalPagesConsolidado ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 700, cursor: currentPageConsolidado === totalPagesConsolidado ? 'not-allowed' : 'pointer' }}
                    >
                      Próxima
                    </button>
                  </div>
                )}
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
            <div style={{ flex: 1, minWidth: 150, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #64748b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
                <ListTodo size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Total</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{statsArkium.total}</div>
            </div>

            <div style={{ flex: 1, minWidth: 150, background: '#fff', border: '1px solid #fee2e2', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c' }}>
                <AlertTriangle size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Vencidas</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{statsArkium.pendentesVencidas}</div>
            </div>

            <div style={{ flex: 1, minWidth: 150, background: '#fff', border: '1px solid #dbeafe', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1d4ed8' }}>
                <Clock size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Não Vencidas</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{statsArkium.pendentesNaoVencidas}</div>
            </div>

            <div style={{ flex: 1, minWidth: 150, background: '#fff', border: '1px solid #fef3c7', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309' }}>
                <PlayCircle size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Processamento</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{statsArkium.emProcessamento}</div>
            </div>

            <div style={{ flex: 1, minWidth: 150, background: '#fff', border: '1px solid #d1fae5', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#047857' }}>
                <CheckCircle2 size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Resolvidos</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{statsArkium.resolvidos}</div>
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
                {lastImport && (
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span>Último upload: <strong>{new Date(lastImport.createdAt).toLocaleString('pt-BR')}</strong></span>
                    <span>Por: <strong>{lastImport.userName}</strong></span>
                  </div>
                )}
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
                    placeholder="Buscar por código, audit, executor ou pergunta..."
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
                  <option value="PENDENTE_VENCIDA">Pendentes Vencidas</option>
                  <option value="PENDENTE_NAO_VENCIDA">Pendentes Não Vencidas</option>
                  <option value="EM_ANDAMENTO">Pendentes em Processamento</option>
                  <option value="RESOLVIDO">Resolvidos</option>
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
                  <div ref={tecnicoFilterRef} style={{ position: 'relative' }}>
                    <div
                      onClick={() => setShowTecnicoFilterDropdown(v => !v)}
                      style={{
                        padding: '8px 12px', borderRadius: 8, border: `1px solid ${showTecnicoFilterDropdown ? PURPLE : '#e2e8f0'}`,
                        cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                        fontWeight: 600, color: '#334155', transition: 'all 0.2s', height: '100%', minHeight: 37,
                        boxShadow: showTecnicoFilterDropdown ? `0 0 0 3px rgba(102,0,153,0.1)` : 'none'
                      }}
                    >
                      {tecnicoFilter === 'ALL' ? (
                        <>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#64748b', flexShrink: 0 }}>👥</div>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Todos os técnicos</span>
                        </>
                      ) : (() => {
                        const t = tecnicos.find(x => x.id === tecnicoFilter)
                        if (!t) return <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Todos os técnicos</span>
                        return (
                          <>
                            {t.fotoUrl ? (
                              <img src={t.fotoUrl} alt={t.nome} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#660099,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                {t.nome.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 140 }}>{t.nome}</span>
                          </>
                        )
                      })()}
                      <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 10, flexShrink: 0 }}>{showTecnicoFilterDropdown ? '▲' : '▼'}</span>
                    </div>

                    {showTecnicoFilterDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, maxHeight: 240, overflowY: 'auto',
                        minWidth: 240
                      }}>
                        {/* Option: Todos */}
                        <div
                          onClick={() => { setTecnicoFilter('ALL'); setCurrentPageArkium(1); setShowTecnicoFilterDropdown(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9', background: tecnicoFilter === 'ALL' ? 'rgba(102,0,153,0.06)' : '#fff',
                            fontSize: 13, fontWeight: 600, color: '#334155'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(102,0,153,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = tecnicoFilter === 'ALL' ? 'rgba(102,0,153,0.06)' : '#fff')}
                        >
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>👥</div>
                          <span>Todos os técnicos</span>
                          {tecnicoFilter === 'ALL' && <span style={{ marginLeft: 'auto', color: PURPLE, fontWeight: 800 }}>✓</span>}
                        </div>

                        {/* List other technicians, filtered by active status if showInactive is false */}
                        {tecnicos.filter(t => showInactive ? true : t.ativo !== false).map(t => (
                          <div
                            key={t.id}
                            onClick={() => { setTecnicoFilter(t.id); setCurrentPageArkium(1); setShowTecnicoFilterDropdown(false); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9', background: tecnicoFilter === t.id ? 'rgba(102,0,153,0.06)' : '#fff',
                              fontSize: 13, fontWeight: 600, color: '#334155'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(102,0,153,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = tecnicoFilter === t.id ? 'rgba(102,0,153,0.06)' : '#fff')}
                          >
                            {t.fotoUrl ? (
                              <img src={t.fotoUrl} alt={t.nome} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#660099,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                {t.nome.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{t.nome}</span>
                              {t.ativo === false && <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>Inativo</span>}
                            </div>
                            {tecnicoFilter === t.id && <span style={{ marginLeft: 'auto', color: PURPLE, fontWeight: 800, flexShrink: 0 }}>✓</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ cursor: 'pointer' }} />
                  Mostrar técnicos inativos
                </label>
              </div>
            </div>

            {selectedIds.length > 0 && (() => {
              const selectedItems = data.filter(d => selectedIds.includes(d.id))
              return (
                <div style={{
                  background: 'rgba(102,0,153,0.05)', border: `1px solid ${PURPLE}`, borderRadius: 10,
                  padding: '12px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: PURPLE }}>
                        {selectedIds.length} {selectedIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
                      </span>
                      <button
                        onClick={() => setShowSelectedPreview(v => !v)}
                        style={{ background: 'none', border: `1px solid ${PURPLE}`, borderRadius: 6, color: PURPLE, fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '2px 10px' }}
                      >
                        {showSelectedPreview ? 'Ocultar' : 'Visualizar'}
                      </button>
                      <button
                        onClick={() => { setSelectedIds([]); setShowSelectedPreview(false); }}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Limpar seleção
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setBatchUpdateText('');
                        setFotoBase64(null);
                        setFotoName(null);
                        setFotoType(null);
                        setBatchStatus('');
                        setBatchActionDate(new Date().toISOString().split('T')[0]);
                        setShowBatchModal(true);
                      }}
                      style={{
                        background: PURPLE, color: '#fff', border: 'none', padding: '8px 16px',
                        borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6
                      }}
                    >
                      <PlusCircle size={15} />
                      Inserir Ação em Lote
                    </button>
                  </div>

                  {showSelectedPreview && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                      {selectedItems.map(item => {
                        let dotColor = '#3b82f6'
                        if (item.status === 'PENDENTE_VENCIDA') dotColor = '#ef4444'
                        else if (item.status === 'EM_ANDAMENTO') dotColor = '#f59e0b'
                        else if (item.status === 'RESOLVIDO') dotColor = '#10b981'
                        return (
                          <div key={item.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: '#fff', borderRadius: 8, padding: '8px 12px',
                            border: '1px solid #e2e8f0', fontSize: 12
                          }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                            <span style={{ fontWeight: 800, color: '#334155', flexShrink: 0 }}>#{item.audit || item.originalId}</span>
                            <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {item.executor} — {item.localidade}
                            </span>
                            <button
                              onClick={() => setSelectedIds(prev => prev.filter(id => id !== item.id))}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center' }}
                              title="Remover da seleção"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Arkium Table */}
            <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '12px 16px', width: 40 }}>
                        <input
                          type="checkbox"
                          checked={paginatedArkium.length > 0 && paginatedArkium.every(item => selectedIds.includes(item.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const pageIds = paginatedArkium.map(item => item.id)
                              setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])))
                            } else {
                              const pageIds = paginatedArkium.map(item => item.id)
                              setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)))
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Cód. Arkium</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Audit.</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data Abertura</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Executor / Técnico</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Questionário / Pergunta</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Localidade</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center', width: 60 }}>Grav.</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center', width: 60 }}>Sit.</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending ? (
                      <tr>
                        <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                          <Loader2 size={24} color={PURPLE} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                          Carregando dados...
                        </td>
                      </tr>
                    ) : paginatedArkium.length === 0 ? (
                      <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Nenhuma não conformidade encontrada para os filtros selecionados.</td></tr>
                    ) : (
                      paginatedArkium.map(item => {
                        const dateLabel = item.dataAbertura
                          ? new Date(item.dataAbertura).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                          : '-'

                        let statusBadge = { bg: '#dbeafe', text: '#1d4ed8', label: 'Pendente (N. Venc.)' }
                        if (item.status === 'PENDENTE_VENCIDA') {
                          statusBadge = { bg: '#fee2e2', text: '#ef4444', label: 'Pendente (Vencida)' }
                        } else if (item.status === 'EM_ANDAMENTO') {
                          statusBadge = { bg: '#fef3c7', text: '#d97706', label: 'Em Processamento' }
                        } else if (item.status === 'RESOLVIDO') {
                          statusBadge = { bg: '#d1fae5', text: '#10b981', label: 'Resolvido' }
                        }

                        const rowBg = item.status === 'PENDENTE_VENCIDA'
                          ? '#fff5f5'
                          : item.status === 'EM_ANDAMENTO'
                            ? '#fffbeb'
                            : '#fff'

                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: rowBg }}>
                            <td style={{ padding: '12px 16px', width: 40 }}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIds(prev => [...prev, item.id])
                                  } else {
                                    setSelectedIds(prev => prev.filter(id => id !== item.id))
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                              #{item.originalId}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 800, color: PURPLE }}>
                              {item.audit || '-'}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#475569' }}>
                              {dateLabel}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', width: 48 }}>
                              {(() => {
                                const label = item.tecnico
                                  ? `${item.executor} \u2192 ${item.tecnico.nome}`
                                  : item.executor || '-'
                                if (item.tecnico?.fotoUrl) {
                                  return (
                                    <img
                                      src={item.tecnico.fotoUrl}
                                      alt={item.tecnico.nome}
                                      title={label}
                                      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${PURPLE}`, cursor: 'help', display: 'block', margin: '0 auto' }}
                                    />
                                  )
                                }
                                const initials = (item.tecnico?.nome || item.executor || '?').substring(0, 2).toUpperCase()
                                return (
                                  <div
                                    title={label}
                                    style={{
                                      width: 32, height: 32, borderRadius: '50%', margin: '0 auto', cursor: 'help',
                                      background: item.tecnico ? 'linear-gradient(135deg,#660099,#9333ea)' : '#e2e8f0',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 11, fontWeight: 800,
                                      color: item.tecnico ? '#fff' : '#64748b',
                                      border: item.tecnico ? `2px solid ${PURPLE}` : '2px solid #cbd5e1'
                                    }}
                                  >
                                    {initials}
                                  </div>
                                )
                              })()}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, maxWidth: 300 }}>
                              <div style={{ fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.questionario}</div>
                              <div style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{item.pergunta}</div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                              {item.localidade || '-'}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12, textAlign: 'center' }} title={item.classificacao || 'Normal'}>
                              <div style={{
                                width: 12, height: 12, borderRadius: '50%', margin: '0 auto', cursor: 'help',
                                background: item.classificacao?.toLowerCase().includes('grave') ? '#ef4444' : '#94a3b8',
                                boxShadow: `0 0 0 3px ${item.classificacao?.toLowerCase().includes('grave') ? '#fecaca' : '#f1f5f9'}`
                              }} />
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12, textAlign: 'center' }} title={statusBadge.label}>
                              <div style={{
                                width: 12, height: 12, borderRadius: '50%', margin: '0 auto', cursor: 'help',
                                background: statusBadge.text,
                                boxShadow: `0 0 0 3px ${statusBadge.bg}`
                              }} />
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
            {filteredArkium.length > 0 && (
              <div style={{
                padding: '16px 20px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                    Mostrando de {(currentPageArkium - 1) * itemsPerPageArkium + 1} a {Math.min(currentPageArkium * itemsPerPageArkium, filteredArkium.length)} de {filteredArkium.length} registros
                  </span>
                  <select
                    value={itemsPerPageArkium}
                    onChange={(e) => {
                      setItemsPerPageArkium(Number(e.target.value))
                      setCurrentPageArkium(1)
                    }}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', cursor: 'pointer' }}
                  >
                    <option value={10}>10 por página</option>
                    <option value={20}>20 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                  </select>
                </div>
                
                {totalPagesArkium > 1 && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setCurrentPageArkium(p => Math.max(1, p - 1))}
                      disabled={currentPageArkium === 1}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPageArkium === 1 ? '#f1f5f9' : '#fff', color: currentPageArkium === 1 ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 700, cursor: currentPageArkium === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPageArkium(p => Math.min(totalPagesArkium, p + 1))}
                      disabled={currentPageArkium === totalPagesArkium}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPageArkium === totalPagesArkium ? '#f1f5f9' : '#fff', color: currentPageArkium === totalPagesArkium ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 700, cursor: currentPageArkium === totalPagesArkium ? 'not-allowed' : 'pointer' }}
                    >
                      Próxima
                    </button>
                  </div>
                )}
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
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            overflow: 'hidden'
          }}>
            {/* Modal Header — fixo */}
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #660099, #9333ea)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>
                  Não Conformidade #{selectedItem.audit || selectedItem.originalId}
                </h3>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                  {selectedItem.questionario}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content — scrollável */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flex: 1 }}>
              {/* Info Grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16, background: '#f8fafc', borderRadius: 10, padding: 16
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Data Abertura</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                    {selectedItem.dataAbertura ? new Date(selectedItem.dataAbertura).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Audit</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                    {selectedItem.audit || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Localidade / Base</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                    {selectedItem.localidade} ({selectedItem.base})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Gravidade</div>
                  <div style={{ marginTop: 2 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11,
                      background: selectedItem.classificacao?.toLowerCase().includes('grave') ? '#fef2f2' : '#f8fafc',
                      color: selectedItem.classificacao?.toLowerCase().includes('grave') ? '#ef4444' : '#64748b',
                      border: `1px solid ${selectedItem.classificacao?.toLowerCase().includes('grave') ? '#fecaca' : '#e2e8f0'}`
                    }}>
                      {selectedItem.classificacao || 'Normal'}
                    </span>
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
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Importado em</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                    {selectedItem.importadoEm ? new Date(selectedItem.importadoEm).toLocaleString('pt-BR') : '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Situação Atual</div>
                  <div style={{ marginTop: 2 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11,
                      background: selectedItem.status === 'RESOLVIDO' ? '#d1fae5' : selectedItem.status === 'EM_ANDAMENTO' ? '#fef3c7' : '#fee2e2',
                      color: selectedItem.status === 'RESOLVIDO' ? '#10b981' : selectedItem.status === 'EM_ANDAMENTO' ? '#d97706' : '#ef4444'
                    }}>
                      {selectedItem.status === 'RESOLVIDO' ? 'Resolvido' : selectedItem.status === 'EM_ANDAMENTO' ? 'Em Processamento' : 'Pendente'}
                    </span>
                  </div>
                </div>
              </div>

              {/* QA Section */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: '0 0 16px 0' }}>
                  Detalhes da Ocorrência
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#f8fafc', padding: 16, borderRadius: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Pergunta</span>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b', margin: '4px 0 0' }}>
                      {selectedItem.pergunta}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Resposta do Checklist</span>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', margin: '4px 0 0' }}>
                        {selectedItem.resposta || '-'}
                      </p>
                    </div>
                    {selectedItem.compl1 && (
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Complemento (Compl. 1)</span>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: '4px 0 0' }}>
                          {selectedItem.compl1}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Detalhamento / Justificativa (R. Compl. 1)</span>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: '#b91c1c', margin: '4px 0 0', background: 'rgba(239,68,68,0.05)', padding: 10, borderRadius: 6, borderLeft: '3px solid #ef4444' }}>
                      {selectedItem.rCompl1 || 'Não informado'}
                    </p>
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
                      <div key={idx} style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid #cbd5e1', paddingBottom: 8 }}>
                        <div style={{
                          position: 'absolute', left: -6, top: 4, width: 10, height: 10,
                          borderRadius: '50%', background: PURPLE
                        }} />
                        
                        {/* Upper content / Delete & Replace Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ fontSize: 13, color: '#334155', fontWeight: 500, flex: 1 }}>
                            {up.text}
                          </div>
                          
                          {/* Admin/Master actions */}
                          {isMasterOrAdmin && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <button
                                type="button"
                                title="Substituir Imagem"
                                onClick={() => {
                                  setReplacingUpdateDate(up.date)
                                  replaceImageInputRef.current?.click()
                                }}
                                style={{
                                  background: 'none', border: 'none', color: PURPLE, cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4,
                                  borderRadius: 4, transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(102,0,153,0.06)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                <Camera size={14} />
                              </button>
                              <button
                                type="button"
                                title="Excluir Ação"
                                onClick={() => setUpdateToDeleteDate(up.date)}
                                style={{
                                  background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4,
                                  borderRadius: 4, transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>

                        {up.fotoUrl && (
                          <div style={{ marginTop: 8 }}>
                            <img
                              src={up.fotoUrl}
                              alt="Evidência"
                              style={{
                                maxWidth: '100%',
                                maxHeight: 180,
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                objectFit: 'contain',
                                cursor: 'pointer',
                                display: 'block'
                              }}
                              onClick={() => window.open(up.fotoUrl!, '_blank')}
                            />
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>Por <strong>{up.author}</strong> em {new Date(up.date).toLocaleString('pt-BR')}</span>
                          {up.actionDate && (
                            <span>• Data da Ação: <strong>{new Date(up.actionDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}</strong></span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Hidden input for replacing image */}
                    <input
                      type="file"
                      accept="image/*"
                      ref={replaceImageInputRef}
                      onChange={handleReplaceImageChange}
                      style={{ display: 'none' }}
                    />
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
                        <option value="PENDENTE_NAO_VENCIDA">Pendente Não Vencida</option>
                        <option value="PENDENTE_VENCIDA">Pendente Vencida</option>
                        <option value="EM_ANDAMENTO">Em Processamento</option>
                        <option value="RESOLVIDO">Resolvido</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={newUpdateText}
                      onChange={e => setNewUpdateText(e.target.value)}
                      placeholder="Descreva a ação tomada (ex. Enviei e-mail solicitando correção ao responsável...)"
                      required
                      rows={3}
                      style={{
                        width: '100%', padding: 10, paddingRight: 44, borderRadius: 8, border: '1px solid #cbd5e1',
                        fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      title="Corrigir e melhorar com IA"
                      disabled={isAiLoadingSingle || !newUpdateText.trim()}
                      onClick={async () => {
                        if (!newUpdateText.trim()) return
                        setIsAiLoadingSingle(true)
                        const res = await optimizeTextWithAI(newUpdateText)
                        if (res.success && res.text) setNewUpdateText(res.text)
                        setIsAiLoadingSingle(false)
                      }}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        background: isAiLoadingSingle ? '#f1f5f9' : 'linear-gradient(135deg, #660099, #9333ea)',
                        border: 'none', borderRadius: 6, width: 30, height: 30,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: (!newUpdateText.trim() || isAiLoadingSingle) ? 'not-allowed' : 'pointer',
                        opacity: (!newUpdateText.trim() || isAiLoadingSingle) ? 0.5 : 1,
                        transition: 'all 0.2s', flexShrink: 0
                      }}
                    >
                      {isAiLoadingSingle
                        ? <Loader2 size={14} color={PURPLE} style={{ animation: 'spin 1s linear infinite' }} />
                        : <span style={{ fontSize: 14, lineHeight: 1 }}>✨</span>
                      }
                    </button>
                  </div>

                  {/* Two column layout for Date and Photo upload */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                        Data da Ação
                      </label>
                      <input
                        type="date"
                        required
                        value={actionDate}
                        onChange={e => setActionDate(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8,
                          border: '1px solid #cbd5e1', fontSize: 13, outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                        Anexar Foto de Evidência
                      </label>
                      
                      <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                      <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

                      {fotoBase64 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)', height: 38 }}>
                          <img src={fotoBase64} alt="Preview" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />
                          <div style={{ flex: 1, overflow: 'hidden', fontSize: 11, color: '#065f46', fontWeight: 600, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {fotoName}
                          </div>
                          <button
                            type="button"
                            onClick={() => { setFotoBase64(null); setFotoName(null); setFotoType(null); }}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            style={{
                              flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px dashed #cbd5e1',
                              background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, height: 38
                            }}
                          >
                            <Camera size={14} /> Foto
                          </button>
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            style={{
                              flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px dashed #cbd5e1',
                              background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, height: 38
                            }}
                          >
                            <UploadCloud size={14} /> Galeria
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={pending || isUploading}
                      style={{
                        padding: '8px 18px', background: PURPLE, color: '#fff', border: 'none',
                        borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: (pending || isUploading) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, opacity: (pending || isUploading) ? 0.7 : 1
                      }}
                    >
                      {(pending || isUploading) ? (
                        <>
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          {isUploading ? 'Enviando Imagem...' : 'Adicionando Ação...'}
                        </>
                      ) : (
                        <>
                          <PlusCircle size={14} />
                          Adicionar Ação
                        </>
                      )}
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

      {/* Modal de Confirmação de Exclusão de Ação */}
      {updateToDeleteDate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '90%', maxWidth: 440,
            padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: '#fee2e2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444'
            }}>
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0' }}>
                Excluir Ação?
              </h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Esta ação é <strong>irreversível</strong> e também removerá permanentemente qualquer imagem de evidência associada do servidor. Tem certeza que deseja prosseguir?
              </p>
            </div>
            <div style={{ display: 'flex', width: '100%', gap: 12, marginTop: 8 }}>
              <button
                onClick={() => setUpdateToDeleteDate(null)}
                style={{
                  flex: 1, padding: '10px 16px', background: '#f1f5f9', color: '#475569',
                  border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const dateToDel = updateToDeleteDate
                  setUpdateToDeleteDate(null)
                  await handleDeleteUpdate(dateToDel)
                }}
                style={{
                  flex: 1, padding: '10px 16px', background: '#ef4444', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ações em Lote */}
      {showBatchModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '90%', maxWidth: 600,
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
                  Registrar Ação em Lote ({selectedIds.length} {selectedIds.length === 1 ? 'item' : 'itens'})
                </h3>
                <span style={{ fontSize: 12, color: PURPLE, fontWeight: 600 }}>
                  A ação será registrada no histórico de todos os itens selecionados.
                </span>
              </div>
              <button
                onClick={() => { setShowBatchModal(false); setFotoBase64(null); setFotoName(null); setFotoType(null); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleBatchUpdate} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Nova Situação:</span>
                  <select
                    value={batchStatus}
                    onChange={e => setBatchStatus(e.target.value as any)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', background: '#fff', color: '#334155' }}
                  >
                    <option value="">Manter status atual de cada item</option>
                    <option value="PENDENTE_NAO_VENCIDA">Pendente Não Vencida</option>
                    <option value="PENDENTE_VENCIDA">Pendente Vencida</option>
                    <option value="EM_ANDAMENTO">Em Processamento</option>
                    <option value="RESOLVIDO">Resolvido</option>
                  </select>
                </div>

                <div style={{ position: 'relative' }}>
                  <textarea
                    value={batchUpdateText}
                    onChange={e => setBatchUpdateText(e.target.value)}
                    placeholder="Descreva a ação a ser inserida para todos os itens selecionados..."
                    required
                    rows={4}
                    style={{
                      width: '100%', padding: 12, paddingRight: 48, borderRadius: 8, border: '1px solid #cbd5e1',
                      fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    title="Corrigir e melhorar com IA"
                    disabled={isAiLoadingBatch || !batchUpdateText.trim()}
                    onClick={async () => {
                      if (!batchUpdateText.trim()) return
                      setIsAiLoadingBatch(true)
                      const res = await optimizeTextWithAI(batchUpdateText)
                      if (res.success && res.text) setBatchUpdateText(res.text)
                      setIsAiLoadingBatch(false)
                    }}
                    style={{
                      position: 'absolute', top: 10, right: 10,
                      background: isAiLoadingBatch ? '#f1f5f9' : 'linear-gradient(135deg, #660099, #9333ea)',
                      border: 'none', borderRadius: 6, width: 32, height: 32,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: (!batchUpdateText.trim() || isAiLoadingBatch) ? 'not-allowed' : 'pointer',
                      opacity: (!batchUpdateText.trim() || isAiLoadingBatch) ? 0.5 : 1,
                      transition: 'all 0.2s', flexShrink: 0
                    }}
                  >
                    {isAiLoadingBatch
                      ? <Loader2 size={14} color={PURPLE} style={{ animation: 'spin 1s linear infinite' }} />
                      : <span style={{ fontSize: 16, lineHeight: 1 }}>✨</span>
                    }
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      Data da Ação
                    </label>
                    <input
                      type="date"
                      required
                      value={batchActionDate}
                      onChange={e => setBatchActionDate(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: '1px solid #cbd5e1', fontSize: 13, outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      Anexar Foto de Evidência
                    </label>
                    
                    <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                    <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

                    {fotoBase64 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)', height: 38 }}>
                        <img src={fotoBase64} alt="Preview" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />
                        <div style={{ flex: 1, overflow: 'hidden', fontSize: 11, color: '#065f46', fontWeight: 600, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fotoName}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setFotoBase64(null); setFotoName(null); setFotoType(null); }}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          style={{
                            flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px dashed #cbd5e1',
                            background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, height: 38
                          }}
                        >
                          <Camera size={14} /> Foto
                        </button>
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          style={{
                            flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px dashed #cbd5e1',
                            background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, height: 38
                          }}
                        >
                          <UploadCloud size={14} /> Galeria
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={() => { setShowBatchModal(false); setFotoBase64(null); setFotoName(null); setFotoType(null); }}
                  style={{
                    padding: '8px 18px', border: '1px solid #cbd5e1', borderRadius: 8,
                    fontSize: 13, fontWeight: 700, background: '#fff', color: '#475569', cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending || isUploading}
                  style={{
                    padding: '8px 18px', background: PURPLE, color: '#fff', border: 'none',
                    borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (pending || isUploading) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, opacity: (pending || isUploading) ? 0.7 : 1
                  }}
                >
                  {(pending || isUploading) ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      {isUploading ? 'Enviando Imagem...' : 'Processando...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Salvar Ação em Lote
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      {/* Modal Gráfico Mês a Mês */}
      {showGraficoModal && (() => {
        // Compute monthly data
        const dadosPorMes = MONTHS_LIST.map((m, i) => {
          const mesNcs = data.filter(a => {
            if (!a.dataAbertura) return false;
            const d = new Date(a.dataAbertura);
            if (d.getUTCMonth() !== i) return false;
            if (selectedYear !== 'ALL' && d.getUTCFullYear() !== selectedYear) return false;
            if (isTst && a.tecnicoId !== userTecnicoId) return false;
            if (!showInactive && a.tecnico?.ativo === false) return false;
            
            // Apply search filter so it reflects the global Consolidado search
            if (consolidadoSearch.trim() && a.tecnico?.nome) {
              if (!a.tecnico.nome.toLowerCase().includes(consolidadoSearch.toLowerCase())) {
                return false;
              }
            }
            return true;
          });

          const fechadas = mesNcs.filter(n => n.status === 'RESOLVIDO').length;
          const abertas = mesNcs.filter(n => n.status === 'EM_ANDAMENTO' || n.status === 'PENDENTE_NAO_VENCIDA').length;
          const outras = mesNcs.filter(n => n.status === 'PENDENTE_VENCIDA').length;
          
          return { label: m.label, key: m.key, fechadas, abertas, outras, count: fechadas + abertas + outras };
        });

        const maxContagem = Math.max(...dadosPorMes.map(d => d.count), 1);
        const totalGeral = dadosPorMes.reduce((acc, curr) => acc + curr.count, 0);

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ background: PURPLE, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>📊 Evolução Mês a Mês</h2>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Não Conformidades por mês em {selectedYear === 'ALL' ? 'Todos os Anos' : selectedYear}</span>
                  </div>
                </div>
                <button onClick={() => setShowGraficoModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 20, fontWeight: 'bold', lineHeight: 1 }}>×</button>
              </div>

              {/* Chart Body */}
              <div style={{ padding: 24, overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, marginBottom: 8 }}>
                  {dadosPorMes.map((d, i) => {
                    const isFiltered = selectedMonths.includes(d.key as MesKey);
                    const hFechadas = maxContagem > 0 ? Math.round((d.fechadas / maxContagem) * 180) : 0;
                    const hAbertas = maxContagem > 0 ? Math.round((d.abertas / maxContagem) * 180) : 0;
                    const hOutras = maxContagem > 0 ? Math.round((d.outras / maxContagem) * 180) : 0;
                    
                    return (
                      <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: d.count > 0 ? '#1e293b' : '#cbd5e1' }}>{d.count > 0 ? d.count : ''}</span>
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 4, opacity: isFiltered ? 1 : 0.4 }}>
                          {/* Stacked bars (from top to bottom: Outras, Abertas, Fechadas) */}
                          {d.outras > 0 && <div style={{ height: hOutras || 2, background: '#ef4444', borderRadius: (d.abertas === 0 && d.fechadas === 0) ? '4px 4px 0 0' : '0' }} title={`Vencidas: ${d.outras}`} />}
                          {d.abertas > 0 && <div style={{ height: hAbertas || 2, background: '#3b82f6', borderRadius: (d.outras === 0 && d.fechadas === 0) ? '4px 4px 0 0' : '0' }} title={`Em Aberto: ${d.abertas}`} />}
                          {d.fechadas > 0 && <div style={{ height: hFechadas || 2, background: '#10b981', borderRadius: (d.outras === 0 && d.abertas === 0) ? '4px 4px 0 0' : '0' }} title={`Fechadas: ${d.fechadas}`} />}
                          {d.count === 0 && <div style={{ height: 4, background: '#e2e8f0', borderRadius: '4px 4px 0 0' }} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Labels dos Meses */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  {dadosPorMes.map((d) => (
                    <div key={d.label} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 700, color: selectedMonths.includes(d.key as MesKey) ? PURPLE : '#94a3b8' }}>{d.label}</div>
                  ))}
                </div>
                
                {/* Legenda do Gráfico */}
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, color: '#64748b', fontWeight: 600, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#10b981', display: 'inline-block' }} />Fechadas</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#3b82f6', display: 'inline-block' }} />Em Aberto (No Prazo)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />Outras (Vencidas)</span>
                </div>
                
                {/* Total Stats */}
                <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
                  <div><div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{totalGeral}</div><div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total no Ano</div></div>
                  <div><div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{dadosPorMes.reduce((acc, curr) => acc + curr.fechadas, 0)}</div><div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Fechadas</div></div>
                  <div><div style={{ fontSize: 22, fontWeight: 800, color: PURPLE }}>{totalGeral > 0 ? Math.round((dadosPorMes.reduce((acc, curr) => acc + curr.fechadas, 0) / totalGeral) * 100) : 0}%</div><div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Taxa de Conclusão</div></div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
