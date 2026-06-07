'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import {
  MessageSquare,
  Search, Trash2, Edit,
  UploadCloud, FileSpreadsheet, ListTodo, CheckSquare, X, AlertTriangle, CheckCircle2, Loader2, Eye
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getTecnicos } from '@/app/actions/tecnicos'
import { getAtividades, upsertAtividadeMes } from '@/app/actions/atividades'
import { getDssArkium, upsertDssArkiumBatch, updateEstadoDssArkium, limparDssArkiumInvalidos, deleteDssArkium } from '@/app/actions/dssArkium'

type MesKey = 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun' | 'jul' | 'ago' | 'set' | 'out' | 'nov' | 'dez'

const MES_MAP: Record<MesKey, string> = {
  jan: 'JANEIRO', fev: 'FEVEREIRO', mar: 'MARCO', abr: 'ABRIL', mai: 'MAIO', jun: 'JUNHO',
  jul: 'JULHO', ago: 'AGOSTO', set: 'SETEMBRO', out: 'OUTUBRO', nov: 'NOVEMBRO', dez: 'DEZEMBRO'
}

export type ArkiumDSSItem = {
  id: string
  assunto: string
  numeroDialogo: string
  lider: string
  base: string
  uf: string
  localidade: string
  dataFechamento: string
  matricula: string
  nome: string
  tipo: string
  statusDSS: string
  assinado: string
  justificativa: string
  estado: 'ABERTO' | 'FECHADO'
  dbTecnico?: any
}

