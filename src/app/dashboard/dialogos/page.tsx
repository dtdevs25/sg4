'use client'

import { useState, useRef } from 'react'
import {
  MessageSquare, Calendar, ShieldCheck, HelpCircle,
  TrendingUp, Search, Plus, Trash2, Edit,
  UploadCloud, FileSpreadsheet, ListTodo, CheckSquare, X, AlertTriangle, PlayCircle, CheckCircle2
} from 'lucide-react'
import * as XLSX from 'xlsx'

// Dados reais compilados da aba "GESTÃO DE DSS - TIME TST SG4"
const INITIAL_DIALOGOS = [
  { id: '1', nome: 'Antonio Carlos Junior Dias', jan: 8, fev: 8, mar: 8, abr: 8, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '2', nome: 'Daniel José Gregorio Junior', jan: 8, fev: 8, mar: 8, abr: 20, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '3', nome: 'Dara Amorim Silva de Lima', jan: 0, fev: 0, mar: 0, abr: 3, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '4', nome: 'Djonatê Cruz dos Santos', jan: 8, fev: 8, mar: 8, abr: 3, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '5', nome: 'Jonas Rodrigues Pereira', jan: 9, fev: 8, mar: 8, abr: 3, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '6', nome: 'Karine Novaes Assem', jan: 8, fev: 9, mar: 13, abr: 10, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '7', nome: 'Luis Claudio Soares', jan: 0, fev: 3, mar: 8, abr: 8, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '8', nome: 'Rogério Lima da Silva', jan: 9, fev: 8, mar: 9, abr: 3, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '9', nome: 'Rosicleide Fernandes Santos Davino', jan: 16, fev: 14, mar: 18, abr: 14, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
  { id: '10', nome: 'Samuel da Silva Santos', jan: 0, fev: 2, mar: 0, abr: 2, mai: 0, jun: 0, jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0 },
]

type MesKey = 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun' | 'jul' | 'ago' | 'set' | 'out' | 'nov' | 'dez'

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
}

