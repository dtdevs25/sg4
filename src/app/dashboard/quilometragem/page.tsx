'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import {
  Car, Fuel, Plus, Search, Calendar, CheckCircle2,
  AlertTriangle, UploadCloud, Trash2, Camera, MapPin, DollarSign, Image as ImageIcon,
  Loader2, PlayCircle, StopCircle, Pencil
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import {
  getQuilometragens, createQuilometragem, fecharQuilometragem, deleteQuilometragem, updateQuilometragem,
  getAbastecimentos, createAbastecimento, deleteAbastecimento, updateAbastecimento, uploadFotoKm
} from '@/app/actions/quilometragem'
import { getTecnicos } from '@/app/actions/tecnicos'

export default function QuilometragemPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [activeTab, setActiveTab] = useState<'km' | 'abastecimento'>('km')
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [kms, setKms] = useState<any[]>([])
  const [abastecimentos, setAbastecimentos] = useState<any[]>([])

  const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth() + 1])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [search, setSearch] = useState('')

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
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null) // URL da foto

  const [showEditKmModal, setShowEditKmModal] = useState<any>(null)
  const [showEditAbsModal, setShowEditAbsModal] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<{id: string, type: 'km' | 'abs'} | null>(null)

  // Forms
  const [formStart, setFormStart] = useState({ tecnicoId: '', diaSemana: 'Segunda-feira', kmInicial: '', fotoBase64: '', fileName: '', contentType: '' })
  const [formEnd, setFormEnd] = useState({ kmFinal: '', fotoBase64: '', fileName: '', contentType: '' })
  const [formAbs, setFormAbs] = useState({ tecnicoId: '', data: '', valor: '', fotoBase64: '', fileName: '', contentType: '' })
  
  const [formEditKm, setFormEditKm] = useState({ diaSemana: '', kmInicial: '', fotoInicialBase64: '', kmFinal: '', fotoFinalBase64: '' })
  const [formEditAbs, setFormEditAbs] = useState({ data: '', valor: '', fotoCupomBase64: '' })

  const fileInputRefStart = useRef<HTMLInputElement>(null)
  const fileInputRefEnd = useRef<HTMLInputElement>(null)
  const fileInputRefAbs = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [selectedYear])

  async function loadData() {
    setLoading(true)
    const [resKm, resAbs, resTec] = await Promise.all([
      getQuilometragens(selectedYear),
      getAbastecimentos(selectedYear),
      getTecnicos()
    ])
    if (resKm.success && resKm.data) setKms(resKm.data)
    if (resAbs.success && resAbs.data) setAbastecimentos(resAbs.data)
    if (resTec.success && resTec.data) {
      setTecnicos(resTec.data.filter((t: any) => t.ativo))
      if (resTec.data.length > 0 && !formStart.tecnicoId) {
        const tId = (session?.user as any)?.tecnicoId || resTec.data[0].id
        setFormStart(p => ({ ...p, tecnicoId: tId }))
        setFormAbs(p => ({ ...p, tecnicoId: tId }))
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
    if (!formStart.tecnicoId || !formStart.kmInicial || !formStart.fotoBase64) return alert('Preencha todos os campos e tire a foto do odômetro inicial.')
    
    startTransition(async () => {
      let fotoUrl = undefined
      if (formStart.fotoBase64) {
        const uploadRes = await uploadFotoKm(formStart.fotoBase64, formStart.fileName, formStart.contentType)
        if (uploadRes.success) fotoUrl = uploadRes.url
        else return alert('Falha ao subir foto')
      }

      const res = await createQuilometragem({
        tecnicoId: formStart.tecnicoId,
        diaSemana: formStart.diaSemana,
        dataInicial: new Date(),
        kmInicial: parseFloat(formStart.kmInicial),
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

      const res = await fecharQuilometragem(showEndModal, parseFloat(formEnd.kmFinal), fotoUrl)
      if (res.success) {
        setShowEndModal(null)
        setFormEnd({ kmFinal: '', fotoBase64: '', fileName: '', contentType: '' })
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
        valor: parseFloat(formAbs.valor),
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
        kmInicial: formEditKm.kmInicial ? parseFloat(formEditKm.kmInicial) : undefined,
        fotoInicial: fotoInUrl,
        kmFinal: formEditKm.kmFinal ? parseFloat(formEditKm.kmFinal) : null,
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
        valor: formEditAbs.valor ? parseFloat(formEditAbs.valor) : undefined,
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

  async function confirmDelete() {
    if(!showDeleteModal) return
    startTransition(async () => {
      if (showDeleteModal.type === 'km') {
        const res = await deleteQuilometragem(showDeleteModal.id)
        if (res.success) loadData()
        else alert(res.error)
      } else {
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
    return selectedMonths.includes(m) && matchSearch
  })

  const filteredAbs = abastecimentos.filter(a => {
    const jsDate = new Date(a.data)
    const m = jsDate.getUTCMonth() + 1
    const matchSearch = a.tecnico.nome.toLowerCase().includes(search.toLowerCase())
    return selectedMonths.includes(m) && matchSearch
  })

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
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {/* Filtro de Meses */}
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
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b' }}>{totalKmRodado} <span style={{ fontSize: 16, color: '#94a3b8' }}>km</span></div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Gasto Combustível</span>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444' }}><span style={{ fontSize: 16, color: '#94a3b8' }}>R$</span> {totalGasto.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
          <input type="text" placeholder="Buscar técnico..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
        </div>
        
        {activeTab === 'km' ? (
          <button onClick={() => setShowStartModal(true)} style={{ background: '#660099', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <PlayCircle size={16} /> Iniciar KM
          </button>
        ) : (
          <button onClick={() => setShowAbsModal(true)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Fuel size={16} /> Novo Abastecimento
          </button>
        )}
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
                {filteredKms.map(k => (
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
                        {k.kmInicial} km
                        {k.fotoInicial && <button onClick={() => setShowPhotoModal(k.fotoInicial)} style={{ background: 'none', border: 'none', color: '#660099', cursor: 'pointer', padding: 0 }} title="Ver Foto Odômetro"><ImageIcon size={14} /></button>}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {k.kmFinal ? (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Sexta-feira - {new Date(k.dataFinal).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            {k.kmFinal} km
                            {k.fotoFinal && <button onClick={() => setShowPhotoModal(k.fotoFinal)} style={{ background: 'none', border: 'none', color: '#660099', cursor: 'pointer', padding: 0 }} title="Ver Foto Odômetro"><ImageIcon size={14} /></button>}
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '4px 8px', borderRadius: 4 }}>Em Aberto</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: k.diferenca ? '#10b981' : '#94a3b8' }}>{k.diferenca ? `${k.diferenca} km` : '—'}</div>
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
                {filteredKms.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Nenhum registro encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
                {filteredAbs.map(a => (
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
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>R$ {a.valor.toFixed(2)}</div>
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
                {filteredAbs.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Nenhum abastecimento encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAIS --- */}
      {/* Modal Iniciar KM */}
      {showStartModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><PlayCircle color="#660099" /> Iniciar KM Semanal</h2>
            <form onSubmit={handleStartKm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Técnico</label>
                <select disabled={role === 'TST'} required value={formStart.tecnicoId} onChange={(e) => setFormStart(p => ({...p, tecnicoId: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', background: role === 'TST' ? '#f1f5f9' : '#fff' }}>
                  {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Dia da Semana</label>
                  <select required value={formStart.diaSemana} onChange={(e) => setFormStart(p => ({...p, diaSemana: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                    <option>Segunda-feira</option>
                    <option>Terça-feira</option>
                    <option>Quarta-feira</option>
                    <option>Quinta-feira</option>
                    <option>Sexta-feira</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>KM Inicial</label>
                  <input type="number" step="0.1" required value={formStart.kmInicial} onChange={(e) => setFormStart(p => ({...p, kmInicial: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Foto do Odômetro</label>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRefStart} onChange={(e) => handleFileChange(e, setFormStart)} style={{ display: 'none' }} />
                <button type="button" onClick={() => fileInputRefStart.current?.click()} style={{ width: '100%', padding: 12, borderRadius: 8, border: '2px dashed #cbd5e1', background: formStart.fotoBase64 ? 'rgba(16,185,129,0.1)' : '#f8fafc', color: formStart.fotoBase64 ? '#10b981' : '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Camera size={20} /> {formStart.fotoBase64 ? 'Foto Anexada (Clique para trocar)' : 'Tirar Foto do Painel'}
                </button>
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
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><StopCircle color="#ef4444" /> Fechar KM Semanal</h2>
            <form onSubmit={handleEndKm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>KM Final (Sexta-feira)</label>
                <input type="number" step="0.1" required value={formEnd.kmFinal} onChange={(e) => setFormEnd(p => ({...p, kmFinal: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Foto do Odômetro</label>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRefEnd} onChange={(e) => handleFileChange(e, setFormEnd)} style={{ display: 'none' }} />
                <button type="button" onClick={() => fileInputRefEnd.current?.click()} style={{ width: '100%', padding: 12, borderRadius: 8, border: '2px dashed #cbd5e1', background: formEnd.fotoBase64 ? 'rgba(16,185,129,0.1)' : '#f8fafc', color: formEnd.fotoBase64 ? '#10b981' : '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Camera size={20} /> {formEnd.fotoBase64 ? 'Foto Anexada (Clique para trocar)' : 'Tirar Foto Final'}
                </button>
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
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Fuel color="#10b981" /> Novo Abastecimento</h2>
            <form onSubmit={handleCreateAbs} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Técnico</label>
                <select disabled={role === 'TST'} required value={formAbs.tecnicoId} onChange={(e) => setFormAbs(p => ({...p, tecnicoId: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', background: role === 'TST' ? '#f1f5f9' : '#fff' }}>
                  {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Data</label>
                  <input type="date" required value={formAbs.data} onChange={(e) => setFormAbs(p => ({...p, data: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Valor Total (R$)</label>
                  <input type="number" step="0.01" required value={formAbs.valor} onChange={(e) => setFormAbs(p => ({...p, valor: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Comprovante / Cupom Fiscal</label>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRefAbs} onChange={(e) => handleFileChange(e, setFormAbs)} style={{ display: 'none' }} />
                <button type="button" onClick={() => fileInputRefAbs.current?.click()} style={{ width: '100%', padding: 12, borderRadius: 8, border: '2px dashed #cbd5e1', background: formAbs.fotoBase64 ? 'rgba(16,185,129,0.1)' : '#f8fafc', color: formAbs.fotoBase64 ? '#10b981' : '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Camera size={20} /> {formAbs.fotoBase64 ? 'Foto Anexada (Trocar)' : 'Tirar Foto do Cupom'}
                </button>
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
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><PlayCircle color="#3b82f6" /> Editar Registro de KM</h2>
            <form onSubmit={handleEditKm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Dia da Semana</label>
                  <select required value={formEditKm.diaSemana} onChange={(e) => setFormEditKm(p => ({...p, diaSemana: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                    <option>Segunda-feira</option>
                    <option>Terça-feira</option>
                    <option>Quarta-feira</option>
                    <option>Quinta-feira</option>
                    <option>Sexta-feira</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>KM Inicial</label>
                  <input type="number" step="0.1" required value={formEditKm.kmInicial} onChange={(e) => setFormEditKm(p => ({...p, kmInicial: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Nova Foto Odômetro Inicial (Opcional)</label>
                {showEditKmModal?.fotoInicial && !formEditKm.fotoInicialBase64 && (
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Foto Atual:</span>
                    <img src={showEditKmModal.fotoInicial} alt="Odômetro Inicial" style={{ width: '100%', height: 160, objectFit: 'contain', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setFormEditKm)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </div>
              
              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '8px 0' }} />

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>KM Final</label>
                <input type="number" step="0.1" value={formEditKm.kmFinal} onChange={(e) => setFormEditKm(p => ({...p, kmFinal: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Nova Foto Odômetro Final (Opcional)</label>
                {showEditKmModal?.fotoFinal && !formEditKm.fotoFinalBase64 && (
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Foto Atual:</span>
                    <img src={showEditKmModal.fotoFinal} alt="Odômetro Final" style={{ width: '100%', height: 160, objectFit: 'contain', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setFormEditKm)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowEditKmModal(null)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700 }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: 12, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  {pending ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Abastecimento */}
      {showEditAbsModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Fuel color="#3b82f6" /> Editar Abastecimento</h2>
            <form onSubmit={handleEditAbs} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Data</label>
                  <input type="date" required value={formEditAbs.data} onChange={(e) => setFormEditAbs(p => ({...p, data: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Valor Total (R$)</label>
                  <input type="number" step="0.01" required value={formEditAbs.valor} onChange={(e) => setFormEditAbs(p => ({...p, valor: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Novo Comprovante (Opcional)</label>
                {showEditAbsModal?.fotoCupom && !formEditAbs.fotoCupomBase64 && (
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Comprovante Atual:</span>
                    <img src={showEditAbsModal.fotoCupom} alt="Cupom Fiscal" style={{ width: '100%', height: 160, objectFit: 'contain', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setFormEditAbs)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
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
              <button disabled={pending} onClick={confirmDelete} style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
    </div>
  )
}