export default function DialogosPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const isMasterOrAdmin = userRole === 'MASTER' || userRole === 'ADMIN'

  const [activeTab, setActiveTab] = useState<'consolidado' | 'arkium'>('consolidado')
  const [pending, startTransition] = useTransition()

  // --- ESTADO: Visão Consolidada ---
  const [data, setData] = useState<any[]>([])
  const [selectedMonths, setSelectedMonths] = useState<MesKey[]>(['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const targetMeta = 8 // Meta de DSS da planilha (8/mês)
  const filtered = data.filter(t => t.nome.toLowerCase().includes(search.toLowerCase()))
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
    const atvRes = await getAtividades('DSS')
    const arkRes = await getDssArkium()

    if (tecRes.success && tecRes.data) {
      const tecnicos = tecRes.data
      const atividades = atvRes.success && atvRes.data ? atvRes.data : []
      const arkiumList = arkRes.success && arkRes.data ? arkRes.data : []

      const newData = tecnicos.map((t: any) => {
        const tecAtv = atividades.filter((a: any) => a.tecnicoId === t.id)
        const tecArkium = arkiumList.filter((a: any) => {
          if (!a.nome || !t.nome) return false
          const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          const nomePlanilha = removeAccents(a.nome.toLowerCase().trim())
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

        const result: any = { id: t.id, nome: t.nome, fotoUrl: t.fotoUrl }
        
        Object.keys(MES_MAP).forEach(k => {
          const mesName = MES_MAP[k as MesKey]
          const totalMesAtv = tecAtv.filter((a: any) => a.mes === mesName && a.ano === selectedYear).reduce((sum: number, a: any) => sum + a.realizado, 0)
          
          const totalMesArkium = tecArkium.filter((a: any) => {
            if (!a.dataFechamento) return false
            let month = 0, year = 0
            if (a.dataFechamento.includes('/')) {
                const parts = a.dataFechamento.split('/')
                if (parts.length >= 3) {
                  month = parseInt(parts[1], 10)
                  year = parseInt(parts[2], 10)
                  if (parts[2].length === 2) year += 2000
                }
            } else if (a.dataFechamento.includes('-')) {
                const parts = a.dataFechamento.split('-')
                if (parts.length >= 3) {
                  year = parseInt(parts[0], 10)
                  month = parseInt(parts[1], 10)
                }
            } else {
                const excelDateNum = Number(a.dataFechamento)
                if (!isNaN(excelDateNum) && excelDateNum > 20000) {
                    const jsDate = new Date(Math.round((excelDateNum - 25569) * 86400 * 1000))
                    // Excel swap bug in PT-BR: if exported DD/MM/YYYY text gets converted to MM/DD/YYYY serial
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

  // Recarrega os dados quando o ano selecionado mudar
  useEffect(() => {
    loadData()
  }, [selectedYear])

  function saveEdit(id: string) {
    if (selectedMonths.length === 1) {
      const monthKey = selectedMonths[0]
      const dbMes = MES_MAP[monthKey]
      
      startTransition(async () => {
         const res = await upsertAtividadeMes(id, 'DSS', selectedYear, dbMes, editValue)
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

  function handleDelete(id: string) {
    setData(prev => prev.filter(t => t.id !== id))
    setDeleteConfirmId(null)
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
  const [arkiumData, setArkiumData] = useState<ArkiumDSSItem[]>([])
  const [arkiumSearch, setArkiumSearch] = useState('')
  const [arkiumFilter, setArkiumFilter] = useState<'ALL' | 'SIM' | 'NA'>('ALL')
  const [treatingItem, setTreatingItem] = useState<ArkiumDSSItem | null>(null)
  const [tratarJustificativa, setTratarJustificativa] = useState('')
  const [tratarAssinado, setTratarAssinado] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importingFileName, setImportingFileName] = useState('')
  const [importProgress, setImportProgress] = useState('')
  const [deleteArkiumConfirmId, setDeleteArkiumConfirmId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carrega registros Arkium do banco ao montar (e limpa inválidos de importações anteriores)
  useEffect(() => {
    async function loadArkium() {
      // Limpa registros sem número de diálogo (import antiga com bug)
      await limparDssArkiumInvalidos()
      const res = await getDssArkium()
      if (res.success && res.data && res.data.length > 0) {
        const fromDb: ArkiumDSSItem[] = res.data.map((r: any) => {
          const dbTecnico = data.find((t: any) => {
            const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            const nomeDb = removeAccents(t.nome.toLowerCase().trim())
            const nomePlanilha = removeAccents(r.nome.toLowerCase().trim())
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
            assunto: r.assunto,
            numeroDialogo: r.numeroDialogo,
            lider: r.lider || '',
            base: r.base || '',
            uf: r.uf || '',
            localidade: r.localidade || '',
            dataFechamento: r.dataFechamento || '',
            matricula: r.matricula,
            nome: r.nome,
            tipo: r.tipo || '',
            statusDSS: r.statusDSS || '',
            assinado: r.assinado || 'NA',
            justificativa: r.justificativa || '',
            estado: r.estado as 'ABERTO' | 'FECHADO',
            dbTecnico,
          }
        })
        setArkiumData(fromDb)
      }
    }
    loadArkium()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

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

        const imported: ArkiumDSSItem[] = parsed
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

            const assinadoVal = String(getKey(['Assinado']))
            const justifVal = String(getKey(['Justificativa']))
            
            // Lógica de "ABERTO": Se não está assinado E não tem justificativa, consideramos aberto
            // Ou se a "Data Fechamento" estiver vazia. Depende do seu processo. 
            // Assumiremos que falta "Assinatura" ou "Justificativa" para fechá-lo.
            const isFechado = (assinadoVal.toLowerCase() === 'sim' || assinadoVal.toLowerCase() === 'yes') || justifVal.length > 0

            return {
              id: Math.random().toString(36).substr(2, 9),
              assunto: String(getKey(['Assunto'])),
              numeroDialogo: String(getKey(['Número do Diálogo', 'Numero do Diálogo', 'Numero do Dialogo', 'Numero', 'N° Diálogo', 'N Diálogo'])).trim(),
              lider: String(getKey(['Lider', 'Líder'])),
              base: String(getKey(['Base'])),
              uf: String(getKey(['UF'])),
              localidade: String(getKey(['Localidade'])),
              dataFechamento: String(getKey(['Data Fechamento', 'DataFechamento'])),
              matricula: String(getKey(['Matricula', 'Matrícula'])),
              nome: String(getKey(['Nome'])),
              tipo: String(getKey(['Tipo'])),
              statusDSS: String(getKey(['Status'])),
              assinado: assinadoVal || 'NA',
              justificativa: justifVal,
              estado: isFechado ? 'FECHADO' : 'ABERTO' as 'ABERTO' | 'FECHADO'
            }
          })
          .filter(item => item.matricula.toUpperCase().startsWith('SG4'))
          .map(item => {
            const dbTecnico = data.find(t => {
               const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
               const nomePlanilha = removeAccents(item.nome.toLowerCase().trim())
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
            return { ...item, dbTecnico }
          })
        setImportProgress('Salvando no banco de dados...')
        // Filtra apenas itens novos (não duplicados)
        const newItems = imported.filter(imp => !arkiumData.some(p => p.numeroDialogo === imp.numeroDialogo && p.matricula === imp.matricula))

        // Persiste no banco via server action
        const saveRes = await upsertDssArkiumBatch(newItems.map(item => ({
          numeroDialogo: item.numeroDialogo,
          assunto: item.assunto,
          lider: item.lider,
          base: item.base,
          uf: item.uf,
          localidade: item.localidade,
          dataFechamento: item.dataFechamento,
          matricula: item.matricula,
          nome: item.nome,
          tipo: item.tipo,
          statusDSS: item.statusDSS,
          assinado: item.assinado,
          justificativa: item.justificativa,
          estado: item.estado,
        })))

        const savedCount = saveRes.success ? (saveRes.inseridos ?? newItems.length) : newItems.length
        setImportProgress(`${savedCount} novos registros importados!`)
        setArkiumData(prev => [...prev, ...newItems])
        setTimeout(() => setIsImporting(false), 1200)
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

    startTransition(async () => {
      const isFechado = (tratarAssinado.toLowerCase() === 'sim' || tratarAssinado.toLowerCase() === 'yes') || tratarJustificativa.length > 0

      // Persiste no banco se o item já tem ID real (do banco)
      if (treatingItem.id && treatingItem.id.length > 9) {
        await updateEstadoDssArkium(treatingItem.id, tratarAssinado, tratarJustificativa)
      }

      setArkiumData(prev => prev.map(item => {
        if (item.id === treatingItem.id) {
          return {
            ...item,
            assinado: tratarAssinado,
            justificativa: tratarJustificativa,
            estado: isFechado ? 'FECHADO' : 'ABERTO'
          }
        }
        return item
      }))
      setTreatingItem(null)
      setTratarJustificativa('')
      setTratarAssinado('')
    })
  }

  function openTreatModal(item: ArkiumDSSItem) {
    setTreatingItem(item)
    setTratarJustificativa(item.justificativa)
    setTratarAssinado(item.assinado || 'NA')
  }

  async function handleDeleteArkium(id: string) {
    const res = await deleteDssArkium(id)
    if (res.success) {
      setArkiumData(prev => prev.filter(a => a.id !== id))
    } else {
      alert("Erro ao excluir registro.")
    }
    setDeleteArkiumConfirmId(null)
  }

  const filteredArkium = arkiumData.filter(a => {
    const textMatch = a.numeroDialogo.toLowerCase().includes(arkiumSearch.toLowerCase()) || 
                      a.nome.toLowerCase().includes(arkiumSearch.toLowerCase()) ||
                      a.assunto.toLowerCase().includes(arkiumSearch.toLowerCase())
    if (!textMatch) return false
    
    if (arkiumFilter === 'SIM') return a.assinado.toLowerCase() === 'sim'
    if (arkiumFilter === 'NA') return a.assinado.toLowerCase() !== 'sim'
    return true
  })

  const totalArkium = arkiumData.length
  const assinadasArkium = arkiumData.filter(a => a.assinado.toLowerCase() === 'sim').length
  const naoAssinadasArkium = arkiumData.filter(a => a.assinado.toLowerCase() !== 'sim').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

      {/* ── Overlay de Importação ── */}
      {isImporting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(6px)',
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
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)', maxWidth: 400, width: '90%',
          }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(102,0,153,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={32} color="#660099" style={{ animation: 'sg4-spin 1s linear infinite' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Importando DSS Arkium</h3>
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
            <MessageSquare color="#660099" size={22} />
            Diálogo Semanal de Segurança
          </h1>
        </div>

        {/* Navegação de Abas */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 8, gap: 4 }}>
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
            Visão Consolidada
          </button>
          <button
            onClick={() => setActiveTab('arkium')}
            style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
              background: activeTab === 'arkium' ? '#fff' : 'transparent',
              color: activeTab === 'arkium' ? '#660099' : '#64748b',
              boxShadow: activeTab === 'arkium' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* Filtro de Meses e Ano */}
            <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8, gridColumn: 'span 2' }}>
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
            <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Atingimento do Período</span>
                <span style={{ background: 'rgba(102,0,153,0.1)', color: '#660099', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                  {selectedMonths.length} MÊS(ES)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{totalRealizado}</span>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>/ {totalMeta} DSS</span>
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
            {/* ── Tabela de Lançamentos ── */}
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
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Meta do Período</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Realizado</th>
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => {
                      const realizado = selectedMonths.reduce((sum, m) => sum + t[m], 0)
                      const meta = targetMeta * (selectedMonths.length || 1)
                      const isCompleted = realizado >= meta
                      const hasStarted = realizado > 0

                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {t.fotoUrl ? (
                                <img src={t.fotoUrl} alt={t.nome} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #f1f5f9' }} />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                                  {t.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                </div>
                              )}
                              <span>{t.nome}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{meta}</td>
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                            {editingId === t.id ? (
                              <input type="number" value={editValue} min={0} onChange={(e) => setEditValue(Number(e.target.value))} style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #e2e8f0', textAlign: 'center' }} />
                            ) : (
                              <span style={{ fontSize: 14, fontWeight: 800, color: isCompleted ? '#10b981' : hasStarted ? '#f59e0b' : '#64748b' }}>{realizado}</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                            {isCompleted ? (
                              <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Completo</span>
                            ) : hasStarted ? (
                              <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{realizado}/{meta}</span>
                            ) : (
                              <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Aguardando</span>
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
      {activeTab === 'arkium' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Top Actions e Stats */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* Upload Area */}
            <div style={{ flex: 1, background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(102,0,153,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileSpreadsheet color="#660099" size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>Importar DSS Arkium</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Excel (.xlsx) ou CSV</div>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ background: '#660099', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
              >
                <UploadCloud size={14} />
                Importar
              </button>
            </div>

            {/* Stats Cards - Clicáveis para filtrar */}
            <div style={{ flex: 2, display: 'flex', gap: 16, minWidth: 300 }}>
              <div 
                onClick={() => setArkiumFilter('ALL')}
                style={{ flex: 1, background: '#fff', border: arkiumFilter === 'ALL' ? '2px solid #660099' : '1px solid #f1f5f9', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', transition: 'all 0.2s', boxShadow: arkiumFilter === 'ALL' ? '0 4px 6px -1px rgba(102,0,153,0.1)' : 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: arkiumFilter === 'ALL' ? '#660099' : '#64748b' }}>
                  <ListTodo size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Total DSS</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{totalArkium}</div>
              </div>
              
              <div 
                onClick={() => setArkiumFilter('NA')}
                style={{ flex: 1, background: '#fff', border: arkiumFilter === 'NA' ? '2px solid #f59e0b' : '1px solid #fef3c7', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', boxShadow: arkiumFilter === 'NA' ? '0 4px 6px -1px rgba(245,158,11,0.2)' : 'none' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: '#f59e0b' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', paddingLeft: 8 }}>
                  <AlertTriangle size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Não Assinados</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', lineHeight: 1, paddingLeft: 8 }}>{naoAssinadasArkium}</div>
              </div>

              <div 
                onClick={() => setArkiumFilter('SIM')}
                style={{ flex: 1, background: '#fff', border: arkiumFilter === 'SIM' ? '2px solid #10b981' : '1px solid #d1fae5', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', boxShadow: arkiumFilter === 'SIM' ? '0 4px 6px -1px rgba(16,185,129,0.2)' : 'none' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: '#10b981' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#047857', paddingLeft: 8 }}>
                  <CheckSquare size={16} /> <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Assinados</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', lineHeight: 1, paddingLeft: 8 }}>{assinadasArkium}</div>
              </div>
            </div>
          </div>

          {/* Table Area */}
          {arkiumData.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ position: 'relative', width: 350 }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Buscar por número, nome ou assunto..."
                    value={arkiumSearch}
                    onChange={(e) => setArkiumSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 1000 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Nº Diálogo</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Nome / Matrícula</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Assunto</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Assinado?</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Estado</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArkium.map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9', background: a.estado === 'ABERTO' ? '#fefce8' : '#fff' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                            {a.numeroDialogo}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {a.dbTecnico?.fotoUrl ? (
                                <img src={a.dbTecnico.fotoUrl} alt={a.nome} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                                  {a.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                </div>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{a.nome}</span>
                                <span style={{ fontSize: 10, color: '#94a3b8' }}>{a.matricula}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.assunto}>{a.assunto}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>Tipo: {a.tipo} | Base: {a.base}</div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {a.assinado.toLowerCase() === 'sim' || a.assinado.toLowerCase() === 'yes' ? (
                              <CheckCircle2 size={16} color="#10b981" />
                            ) : (
                              <X size={16} color="#ef4444" />
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {a.estado === 'FECHADO' ? (
                              <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, background: '#d1fae5', color: '#047857' }}>FECHADO</span>
                            ) : (
                              <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, background: '#fef3c7', color: '#b45309' }}>ABERTO</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                              <button
                                onClick={() => openTreatModal(a)}
                                title={a.estado === 'ABERTO' ? 'Tratar Diálogo' : 'Visualizar Detalhes'}
                                style={{
                                  padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: a.estado === 'ABERTO' ? '#660099' : '#f1f5f9',
                                  color: a.estado === 'ABERTO' ? '#fff' : '#64748b',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Eye size={16} />
                              </button>
                              {isMasterOrAdmin && (
                                <button
                                  onClick={() => setDeleteArkiumConfirmId(a.id)}
                                  title="Excluir Registro"
                                  style={{
                                    padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'transparent', color: '#ef4444', transition: 'all 0.2s'
                                  }}
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

      {/* MODAL TRATAR ARKIUM */}
      {treatingItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.8)', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1e293b' }}>
                {treatingItem.estado === 'ABERTO' ? 'Tratar' : 'Detalhes'}: {treatingItem.numeroDialogo}
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
                    <img src={treatingItem.dbTecnico.fotoUrl} alt={treatingItem.nome} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, border: '2px solid #e2e8f0' }}>
                      {treatingItem.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{treatingItem.nome}</h4>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Líder: <span style={{ fontWeight: 600, color: '#334155' }}>{treatingItem.lider}</span></div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Matrícula: <span style={{ fontWeight: 600, color: '#334155' }}>{treatingItem.matricula}</span></div>
                  </div>
                  {treatingItem.estado === 'FECHADO' ? (
                    <span style={{ padding: '4px 10px', background: '#d1fae5', color: '#047857', borderRadius: 20, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12}/> FECHADO</span>
                  ) : (
                    <span style={{ padding: '4px 10px', background: '#fef3c7', color: '#b45309', borderRadius: 20, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12}/> PENDENTE</span>
                  )}
                </div>

                {/* Grid de Informações Secundárias */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Assunto</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{treatingItem.assunto || '--'}</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Tipo</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{treatingItem.tipo || '--'}</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Localidade / UF</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{treatingItem.localidade || '--'} / {treatingItem.uf || '--'}</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Data / Base</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{treatingItem.dataFechamento || '--'} ({treatingItem.base || '--'})</span>
                  </div>
                </div>

                {/* Seção de Tratativa (Assinatura e Justificativa) */}
                <div style={{ background: treatingItem.estado === 'FECHADO' ? '#f0fdf4' : '#fff', border: treatingItem.estado === 'FECHADO' ? '1px solid #bbf7d0' : '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 800, color: treatingItem.estado === 'FECHADO' ? '#166534' : '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={14} /> 
                    Tratativa
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>Assinado?</label>
                      {treatingItem.estado === 'FECHADO' ? (
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{treatingItem.assinado}</div>
                      ) : (
                        <select 
                          value={tratarAssinado} 
                          onChange={e => setTratarAssinado(e.target.value)} 
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', background: '#f8fafc' }} 
                        >
                          <option value="Sim">Sim</option>
                          <option value="NA">NA</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>Justificativa / Observação</label>
                      {treatingItem.estado === 'FECHADO' ? (
                        <div style={{ fontSize: 12, color: '#475569', background: '#fff', padding: 8, borderRadius: 6, border: '1px dashed #cbd5e1', minHeight: 40 }}>
                          {treatingItem.justificativa || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma justificativa fornecida.</span>}
                        </div>
                      ) : (
                        <textarea 
                          value={tratarJustificativa} 
                          onChange={e => setTratarJustificativa(e.target.value)} 
                          placeholder="Digite o motivo..."
                          rows={2}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', resize: 'none', background: '#f8fafc' }} 
                        />
                      )}
                    </div>
                  </div>
                </div>

                {treatingItem.estado === 'ABERTO' ? (
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
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Excluir DSS Importado</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Ação exclusiva para Master/Admin.</p>
              </div>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
              Você tem certeza que deseja excluir este registro importado? Esta ação removerá o dado do banco de dados definitivamente.
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
