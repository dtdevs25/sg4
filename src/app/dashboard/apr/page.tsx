'use client'

import { useState, useRef, useEffect, useTransition, useMemo, useCallback } from 'react'
import {
  Search, UploadCloud, Loader2, X, PlayCircle, ShieldCheck, Filter,
  FileSpreadsheet, ListTodo, MapPin, BarChart3, Users, Clock, AlertCircle,
  CheckCircle2, ChevronRight, RefreshCw, Trash2, Eye, Award
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useSession } from 'next-auth/react'
import { getAprs, getAprYears, backfillAprAnoAbertura, upsertAprBatch, deleteAprItem } from '@/app/actions/apr'
import { getLastImportTime } from '@/app/actions/logs'
import { getTecnicos } from '@/app/actions/tecnicos'
import { gerarExcelCentral } from '@/app/utils/gerarExcelCentral'
import { BRAZIL_STATES, REGIAO_MAP, getRegionForState } from './BrazilMapData'

// Months stored as numbers 1-12 (matching the new server action)
const MONTHS_LIST = [
  { num: 1, label: 'Jan' }, { num: 2, label: 'Fev' },
  { num: 3, label: 'Mar' }, { num: 4, label: 'Abr' },
  { num: 5, label: 'Mai' }, { num: 6, label: 'Jun' },
  { num: 7, label: 'Jul' }, { num: 8, label: 'Ago' },
  { num: 9, label: 'Set' }, { num: 10, label: 'Out' },
  { num: 11, label: 'Nov' }, { num: 12, label: 'Dez' }
]

function parseLocalidade(localidade: string | null | undefined): { uf: string; cidade: string } {
  if (!localidade) return { uf: 'Outros', cidade: 'Outros' }
  const trimmed = localidade.trim()
  const spaceIdx = trimmed.indexOf(' ')
  if (spaceIdx === -1) {
    if (trimmed.length === 2) {
      return { uf: trimmed.toUpperCase(), cidade: 'Outros' }
    }
    return { uf: 'Outros', cidade: trimmed }
  }
  const ufCandidate = trimmed.substring(0, spaceIdx).toUpperCase()
  const cidadeCandidate = trimmed.substring(spaceIdx + 1).trim()
  if (ufCandidate.length === 2 && /^[A-Z]{2}$/.test(ufCandidate)) {
    return { uf: ufCandidate, cidade: cidadeCandidate }
  }
  return { uf: 'Outros', cidade: trimmed }
}

function parseDateToJsDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const str = String(dateStr).trim()
  if (!str) return null
  
  const num = Number(str)
  if (!isNaN(num) && num > 20000) {
    return new Date(Math.round((num - 25569) * 86400 * 1000))
  }
  
  // Try parsing DMY with optional time: "DD/MM/YYYY HH:MM" or "DD/MM/YYYY HH:MM:SS"
  const partsDmy = str.split('/')
  if (partsDmy.length === 3) {
    const day = parseInt(partsDmy[0], 10)
    const month = parseInt(partsDmy[1], 10) - 1
    const yearPart = partsDmy[2].trim()
    const spaceIdx = yearPart.indexOf(' ')
    let yearStr = yearPart
    let hour = 0
    let minute = 0
    let second = 0
    if (spaceIdx !== -1) {
      yearStr = yearPart.substring(0, spaceIdx)
      const timePart = yearPart.substring(spaceIdx + 1).trim()
      const timeParts = timePart.split(':')
      if (timeParts.length >= 2) {
        hour = parseInt(timeParts[0], 10)
        minute = parseInt(timeParts[1], 10)
        if (timeParts.length >= 3) {
          second = parseInt(timeParts[2], 10)
        }
      }
    }
    const year = parseInt(yearStr, 10)
    const finalYear = year < 100 ? year + 2000 : year
    if (!isNaN(day) && !isNaN(month) && !isNaN(finalYear) && !isNaN(hour) && !isNaN(minute)) {
      return new Date(finalYear, month, day, hour, minute, second)
    }
  }

  // Try parsing YMD with optional time: "YYYY-MM-DD HH:MM:SS"
  const partsYmd = str.split('-')
  if (partsYmd.length >= 3) {
    const year = parseInt(partsYmd[0], 10)
    const month = parseInt(partsYmd[1], 10) - 1
    const dayPart = partsYmd[2].trim()
    const spaceIdx = dayPart.indexOf(' ')
    let dayStr = dayPart
    let hour = 0
    let minute = 0
    let second = 0
    if (spaceIdx !== -1) {
      dayStr = dayPart.substring(0, spaceIdx)
      const timePart = dayPart.substring(spaceIdx + 1).trim()
      const timeParts = timePart.split(':')
      if (timeParts.length >= 2) {
        hour = parseInt(timeParts[0], 10)
        minute = parseInt(timeParts[1], 10)
        if (timeParts.length >= 3) {
          second = parseInt(timeParts[2], 10)
        }
      }
    }
    const day = parseInt(dayStr, 10)
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && !isNaN(hour) && !isNaN(minute)) {
      return new Date(year, month, day, hour, minute, second)
    }
  }

  const d = new Date(str)
  if (!isNaN(d.getTime())) return d
  return null
}

