'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import {
  ClipboardCheck, Calendar, Filter, User,
  CheckCircle2, AlertTriangle, PlayCircle, Search, Edit2, Trash2,
  UploadCloud, FileSpreadsheet, ListTodo, CheckSquare, X, Loader2, Eye
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useSession } from 'next-auth/react'
import { getTecnicos } from '@/app/actions/tecnicos'
import { getAtividades, upsertAtividadeMes } from '@/app/actions/atividades'
import {
  getInspecoesArkium,
  upsertInspecoesArkiumBatch,
  updateInspecoesArkiumItem,
  limparInspecoesArkiumInvalidos,
  deleteInspecoesArkiumItem
} from '@/app/actions/inspecoesArkium'

type MesKey = 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun' | 'jul' | 'ago' | 'set' | 'out' | 'nov' | 'dez'

const MES_MAP: Record<MesKey, string> = {
  jan: 'JANEIRO', fev: 'FEVEREIRO', mar: 'MARCO', abr: 'ABRIL', mai: 'MAIO', jun: 'JUNHO',
  jul: 'JULHO', ago: 'AGOSTO', set: 'SETEMBRO', out: 'OUTUBRO', nov: 'NOVEMBRO', dez: 'DEZEMBRO'
}

export type ArkiumItem = {
  id: string
  numero: string
  resultado: string
  dataAbertura: string
  dataFechamento: string
  matriculaAuditor: string
  nomeAuditor: string
  identificadorObjeto: string
  nomeQuestionario: string
  clienteObjeto: string
  localidadeObjeto: string
  autocheck: string
  observacao: string
  status: 'ABERTO' | 'FECHADO'
  dbTecnico?: any
}
function formatDataInspecao(dateStr: string) {
  if (!dateStr) return '-'
  if (dateStr.includes('/') || dateStr.includes('-')) return dateStr
  const excelDateNum = Number(dateStr)
  if (!isNaN(excelDateNum) && excelDateNum > 20000) {
    const jsDate = new Date(Math.round((excelDateNum - 25569) * 86400 * 1000))
    return `${jsDate.getUTCDate().toString().padStart(2,'0')}/${(jsDate.getUTCMonth()+1).toString().padStart(2,'0')}/${jsDate.getUTCFullYear()}`
  }
  return dateStr
}

