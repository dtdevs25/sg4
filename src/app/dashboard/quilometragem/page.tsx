'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import {
  Car, Fuel, Plus, Search, Calendar, CheckCircle2,
  AlertTriangle, UploadCloud, Trash2, Camera, MapPin, DollarSign, Image as ImageIcon,
  Loader2, PlayCircle, StopCircle, Pencil, X, Save
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import {
  getQuilometragens, createQuilometragem, fecharQuilometragem, deleteQuilometragem, updateQuilometragem,
  getAbastecimentos, createAbastecimento, deleteAbastecimento, updateAbastecimento, uploadFotoKm
} from '@/app/actions/quilometragem'
import { getTecnicos } from '@/app/actions/tecnicos'
import { getManutencoes, registrarManutencao, excluirManutencao } from '@/app/actions/manutencao'

export default function QuilometragemPage() {

  const formatKmStr = (val) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '')
    if (!digits) return ''
    return parseInt(digits, 10).toLocaleString('pt-BR')
  }

  const formatCurrencyStr = (val) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '')
    if (!digits) return ''
    return (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }

  const parseFormattedNumber = (val) => {
    if (!val) return 0
    return parseFloat(val.toString().replace(/\./g, '').replace(',', '.'))
  }

  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [activeTab, setActiveTab] = useState<'km' | 'abastecimento' | 'manutencao'>('km')
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [kms, setKms] = useState<any[]>([])
  const [abastecimentos, setAbastecimentos] = useState<any[]>([])
  const [manutencoes, setManutencoes] = useState<any[]>([])

  const [selectedMonths, setSelectedMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(new Date().getFullYear())
  const [search, setSearch] = useState('')
  const [currentPageKm, setCurrentPageKm] = useState(1)
  const [itemsPerPageKm, setItemsPerPageKm] = useState(10)
  const [currentPageAbs, setCurrentPageAbs] = useState(1)
  const [itemsPerPageAbs, setItemsPerPageAbs] = useState(10)

  const MONTHS_LIST = [
    { key: 1, label: 'Jan' }, { key: 2, label: 'Fev' },
    { key: 3, label: 'Mar' }, { key: 4, label: 'Abr' },
    { key: 5, label: 'Mai' }, { key: 6, label: 'Jun' },
    { key: 7, label: 'Jul' }, { key: 8, label: 'Ago' },
    { key: 9, label: 'Set' }, { key: 10, label: 'Out' },
    { key: 11, label: 'Nov' }, { key: 12, label: 'Dez' }
  ]

  // Modais
  const [showStartModal, setShowStartModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState<string | null>(null)
  const [showAbsModal, setShowAbsModal] = useState(false)
  const [showMaintModal, setShowMaintModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null) // URL da foto

  const [showEditKmModal, setShowEditKmModal] = useState<any>(null)
  const [showEditAbsModal, setShowEditAbsModal] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<{id: string, type: 'km' | 'abs' | 'manutencao'} | null>(null)

  const [showInativos, setShowInativos] = useState(false)
  const [showStartTecnicoDropdown, setShowStartTecnicoDropdown] = useState(false)
  const [showAbsTecnicoDropdown, setShowAbsTecnicoDropdown] = useState(false)

  // Forms
  const [formStart, setFormStart] = useState({ tecnicoId: '', dataInicial: new Date().toISOString().split('T')[0], kmInicial: '', fotoBase64: '', fileName: '', contentType: '' })
  const [formEnd, setFormEnd] = useState({ dataFinal: '', kmFinal: '', fotoBase64: '', fileName: '', contentType: '' })
  const [formAbs, setFormAbs] = useState({ tecnicoId: '', data: '', valor: '', fotoBase64: '', fileName: '', contentType: '' })
  const [formMaint, setFormMaint] = useState({ tecnicoId: '', dataManutencao: new Date().toISOString().split('T')[0], kmManutencao: '', fotoBase64: '', fileName: '', contentType: '' })
  
  const [formEditKm, setFormEditKm] = useState({ diaSemana: '', kmInicial: '', fotoInicialBase64: '', kmFinal: '', fotoFinalBase64: '' })
  const [formEditAbs, setFormEditAbs] = useState({ data: '', valor: '', fotoCupomBase64: '' })

  const fileInputRefStartCam = useRef<HTMLInputElement>(null)
  const fileInputRefStartGal = useRef<HTMLInputElement>(null)
  const fileInputRefEndCam = useRef<HTMLInputElement>(null)
  const fileInputRefEndGal = useRef<HTMLInputElement>(null)
  const fileInputRefAbsCam = useRef<HTMLInputElement>(null)
  const fileInputRefAbsGal = useRef<HTMLInputElement>(null)
  const fileInputRefMaintCam = useRef<HTMLInputElement>(null)
  const fileInputRefMaintGal = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [selectedYear])

  async function loadData() {
    setLoading(true)
    const [resKm, resAbs, resTec, resMan] = await Promise.all([
      getQuilometragens(selectedYear === 'ALL' ? undefined : selectedYear),
      getAbastecimentos(selectedYear === 'ALL' ? undefined : selectedYear),
      getTecnicos(),
      getManutencoes(selectedYear === 'ALL' ? undefined : selectedYear)
    ])
    if (resKm.success && resKm.data) setKms(resKm.data)
    if (resAbs.success && resAbs.data) setAbastecimentos(resAbs.data)
    if (resMan.success && resMan.data) setManutencoes(resMan.data)
    if (resTec.success && resTec.data) {
      setTecnicos(resTec.data)
      if (resTec.data.length > 0 && !formStart.tecnicoId) {
        const atv = resTec.data.find((t: any) => t.ativo)
        const tId = (session?.user as any)?.tecnicoId || (atv ? atv.id : resTec.data[0].id)
        setFormStart(p => ({ ...p, tecnicoId: tId }))
        setFormAbs(p => ({ ...p, tecnicoId: tId }))
        setFormMaint(p => ({ ...p, tecnicoId: tId }))
      }
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
          if (prev.length === 1 && prev.includes(m)) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          if (prev.includes(m)) return prev.filter(x => x !== m)
          return [...prev, m]
        })
      }, 250)
    }
  }

  // File Handlers
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, setForm: React.Dispatch<React.SetStateAction<any>>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setForm((p: any) => ({
        ...p,
        fotoBase64: event.target?.result as string,
        fileName: file.name,
        contentType: file.type
      }))
    }
    reader.readAsDataURL(file)
  }

  // --- ACTIONS ---
  async function handleStartKm(e: React.FormEvent) {
    e.preventDefault()
    if (!formStart.tecnicoId || !formStart.dataInicial || !formStart.kmInicial || !formStart.fotoBase64) return alert('Preencha todos os campos e anexe a foto do odômetro inicial.')
    
    startTransition(async () => {
      let fotoUrl = undefined
      if (formStart.fotoBase64) {
        const uploadRes = await uploadFotoKm(formStart.fotoBase64, formStart.fileName, formStart.contentType)
        if (uploadRes.success) fotoUrl = uploadRes.url
        else return alert('Falha ao subir foto')
      }

      const jsDate = new Date(formStart.dataInicial + 'T12:00:00Z')
      const ds = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][jsDate.getUTCDay()]

      const res = await createQuilometragem({
        tecnicoId: formStart.tecnicoId,
        diaSemana: ds,
        dataInicial: jsDate,
        kmInicial: parseFormattedNumber(formStart.kmInicial),
        fotoInicial: fotoUrl
      })

      if (res.success) {
        setShowStartModal(false)
        setFormStart(p => ({ ...p, kmInicial: '', fotoBase64: '', fileName: '', contentType: '' }))
        loadData()
      } else {
        alert(res.error)
      }
    })
  }

  async function handleEndKm(e: React.FormEvent) {
    e.preventDefault()
    if (!showEndModal || !formEnd.kmFinal || !formEnd.fotoBase64) return alert('Preencha o KM final e tire a foto.')
    
    startTransition(async () => {
      let fotoUrl = undefined
      if (formEnd.fotoBase64) {
        const uploadRes = await uploadFotoKm(formEnd.fotoBase64, formEnd.fileName, formEnd.contentType)
        if (uploadRes.success) fotoUrl = uploadRes.url
        else return alert('Falha ao subir foto')
      }

      const dtFinal = formEnd.dataFinal ? new Date(formEnd.dataFinal + 'T12:00:00Z') : undefined
      const res = await fecharQuilometragem(showEndModal, parseFormattedNumber(formEnd.kmFinal), fotoUrl, dtFinal)
      if (res.success) {
        setShowEndModal(null)
        setFormEnd({ dataFinal: '', kmFinal: '', fotoBase64: '', fileName: '', contentType: '' })
        loadData()
      } else {
        alert(res.error)
      }
    })
  }

  async function handleCreateAbs(e: React.FormEvent) {
    e.preventDefault()
    if (!formAbs.tecnicoId || !formAbs.data || !formAbs.valor || !formAbs.fotoBase64) return alert('Preencha os dados e anexe o cupom fiscal.')
    
    startTransition(async () => {
      let fotoUrl = undefined
      if (formAbs.fotoBase64) {
        const uploadRes = await uploadFotoKm(formAbs.fotoBase64, formAbs.fileName, formAbs.contentType)
        if (uploadRes.success) fotoUrl = uploadRes.url
        else return alert('Falha ao subir foto')
      }

      const res = await createAbastecimento({
        tecnicoId: formAbs.tecnicoId,
        data: new Date(formAbs.data + 'T12:00:00Z'),
        valor: parseFormattedNumber(formAbs.valor),
        fotoCupom: fotoUrl
      })

      if (res.success) {
        setShowAbsModal(false)
        setFormAbs(p => ({ ...p, data: '', valor: '', fotoBase64: '', fileName: '', contentType: '' }))
        loadData()
      } else {
        alert(res.error)
      }
    })
  }

  async function handleEditKm(e: React.FormEvent) {
    e.preventDefault()
    if (!showEditKmModal) return

    startTransition(async () => {
      let fotoInUrl = undefined
      let fotoFiUrl = undefined

      if (formEditKm.fotoInicialBase64) {
        const upIn = await uploadFotoKm(formEditKm.fotoInicialBase64, 'edit_in.jpg', 'image/jpeg')
        if (upIn.success) fotoInUrl = upIn.url
      }
      if (formEditKm.fotoFinalBase64) {
        const upFi = await uploadFotoKm(formEditKm.fotoFinalBase64, 'edit_fi.jpg', 'image/jpeg')
        if (upFi.success) fotoFiUrl = upFi.url
      }

      const res = await updateQuilometragem(showEditKmModal.id, {
        diaSemana: formEditKm.diaSemana,
        kmInicial: formEditKm.kmInicial ? parseFormattedNumber(formEditKm.kmInicial) : undefined,
        fotoInicial: fotoInUrl,
        kmFinal: formEditKm.kmFinal ? parseFormattedNumber(formEditKm.kmFinal) : null,
        fotoFinal: fotoFiUrl
      })

      if (res.success) {
        setShowEditKmModal(null)
        loadData()
      } else {
        alert(res.error)
      }
    })
  }

  async function handleEditAbs(e: React.FormEvent) {
    e.preventDefault()
    if (!showEditAbsModal) return

    startTransition(async () => {
      let fotoUrl = undefined
      if (formEditAbs.fotoCupomBase64) {
        const up = await uploadFotoKm(formEditAbs.fotoCupomBase64, 'edit_abs.jpg', 'image/jpeg')
        if (up.success) fotoUrl = up.url
      }

      const dt = formEditAbs.data ? new Date(formEditAbs.data + 'T12:00:00Z') : undefined
      const res = await updateAbastecimento(showEditAbsModal.id, {
        data: dt,
        valor: formEditAbs.valor ? parseFormattedNumber(formEditAbs.valor) : undefined,
        fotoCupom: fotoUrl
      })

      if (res.success) {
        setShowEditAbsModal(null)
        loadData()
      } else {
        alert(res.error)
      }
    })
  }

  async function handleCreateMaint(e: React.FormEvent) {
    e.preventDefault()
    if (!formMaint.tecnicoId || !formMaint.dataManutencao || !formMaint.kmManutencao) return alert('Preencha os dados obrigatórios.')
    
    startTransition(async () => {
      let fotoUrl = undefined
      if (formMaint.fotoBase64) {
        const uploadRes = await uploadFotoKm(formMaint.fotoBase64, formMaint.fileName, formMaint.contentType)
        if (uploadRes.success) fotoUrl = uploadRes.url
        else return alert('Falha ao subir foto do comprovante')
      }

      const res = await registrarManutencao({
        tecnicoId: formMaint.tecnicoId,
        dataManutencao: new Date(formMaint.dataManutencao + 'T12:00:00Z'),
        kmManutencao: parseFormattedNumber(formMaint.kmManutencao),
        comprovanteUrl: fotoUrl
      })

      if (res.success) {
        setShowMaintModal(false)
        setFormMaint(p => ({ ...p, kmManutencao: '', fotoBase64: '', fileName: '', contentType: '' }))
        loadData()
      } else {
        alert(res.error)
      }
    })
  }

  function confirmDelete(id: string, type: 'km' | 'abs' | 'manutencao') {
    setShowDeleteModal({ id, type })
  }

  async function processDelete() {
    if(!showDeleteModal) return
    startTransition(async () => {
      if (showDeleteModal.type === 'km') {
        const res = await deleteQuilometragem(showDeleteModal.id)
        if (res.success) loadData()
        else alert(res.error)
      } else if (showDeleteModal.type === 'abs') {
        const res = await deleteAbastecimento(showDeleteModal.id)
        if (res.success) loadData()
        else alert(res.error)
      }
      setShowDeleteModal(null)
    })
  }

  // Filters
  const filteredKms = kms.filter(k => {
    const jsDate = new Date(k.dataInicial)
    const m = jsDate.getUTCMonth() + 1
    const matchSearch = k.tecnico.nome.toLowerCase().includes(search.toLowerCase())
    const t = tecnicos.find((x: any) => x.id === k.tecnico.id)
    const isAtivo = t ? t.ativo !== false : k.tecnico.ativo !== false
    const matchAtivo = showInativos ? true : isAtivo
    return selectedMonths.includes(m) && matchSearch && matchAtivo
  })

  const filteredAbs = abastecimentos.filter(a => {
    const jsDate = new Date(a.data)
    const m = jsDate.getUTCMonth() + 1
    const matchSearch = a.tecnico.nome.toLowerCase().includes(search.toLowerCase())
    const t = tecnicos.find((x: any) => x.id === a.tecnico.id)
    const isAtivo = t ? t.ativo !== false : a.tecnico.ativo !== false
    const matchAtivo = showInativos ? true : isAtivo
    return selectedMonths.includes(m) && matchSearch && matchAtivo
  })

  const filteredMaint = manutencoes.filter(m => {
    const jsDate = new Date(m.dataManutencao)
    const month = jsDate.getUTCMonth() + 1
    const matchSearch = m.tecnico.nome.toLowerCase().includes(search.toLowerCase())
    const t = tecnicos.find((x: any) => x.id === m.tecnico.id)
    const isAtivo = t ? t.ativo !== false : m.tecnico.ativo !== false
    const matchAtivo = showInativos ? true : isAtivo
    return selectedMonths.includes(month) && matchSearch && matchAtivo
  })

  useEffect(() => {
    setCurrentPageKm(1)
    setCurrentPageAbs(1)
  }, [search, selectedMonths, showInativos])

  const totalPagesKm = Math.ceil(filteredKms.length / itemsPerPageKm)
  const paginatedKms = filteredKms.slice((currentPageKm - 1) * itemsPerPageKm, currentPageKm * itemsPerPageKm)

  const totalPagesAbs = Math.ceil(filteredAbs.length / itemsPerPageAbs)
  const paginatedAbs = filteredAbs.slice((currentPageAbs - 1) * itemsPerPageAbs, currentPageAbs * itemsPerPageAbs)

  const totalGasto = filteredAbs.reduce((acc, curr) => acc + curr.valor, 0)
  const totalKmRodado = filteredKms.reduce((acc, curr) => acc + (curr.diferenca || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* ── Cabeçalho Padronizado ── */}
      <div style={{
        background: '#fff', borderRadius: 10, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Car color="#660099" size={22} /> Frota e Quilometragem
          </h1>
        </div>

        <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 8, gap: 4 }}>
          <button
            onClick={() => setActiveTab('km')}
            style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
              background: activeTab === 'km' ? '#fff' : 'transparent', color: activeTab === 'km' ? '#660099' : '#64748b', boxShadow: activeTab === 'km' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Controle de KM
          </button>
          {role !== 'TST' && (
            <button
              onClick={() => setActiveTab('abastecimento')}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                background: activeTab === 'abastecimento' ? '#fff' : 'transparent', color: activeTab === 'abastecimento' ? '#660099' : '#64748b', boxShadow: activeTab === 'abastecimento' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Abastecimentos
            </button>
          )}
          <button
            onClick={() => setActiveTab('manutencao')}
            style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
              background: activeTab === 'manutencao' ? '#fff' : 'transparent', color: activeTab === 'manutencao' ? '#660099' : '#64748b', boxShadow: activeTab === 'manutencao' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Manutenções
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {/* Filtro de Meses */}
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Selecionar Período</span>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none' }}>
              <option value="ALL">Todos os Anos</option>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {MONTHS_LIST.slice(0, 6).map(m => {
                const isSelected = selectedMonths.includes(m.key)
                return (
                  <button key={m.key} onClick={() => handleMonthClick(m.key)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: isSelected ? '1px solid #660099' : '1px solid #e2e8f0', background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc', color: isSelected ? '#660099' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none' }}>{m.label}</button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {MONTHS_LIST.slice(6, 12).map(m => {
                const isSelected = selectedMonths.includes(m.key)
                return (
                  <button key={m.key} onClick={() => handleMonthClick(m.key)} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: isSelected ? '1px solid #660099' : '1px solid #e2e8f0', background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc', color: isSelected ? '#660099' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none' }}>{m.label}</button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Card Estatísticas */}
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Consumo do Período</span>
            <span style={{ background: 'rgba(102,0,153,0.1)', color: '#660099', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4 }}>{selectedMonths.length} MÊS(ES)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Km Rodados</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{totalKmRodado.toLocaleString('pt-BR')} <span style={{ fontSize: 14, color: '#94a3b8' }}>km</span></div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Gasto Combustível</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}><span style={{ fontSize: 14, color: '#94a3b8' }}>R$</span> {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
        <div style={{ position: 'relative', width: 300, maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
          <input type="text" placeholder="Buscar técnico..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 700, color: '#475569', background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span>Ativos: <span style={{ color: '#10b981' }}>{tecnicos.filter((t: any) => t.ativo !== false).length}</span></span>
            {showInativos && (
              <>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <span>Inativos: <span style={{ color: '#ef4444' }}>{tecnicos.filter((t: any) => t.ativo === false).length}</span></span>
              </>
            )}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
            <input type="checkbox" checked={showInativos} onChange={e => setShowInativos(e.target.checked)} style={{ cursor: 'pointer' }} />
            Mostrar inativos
          </label>

          {activeTab === 'km' && (
            <button onClick={() => setShowStartModal(true)} style={{ background: '#660099', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <PlayCircle size={16} /> Iniciar KM
            </button>
          )}
          {activeTab === 'abastecimento' && (
            <button onClick={() => setShowAbsModal(true)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Fuel size={16} /> Novo Abastecimento
            </button>
          )}
          {activeTab === 'manutencao' && (
            <button onClick={() => setShowMaintModal(true)} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Plus size={16} /> Registrar Manutenção
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" size={32} color="#660099" /></div>
      ) : activeTab === 'km' ? (
        // --- TABELA KM ---
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Início da Semana</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fim da Semana</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Total Rodado</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedKms.map(k => (
                  <tr key={k.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {k.tecnico.fotoUrl ? (
                          <img src={k.tecnico.fotoUrl} alt={k.tecnico.nome} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                            {k.tecnico.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{k.tecnico.nome}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>Admissão: {new Date(k.tecnico.admissao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{k.diaSemana} - {new Date(k.dataInicial).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        {k.kmInicial.toLocaleString('pt-BR')} km
                        {k.fotoInicial && <button onClick={() => setShowPhotoModal(k.fotoInicial)} style={{ background: 'none', border: 'none', color: '#660099', cursor: 'pointer', padding: 0 }} title="Ver Foto Odômetro"><ImageIcon size={14} /></button>}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {k.kmFinal ? (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                            {['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][new Date(k.dataFinal).getUTCDay()]} - {new Date(k.dataFinal).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            {k.kmFinal.toLocaleString('pt-BR')} km
                            {k.fotoFinal && <button onClick={() => setShowPhotoModal(k.fotoFinal)} style={{ background: 'none', border: 'none', color: '#660099', cursor: 'pointer', padding: 0 }} title="Ver Foto Odômetro"><ImageIcon size={14} /></button>}
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '4px 8px', borderRadius: 4 }}>Em Aberto</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: k.diferenca ? '#10b981' : '#94a3b8' }}>{k.diferenca ? `${k.diferenca.toLocaleString('pt-BR')} km` : '—'}</div>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        {!k.kmFinal && (
                          <button onClick={() => setShowEndModal(k.id)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <StopCircle size={14} /> Fechar KM
                          </button>
                        )}
                        {(role === 'MASTER' || role === 'ADMIN') && (
                          <>
                            <button onClick={() => {
                              setFormEditKm({
                                diaSemana: k.diaSemana,
                                kmInicial: k.kmInicial.toString(),
                                fotoInicialBase64: '',
                                kmFinal: k.kmFinal ? k.kmFinal.toString() : '',
                                fotoFinalBase64: ''
                              })
                              setShowEditKmModal(k)
                            }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4 }} title="Editar">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => setShowDeleteModal({id: k.id, type: 'km'})} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title="Excluir">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedKms.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Nenhum registro encontrado.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS KM */}
          {filteredKms.length > 0 && (
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                  Mostrando de {(currentPageKm - 1) * itemsPerPageKm + 1} a {Math.min(currentPageKm * itemsPerPageKm, filteredKms.length)} de {filteredKms.length} registros
                </span>
                <select
                  value={itemsPerPageKm}
                  onChange={(e) => {
                    setItemsPerPageKm(Number(e.target.value))
                    setCurrentPageKm(1)
                  }}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', cursor: 'pointer' }}
                >
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>
              
              {totalPagesKm > 1 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setCurrentPageKm(p => Math.max(1, p - 1))}
                    disabled={currentPageKm === 1}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPageKm === 1 ? '#f1f5f9' : '#fff', color: currentPageKm === 1 ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 700, cursor: currentPageKm === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPageKm(p => Math.min(totalPagesKm, p + 1))}
                    disabled={currentPageKm === totalPagesKm}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPageKm === totalPagesKm ? '#f1f5f9' : '#fff', color: currentPageKm === totalPagesKm ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 700, cursor: currentPageKm === totalPagesKm ? 'not-allowed' : 'pointer' }}
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeTab === 'abastecimento' ? (
        // --- TABELA ABASTECIMENTO ---
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Valor Gasto</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Comprovante</th>
                  {(role === 'MASTER' || role === 'ADMIN') && <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedAbs.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>{new Date(a.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {a.tecnico.fotoUrl ? (
                          <img src={a.tecnico.fotoUrl} alt={a.tecnico.nome} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                            {a.tecnico.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{a.tecnico.nome}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>Admissão: {new Date(a.tecnico.admissao).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>R$ {a.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      {a.fotoCupom ? (
                        <button onClick={() => setShowPhotoModal(a.fotoCupom)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#660099', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <ImageIcon size={14} /> Ver Cupom
                        </button>
                      ) : '—'}
                    </td>
                    {(role === 'MASTER' || role === 'ADMIN') && (
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button onClick={() => {
                            setFormEditAbs({
                              data: new Date(a.data).toISOString().split('T')[0],
                              valor: a.valor.toString(),
                              fotoCupomBase64: ''
                            })
                            setShowEditAbsModal(a)
                          }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4 }} title="Editar">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => setShowDeleteModal({id: a.id, type: 'abs'})} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {paginatedAbs.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Nenhum abastecimento encontrado.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS ABS */}
          {filteredAbs.length > 0 && (
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                  Mostrando de {(currentPageAbs - 1) * itemsPerPageAbs + 1} a {Math.min(currentPageAbs * itemsPerPageAbs, filteredAbs.length)} de {filteredAbs.length} abastecimentos
                </span>
                <select
                  value={itemsPerPageAbs}
                  onChange={(e) => {
                    setItemsPerPageAbs(Number(e.target.value))
                    setCurrentPageAbs(1)
                  }}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', cursor: 'pointer' }}
                >
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>
              
              {totalPagesAbs > 1 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setCurrentPageAbs(p => Math.max(1, p - 1))}
                    disabled={currentPageAbs === 1}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPageAbs === 1 ? '#f1f5f9' : '#fff', color: currentPageAbs === 1 ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 700, cursor: currentPageAbs === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPageAbs(p => Math.min(totalPagesAbs, p + 1))}
                    disabled={currentPageAbs === totalPagesAbs}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPageAbs === totalPagesAbs ? '#f1f5f9' : '#fff', color: currentPageAbs === totalPagesAbs ? '#94a3b8' : '#334155', fontSize: 12, fontWeight: 700, cursor: currentPageAbs === totalPagesAbs ? 'not-allowed' : 'pointer' }}
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === 'manutencao' && (
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>KM Registrado</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Comprovante</th>
                  <th style={{ padding: '14px 20px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredMaint.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>
                      {new Date(m.dataManutencao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {m.tecnico.fotoUrl ? (
                          <img src={m.tecnico.fotoUrl} alt={m.tecnico.nome} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                            {m.tecnico.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{m.tecnico.nome}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                      {m.kmManutencao.toLocaleString('pt-BR')} km
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      {m.comprovanteUrl ? (
                        <button onClick={() => setShowPhotoModal(m.comprovanteUrl)} style={{ background: '#f1f5f9', color: '#660099', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <ImageIcon size={14} /> Ver Doc
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      {(role === 'MASTER' || role === 'ADMIN') && (
                        <button onClick={() => confirmDelete(m.id, 'manutencao')} style={{ background: 'none', border: 'none', color: '#ef4444', padding: 6, cursor: 'pointer', borderRadius: 6 }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredMaint.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                      Nenhuma manutenção registrada neste período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAIS --- */}
      {/* Modal Iniciar KM */}
      {showStartModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#660099', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlayCircle color="#fff" size={20} /> Iniciar KM Semanal
              </h2>
              <button onClick={() => setShowStartModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleStartKm} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Técnico</label>
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => { if (role !== 'TST') setShowStartTecnicoDropdown(v => !v) }}
                    style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${showStartTecnicoDropdown ? '#660099' : '#cbd5e1'}`, cursor: role === 'TST' ? 'default' : 'pointer', background: role === 'TST' ? '#f1f5f9' : '#fff', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
                  >
                    {(() => {
                      const t = tecnicos.find(x => x.id === formStart.tecnicoId)
                      return t ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {t.fotoUrl ? (
                            <img src={t.fotoUrl} alt={t.nome} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#660099', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff' }}>{t.nome.substring(0,2).toUpperCase()}</div>
                          )}
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{t.nome}</span>
                        </div>
                      ) : <span style={{ fontSize: 13, color: '#94a3b8' }}>Selecione um técnico</span>
                    })()}
                    {role !== 'TST' && <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 10 }}>{showStartTecnicoDropdown ? '▲' : '▼'}</span>}
                  </div>
                  
                  {showStartTecnicoDropdown && role !== 'TST' && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                      {tecnicos.filter(t => t.ativo !== false).map(t => (
                        <div key={t.id} onClick={() => { setFormStart(p => ({...p, tecnicoId: t.id})); setShowStartTecnicoDropdown(false) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: formStart.tecnicoId === t.id ? 'rgba(102,0,153,0.06)' : '#fff' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(102,0,153,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = formStart.tecnicoId === t.id ? 'rgba(102,0,153,0.06)' : '#fff')}
                        >
                          {t.fotoUrl ? (<img src={t.fotoUrl} alt={t.nome} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />) : (<div style={{ width: 28, height: 28, borderRadius: '50%', background: '#660099', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff', flexShrink:0 }}>{t.nome.substring(0,2).toUpperCase()}</div>)}
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.nome}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Data Inicial</label>
                  <input type="date" required value={formStart.dataInicial} onChange={(e) => setFormStart(p => ({...p, dataInicial: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                  {formStart.dataInicial && (
                    <span style={{ display: 'block', fontSize: 11, color: '#660099', marginTop: 4, fontWeight: 700 }}>
                      {['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][new Date(formStart.dataInicial + 'T12:00:00Z').getUTCDay()]}
                    </span>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>KM Inicial</label>
                  <input type="text" required value={formStart.kmInicial} onChange={(e) => setFormStart(p => ({...p, kmInicial: formatKmStr(e.target.value)}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Foto do Odômetro</label>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRefStartCam} onChange={(e) => handleFileChange(e, setFormStart)} style={{ display: 'none' }} />
                <input type="file" accept="image/*" ref={fileInputRefStartGal} onChange={(e) => handleFileChange(e, setFormStart)} style={{ display: 'none' }} />
                
                {formStart.fotoBase64 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)' }}>
                      <ImageIcon color="#10b981" size={20} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46', display: 'block' }}>Imagem Anexada</span>
                        <span style={{ fontSize: 11, color: '#10b981', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{formStart.fileName}</span>
                      </div>
                      <button type="button" onClick={() => setFormStart(p => ({...p, fotoBase64: '', fileName: '', contentType: ''}))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => fileInputRefStartCam.current?.click()} style={{ flex: 1, padding: '12px 8px', borderRadius: 8, border: '2px dashed #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Camera size={20} /> Tirar Foto
                    </button>
                    <button type="button" onClick={() => fileInputRefStartGal.current?.click()} style={{ flex: 1, padding: '12px 8px', borderRadius: 8, border: '2px dashed #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <UploadCloud size={20} /> Galeria
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowStartModal(false)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700 }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: 12, background: '#660099', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  {pending ? <Loader2 className="animate-spin" /> : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Fechar KM */}
      {showEndModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#660099', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <StopCircle color="#fff" size={20} /> Fechar KM Semanal
              </h2>
              <button onClick={() => setShowEndModal(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleEndKm} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Data de Fechamento</label>
                  <input type="date" required value={formEnd.dataFinal} onChange={(e) => setFormEnd(p => ({...p, dataFinal: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>KM Final (Odômetro)</label>
                  <input type="text" required value={formEnd.kmFinal} onChange={(e) => setFormEnd(p => ({...p, kmFinal: formatKmStr(e.target.value)}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Foto do Odômetro</label>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRefEndCam} onChange={(e) => handleFileChange(e, setFormEnd)} style={{ display: 'none' }} />
                <input type="file" accept="image/*" ref={fileInputRefEndGal} onChange={(e) => handleFileChange(e, setFormEnd)} style={{ display: 'none' }} />
                
                {formEnd.fotoBase64 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)' }}>
                      <ImageIcon color="#10b981" size={20} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46', display: 'block' }}>Imagem Anexada</span>
                        <span style={{ fontSize: 11, color: '#10b981', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{formEnd.fileName}</span>
                      </div>
                      <button type="button" onClick={() => setFormEnd(p => ({...p, fotoBase64: '', fileName: '', contentType: ''}))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => fileInputRefEndCam.current?.click()} style={{ flex: 1, padding: '12px 8px', borderRadius: 8, border: '2px dashed #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Camera size={20} /> Tirar Foto
                    </button>
                    <button type="button" onClick={() => fileInputRefEndGal.current?.click()} style={{ flex: 1, padding: '12px 8px', borderRadius: 8, border: '2px dashed #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <UploadCloud size={20} /> Galeria
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowEndModal(null)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700 }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: 12, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  {pending ? <Loader2 className="animate-spin" /> : 'Fechar Semana'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Abastecimento */}
      {showAbsModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#660099', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Fuel color="#fff" size={20} /> Novo Abastecimento
              </h2>
              <button onClick={() => setShowAbsModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAbs} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Técnico</label>
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => { if (role !== 'TST') setShowAbsTecnicoDropdown(v => !v) }}
                    style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${showAbsTecnicoDropdown ? '#660099' : '#cbd5e1'}`, cursor: role === 'TST' ? 'default' : 'pointer', background: role === 'TST' ? '#f1f5f9' : '#fff', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
                  >
                    {(() => {
                      const t = tecnicos.find(x => x.id === formAbs.tecnicoId)
                      return t ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {t.fotoUrl ? (
                            <img src={t.fotoUrl} alt={t.nome} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#660099', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff' }}>{t.nome.substring(0,2).toUpperCase()}</div>
                          )}
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{t.nome}</span>
                        </div>
                      ) : <span style={{ fontSize: 13, color: '#94a3b8' }}>Selecione um técnico</span>
                    })()}
                    {role !== 'TST' && <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 10 }}>{showAbsTecnicoDropdown ? '▲' : '▼'}</span>}
                  </div>
                  
                  {showAbsTecnicoDropdown && role !== 'TST' && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                      {tecnicos.filter(t => t.ativo !== false).map(t => (
                        <div key={t.id} onClick={() => { setFormAbs(p => ({...p, tecnicoId: t.id})); setShowAbsTecnicoDropdown(false) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: formAbs.tecnicoId === t.id ? 'rgba(102,0,153,0.06)' : '#fff' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(102,0,153,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = formAbs.tecnicoId === t.id ? 'rgba(102,0,153,0.06)' : '#fff')}
                        >
                          {t.fotoUrl ? (<img src={t.fotoUrl} alt={t.nome} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />) : (<div style={{ width: 28, height: 28, borderRadius: '50%', background: '#660099', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff', flexShrink:0 }}>{t.nome.substring(0,2).toUpperCase()}</div>)}
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.nome}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Data</label>
                  <input type="date" required value={formAbs.data} onChange={(e) => setFormAbs(p => ({...p, data: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Valor Total (R$)</label>
                  <input type="text" required value={formAbs.valor} onChange={(e) => setFormAbs(p => ({...p, valor: formatCurrencyStr(e.target.value)}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Comprovante / Cupom Fiscal</label>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRefAbsCam} onChange={(e) => handleFileChange(e, setFormAbs)} style={{ display: 'none' }} />
                <input type="file" accept="image/*" ref={fileInputRefAbsGal} onChange={(e) => handleFileChange(e, setFormAbs)} style={{ display: 'none' }} />
                
                {formAbs.fotoBase64 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)' }}>
                      <ImageIcon color="#10b981" size={20} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46', display: 'block' }}>Imagem Anexada</span>
                        <span style={{ fontSize: 11, color: '#10b981', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{formAbs.fileName}</span>
                      </div>
                      <button type="button" onClick={() => setFormAbs(p => ({...p, fotoBase64: '', fileName: '', contentType: ''}))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => fileInputRefAbsCam.current?.click()} style={{ flex: 1, padding: '12px 8px', borderRadius: 8, border: '2px dashed #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Camera size={20} /> Tirar Foto
                    </button>
                    <button type="button" onClick={() => fileInputRefAbsGal.current?.click()} style={{ flex: 1, padding: '12px 8px', borderRadius: 8, border: '2px dashed #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <UploadCloud size={20} /> Galeria
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowAbsModal(false)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700 }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: 12, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  {pending ? <Loader2 className="animate-spin" /> : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar KM */}
      {showEditKmModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#660099', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pencil color="#fff" size={20} /> Editar Registro de KM
              </h2>
              <button onClick={() => setShowEditKmModal(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
              <form onSubmit={handleEditKm} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Dia da Semana</label>
                  <select required value={formEditKm.diaSemana} onChange={(e) => setFormEditKm(p => ({...p, diaSemana: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                    <option>Segunda-feira</option>
                    <option>Terça-feira</option>
                    <option>Quarta-feira</option>
                    <option>Quinta-feira</option>
                    <option>Sexta-feira</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>KM Inicial</label>
                  <input type="text" required value={formEditKm.kmInicial} onChange={(e) => setFormEditKm(p => ({...p, kmInicial: formatKmStr(e.target.value)}))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Nova Foto Inicial</label>
                {showEditKmModal?.fotoInicial && !formEditKm.fotoInicialBase64 && (
                  <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={showEditKmModal.fotoInicial} alt="Odômetro Inicial" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Imagem Atual</span>
                      <button type="button" onClick={() => { const input = document.getElementById('editKmInPic') as HTMLInputElement; input?.click() }} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Trocar Imagem</button>
                    </div>
                  </div>
                )}
                <input id="editKmInPic" type="file" accept="image/*" onChange={(e) => handleFileChange(e, setFormEditKm)} style={{ display: showEditKmModal?.fotoInicial && !formEditKm.fotoInicialBase64 ? 'none' : 'block', width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </div>
              
              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>KM Final</label>
                <input type="text" value={formEditKm.kmFinal} onChange={(e) => setFormEditKm(p => ({...p, kmFinal: formatKmStr(e.target.value)}))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Nova Foto Final</label>
                {showEditKmModal?.fotoFinal && !formEditKm.fotoFinalBase64 && (
                  <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={showEditKmModal.fotoFinal} alt="Odômetro Final" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Imagem Atual</span>
                      <button type="button" onClick={() => { const input = document.getElementById('editKmFiPic') as HTMLInputElement; input?.click() }} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Trocar Imagem</button>
                    </div>
                  </div>
                )}
                <input id="editKmFiPic" type="file" accept="image/*" onChange={(e) => handleFileChange(e, setFormEditKm)} style={{ display: showEditKmModal?.fotoFinal && !formEditKm.fotoFinalBase64 ? 'none' : 'block', width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowEditKmModal(null)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700 }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: 12, background: '#660099', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  {pending ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Abastecimento */}
      {showEditAbsModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#660099', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pencil color="#fff" size={20} /> Editar Abastecimento
              </h2>
              <button onClick={() => setShowEditAbsModal(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
              <form onSubmit={handleEditAbs} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Data</label>
                  <input type="date" required value={formEditAbs.data} onChange={(e) => setFormEditAbs(p => ({...p, data: e.target.value}))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Valor Total (R$)</label>
                  <input type="text" required value={formEditAbs.valor} onChange={(e) => setFormEditAbs(p => ({...p, valor: formatCurrencyStr(e.target.value)}))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Novo Comprovante</label>
                {showEditAbsModal?.fotoCupom && !formEditAbs.fotoCupomBase64 && (
                  <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={showEditAbsModal.fotoCupom} alt="Cupom Fiscal" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Comprovante Atual</span>
                      <button type="button" onClick={() => { const input = document.getElementById('editAbsPic') as HTMLInputElement; input?.click() }} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Trocar Imagem</button>
                    </div>
                  </div>
                )}
                <input id="editAbsPic" type="file" accept="image/*" onChange={(e) => handleFileChange(e, setFormEditAbs)} style={{ display: showEditAbsModal?.fotoCupom && !formEditAbs.fotoCupomBase64 ? 'none' : 'block', width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowEditAbsModal(null)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700 }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: 12, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  {pending ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
                </button>
              </div>
            </form>
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
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
              Você tem certeza que deseja excluir este registro? Esta ação é permanente e <strong>não poderá ser desfeita</strong>.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button disabled={pending} onClick={() => setShowDeleteModal(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button disabled={pending} onClick={processDelete} style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {pending ? <Loader2 className="animate-spin" size={18} /> : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Foto */}
      {showPhotoModal && (
        <div onClick={() => setShowPhotoModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <img src={showPhotoModal} alt="Foto SG4" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }} />
        </div>
      )}
      {/* Modal Registrar Manutenção */}
      {showMaintModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#f59e0b', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus color="#fff" size={20} /> Registrar Manutenção
              </h2>
              <button onClick={() => setShowMaintModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCreateMaint} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {role !== 'TST' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Selecionar Técnico</label>
                  <select
                    value={formMaint.tecnicoId}
                    onChange={(e) => setFormMaint(p => ({ ...p, tecnicoId: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                  >
                    {tecnicos.filter(t => t.ativo !== false).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Data da Manutenção</label>
                  <input type="date" required value={formMaint.dataManutencao} onChange={(e) => setFormMaint(p => ({ ...p, dataManutencao: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>KM de Realização</label>
                  <input type="text" required value={formMaint.kmManutencao} onChange={(e) => setFormMaint(p => ({ ...p, kmManutencao: formatKmStr(e.target.value) }))} placeholder="Ex: 30.100" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Comprovante / Nota Fiscal (Opcional)</label>
                <input type="file" accept="image/*" id="maintPhotoInput" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setFormMaint(p => ({ ...p, fotoBase64: ev.target?.result as string, fileName: file.name, contentType: file.type }));
                    };
                    reader.readAsDataURL(file);
                  }
                }} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => document.getElementById('maintPhotoInput')?.click()} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px dashed #64748b', background: '#f8fafc', color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <UploadCloud size={16} /> Anexar da Galeria
                  </button>
                </div>
                {formMaint.fileName && <div style={{ marginTop: 8, fontSize: 12, color: '#10b981', fontWeight: 600 }}>{formMaint.fileName} selecionado</div>}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowMaintModal(false)} disabled={pending} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                  Salvar Manutenção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