function formatDelay(avgHours: number): string {
  if (avgHours <= 0) return '0 min'
  const totalMinutes = Math.round(avgHours * 60)
  if (totalMinutes < 60) {
    return `${totalMinutes} ${totalMinutes === 1 ? 'minuto' : 'minutos'}`
  }
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (mins === 0) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`
  }
  return `${hours} ${hours === 1 ? 'hora' : 'horas'} e ${mins} min`
}

export default function APRPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const isMasterOrAdmin = userRole === 'MASTER' || userRole === 'ADMIN'

  const [activeTab, setActiveTab] = useState<'dashboard' | 'consolidado'>('dashboard')
  const [, startTransition] = useTransition()

  // Data states
  const [aprs, setAprs] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    conforme: 0,
    naoConforme: 0,
    avgDelayHours: 0
  })
  const [rankingTecnicos, setRankingTecnicos] = useState<any[]>([])
  const [rankingAtividades, setRankingAtividades] = useState<any[]>([])
  const [availableCities, setAvailableCities] = useState<any[]>([])
  const [lastImport, setLastImport] = useState<{ createdAt: string; userName: string } | null>(null)
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Available years loaded dynamically
  const [anosDisponiveis, setAnosDisponiveis] = useState<(number | 'ALL')[]>(['ALL'])

  // Filters state — months stored as numbers 1-12
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(new Date().getFullYear())
  const currentMonthNum = new Date().getMonth() + 1  // 1-indexed
  const [selectedMonths, setSelectedMonths] = useState<number[]>(
    Array.from({ length: currentMonthNum }, (_, i) => i + 1)
  )
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [selectedState, setSelectedState] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedTecnico, setSelectedTecnico] = useState<string>('')

  // Search & Pagination in Data Table tab
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Excel import status
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const [importingFileName, setImportingFileName] = useState('')
  const [importResult, setImportResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const clickTimeout = useRef<NodeJS.Timeout | null>(null)

  // Details Modal
  const [viewingItem, setViewingItem] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = useCallback(async (isExport = false) => {
    if (!isExport) setIsDataLoading(true)
    try {
      const months = selectedMonths.length === 12 ? [] : selectedMonths
      const res = await getAprs({
        year: selectedYear,
        months,
        region: selectedRegion,
        state: selectedState,
        city: selectedCity,
        tecnico: selectedTecnico,
        search: searchText,
        page: currentPage,
        pageSize: itemsPerPage
      })

      if (res.success && res.data) {
        setAprs(res.data.aprs)
        setTotalCount(res.data.totalCount)
        setStats(res.data.stats)
        setRankingTecnicos(res.data.rankingTecnicos)
        setRankingAtividades(res.data.rankingAtividades)
        setAvailableCities(res.data.availableCities)
        setHasLoadedOnce(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (!isExport) setIsDataLoading(false)
    }
  }, [
    selectedYear, selectedMonths, selectedRegion, selectedState, selectedCity,
    selectedTecnico, searchText, currentPage, itemsPerPage
  ])

  // Load initial config on mount: years + last import, then auto-load data
  useEffect(() => {
    async function loadInitial() {
      const [yearsRes, importTimeRes] = await Promise.all([
        getAprYears(),
        getLastImportTime('IMPORTAR_APR')
      ])

      let defaultYear: number | 'ALL' = new Date().getFullYear()

      if (yearsRes.success && yearsRes.years && yearsRes.years.length > 0) {
        setAnosDisponiveis(['ALL', ...yearsRes.years])
        defaultYear = yearsRes.years[0]  // most recent year
        setSelectedYear(defaultYear)
      }

      if (importTimeRes?.success && importTimeRes?.data) {
        setLastImport(importTimeRes.data)
      } else {
        setLastImport(null)
      }

      // Trigger backfill in the background (fire and forget) —
      // populates ano_abertura for existing records so future queries use the index
      backfillAprAnoAbertura().catch(() => {})

      // Auto-load data with the resolved year
      setIsDataLoading(true)
      try {
        const currentM = new Date().getMonth() + 1
        const initialMonths = Array.from({ length: currentM }, (_, i) => i + 1)
        const res = await getAprs({
          year: defaultYear,
          months: initialMonths.length === 12 ? [] : initialMonths,
          page: 1,
          pageSize: 20
        })
        if (res.success && res.data) {
          setAprs(res.data.aprs)
          setTotalCount(res.data.totalCount)
          setStats(res.data.stats)
          setRankingTecnicos(res.data.rankingTecnicos)
          setRankingAtividades(res.data.rankingAtividades)
          setAvailableCities(res.data.availableCities)
          setHasLoadedOnce(true)
        }
      } catch (e) {
        console.error('Erro no auto-load inicial:', e)
      } finally {
        setIsDataLoading(false)
      }
    }
    loadInitial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Only auto-reload when pagination changes (user clicked next page)
  useEffect(() => {
    if (hasLoadedOnce) {
      loadData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchText, selectedYear, selectedMonths, selectedRegion, selectedState, selectedCity, selectedTecnico])

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  // Month handler — click = toggle; double-click = select only that month
  const handleMonthClick = (m: number) => {
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
            return [...prev, m].sort((a, b) => a - b)
          }
        })
      }, 250)
    }
  }

  // Region filter handler
  const handleRegionChange = (reg: string) => {
    setSelectedRegion(reg)
    setSelectedState('')
    setSelectedCity('')
  }

  // State filter handler
  const handleStateChange = (uf: string) => {
    setSelectedState(uf)
    setSelectedCity('')
    if (uf) {
      const reg = getRegionForState(uf)
      if (reg !== 'Outro') setSelectedRegion(reg)
    }
  }

  // Click on SVG State Map
  const handleStateClick = (uf: string) => {
    if (selectedState === uf) {
      setSelectedState('')
      setSelectedCity('')
    } else {
      setSelectedState(uf)
      setSelectedCity('')
      const reg = getRegionForState(uf)
      if (reg !== 'Outro') {
        setSelectedRegion(reg)
      }
    }
  }

  // Reset all dashboard filters
  const handleResetFilters = () => {
    const currentM = new Date().getMonth() + 1
    setSelectedYear(anosDisponiveis.find(a => a !== 'ALL') as number ?? new Date().getFullYear())
    setSelectedMonths(Array.from({ length: currentM }, (_, i) => i + 1))
    setSelectedRegion('')
    setSelectedState('')
    setSelectedCity('')
    setSelectedTecnico('')
    setSearchText('')
  }

  const maxTecnicoCount = rankingTecnicos[0]?.count || 1
  const maxAtividadeCount = rankingAtividades[0]?.count || 1

  // Excel template generator wrapper
  const handleExportExcel = async () => {
    setIsDataLoading(true)
    try {
      const months = selectedMonths.length === 12 ? [] : selectedMonths
      const res = await getAprs({
        year: selectedYear,
        months,
        region: selectedRegion,
        state: selectedState,
        city: selectedCity,
        tecnico: selectedTecnico,
        search: searchText,
        exportAll: true
      })
      if (!res.success || !res.data) {
        alert('Erro ao carregar dados para exportação')
        return
      }

      const allFiltered = res.data.aprs
      const exportStats = res.data.stats

      const headers = [
        'Número',
        'Data Checklist',
        'Data Abertura',
        'Data Fechamento',
        'Situação',
        'Matrícula Auditor',
        'Nome Auditor',
        'Técnico Vinculado',
        'Localidade Objeto',
        'Cliente Objeto',
        'Identificador Objeto',
        'Questionário',
        'Autocheck',
        'Observação'
      ]

      const rows = allFiltered.map(apr => [
        apr.numero,
        apr.dataChecklist || '',
        apr.dataAbertura || '',
        apr.dataFechamento || '',
        apr.status || '',
        apr.matriculaAuditor || '',
        apr.nomeAuditor || '',
        apr.tecnico?.nome || 'Não Vinculado',
        apr.localidadeObjeto || '',
        apr.clienteObjeto || '',
        apr.identificadorObjeto || '',
        apr.nomeQuestionario || '',
        apr.autocheck || '',
        apr.observacao || ''
      ])

      const resumo = [
        { label: 'Total Geral', valor: exportStats.total },
        { label: 'Resultado Conforme', valor: exportStats.conforme, pct: exportStats.total > 0 ? `${Math.round((exportStats.conforme/exportStats.total)*100)}%` : '0%' },
        { label: 'Resultado Não Conforme', valor: exportStats.naoConforme, pct: exportStats.total > 0 ? `${Math.round((exportStats.naoConforme/exportStats.total)*100)}%` : '0%' },
        { label: 'Tempo Médio Abertura', valor: formatDelay(exportStats.avgDelayHours) }
      ]

      await gerarExcelCentral({
        titulo: 'SG4 - Relatório de Análise Preliminar de Risco (APR)',
        subtitulo: `Filtros Aplicados: Ano ${selectedYear} | Estado: ${selectedState || 'Todos'} | Cidade: ${selectedCity || 'Todas'}`,
        headers,
        rows,
        resumo,
        fileName: `SG4_APR_${new Date().toISOString().substring(0,10)}.xlsx`
      })
    } catch (err) {
      console.error(err)
      alert('Falha ao exportar arquivo Excel')
    } finally {
      setIsDataLoading(false)
    }
  }

  // Excel parsing and mapping helpers
  const getCategorizedStatus = (situacao: string | null | undefined): string => {
    if (!situacao) return 'pendente não vencidos'
    const s = String(situacao).toUpperCase().trim()
    
    if (['RESOLVIDA ANTES VENCIMENTO', 'RESOLVIDA APOS VENCIMENTO', 'RESOLVIDA SEM DATA PREVISTA'].includes(s)) {
      return 'resolvidos'
    }
    if ([
      'PENDENTE VENCIDA EM PROCESSAMENTO', 'PENDENTE SEM DATA PREVISTA EM PROCESSAMENTO',
      'PENDENTE VENCIDA EM ENTREGA', 'PENDENTE NÃO VENCIDA EM PROCESSAMENTO',
      'PENDENTE NAO VENCIDA EM PROCESSAMENTO'
    ].includes(s)) {
      return 'PENDENTES EM PROCESSAMENTO'
    }
    if (['PENDENTE NÃO VENCIDA', 'PENDENTE NAO VENCIDA', 'PENDENTE SEM DATA PREVISTA'].includes(s)) {
      return 'pendente não vencidos'
    }
    if (['PENDENTE VENCIDA'].includes(s)) {
      return 'pendente vencidos'
    }
    return 'pendente não vencidos' // fallback
  }

  const parseExcelDate = (val: any): string | null => {
    if (val === undefined || val === null || val === '') return null
    if (val instanceof Date) {
      return val.toLocaleDateString('pt-BR')
    }
    const num = Number(val)
    if (!isNaN(num) && num > 20000) {
      const jsDate = new Date(Math.round((num - 25569) * 86400 * 1000))
      const day = jsDate.getUTCDate().toString().padStart(2, '0')
      const month = (jsDate.getUTCMonth() + 1).toString().padStart(2, '0')
      const year = jsDate.getUTCFullYear()
      return `${day}/${month}/${year}`
    }
    const str = String(val).trim()
    if (str.includes('/') || str.includes('-')) {
      return str
    }
    return str
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportingFileName(file.name)
    setIsImporting(true)
    setImportProgress('Processando arquivo...')
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer
        let parsed: any[] = []

        if (file.name.toLowerCase().endsWith('.csv')) {
          // Helper to split CSV row respecting double quotes
          const parseCsvLine = (line: string, separator: string) => {
            const result: string[] = []
            let current = ''
            let inQuotes = false
            for (let i = 0; i < line.length; i++) {
              const char = line[i]
              if (char === '"') {
                inQuotes = !inQuotes
              } else if (char === separator && !inQuotes) {
                result.push(current.trim())
                current = ''
              } else {
                current += char
              }
            }
            result.push(current.trim())
            return result
          }

          const decoder = new TextDecoder('windows-1252')
          const csvText = decoder.decode(buffer)
          const lines = csvText.split(/\r?\n/)
          if (lines.length > 0) {
            const separator = lines[0].includes(';') ? ';' : ','
            const headers = parseCsvLine(lines[0], separator).map(h => h.replace(/^["']|["']$/g, '').trim())
            
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim()
              if (!line) continue
              const values = parseCsvLine(line, separator)
              const obj: any = {}
              headers.forEach((h, idx) => {
                let val = values[idx] !== undefined ? values[idx] : ''
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
                obj[h] = val
              })
              parsed.push(obj)
            }
          }
        } else {
          const wb = XLSX.read(buffer, { type: 'array' })
          const wsname = wb.SheetNames[0]
          if (!wsname) throw new Error("Planilha vazia ou não reconhecida")
          const ws = wb.Sheets[wsname]
          parsed = XLSX.utils.sheet_to_json(ws) as any[]
        }

        setImportProgress(`Processando ${parsed.length} linhas...`)
        
        const firstRow = parsed[0]
        const rowKeys = firstRow ? Object.keys(firstRow) : []
        const findMatch = (keysList: string[]) => {
          for (const k of keysList) {
            const match = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, ''))
            if (match) return match
          }
          return null
        }

        const matchedKeys = {
          numero: findMatch(['Numero', 'Número', 'NUMERO DA AUDITORIA']),
          resultado: findMatch(['Resultado', 'SITUAÇÃO/STATUS', 'SITUAÇO/STATUS', 'SITUACAO/STATUS', 'STATUS', 'SITUAÇÃO', 'SITUACAO']),
          dataAbertura: findMatch(['Data Abertura', 'DataAbertura', 'Abertura']),
          dataFechamento: findMatch(['Data Fechamento', 'DataFechamento', 'FECHAMENTO']),
          dataChecklist: findMatch(['Data Checklist', 'DataChecklist', 'Checklist']),
          matriculaAuditor: findMatch(['Matricula Auditor', 'MatriculaAuditor', 'Matrícula Auditor', 'MATRICULA']),
          nomeAuditor: findMatch(['Nome Auditor', 'NomeAuditor', 'COLABORADOR']),
          identificadorObjeto: findMatch(['Identificador Objeto', 'IdentificadorObjeto', 'Nome do Objeto']),
          nomeQuestionario: findMatch(['Nome Questionario', 'NomeQuestionário', 'NomeQuestionario', 'TIPO DE OBJETO', 'Questionário', 'Questionario']),
          clienteObjeto: findMatch(['Cliente Objeto', 'ClienteObjeto']),
          localidadeObjeto: findMatch(['Localidade Objeto', 'LocalidadeObjeto', 'LOCALIDADE']),
          autocheck: findMatch(['Autocheck']),
          observacao: findMatch(['Observação', 'Observacao', 'Observao'])
        }

        const validRows: any[] = []
        let discardedCount = 0

        for (const row of parsed) {
          const matchedQuestKey = matchedKeys.nomeQuestionario
          const quest = matchedQuestKey && row[matchedQuestKey] ? String(row[matchedQuestKey]).toUpperCase() : ''
          
          if (!quest.includes('APR')) {
            discardedCount++
            continue
          }

          const getVal = (keyName: keyof typeof matchedKeys) => {
            const matchedKey = matchedKeys[keyName]
            return (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) ? row[matchedKey] : ''
          }

          const mappedRow = {
            numero: String(getVal('numero')).trim(),
            resultado: getVal('resultado') ? String(getVal('resultado')).trim() : null,
            dataAbertura: parseExcelDate(getVal('dataAbertura')),
            dataFechamento: parseExcelDate(getVal('dataFechamento')),
            dataChecklist: parseExcelDate(getVal('dataChecklist')),
            matriculaAuditor: getVal('matriculaAuditor') ? String(getVal('matriculaAuditor')).trim() : null,
            nomeAuditor: getVal('nomeAuditor') ? String(getVal('nomeAuditor')).trim() : null,
            identificadorObjeto: getVal('identificadorObjeto') ? String(getVal('identificadorObjeto')).trim() : null,
            nomeQuestionario: getVal('nomeQuestionario') ? String(getVal('nomeQuestionario')).trim() : null,
            clienteObjeto: getVal('clienteObjeto') ? String(getVal('clienteObjeto')).trim() : null,
            localidadeObjeto: getVal('localidadeObjeto') ? String(getVal('localidadeObjeto')).trim() : null,
            autocheck: getVal('autocheck') ? String(getVal('autocheck')).trim() : null,
            observacao: getVal('observacao') ? String(getVal('observacao')).trim() : null,
            status: getCategorizedStatus(getVal('resultado')),
            importadoPor: session?.user?.name || 'Administrador'
          }

          if (!mappedRow.numero) {
            discardedCount++
            continue
          }

          validRows.push(mappedRow)
        }

        if (validRows.length === 0) {
          setIsImporting(false)
          alert('Nenhum registro de APR válido encontrado. Garanta que a coluna "Questionário" contenha a sigla "APR".')
          return
        }

        setImportProgress(`Preparando banco de dados (${validRows.length} itens)...`)

        const batchSize = 1000
        let totalInseridos = 0
        let totalAtualizados = 0
        let success = true

        for (let i = 0; i < validRows.length; i += batchSize) {
          const chunk = validRows.slice(i, i + batchSize)
          const pct = Math.round((i / validRows.length) * 100)
          setImportProgress(`Sincronizando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(validRows.length / batchSize)} (${pct}%)...`)
          const res = await upsertAprBatch(chunk)
          
          if (res.success) {
            totalInseridos += res.inseridos ?? 0
            totalAtualizados += res.atualizados ?? 0
          } else {
            success = false
            setImportProgress('Falha na importação.')
            setImportResult({
              success: false,
              error: res.error || 'Erro desconhecido'
            })
            break
          }
        }

        if (success) {
          setImportResult({
            success: true,
            total: parsed.length,
            inseridos: totalInseridos,
            atualizados: totalAtualizados,
            descartados: discardedCount
          })
          setImportProgress('Importação concluída!')
          loadData()
        }
      } catch (err: any) {
        console.error(err)
        setImportProgress('Erro na leitura do arquivo.')
        setImportResult({
          success: false,
          error: err.message || 'Falha ao processar planilha'
        })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // Delete Action handler
  const handleDeleteItem = async () => {
    if (!deletingId) return
    startTransition(async () => {
      const res = await deleteAprItem(deletingId)
      if (res.success) {
        setDeletingId(null)
        loadData()
      } else {
        alert(res.error || 'Erro ao excluir registro')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      
      {/* ── Overlay de Importação (Glassmorphic) ── */}
      {isImporting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 20,
        }}>
          <style>{`
            @keyframes sg4-spin { to { transform: rotate(360deg); } }
            @keyframes sg4-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
            @keyframes sg4-progress { 0%{width:0%;margin-left:0%} 50%{width:70%;margin-left:15%} 100%{width:0%;margin-left:100%} }
          `}</style>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '40px 48px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)', maxWidth: 440, width: '90%',
          }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(102,0,153,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {importResult ? (
                <div style={{ color: '#10b981', display: 'flex' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
              ) : (
                <Loader2 size={32} color="#660099" style={{ animation: 'sg4-spin 1s linear infinite' }} />
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>
                {importResult ? 'Importação Concluída!' : 'Sincronizando APRs'}
              </h3>
              <p style={{ margin: '0 0 4px 0', fontSize: 12, color: '#64748b', fontWeight: 500, maxWidth: 280, lineHeight: 1.5 }}>
                {importingFileName}
              </p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: importResult ? '#10b981' : '#660099', animation: importResult ? 'none' : 'sg4-pulse 1.5s ease-in-out infinite' }}>
                {importProgress}
              </p>
            </div>
            
            {!importResult ? (
              <div style={{ width: '100%', background: '#f1f5f9', borderRadius: 8, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #660099, #8e44ad)', borderRadius: 8, animation: 'sg4-progress 1.5s ease-in-out infinite' }} />
              </div>
            ) : (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Inseridos novos:</span>
                    <strong style={{ color: '#1e293b' }}>{importResult.inseridos}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Atualizados:</span>
                    <strong style={{ color: '#1e293b' }}>{importResult.atualizados}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Descartados (Não-APR):</span>
                    <strong style={{ color: '#94a3b8' }}>{importResult.descartados}</strong>
                  </div>
                </div>
                <button 
                  onClick={() => { setIsImporting(false); setImportResult(null); }}
                  style={{ width: '100%', padding: '10px 24px', background: '#660099', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer', outline: 'none' }}
                >
                  Continuar
                </button>
              </div>
            )}
            
            {!importResult && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Por favor, aguarde o término do processamento.</p>}
          </div>
        </div>
      )}

      {/* Header & Tabs bar */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
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
            <ShieldCheck color="#660099" size={24} />
            Análise Preliminar de Risco (APR)
          </h1>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 8, gap: 4 }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
              background: activeTab === 'dashboard' ? '#fff' : 'transparent',
              color: activeTab === 'dashboard' ? '#660099' : '#64748b',
              boxShadow: activeTab === 'dashboard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('consolidado')}
            style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
              background: activeTab === 'consolidado' ? '#fff' : 'transparent',
              color: activeTab === 'consolidado' ? '#660099' : '#64748b',
              boxShadow: activeTab === 'consolidado' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Importação APR Arkium
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB: DASHBOARD
      ======================================================== */}
      {activeTab === 'dashboard' && (
        <>
          {/* Top Panel: Left (Filters) & Right (Stats Summary) */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
            {/* Filters Card (Left) */}
            <div style={{
              background: '#fff',
              border: '1px solid #f1f5f9',
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              flex: '2.2',
              minWidth: 320
            }}>
              {/* First Row: Year & Month Filter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Selecionar Período</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select 
                    value={selectedYear} 
                    onChange={e => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))} 
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none' }}
                  >
                    <option value="ALL">Todos os Anos</option>
                    {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <input 
                    type="text"
                    placeholder="Filtrar Técnico..."
                    value={selectedTecnico} 
                    onChange={e => setSelectedTecnico(e.target.value)} 
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none', width: 180 }}
                  />
                  <button 
                    onClick={handleResetFilters}
                    style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>

              {/* Months Row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {MONTHS_LIST.slice(0, 6).map(m => {
                    const isSelected = selectedMonths.includes(m.num)
                    return (
                      <button
                        key={m.num}
                        onClick={() => handleMonthClick(m.num)}
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
                    const isSelected = selectedMonths.includes(m.num)
                    return (
                      <button
                        key={m.num}
                        onClick={() => handleMonthClick(m.num)}
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
                {/* Search Button */}
                <button
                  onClick={() => { setCurrentPage(1); loadData() }}
                  disabled={isDataLoading}
                  style={{
                    padding: '10px 0', borderRadius: 8, border: 'none',
                    background: isDataLoading ? '#a78bfa' : 'linear-gradient(135deg, #660099, #9333ea)',
                    color: '#fff', fontSize: 13, fontWeight: 800, cursor: isDataLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'opacity 0.2s'
                  }}
                >
                  {isDataLoading
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Carregando...</>
                    : <><Search size={14} /> Buscar APRs</>
                  }
                </button>
              </div>

              {/* Geographic Filter Bar */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>Região</label>
                  <select
                    value={selectedRegion}
                    onChange={e => handleRegionChange(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155' }}
                  >
                    <option value="">Todas as Regiões</option>
                    <option value="Norte">Norte</option>
                    <option value="Nordeste">Nordeste</option>
                    <option value="Centro-Oeste">Centro-Oeste</option>
                    <option value="Sudeste">Sudeste</option>
                    <option value="Sul">Sul</option>
                  </select>
                </div>

                {selectedRegion && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>Estado (UF)</label>
                    <select
                      value={selectedState}
                      onChange={e => handleStateChange(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155' }}
                    >
                      <option value="">Todos os Estados</option>
                      {BRAZIL_STATES.filter(s => {
                        return REGIAO_MAP[selectedRegion]?.includes(s.uf)
                      }).map(s => <option key={s.uf} value={s.uf}>{s.name} ({s.uf})</option>)}
                    </select>
                  </div>
                )}

                {selectedState && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>Cidade</label>
                    <select
                      value={selectedCity}
                      onChange={e => setSelectedCity(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155' }}
                    >
                      <option value="">Todas as Cidades</option>
                      {availableCities.map(c => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* KPI Metrics Cards (Right) */}
            <div style={{
              background: '#fff',
              border: '1px solid #f1f5f9',
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
              flex: '1',
              minWidth: 280
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Resumo do Período</span>
                <span style={{ background: 'rgba(102,0,153,0.1)', color: '#660099', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                  {selectedMonths.length} MÊS(ES)
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Total */}
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ color: '#660099' }}>
                    <FileSpreadsheet size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Total</span>
                    <strong style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{stats.total}</strong>
                  </div>
                </div>

                {/* Delay */}
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ color: '#f59e0b' }}>
                    <Clock size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>T. Médio</span>
                    <strong style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{formatDelay(stats.avgDelayHours)}</strong>
                  </div>
                </div>

                {/* Conforme */}
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ color: '#10b981' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Conforme</span>
                    <strong style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>{stats.conforme}</strong>
                  </div>
                </div>

                {/* Não Conforme */}
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ color: '#ef4444' }}>
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Não Conforme</span>
                    <strong style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>{stats.naoConforme}</strong>
                  </div>
                </div>
              </div>

              {/* Percentage Bar */}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                  <span>TAXA DE CONFORMIDADE</span>
                  <span style={{ color: '#10b981' }}>{stats.total > 0 ? Math.round((stats.conforme/stats.total)*100) : 0}%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${stats.total > 0 ? Math.round((stats.conforme/stats.total)*100) : 0}%`, height: '100%', background: '#10b981', borderRadius: 3 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Map & Rankings Panel */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
            
            {/* Map Container */}
            <div style={{
              background: '#fff',
              border: '1px solid #f1f5f9',
              borderRadius: 12,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              minWidth: 320,
              flex: '1.2',
              position: 'relative'
            }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={16} color="#660099" /> Distribuição Geográfica de APRs
                  </h3>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Selecione um estado no mapa para drill-down</span>
                </div>
                
                {(selectedRegion || selectedState || selectedCity) && (
                  <button
                    onClick={() => { setSelectedRegion(''); setSelectedState(''); setSelectedCity(''); }}
                    style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <X size={12} /> Limpar
                  </button>
                )}
              </div>

              {/* SVG Map container */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                <svg
                  version="1.1"
                  id="svg-map"
                  xmlns="http://www.w3.org/2000/svg"
                  x="0px"
                  y="0px"
                  width="100%"
                  viewBox="0 0 450 460"
                  style={{ maxWidth: 400, maxHeight: 420, height: 'auto', transition: 'all 0.4s ease-in-out' }}
                >
                  <g>
                    {BRAZIL_STATES.map((state) => {
                      const isSelected = selectedState === state.uf
                      const isSelectedRegion = selectedRegion && REGIAO_MAP[selectedRegion]?.includes(state.uf)
                      const isHighlighted = isSelected || isSelectedRegion
                      const isAnyFilterActive = !!selectedState || !!selectedRegion

                      // Theme coloring matching Vivo and SG4
                      const fill = isHighlighted 
                        ? '#660099' 
                        : (isAnyFilterActive ? '#f1f5f9' : '#0094d9')

                      const stroke = isHighlighted ? '#ffffff' : '#ffffff'
                      const strokeWidth = isHighlighted ? 2.5 : 1

                      return (
                        <g 
                          key={state.id} 
                          onClick={() => handleStateClick(state.uf)}
                          style={{ cursor: 'pointer' }}
                        >
                          <path 
                            d={state.path} 
                            fill={fill} 
                            stroke={stroke} 
                            strokeWidth={strokeWidth}
                            style={{ transition: 'all 0.3s' }}
                          />
                          {state.circlePath && (
                            <path 
                              d={state.circlePath} 
                              fill={isHighlighted ? '#9333ea' : (isAnyFilterActive ? '#cbd5e1' : '#66ccff')}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                              style={{ transition: 'all 0.3s' }}
                            />
                          )}
                          <text 
                            transform={`matrix(1 0 0 1 ${state.text.x} ${state.text.y})`}
                            fill={isHighlighted ? '#ffffff' : (isAnyFilterActive ? '#94a3b8' : '#ffffff')}
                            fontWeight="800" 
                            fontSize="10" 
                            textAnchor="middle"
                            style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.3s' }}
                          >
                            {state.text.label}
                          </text>
                        </g>
                      )
                    })}
                  </g>
                </svg>
              </div>

              {/* Info panel below the map */}
              <div style={{ width: '100%', marginTop: 12, background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Filtro Geográfico: <strong>{selectedState ? `${selectedState} (${selectedCity || 'Todas Cidades'})` : (selectedRegion ? `Região ${selectedRegion}` : 'Nacional')}</strong></span>
                <span style={{ background: '#e2e8f0', padding: '3px 8px', borderRadius: 4, fontWeight: 700, color: '#475569' }}>
                  {stats.total} APRs
                </span>
              </div>
            </div>

            {/* Rankings widgets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, minWidth: 320 }}>
              
              {/* Ranking Atividades */}
              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart3 size={16} color="#660099" /> Atividades com mais APRs
                </h3>
                
                {rankingAtividades.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Nenhuma atividade registrada no período.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {rankingAtividades.map((item, idx) => {
                      const pct = Math.round((item.count / maxAtividadeCount) * 100)
                      return (
                        <div key={item.nome} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>
                              {idx + 1}. {item.nome}
                            </span>
                            <strong style={{ color: '#1e293b' }}>{item.count}</strong>
                          </div>
                          <div style={{ width: '100%', background: '#f1f5f9', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #660099, #9333ea)', height: '100%', borderRadius: 3 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Ranking Técnicos */}
              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={16} color="#660099" /> Técnicos com mais APRs
                </h3>
                
                {rankingTecnicos.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Nenhum técnico registrado no período.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {rankingTecnicos.map((item, idx) => {
                      const pct = Math.round((item.count / maxTecnicoCount) * 100)
                      return (
                        <div key={item.nome} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '80%' }}>
                              <span style={{ fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {idx + 1}. {item.nome}
                              </span>
                              {!item.active && (
                                <span style={{ padding: '1px 5px', fontSize: 8, background: '#fee2e2', color: '#ef4444', borderRadius: 4, fontWeight: 800 }}>INATIVO</span>
                              )}
                            </div>
                            <strong style={{ color: '#1e293b' }}>{item.count}</strong>
                          </div>
                          <div style={{ width: '100%', background: '#f1f5f9', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', height: '100%', borderRadius: 3 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        </>
      )}

      {/* ========================================================
          TAB: IMPORTAÇÃO APR ARKIUM
      ======================================================== */}
      {activeTab === 'consolidado' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Stats Cards */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #64748b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
                <ListTodo size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Total</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{stats.total}</div>
            </div>

            <div style={{ flex: 1, minWidth: 150, background: '#fff', border: '1px solid #d1fae5', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#047857' }}>
                <CheckCircle2 size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Conforme</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{stats.conforme}</div>
            </div>

            <div style={{ flex: 1, minWidth: 150, background: '#fff', border: '1px solid #fee2e2', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c' }}>
                <AlertCircle size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Não Conforme</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{stats.naoConforme}</div>
            </div>

            <div style={{ flex: 1, minWidth: 150, background: '#fff', border: '1px solid #fef3c7', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309' }}>
                <Clock size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Tempo Médio</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{formatDelay(stats.avgDelayHours)}</div>
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
                    const isSelected = selectedMonths.includes(m.num)
                    return (
                      <button
                        key={m.num}
                        onClick={() => handleMonthClick(m.num)}
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
                    const isSelected = selectedMonths.includes(m.num)
                    return (
                      <button
                        key={m.num}
                        onClick={() => handleMonthClick(m.num)}
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

            {/* Uploader Card */}
            {isMasterOrAdmin && (
              <div style={{
                background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 10,
                padding: '16px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12
              }}>
                <div style={{ width: 44, height: 44, background: 'rgba(102,0,153,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileSpreadsheet color="#660099" size={22} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Importar APR Arkium</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Excel (.xls ou .xlsx)</div>
                </div>
                <input type="file" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: '#660099', color: '#fff', border: 'none', padding: '8px 24px',
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

          {/* Table Filters & Actions */}
          <div style={{
            background: '#fff',
            border: '1px solid #f1f5f9',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              
              <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 280 }}>
                {/* Search Text input */}
                <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Filtrar por número, técnico, questionário..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  />
                </div>

                {/* Status selector */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#475569', outline: 'none' }}
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="RESOLVIDO">Resolvidos</option>
                  <option value="PENDENTE_PROC">Pendente em Processamento</option>
                  <option value="PENDENTE_NV">Pendente Não Vencidos</option>
                  <option value="PENDENTE_V">Pendente Vencidos</option>
                </select>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExportExcel}
                disabled={totalCount === 0}
                style={{
                  padding: '8px 16px', background: '#fff', color: '#1e293b',
                  border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: totalCount === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, opacity: totalCount === 0 ? 0.6 : 1
                }}
              >
                <FileSpreadsheet size={16} color="#10b981" /> Exportar Filtrados ({totalCount})
              </button>
            </div>

            {/* Data Table */}
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>Número</th>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>Questionário</th>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>Data Checklist</th>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>Data Abertura</th>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>Técnico</th>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>Base/Localidade</th>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {aprs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: 500 }}>
                        Nenhum registro encontrado com os critérios de busca selecionados.
                      </td>
                    </tr>
                  ) : (
                    aprs.map(apr => {
                      const loc = parseLocalidade(apr.localidadeObjeto)
                      const st = String(apr.status || '').toLowerCase()
                      
                      let badgeBg = '#e2e8f0'
                      let badgeColor = '#475569'
                      let badgeText = apr.status

                      if (st === 'resolvidos') {
                        badgeBg = '#d1fae5'
                        badgeColor = '#065f46'
                        badgeText = 'Resolvido'
                      } else if (st === 'pendentes em processamento') {
                        badgeBg = '#fef3c7'
                        badgeColor = '#92400e'
                        badgeText = 'Processando'
                      } else if (st === 'pendente não vencidos') {
                        badgeBg = '#dbeafe'
                        badgeColor = '#1e40af'
                        badgeText = 'Pendente N. Vencida'
                      } else if (st === 'pendente vencidos') {
                        badgeBg = '#fee2e2'
                        badgeColor = '#991b1b'
                        badgeText = 'Pendente Vencida'
                      }

                      return (
                        <tr key={apr.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>{apr.numero}</td>
                          <td style={{ padding: '12px 16px', color: '#475569', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={apr.nomeQuestionario}>
                            {apr.nomeQuestionario || '-'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{apr.dataChecklist || '-'}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{apr.dataAbertura || '-'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 700, color: '#334155' }}>{apr.tecnico?.nome || apr.nomeAuditor || '-'}</span>
                              <span style={{ fontSize: 10, color: '#94a3b8' }}>Matrícula: {apr.matriculaAuditor || '-'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>
                            {loc.uf} - {loc.cidade}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: badgeBg, color: badgeColor }}>
                              {badgeText}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                onClick={() => setViewingItem(apr)}
                                style={{
                                  width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                  color: '#64748b'
                                }}
                                title="Visualizar Detalhes"
                              >
                                <Eye size={16} />
                              </button>
                              
                              {isMasterOrAdmin && (
                                <button
                                  onClick={() => setDeletingId(apr.id)}
                                  style={{
                                    width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                    color: '#ef4444'
                                  }}
                                  title="Excluir Registro"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalCount > 0 && (
              <div style={{
                padding: '8px 4px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                    Mostrando de {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} registros
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
      )}

      {/* ── Modal de Visualização Detalhada ── */}
      {viewingItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck color="#660099" size={18} />
                Detalhes da APR #{viewingItem.numero}
              </h3>
              <button onClick={() => setViewingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* Technician Profile Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(102,0,153,0.1)', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
                  {(viewingItem.tecnico?.nome || viewingItem.nomeAuditor || 'U').split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                    {viewingItem.tecnico?.nome || viewingItem.nomeAuditor || 'Não Identificado'}
                  </h4>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Matrícula: {viewingItem.matriculaAuditor || '-'}</span>
                </div>
              </div>

              {/* Grid data fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Questionário</label>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{viewingItem.nomeQuestionario || '-'}</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Status</label>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#660099' }}>{viewingItem.status || '-'}</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Data Checklist</label>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{viewingItem.dataChecklist || '-'}</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Data Abertura</label>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{viewingItem.dataAbertura || '-'}</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Localidade Objeto</label>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{viewingItem.localidadeObjeto || '-'}</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Cliente Objeto</label>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{viewingItem.clienteObjeto || '-'}</span>
                </div>

              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Resultado</label>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{viewingItem.resultado || '-'}</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Observação</label>
                <span style={{ fontSize: 12, color: '#475569', display: 'block', background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #f1f5f9', minHeight: 48 }}>
                  {viewingItem.observacao || 'Nenhuma observação informada.'}
                </span>
              </div>

            </div>
            
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
              <button 
                onClick={() => setViewingItem(null)} 
                style={{ padding: '8px 16px', background: '#660099', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmação de Exclusão ── */}
      {deletingId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
                <Trash2 size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Confirmar Exclusão</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Tem certeza de que deseja excluir este registro de APR? Esta ação é permanente e não poderá ser desfeita.
              </p>
            </div>
            <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button 
                onClick={() => setDeletingId(null)} 
                style={{ padding: '8px 14px', background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteItem} 
                style={{ padding: '8px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
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