export default function InspecoesPage() {
  const { data: session } = useSession()
  const isMasterOrAdmin = (session?.user as any)?.role === 'MASTER' || (session?.user as any)?.role === 'ADMIN'

  const [activeTab, setActiveTab] = useState<'consolidado' | 'arkium'>('consolidado')
  const [pending, startTransition] = useTransition()

  // --- ESTADO: Visão Consolidada ---
  const [data, setData] = useState<any[]>([])
  const [selectedMonths, setSelectedMonths] = useState<MesKey[]>(['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  const targetMeta = 20
  const filtered = data.filter(t => {
    if (!showInactive && t.ativo === false) return false
    return t.nome.toLowerCase().includes(search.toLowerCase())
  })
  const totalRealizado = filtered.reduce((acc, curr) => {
    return acc + selectedMonths.reduce((sum, m) => sum + curr[m], 0)
  }, 0)
  const totalMeta = filtered.length * targetMeta * (selectedMonths.length || 1)
  const pctRealizado = totalMeta > 0 ? Math.round((totalRealizado / totalMeta) * 100) : 0

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const tecRes = await getTecnicos()
    const arkRes = await getInspecoesArkium()

    if (tecRes.success && tecRes.data) {
      const tecnicos = tecRes.data // Busca todos, incluindo inativos
      const arkiumList = arkRes.success && arkRes.data ? arkRes.data : []

      const newData = tecnicos.map((t: any) => {
        const tecArkium = arkiumList.filter((a: any) => {
          if (!a.nomeAuditor || !t.nome) return false
          const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          const nomePlanilha = removeAccents(a.nomeAuditor.toLowerCase().trim())
          const nomeBd = removeAccents(t.nome.toLowerCase().trim())
          if (nomePlanilha === nomeBd) return true
          
          const planTokens = nomePlanilha.split(' ')
          const dbTokens = nomeBd.split(' ')
          
          if (planTokens[0] === dbTokens[0]) {
             if (planTokens.length === 1 || dbTokens.length === 1) return true
             for (let i = 1; i < planTokens.length; i++) {
                for (let j = 1; j < dbTokens.length; j++) {
                   if (planTokens[i] === dbTokens[j] || (planTokens[i] === 'jr' && dbTokens[j] === 'junior') || (planTokens[i] === 'junior' && dbTokens[j] === 'jr')) {
                      return true
                   }
                }
             }
          }
          return false
        })

        const result: any = { id: t.id, nome: t.nome, admissao: new Date(t.admissao).toLocaleDateString('pt-BR'), fotoUrl: t.fotoUrl }
        
        Object.keys(MES_MAP).forEach(k => {
          const mesName = MES_MAP[k as MesKey]
          const totalMesArkium = tecArkium.filter((a: any) => {
            const dateStr = a.dataAbertura || a.dataFechamento
            if (!dateStr) return false
            let month = 0, year = 0
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/')
                if (parts.length >= 3) {
                  month = parseInt(parts[1], 10)
                  year = parseInt(parts[2], 10)
                  if (parts[2].length === 2) year += 2000
                }
            } else if (dateStr.includes('-')) {
                const parts = dateStr.split('-')
                if (parts.length >= 3) {
                  year = parseInt(parts[0], 10)
                  month = parseInt(parts[1], 10)
                }
            } else {
                const excelDateNum = Number(dateStr)
                if (!isNaN(excelDateNum) && excelDateNum > 20000) {
                    const jsDate = new Date(Math.round((excelDateNum - 25569) * 86400 * 1000))
                    month = jsDate.getUTCDate()
                    year = jsDate.getUTCFullYear()
                }
            }
            if (month === 0 || year === 0) return false
            const MONTH_NAMES = ["", "JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"]
            return MONTH_NAMES[month] === mesName && year === selectedYear
          }).length

          result[k] = totalMesArkium
        })
        result.ativo = t.ativo
        return result
      }).filter((r: any) => r.ativo || Object.keys(MES_MAP).some(k => r[k] > 0))

      setData(newData)
    }
  }

  // Recarrega os dados quando o ano selecionado mudar para re-calcular os meses
  useEffect(() => {
    loadData()
  }, [selectedYear])

  function startEdit(id: string, currentValue: number) {
    setEditingId(id)
    setEditValue(currentValue)
  }

  function handleDelete(id: string) {
    setData(prev => prev.filter(t => t.id !== id))
    setDeleteConfirmId(null)
  }

  function saveEdit(id: string) {
    if (selectedMonths.length === 1) {
      const monthKey = selectedMonths[0]
      const dbMes = MES_MAP[monthKey]
      
      startTransition(async () => {
         const res = await upsertAtividadeMes(id, 'INSPECAO', selectedYear, dbMes, editValue)
         if (res.success) {
           setData(prev => prev.map(t => t.id === id ? { ...t, [monthKey]: editValue } : t))
         } else {
           alert('Erro ao salvar no banco.')
         }
         setEditingId(null)
      })
    } else {
      alert("Selecione apenas 1 mês para editar os valores na tabela.")
      setEditingId(null)
    }
  }

  const MONTHS_LIST = [
    { key: 'jan', label: 'Jan' }, { key: 'fev', label: 'Fev' },
    { key: 'mar', label: 'Mar' }, { key: 'abr', label: 'Abr' },
    { key: 'mai', label: 'Mai' }, { key: 'jun', label: 'Jun' },
    { key: 'jul', label: 'Jul' }, { key: 'ago', label: 'Ago' },
    { key: 'set', label: 'Set' }, { key: 'out', label: 'Out' },
    { key: 'nov', label: 'Nov' }, { key: 'dez', label: 'Dez' }
  ]

  const clickTimeout = useRef<NodeJS.Timeout | null>(null)

  function handleMonthClick(m: MesKey) {
    if (clickTimeout.current) {
      // Duplo clique detectado: seleciona APENAS este mês
      clearTimeout(clickTimeout.current)
      clickTimeout.current = null
      setSelectedMonths([m])
      setEditingId(null)
    } else {
      // Clique simples: espera para ver se é duplo clique
      clickTimeout.current = setTimeout(() => {
        clickTimeout.current = null
        setSelectedMonths(prev => {
          // Se o mês clicado é o ÚNICO selecionado atualmente, seleciona TODOS novamente
          if (prev.length === 1 && prev.includes(m)) {
            return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
          }
          
          if (prev.includes(m)) {
            return prev.filter(x => x !== m)
          } else {
            return [...prev, m]
          }
        })
        setEditingId(null)
      }, 250)
    }
  }

  // --- ESTADO: Visão Arkium ---
  const [arkiumData, setArkiumData] = useState<ArkiumItem[]>([])

  useEffect(() => {
    async function loadArkium() {
      await limparInspecoesArkiumInvalidos()
      const res = await getInspecoesArkium()
      if (res.success && res.data && res.data.length > 0) {
        const fromDb: ArkiumItem[] = res.data.map((r: any) => {
          const dbTecnico = data.find((t: any) => {
            const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            const nomeDb = removeAccents(t.nome.toLowerCase().trim())
            const nomePlanilha = removeAccents(r.nomeAuditor.toLowerCase().trim())
            if (nomePlanilha === nomeDb) return true
            const planTokens = nomePlanilha.split(' ')
            const dbTokens = nomeDb.split(' ')
            if (planTokens[0] === dbTokens[0]) {
               if (planTokens.length === 1 || dbTokens.length === 1) return true
               for (let i = 1; i < planTokens.length; i++) {
                  for (let j = 1; j < dbTokens.length; j++) {
                     if (planTokens[i] === dbTokens[j] || (planTokens[i] === 'jr' && dbTokens[j] === 'junior') || (planTokens[i] === 'junior' && dbTokens[j] === 'jr')) {
                        return true
                     }
                  }
               }
            }
            return false
          })
          return {
            id: r.id,
            numero: r.numero,
            resultado: r.resultado || '',
            dataAbertura: r.dataAbertura || '',
            dataFechamento: r.dataFechamento || '',
            matriculaAuditor: r.matriculaAuditor || '',
            nomeAuditor: r.nomeAuditor || '',
            identificadorObjeto: r.identificadorObjeto || '',
            nomeQuestionario: r.nomeQuestionario || '',
            clienteObjeto: r.clienteObjeto || '',
            localidadeObjeto: r.localidadeObjeto || '',
            autocheck: r.autocheck || '',
            observacao: r.observacao || '',
            status: r.status as 'ABERTO' | 'FECHADO',
            dbTecnico,
          }
        })
        setArkiumData(fromDb)
      }
    }
    loadArkium()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])
  const [arkiumSearch, setArkiumSearch] = useState('')
  const [arkiumFilter, setArkiumFilter] = useState<'ALL' | 'CONFORME' | 'NAO_CONFORME'>('ALL')
  const [treatingItem, setTreatingItem] = useState<ArkiumItem | null>(null)
  const [tratarData, setTratarData] = useState('')
  const [tratarObs, setTratarObs] = useState('')
  const [deleteArkiumConfirmId, setDeleteArkiumConfirmId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importingFileName, setImportingFileName] = useState('')
  const [importProgress, setImportProgress] = useState('')
  const [showInspecoesPie, setShowInspecoesPie] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportingFileName(file.name)
    setImportProgress('Lendo arquivo...')

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        setImportProgress('Processando planilha...')
        const buffer = evt.target?.result as ArrayBuffer
        let parsed: any[] = []

        if (file.name.toLowerCase().endsWith('.csv')) {
          const decoder = new TextDecoder('windows-1252')
          const csvText = decoder.decode(buffer)
          const lines = csvText.split(/\r?\n/)
          if (lines.length > 0) {
            const separator = lines[0].includes(';') ? ';' : ','
            const headers = lines[0].split(separator).map(h => h.trim())
            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue
              const values = lines[i].split(separator)
              const obj: any = {}
              headers.forEach((h, idx) => {
                let val = values[idx] !== undefined ? values[idx].trim() : ''
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

        const imported: ArkiumItem[] = parsed
          .map((row: any) => {
            // Busca segura de chaves por causa de possíveis espaços ou acentos
            const getKey = (keys: string[]) => {
              const rowKeys = Object.keys(row)
              for (const k of keys) {
                const match = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, ''))
                if (match && row[match] !== undefined && row[match] !== null) return row[match]
              }
              return ''
            }

            const dtFechamento = getKey(['Data Fechamento', 'DataFechamento'])
            return {
              id: Math.random().toString(36).substr(2, 9),
              numero: String(getKey(['Numero', 'Número'])),
              resultado: String(getKey(['Resultado'])),
              dataAbertura: String(getKey(['Data Abertura', 'DataAbertura'])),
              dataFechamento: String(dtFechamento),
              matriculaAuditor: String(getKey(['Matricula Auditor', 'MatriculaAuditor', 'Matrícula Auditor'])),
              nomeAuditor: String(getKey(['Nome Auditor', 'NomeAuditor'])),
              identificadorObjeto: String(getKey(['Identificador Objeto', 'IdentificadorObjeto'])),
              nomeQuestionario: String(getKey(['Nome Questionario', 'NomeQuestionário', 'NomeQuestionario'])),
              clienteObjeto: String(getKey(['Cliente Objeto', 'ClienteObjeto'])),
              localidadeObjeto: String(getKey(['Localidade Objeto', 'LocalidadeObjeto'])),
              autocheck: String(getKey(['Autocheck'])),
              observacao: String(getKey(['Observação', 'Observacao', 'Observao'])),
              status: dtFechamento ? 'FECHADO' : 'ABERTO' as 'ABERTO' | 'FECHADO'
            }
          })
          .filter(item => item.numero.trim() !== '') // Evita linhas vazias
          .filter(item => item.matriculaAuditor.toUpperCase().startsWith('SG4'))
          .map(item => {
            // Tenta achar o técnico correspondente no array 'data' (que veio do BD)
            // Match simples: nome exato ou contendo partes do nome (ex: nome e sobrenome principais)
            const dbTecnico = data.find(t => {
               const nomePlanilha = item.nomeAuditor.toLowerCase().trim()
               const nomeBd = t.nome.toLowerCase().trim()
               return nomePlanilha === nomeBd || nomePlanilha.includes(nomeBd.split(' ')[0]) && nomePlanilha.includes(nomeBd.split(' ').pop())
            })
            return { ...item, dbTecnico }
          })
        setImportProgress('Salvando no banco de dados...')

        const saveRes = await upsertInspecoesArkiumBatch(imported.map(item => ({
          numero: item.numero,
          resultado: item.resultado,
          dataAbertura: item.dataAbertura,
          dataFechamento: item.dataFechamento,
          matriculaAuditor: item.matriculaAuditor,
          nomeAuditor: item.nomeAuditor,
          identificadorObjeto: item.identificadorObjeto,
          nomeQuestionario: item.nomeQuestionario,
          clienteObjeto: item.clienteObjeto,
          localidadeObjeto: item.localidadeObjeto,
          autocheck: item.autocheck,
          observacao: item.observacao,
          status: item.status,
        })))

        const msg = saveRes.success 
           ? `${saveRes.inseridos} novos importados, ${saveRes.atualizados} atualizados (já existiam).` 
           : `${imported.length} itens processados.`
           
        setImportProgress(msg)
        
        // Atualiza estado local simulando o Upsert
        setArkiumData(prev => {
           const next = [...prev]
           imported.forEach(imp => {
              const idx = next.findIndex(p => p.numero === imp.numero)
              if (idx >= 0) next[idx] = imp
              else next.push(imp)
           })
           return next
        })
        
        setTimeout(() => setIsImporting(false), 2500)
      } catch (err) {
        setIsImporting(false)
        alert("Erro ao ler o arquivo. Certifique-se de que é um Excel (.xlsx) ou CSV válido.")
      }
    }
    reader.onerror = () => {
      setIsImporting(false)
      alert("Não foi possível ler o arquivo. Tente novamente.")
    }
    reader.readAsArrayBuffer(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleTratar(e: React.FormEvent) {
    e.preventDefault()
    if (!treatingItem) return
    setArkiumData(prev => prev.map(item => {
      if (item.id === treatingItem.id) {
        return {
          ...item,
          dataFechamento: tratarData,
          observacao: tratarObs,
          status: tratarData ? 'FECHADO' : 'ABERTO'
        }
      }
      return item
    }))
    setTreatingItem(null)
    setTratarData('')
    setTratarObs('')
  }

  function handleDeleteArkium(id: string) {
    startTransition(async () => {
      const res = await deleteInspecoesArkiumItem(id)
      if (res.success) {
        setArkiumData(prev => prev.filter(t => t.id !== id))
        setDeleteArkiumConfirmId(null)
      } else {
        alert("Erro ao excluir registro.")
      }
    })
  }

  function openTreatModal(item: ArkiumItem) {
    setTreatingItem(item)
    setTratarData(item.dataFechamento)
    setTratarObs(item.observacao)
  }

  const totalsTecnicos = {
    ativos: data.filter((t: any) => t.ativo !== false).length,
    inativos: data.filter((t: any) => t.ativo === false).length
  }

  const filteredArkiumByDateAndActive = arkiumData.filter(a => {
    // 1. Filtro de inativos: só excluir se SABEMOS que o técnico é inativo
    //    (dbTecnico encontrado e ativo===false). Se não há match no BD, não excluir.
    if (!showInactive && a.dbTecnico && a.dbTecnico.ativo === false) return false

    // 2. Filtro de data: se não conseguir parsear, incluir o registro
    const dateStr = a.dataAbertura || a.dataFechamento
    if (!dateStr) return true // sem data → mostrar
    let month = 0, year = 0
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/')
      if (parts.length >= 3) { month = parseInt(parts[1],10); year = parseInt(parts[2],10); if (parts[2].length===2) year+=2000 }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-')
      if (parts.length >= 3) { year = parseInt(parts[0],10); month = parseInt(parts[1],10) }
    } else {
      const excelDateNum = Number(dateStr)
      if (!isNaN(excelDateNum) && excelDateNum > 20000) {
        const jsDate = new Date(Math.round((excelDateNum - 25569) * 86400 * 1000))
        month = jsDate.getUTCMonth() + 1; year = jsDate.getUTCFullYear()
      }
    }
    // Se não conseguiu parsear ano/mês → incluir o registro
    if (year === 0 || month === 0) return true
    if (year !== selectedYear) return false
    const MONTH_KEYS: string[] = ['', 'jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    if (month >= 1 && month <= 12) {
      if (!selectedMonths.includes(MONTH_KEYS[month] as MesKey)) return false
    }
    return true
  })

  const filteredArkium = filteredArkiumByDateAndActive.filter(a => {
    const textMatch = a.numero.toLowerCase().includes(arkiumSearch.toLowerCase()) || 
                      a.nomeAuditor.toLowerCase().includes(arkiumSearch.toLowerCase()) ||
                      a.nomeQuestionario.toLowerCase().includes(arkiumSearch.toLowerCase())
    if (!textMatch) return false
    if (arkiumFilter === 'CONFORME') return a.resultado.toLowerCase().trim() === 'conforme'
    if (arkiumFilter === 'NAO_CONFORME') {
      const res = a.resultado.toLowerCase().trim()
      return res.includes('não conforme') || res.includes('nao conforme')
    }
    return true
  })
  
  const totalArkium = filteredArkiumByDateAndActive.length
  const conformesArkium = filteredArkiumByDateAndActive.filter(a => a.resultado.toLowerCase().trim() === 'conforme').length
  const naoConformesArkium = filteredArkiumByDateAndActive.filter(a => {
    const res = a.resultado.toLowerCase().trim()
    return res.includes('não conforme') || res.includes('nao conforme')
  }).length

  return (
    <div className="flex flex-col gap-[24px] pb-[40px]">

      {/* ── Overlay de Importação ── */}
      {isImporting && (
        <div className="fixed inset-0 z-[9999] bg-[rgba(15,23,42,0.85)] backdrop-blur-[6px] flex flex-col items-center justify-center gap-[20px] p-[16px]">
          <style>{`
            @keyframes sg4-spin { to { transform: rotate(360deg); } }
            @keyframes sg4-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
            @keyframes sg4-progress { 0%{width:0%;margin-left:0%} 50%{width:70%;margin-left:15%} 100%{width:0%;margin-left:100%} }
          `}</style>
          <div className="bg-white rounded-[20px] p-[40px_24px] md:p-[40px_48px] flex flex-col items-center gap-[20px] shadow-[0_25px_50px_rgba(0,0,0,0.4)] w-full max-w-[400px]">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(102,0,153,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={32} color="#660099" style={{ animation: 'sg4-spin 1s linear infinite' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Importando Inspeções</h3>
              <p style={{ margin: '0 0 4px 0', fontSize: 12, color: '#64748b', fontWeight: 500, maxWidth: 280, lineHeight: 1.5 }}>{importingFileName}</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#660099', animation: 'sg4-pulse 1.5s ease-in-out infinite' }}>{importProgress}</p>
            </div>
            <div style={{ width: '100%', background: '#f1f5f9', borderRadius: 8, height: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #660099, #8e44ad)', borderRadius: 8, animation: 'sg4-progress 1.5s ease-in-out infinite' }} />
            </div>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Não feche nem atualize a página durante a importação.</p>
          </div>
        </div>
      )}
      <div className="bg-white rounded-[10px] border border-[#f1f5f9] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-[14px_20px] flex items-center justify-between flex-wrap gap-[16px]">
        <div className="flex items-baseline gap-[10px]">
          <h1 className="text-[20px] font-extrabold text-[#1e293b] m-0 flex items-center gap-[8px]">
            <ClipboardCheck color="#660099" size={22} />
            Inspeções de Segurança
          </h1>
        </div>
        
        {/* Navegação de Abas */}
        <div className="flex bg-[#f1f5f9] p-[4px] rounded-[8px] gap-[4px] overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab('consolidado')}
            className={`whitespace-nowrap px-[16px] py-[6px] rounded-[6px] border-none cursor-pointer text-[13px] font-bold transition-all duration-200 ${activeTab === 'consolidado' ? 'bg-white text-[#660099] shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'bg-transparent text-[#64748b]'}`}
          >
            Visão Consolidada
          </button>
          <button
            onClick={() => setActiveTab('arkium')}
            className={`whitespace-nowrap px-[16px] py-[6px] rounded-[6px] border-none cursor-pointer text-[13px] font-bold transition-all duration-200 ${activeTab === 'arkium' ? 'bg-white text-[#660099] shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'bg-transparent text-[#64748b]'}`}
          >
            Estratificação Arkium
          </button>
        </div>
      </div>

      {/* ========================================================
          ABA: VISÃO CONSOLIDADA
      ======================================================== */}
      {activeTab === 'consolidado' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
            {/* Filtro de Meses e Ano */}
            <div className="bg-white border border-[#f1f5f9] rounded-[10px] p-[20px] flex flex-col gap-[12px] lg:col-span-2">
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
                    const isSelected = selectedMonths.includes(m.key as MesKey)
                    return (
                      <button
                        key={m.key}
                        onClick={() => handleMonthClick(m.key as MesKey)}
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
                    const isSelected = selectedMonths.includes(m.key as MesKey)
                    return (
                      <button
                        key={m.key}
                        onClick={() => handleMonthClick(m.key as MesKey)}
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

            {/* Card de Estatística */}
            <div className="bg-white border border-[#f1f5f9] rounded-[10px] p-[20px] lg:col-span-1">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Atingimento do Período</span>
                <span style={{ background: 'rgba(102,0,153,0.1)', color: '#660099', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                  {selectedMonths.length} MÊS(ES)
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

          <div className="flex flex-col gap-[16px]">
            <div className="flex flex-col md:flex-row items-center justify-between bg-white p-[12px_20px] rounded-[10px] border border-[#f1f5f9] gap-[16px]">
              <div className="relative w-full md:w-[300px]">
                <Search size={16} className="absolute left-[12px] top-[10px] text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="Filtrar por técnico..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                />
              </div>
              <div className="flex items-center gap-[16px] w-full md:w-auto justify-between md:justify-end">
                <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 700, color: '#475569', background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span>Ativos: <span style={{ color: '#10b981' }}>{data.filter((t: any) => t.ativo !== false).length}</span></span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>Inativos: <span style={{ color: '#ef4444' }}>{data.filter((t: any) => t.ativo === false).length}</span></span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ cursor: 'pointer' }} />
                  Mostrar inativos
                </label>
              </div>
            </div>

            <div className="bg-white border border-[#f1f5f9] rounded-[10px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse text-left min-w-[700px]">
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Meta do Período</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Realizado</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Progresso</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => {
                      const realizado = selectedMonths.reduce((sum, m) => sum + t[m], 0)
                      const meta = targetMeta * (selectedMonths.length || 1)
                      const statusPct = meta > 0 ? Math.round((realizado / meta) * 100) : 0
                      const isCompleted = realizado >= meta
                      const hasStarted = realizado > 0

                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {t.fotoUrl ? (
                                <img src={t.fotoUrl} alt={t.nome} style={{ width: 56, height: 56, flexShrink: 0, borderRadius: '50%', objectFit: 'cover', border: '2px solid #f1f5f9' }} />
                              ) : (
                                <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: '50%', background: '#f1f5f9', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>
                                  {t.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                </div>
                              )}
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>{t.nome}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Admissão: {t.admissao}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
                            {meta}
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
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          ABA: ESTRATIFICAÇÃO ARKIUM
      ======================================================== */}
        <div className="flex flex-col gap-[24px]">

          {/* Stats Cards */}
          <div className="flex flex-col md:flex-row gap-[16px] flex-wrap">
            <div 
              onClick={() => { setArkiumFilter('ALL'); setShowInspecoesPie(true); }}
              style={{ flex: 1, background: '#fff', border: arkiumFilter === 'ALL' ? '2px solid #660099' : '1px solid #f1f5f9', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', transition: 'all 0.2s', boxShadow: arkiumFilter === 'ALL' ? '0 4px 6px -1px rgba(102,0,153,0.1)' : 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: arkiumFilter === 'ALL' ? '#660099' : '#64748b' }}>
                <ListTodo size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Total</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{totalArkium}</div>
            </div>
            
            <div 
              onClick={() => setArkiumFilter('CONFORME')}
              style={{ flex: 1, background: '#fff', border: arkiumFilter === 'CONFORME' ? '2px solid #10b981' : '1px solid #d1fae5', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', boxShadow: arkiumFilter === 'CONFORME' ? '0 4px 6px -1px rgba(16,185,129,0.2)' : 'none' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: '#10b981' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#047857', paddingLeft: 8 }}>
                <CheckCircle2 size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Conformes</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', lineHeight: 1, paddingLeft: 8 }}>{conformesArkium}</div>
            </div>

            <div 
              onClick={() => setArkiumFilter('NAO_CONFORME')}
              style={{ flex: 1, background: '#fff', border: arkiumFilter === 'NAO_CONFORME' ? '2px solid #ef4444' : '1px solid #fee2e2', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', boxShadow: arkiumFilter === 'NAO_CONFORME' ? '0 4px 6px -1px rgba(239,68,68,0.2)' : 'none' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: '#ef4444' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c', paddingLeft: 8 }}>
                <AlertTriangle size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Não Conformes</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', lineHeight: 1, paddingLeft: 8 }}>{naoConformesArkium}</div>
            </div>
          </div>


          {/* Table Area */}
          {arkiumData.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Filtros e Importação */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
                {/* Filtro de Meses e Ano */}
                <div className="bg-white border border-[#f1f5f9] rounded-[10px] p-[10px_16px] flex flex-col gap-[8px] lg:col-span-2">
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
                        const isSelected = selectedMonths.includes(m.key as MesKey)
                        return (
                          <button key={m.key} onClick={() => handleMonthClick(m.key as MesKey)}
                            style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: isSelected ? '1px solid #660099' : '1px solid #e2e8f0', background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc', color: isSelected ? '#660099' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none' }}
                          >{m.label}</button>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {MONTHS_LIST.slice(6, 12).map(m => {
                        const isSelected = selectedMonths.includes(m.key as MesKey)
                        return (
                          <button key={m.key} onClick={() => handleMonthClick(m.key as MesKey)}
                            style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: isSelected ? '1px solid #660099' : '1px solid #e2e8f0', background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc', color: isSelected ? '#660099' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none' }}
                          >{m.label}</button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Upload Area */}
                <div className="bg-white border border-dashed border-[#cbd5e1] rounded-[10px] p-[16px] flex flex-col items-center justify-center gap-[12px] lg:col-span-1">
                  <div style={{ width: 48, height: 48, background: 'rgba(102,0,153,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileSpreadsheet color="#660099" size={24} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Importar Inspeções Arkium</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Excel (.xlsx) ou CSV</div>
                  </div>
                  <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{ background: '#660099', color: '#fff', border: 'none', padding: '8px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}
                  >
                    <UploadCloud size={16} />
                    Selecionar Arquivo
                  </button>
                </div>
              </div>

              {/* Busca e Inativos */}
              <div className="flex flex-col md:flex-row items-center justify-between bg-white p-[12px_20px] rounded-[10px] border border-[#f1f5f9] flex-wrap gap-[16px]">
                <div className="relative w-full md:w-[350px]">
                  <Search size={16} className="absolute left-[12px] top-[10px] text-[#94a3b8]" />
                  <input
                    type="text"
                    placeholder="Buscar por número, auditor ou questionário..."
                    value={arkiumSearch}
                    onChange={(e) => setArkiumSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div className="flex items-center gap-[16px] w-full md:w-auto justify-between md:justify-end">
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

              <div className="bg-white border border-[#f1f5f9] rounded-[10px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="overflow-x-auto w-full">
                  <table className="w-full border-collapse text-left min-w-[1000px]">
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Número</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data Ab.</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Auditor</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Questionário / Objeto</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data Ab.</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data Fec.</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArkium.map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#334155' }}>{a.numero}</td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569', fontWeight: 600 }}>{formatDataInspecao(a.dataAbertura)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {a.dbTecnico?.fotoUrl ? (
                                <img src={a.dbTecnico.fotoUrl} alt={a.dbTecnico.nome} style={{ width: 56, height: 56, flexShrink: 0, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                              ) : (
                                <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: '50%', background: '#f1f5f9', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>
                                  {(a.dbTecnico?.nome || a.nomeAuditor).split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{a.dbTecnico?.nome || a.nomeAuditor}</div>
                                <div style={{ fontSize: 10, color: '#94a3b8' }}>Mat: {a.matriculaAuditor || '--'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.nomeQuestionario}>{a.nomeQuestionario}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.clienteObjeto}>{a.clienteObjeto}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569' }}>{a.dataAbertura}</td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569' }}>{a.dataFechamento || '--'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {a.status === 'FECHADO' ? (
                              <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, background: '#d1fae5', color: '#047857' }}>FECHADO</span>
                            ) : (
                              <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, background: '#fef3c7', color: '#b45309' }}>ABERTO</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                              <button
                                onClick={() => openTreatModal(a)}
                                style={{
                                  width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                  color: '#64748b', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                                title="Visualizar Detalhes"
                              >
                                <Eye size={16} />
                              </button>
                              {isMasterOrAdmin && (
                                <button
                                  onClick={() => setDeleteArkiumConfirmId(a.id)}
                                  style={{
                                    width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                    color: '#ef4444', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                  }}
                                  title="Excluir Registro"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL PIE CHART INSPEÇÕES */}
      {showInspecoesPie && (() => {
        const mapTec = new Map<string, number>()
        filteredArkiumByDateAndActive.forEach(a => {
          const nome = a.dbTecnico?.nome || a.nomeAuditor
          mapTec.set(nome, (mapTec.get(nome) || 0) + 1)
        })
        const slices = Array.from(mapTec.entries()).map(([nome, count]) => ({ nome, count })).sort((a,b) => b.count - a.count)
        const total = slices.reduce((acc, s) => acc + s.count, 0)
        const COLORS = ['#660099','#9333ea','#06b6d4','#f59e0b','#ef4444','#22c55e','#3b82f6','#ec4899','#8b5cf6','#14b8a6']

        const buildPie = () => {
          if (total === 0) return []
          let cumAngle = -Math.PI / 2
          const cx = 100, cy = 100, r = 90
          return slices.map(({ nome, count }, i) => {
            const angle = (count / total) * 2 * Math.PI
            const x1 = cx + r * Math.cos(cumAngle)
            const y1 = cy + r * Math.sin(cumAngle)
            cumAngle += angle
            const x2 = cx + r * Math.cos(cumAngle)
            const y2 = cy + r * Math.sin(cumAngle)
            const largeArc = angle > Math.PI ? 1 : 0
            const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
            return { d, color: COLORS[i % COLORS.length], nome, count, pct: Math.round((count / total) * 100) }
          })
        }
        const pieSlices = buildPie()

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
              <div style={{ background: '#660099', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>🍕 Inspeções — Participação por Técnico</h2>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{total} inspeções no período selecionado</span>
                </div>
                <button onClick={() => setShowInspecoesPie(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 24, fontWeight: 'bold', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: 24, overflowY: 'auto' }}>
                {total === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>Nenhuma inspeção no período.</div>
                ) : (
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <svg width="200" height="200" viewBox="0 0 200 200">
                      {pieSlices.map((s, i) => (
                        <path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth="2" />
                      ))}
                      <circle cx="100" cy="100" r="42" fill="#fff" />
                      <text x="100" y="96" textAnchor="middle" fontSize="18" fontWeight="800" fill="#1e293b">{total}</text>
                      <text x="100" y="112" textAnchor="middle" fontSize="10" fontWeight="600" fill="#94a3b8">insp.</text>
                    </svg>
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
            </div>
          </div>
        )
      })()}

      {/* MODAL TRATAR ARKIUM (NOVO DESIGN) */}
      {treatingItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.8)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardCheck color="#64748b" size={16} />
                </div>
                Detalhes da Inspeção #{treatingItem.numero}
              </h3>
              <button onClick={() => setTreatingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleTratar} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Cabeçalho do Card Interno */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'linear-gradient(145deg, #f8fafc, #f1f5f9)', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  {treatingItem.dbTecnico?.fotoUrl ? (
                    <img src={treatingItem.dbTecnico.fotoUrl} alt={treatingItem.nomeAuditor} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, border: '2px solid #e2e8f0' }}>
                      {(treatingItem.dbTecnico?.nome || treatingItem.nomeAuditor).split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{treatingItem.dbTecnico?.nome || treatingItem.nomeAuditor}</h4>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Matrícula: <span style={{ fontWeight: 600, color: '#334155' }}>{treatingItem.matriculaAuditor || '--'}</span></div>
                  </div>
                  {treatingItem.status === 'FECHADO' ? (
                    <span style={{ padding: '4px 10px', background: '#d1fae5', color: '#047857', borderRadius: 20, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12}/> FECHADO</span>
                  ) : (
                    <span style={{ padding: '4px 10px', background: '#fef3c7', color: '#b45309', borderRadius: 20, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12}/> PENDENTE</span>
                  )}
                </div>

                {/* Grid de Informações Secundárias */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Resultado</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: treatingItem.resultado?.toLowerCase().includes('não') ? '#ef4444' : '#10b981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{treatingItem.resultado || '--'}</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Questionário</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{treatingItem.nomeQuestionario || '--'}</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Localidade / Cliente</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{treatingItem.localidadeObjeto || '--'} / {treatingItem.clienteObjeto || '--'}</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Data Abertura</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{treatingItem.dataAbertura || '--'}</span>
                  </div>
                </div>

                {/* Seção de Tratativa */}
                <div style={{ background: treatingItem.status === 'FECHADO' ? '#f0fdf4' : '#fff', border: treatingItem.status === 'FECHADO' ? '1px solid #bbf7d0' : '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 800, color: treatingItem.status === 'FECHADO' ? '#166534' : '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckSquare size={14} /> 
                    Tratativa
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>Data de Fechamento</label>
                      {treatingItem.status === 'FECHADO' ? (
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{treatingItem.dataFechamento || '--'}</div>
                      ) : (
                        <input 
                          type="text" 
                          value={tratarData} 
                          onChange={e => setTratarData(e.target.value)} 
                          placeholder="Ex: 10/05/2026"
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', background: '#f8fafc' }} 
                        />
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>Observação / Ação Tomada</label>
                      {treatingItem.status === 'FECHADO' ? (
                        <div style={{ fontSize: 12, color: '#475569', background: '#fff', padding: 8, borderRadius: 6, border: '1px dashed #cbd5e1', minHeight: 40 }}>
                          {treatingItem.observacao || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma observação fornecida.</span>}
                        </div>
                      ) : (
                        <textarea 
                          value={tratarObs} 
                          onChange={e => setTratarObs(e.target.value)} 
                          placeholder="Descreva a tratativa..."
                          rows={2}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', resize: 'none', background: '#f8fafc' }} 
                        />
                      )}
                    </div>
                  </div>
                </div>

                {treatingItem.status === 'ABERTO' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <button type="button" onClick={() => setTreatingItem(null)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                      Cancelar
                    </button>
                    <button type="submit" style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 6px -1px rgba(16,185,129,0.2)', transition: 'all 0.2s' }}>
                      <CheckSquare size={14} /> Salvar Tratativa
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button type="button" onClick={() => setTreatingItem(null)} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                      Fechar
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão Arkium */}
      {deleteArkiumConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 color="#ef4444" size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Excluir Inspeção Importada</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Ação exclusiva para Master/Admin.</p>
              </div>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
              Você tem certeza que deseja excluir esta inspeção importada? Esta ação removerá o dado do banco de dados definitivamente.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setDeleteArkiumConfirmId(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => handleDeleteArkium(deleteArkiumConfirmId)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão Consolidado */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
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
              Você tem certeza que deseja excluir as informações deste técnico?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