export default function DialogosPage() {
  const [activeTab, setActiveTab] = useState<'consolidado' | 'arkium'>('consolidado')

  // --- ESTADO: Visão Consolidada ---
  const [data, setData] = useState(INITIAL_DIALOGOS)
  const [selectedMonths, setSelectedMonths] = useState<MesKey[]>(['abr'])
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

  function saveEdit(id: string) {
    if (selectedMonths.length === 1) {
      setData(prev => prev.map(t => t.id === id ? { ...t, [selectedMonths[0]]: editValue } : t))
    } else {
      alert("Selecione apenas 1 mês para editar os valores na tabela.")
    }
    setEditingId(null)
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

  function toggleMonth(m: MesKey) {
    setSelectedMonths(prev => 
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    )
    setEditingId(null)
  }


  // --- ESTADO: Visão Arkium ---
  const [arkiumData, setArkiumData] = useState<ArkiumDSSItem[]>([])
  const [arkiumSearch, setArkiumSearch] = useState('')
  const [treatingItem, setTreatingItem] = useState<ArkiumDSSItem | null>(null)
  const [tratarJustificativa, setTratarJustificativa] = useState('')
  const [tratarAssinado, setTratarAssinado] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const parsed = XLSX.utils.sheet_to_json(ws) as any[]

        const imported: ArkiumDSSItem[] = parsed.map((row: any) => {
          const assinadoVal = String(row['Assinado'] || '')
          const justifVal = String(row['Justificativa'] || '')
          
          // Lógica de "ABERTO": Se não está assinado E não tem justificativa, consideramos aberto
          // Ou se a "Data Fechamento" estiver vazia. Depende do seu processo. 
          // Assumiremos que falta "Assinatura" ou "Justificativa" para fechá-lo.
          const isFechado = (assinadoVal.toLowerCase() === 'sim' || assinadoVal.toLowerCase() === 'yes') || justifVal.length > 0

          return {
            id: Math.random().toString(36).substr(2, 9),
            assunto: String(row['Assunto'] || ''),
            numeroDialogo: String(row['Numero do Diálogo'] || row['Numero do Dialogo'] || row['Numero'] || ''),
            lider: String(row['Lider'] || row['Líder'] || ''),
            base: String(row['Base'] || ''),
            uf: String(row['UF'] || ''),
            localidade: String(row['Localidade'] || ''),
            dataFechamento: String(row['Data Fechamento'] || row['DataFechamento'] || ''),
            matricula: String(row['Matricula'] || row['Matrícula'] || ''),
            nome: String(row['Nome'] || ''),
            tipo: String(row['Tipo'] || ''),
            statusDSS: String(row['Status'] || ''),
            assinado: assinadoVal,
            justificativa: justifVal,
            estado: isFechado ? 'FECHADO' : 'ABERTO'
          }
        })
        
        setArkiumData(prev => {
          const newItems = imported.filter(imp => !prev.some(p => p.numeroDialogo === imp.numeroDialogo && p.matricula === imp.matricula))
          return [...prev, ...newItems]
        })
      } catch (err) {
        alert("Erro ao ler o arquivo. Certifique-se de que é um Excel (.xlsx) ou CSV válido.")
      }
    }
    reader.readAsBinaryString(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleTratar(e: React.FormEvent) {
    e.preventDefault()
    if (!treatingItem) return
    setArkiumData(prev => prev.map(item => {
      if (item.id === treatingItem.id) {
        const isFechado = (tratarAssinado.toLowerCase() === 'sim' || tratarAssinado.toLowerCase() === 'yes') || tratarJustificativa.length > 0
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
  }

  function openTreatModal(item: ArkiumDSSItem) {
    setTreatingItem(item)
    setTratarJustificativa(item.justificativa)
    setTratarAssinado(item.assinado || 'Não')
  }

  const filteredArkium = arkiumData.filter(a => 
    a.numeroDialogo.toLowerCase().includes(arkiumSearch.toLowerCase()) || 
    a.nome.toLowerCase().includes(arkiumSearch.toLowerCase()) ||
    a.assunto.toLowerCase().includes(arkiumSearch.toLowerCase())
  )
  const totalArkium = filteredArkium.length
  const fechadasArkium = filteredArkium.filter(a => a.estado === 'FECHADO').length
  const abertasArkium = filteredArkium.filter(a => a.estado === 'ABERTO').length

  return (
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
                    const isSelected = selectedMonths.includes(m.key as MesKey)
                    return (
                      <button
                        key={m.key}
                        onClick={() => toggleMonth(m.key as MesKey)}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 6,
                          border: isSelected ? '1px solid #660099' : '1px solid #e2e8f0',
                          background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc',
                          color: isSelected ? '#660099' : '#64748b',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
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
                        onClick={() => toggleMonth(m.key as MesKey)}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 6,
                          border: isSelected ? '1px solid #660099' : '1px solid #e2e8f0',
                          background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc',
                          color: isSelected ? '#660099' : '#64748b',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
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
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Atingimento do Período</span>
                <span style={{ background: 'rgba(102,0,153,0.1)', color: '#660099', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                  {selectedMonths.length} MÊS(ES)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{totalRealizado}</span>
                <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>/ {totalMeta} DSS</span>
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
                      <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
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
                          <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>{t.nome}</td>
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
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            {editingId === t.id ? (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button onClick={() => saveEdit(t.id)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                                <button onClick={() => setEditingId(null)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cancela</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button
                                  onClick={() => { setEditingId(t.id); setEditValue(realizado) }}
                                  title="Editar"
                                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(t.id)}
                                  title="Excluir"
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
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
            <div style={{ flex: 1, background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minWidth: 300 }}>
              <div style={{ width: 48, height: 48, background: 'rgba(102,0,153,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet color="#660099" size={24} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>Importar DSS Arkium</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>Selecione um arquivo Excel (.xlsx) ou CSV</p>
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
                style={{ background: '#660099', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <UploadCloud size={16} />
                Selecionar Arquivo
              </button>
            </div>

            {/* Stats Cards */}
            <div style={{ flex: 2, display: 'flex', gap: 16, minWidth: 300 }}>
              <div style={{ flex: 1, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
                  <ListTodo size={18} /> <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Total Importados</span>
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#1e293b' }}>{totalArkium}</div>
              </div>
              
              <div style={{ flex: 1, background: '#fff', border: '1px solid #fef3c7', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: '#f59e0b' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b45309' }}>
                  <AlertTriangle size={18} /> <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Pendentes (Aberto)</span>
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#f59e0b' }}>{abertasArkium}</div>
              </div>

              <div style={{ flex: 1, background: '#fff', border: '1px solid #d1fae5', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: '#10b981' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#047857' }}>
                  <CheckSquare size={18} /> <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Tratados / Fechados</span>
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#10b981' }}>{fechadasArkium}</div>
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
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#334155' }}>#{a.numeroDialogo}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{a.nome}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>Mat: {a.matricula || '--'}</div>
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
                            <button
                              onClick={() => openTreatModal(a)}
                              style={{
                                padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                                background: a.estado === 'ABERTO' ? '#660099' : '#f1f5f9',
                                color: a.estado === 'ABERTO' ? '#fff' : '#64748b',
                                transition: 'all 0.2s'
                              }}
                            >
                              {a.estado === 'ABERTO' ? 'Tratar' : 'Visualizar'}
                            </button>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.8)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
                {treatingItem.estado === 'ABERTO' ? 'Tratar Diálogo' : 'Detalhes do Diálogo'} #{treatingItem.numeroDialogo}
              </h3>
              <button onClick={() => setTreatingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTratar} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                <div>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Colaborador</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{treatingItem.nome}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Líder</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{treatingItem.lider}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Assunto</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{treatingItem.assunto}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Assinado?</label>
                <select 
                  value={tratarAssinado} 
                  onChange={e => setTratarAssinado(e.target.value)} 
                  disabled={treatingItem.estado === 'FECHADO'}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} 
                >
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Justificativa (obrigatório se não assinado)</label>
                <textarea 
                  value={tratarJustificativa} 
                  onChange={e => setTratarJustificativa(e.target.value)} 
                  placeholder="Por que não foi assinado ou qual a tratativa?"
                  disabled={treatingItem.estado === 'FECHADO'}
                  rows={4}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', resize: 'none' }} 
                />
              </div>

              {treatingItem.estado === 'ABERTO' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                  <button type="button" onClick={() => setTreatingItem(null)} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="submit" style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckSquare size={16} /> Finalizar Tratativa
                  </button>
                </div>
              )}
            </form>
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
