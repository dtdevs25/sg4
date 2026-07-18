'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import {
  AlertTriangle, Filter, Search, Eye, UploadCloud,
  Loader2, X, PlusCircle, CheckCircle, Clock, Trash2
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
  }
}

function parseExcelDate(dateVal: any): Date | null {
  if (!dateVal) return null
  if (dateVal instanceof Date) return dateVal
  const num = Number(dateVal)
  if (!isNaN(num) && num > 20000) {
    const baseDate = new Date(1899, 11, 30)
    const millisecondsInDay = 24 * 60 * 60 * 1000
    return new Date(baseDate.getTime() + num * millisecondsInDay)
  }
  const str = String(dateVal).trim()
  if (str.includes('/')) {
    const parts = str.split('/')
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      let year = parseInt(parts[2], 10)
      if (parts[2].length === 2) year += 2000
      return new Date(year, month, day)
    }
  }
  if (str.includes('-')) {
    const parts = str.split('-')
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      return new Date(year, month, day)
    }
  }
  const parsed = Date.parse(str)
  if (!isNaN(parsed)) return new Date(parsed)
  return null
}

const PURPLE = '#660099'
const PURPLE_BG = 'rgba(102,0,153,0.06)'
const PURPLE_HOVER = '#50007c'

export default function NaoConformidadesPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const isMasterOrAdmin = userRole === 'MASTER' || userRole === 'ADMIN'

  const [activeTab, setActiveTab] = useState<'painel' | 'importar'>('painel')
  const [data, setData] = useState<NaoConformidadeItem[]>([])
  const [tecnicos, setTecnicos] = useState<any[]>([])
  
  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ABERTO' | 'EM_ANDAMENTO' | 'RESOLVIDO'>('ALL')
  const [classFilter, setClassFilter] = useState('ALL')
  const [tecnicoFilter, setTecnicoFilter] = useState('ALL')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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

  // Handle excel upload
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

        // Find keys case-insensitively
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

        setImportProgress(`Enviando ${itemsToUpsert.length} registros para o banco...`)
        const res = await upsertNaoConformidadesBatch(itemsToUpsert)

        if (res.success) {
          setImportResultMsg(`Importação realizada com sucesso! ${res.inseridos} registros inseridos, ${res.atualizados} atualizados.`)
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

  // Handle add timeline action update
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

  // Handle direct status change
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

  // Delete item handler
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

  // Filter logic
  const filtered = data.filter(item => {
    // Search filter
    const query = search.toLowerCase()
    const matchesSearch =
      (item.originalId || '').toLowerCase().includes(query) ||
      (item.executor || '').toLowerCase().includes(query) ||
      (item.questionario || '').toLowerCase().includes(query) ||
      (item.pergunta || '').toLowerCase().includes(query) ||
      (item.rCompl1 || '').toLowerCase().includes(query)

    // Status filter
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter

    // Classification filter
    const matchesClass = classFilter === 'ALL' || item.classificacao === classFilter

    // Technician filter
    const matchesTecnico = tecnicoFilter === 'ALL' || item.tecnicoId === tecnicoFilter

    return matchesSearch && matchesStatus && matchesClass && matchesTecnico
  })

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const classifications = Array.from(new Set(data.map(i => i.classificacao).filter(Boolean)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* --- Overlay de Importação --- */}
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
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)', maxWidth: 450, width: '90%',
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
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: isDoneImporting ? '#10b981' : PURPLE }}>
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
                Fechar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header e Abas */}
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
        padding: '16px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle color={PURPLE} size={26} />
          Não Conformidades (Arkium)
        </h1>

        <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 8, gap: 4 }}>
          <button
            onClick={() => { setActiveTab('painel'); setCurrentPage(1); }}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
              background: activeTab === 'painel' ? '#fff' : 'transparent',
              color: activeTab === 'painel' ? PURPLE : '#64748b',
              boxShadow: activeTab === 'painel' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Painel Geral
          </button>
          {isMasterOrAdmin && (
            <button
              onClick={() => setActiveTab('importar')}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                background: activeTab === 'importar' ? '#fff' : 'transparent',
                color: activeTab === 'importar' ? PURPLE : '#64748b',
                boxShadow: activeTab === 'importar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Importar Planilha
            </button>
          )}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'painel' ? (
        <>
          {/* Filtros */}
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
            padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
              <Filter size={18} color={PURPLE} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>Filtros de Busca</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {/* Pesquisa */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Buscar por texto</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="ID, Executor, Pergunta..."
                    style={{
                      width: '100%', padding: '10px 12px 10px 38px', borderRadius: 8,
                      border: '1px solid #cbd5e1', fontSize: 13, outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Situação (Status)</label>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, color: '#334155', outline: 'none', background: '#fff' }}
                >
                  <option value="ALL">Todas as situações</option>
                  <option value="ABERTO">Aberto</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="RESOLVIDO">Resolvido</option>
                </select>
              </div>

              {/* Classificacao */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Classificação (Gravidade)</label>
                <select
                  value={classFilter}
                  onChange={e => { setClassFilter(e.target.value); setCurrentPage(1); }}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, color: '#334155', outline: 'none', background: '#fff' }}
                >
                  <option value="ALL">Todas as gravidades</option>
                  {classifications.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Tecnico (apenas master/admin) */}
              {isMasterOrAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Técnico Vinculado</label>
                  <select
                    value={tecnicoFilter}
                    onChange={e => { setTecnicoFilter(e.target.value); setCurrentPage(1); }}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, color: '#334155', outline: 'none', background: '#fff' }}
                  >
                    <option value="ALL">Todos os técnicos</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Listagem */}
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
            overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Cód. Arkium</th>
                    <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Questionário / Pergunta</th>
                    <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Executor / Técnico</th>
                    <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Localidade / Base</th>
                    <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Data Abertura</th>
                    <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Gravidade</th>
                    <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Situação</th>
                    <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>Ações</th>
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
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                        Nenhuma não conformidade encontrada.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item) => {
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
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                          <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                            #{item.originalId}
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: 13, maxWidth: 300 }}>
                            <div style={{ fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.questionario}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                              {item.pergunta}
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: 13 }}>
                            <div style={{ fontWeight: 600, color: '#334155' }}>{item.executor}</div>
                            {item.tecnico && (
                              <div style={{ fontSize: 11, color: PURPLE, fontWeight: 500 }}>
                                🔗 {item.tecnico.nome}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: 13, color: '#475569' }}>
                            <div>{item.localidade || '-'}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.base}</div>
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: 13, color: '#475569' }}>
                            {dateLabel}
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: 12 }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                              background: item.classificacao?.toLowerCase().includes('grave') ? '#fef2f2' : '#f8fafc',
                              color: item.classificacao?.toLowerCase().includes('grave') ? '#ef4444' : '#64748b',
                              border: `1px solid ${item.classificacao?.toLowerCase().includes('grave') ? '#fecaca' : '#e2e8f0'}`
                            }}>
                              {item.classificacao || 'Normal'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: 12 }}>
                            <span style={{
                              padding: '4px 10px', borderRadius: 20, fontWeight: 700,
                              background: statusBadge.bg, color: statusBadge.text
                            }}>
                              {statusBadge.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                            <button
                              onClick={() => { setSelectedItem(item); setModalStatus(item.status); }}
                              style={{
                                padding: 6, background: PURPLE_BG, color: PURPLE, border: 'none',
                                borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                                transition: 'all 0.15s'
                              }}
                              title="Visualizar e Acompanhar"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderTop: '1px solid #e2e8f0'
              }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  Mostrando página {currentPage} de {totalPages} ({filtered.length} itens)
                </span>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    style={{
                      padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6,
                      background: '#fff', fontSize: 13, cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    Anterior
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    style={{
                      padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6,
                      background: '#fff', fontSize: 13, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ==================== TAB: IMPORTAR ==================== */
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
          padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: PURPLE_BG,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: PURPLE
          }}>
            <UploadCloud size={40} />
          </div>

          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0' }}>
              Importar Planilha de Não Conformidades
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              Selecione ou arraste o arquivo excel contendo as Não Conformidades exportadas do Arkium.
              O sistema associará cada registro ao respectivo Técnico de Segurança por correspondência de nome.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xls,.xlsx"
            style={{ display: 'none' }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '12px 28px', background: PURPLE, color: '#fff', border: 'none',
              borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              transition: 'background 0.2s', boxShadow: `0 4px 12px rgba(102,0,153,0.15)`
            }}
          >
            Selecionar Arquivo
          </button>

          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Tipos aceitos: .xls, .xlsx (Formato padrão exportado)
          </span>
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
              {/* Grid de Informações Básicas */}
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

              {/* Pergunta e Resposta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ borderLeft: `3px solid ${PURPLE}`, paddingLeft: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Pergunta</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>
                    {selectedItem.pergunta}
                  </div>
                </div>

                <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Situação Detalhada (R. Compl 1)</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#b91c1c', marginTop: 2 }}>
                    {selectedItem.rCompl1 || 'Não informada'}
                  </div>
                </div>
              </div>

              {/* Timeline de Histórico */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: '0 0 16px 0' }}>
                  Histórico de Atualizações
                </h4>

                {(!selectedItem.updates || selectedItem.updates.length === 0) ? (
                  <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', margin: '0 0 16px 0' }}>
                    Nenhuma atualização registrada ainda.
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

                {/* Adicionar Atualização */}
                <form onSubmit={handleAddUpdate} style={{
                  display: 'flex', flexDirection: 'column', gap: 12,
                  background: '#f8fafc', padding: 16, borderRadius: 10
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                      Registrar Ação / Atualização
                    </span>

                    {/* Mudar Status */}
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
                    placeholder="Descreva a ação tomada (ex. Enviei e-mail solicitando EPI...)"
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
      
      {/* CSS base para animações e resets simples */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
