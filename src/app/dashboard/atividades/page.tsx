'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  CalendarDays, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Plus, Edit2, CheckCircle2, AlertTriangle, User, MapPin, Search, 
  X, Check, AlertCircle, Trash2, RotateCcw
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getTecnicos } from '@/app/actions/tecnicos'
import {
  getPlanejamentos, savePlanejamento, modificarExecucao, concluirPlanejamento, deletePlanejamento, moverPlanejamento, reverterPlanejamento
} from '@/app/actions/planejamento'
import { getUnidades } from '@/app/actions/unidades'

// --- Cores de Prioridade ---
const PR_COLORS: any = {
  ALTA: { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' },
  MEDIA: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
  BAIXA: { bg: '#e0e7ff', border: '#6366f1', text: '#4338ca' }
}

const CATEGORIES = ['ADMINISTRATIVA', 'INSPEÇÃO DE SEGURANÇA', 'GESTÃO DSS', 'REUNIÃO DE ALINHAMENTO', 'TREINAMENTO', 'OUTROS']

export default function PlanejamentoPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const userTecnicoId = (session?.user as any)?.tecnicoId
  const isTst = role === 'TST'

  const [view, setView] = useState<'semana' | 'mes'>('semana')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTecnico, setSelectedTecnico] = useState<string>('TODOS')
  
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [planejamentos, setPlanejamentos] = useState<any[]>([])
  const [pending, startTransition] = useTransition()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showExecModal, setShowExecModal] = useState<any>(null)
  const [isModifying, setIsModifying] = useState(false)
  const [showTecnicoDropdown, setShowTecnicoDropdown] = useState(false)
  const [showSidebarDropdown, setShowSidebarDropdown] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null)

  // Form State
  const [form, setForm] = useState({
    id: '', tecnicoId: '', dataAtividade: '', categoria: 'INSPEÇÃO DE SEGURANÇA', outraCategoria: '',
    descricaoOriginal: '', equipe: 'Não se aplica', local: '', outroLocal: '', cidade: '', estado: 'SP',
    prioridade: 'MEDIA'
  })
  
  const [execForm, setExecForm] = useState({
    descricaoExecutada: '', observacoes: ''
  })

  useEffect(() => {
    if (!isTst) {
      getTecnicos().then(res => {
        if (res.success && res.data) setTecnicos(res.data)
      })
    }
    getUnidades().then(res => {
      if (res.success && res.data) setUnidades(res.data)
    })
  }, [isTst])

  useEffect(() => {
    load()
  }, [currentDate, view, selectedTecnico, userTecnicoId])

  async function load() {
    let start, end;
    if (view === 'semana') {
      start = getStartOfWeek(currentDate)
      end = new Date(start)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    } else {
      start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999)
    }

    const tId = isTst ? userTecnicoId : (selectedTecnico === 'TODOS' ? undefined : selectedTecnico)
    if (isTst && !userTecnicoId) return // Aguarda carregar sessão

    const res = await getPlanejamentos(tId, start, end)
    if (res.success && res.data) {
      setPlanejamentos(res.data)
    }
  }

  // --- Funções de Data ---
  function getStartOfWeek(date: Date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Seg a Dom
    return new Date(d.setDate(diff))
  }

  function formatStrDate(d: Date) {
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
    return localISOTime;
  }

  function handlePrev() {
    const d = new Date(currentDate)
    if (view === 'semana') d.setDate(d.getDate() - 7)
    else d.setMonth(d.getMonth() - 1)
    setCurrentDate(d)
  }

  function handleNext() {
    const d = new Date(currentDate)
    if (view === 'semana') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    setCurrentDate(d)
  }

  function handleAdd(dateStr?: string) {
    setForm({
      id: '', tecnicoId: isTst ? userTecnicoId : (selectedTecnico !== 'TODOS' ? selectedTecnico : ''),
      dataAtividade: dateStr || formatStrDate(new Date()), categoria: 'INSPEÇÃO DE SEGURANÇA', outraCategoria: '',
      descricaoOriginal: '', equipe: 'Não se aplica', local: '', outroLocal: '', cidade: '', estado: 'SP',
      prioridade: 'MEDIA'
    })
    setShowAddModal(true)
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('plan_id', id)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, dateStr: string) {
    e.preventDefault()
    e.currentTarget.style.background = '' // Limpa highlight
    const planId = e.dataTransfer.getData('plan_id')
    if (!planId) return
    
    startTransition(async () => {
      // Otimisticamente:
      setPlanejamentos(prev => prev.map(p => p.id === planId ? { ...p, dataAtividade: new Date(`${dateStr}T12:00:00Z`) } : p))
      
      const res = await moverPlanejamento(planId, new Date(`${dateStr}T12:00:00Z`))
      if (!res.success) {
        alert(res.error)
        load() // reverte
      }
    })
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.currentTarget.style.background = 'rgba(102,0,153,0.05)'
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.currentTarget.style.background = ''
  }

  function handleSaveForm(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const payload = {
        ...form,
        categoria: form.categoria === 'OUTROS' && form.outraCategoria ? form.outraCategoria : form.categoria,
        local: form.local === 'OUTROS' && form.outroLocal ? form.outroLocal : form.local,
        dataAtividade: new Date(`${form.dataAtividade}T12:00:00Z`), // Força meio-dia para evitar fuso
        prioridade: form.prioridade as any
      }
      // remover props temporárias antes de enviar
      delete (payload as any).outraCategoria
      delete (payload as any).outroLocal

      const res = await savePlanejamento(payload)
      if (res.success) {
        setShowAddModal(false)
        load()
      } else {
        alert(res.error)
      }
    })
  }

  function handleActionExecute(plan: any) {
    setShowExecModal(plan)
    setIsModifying(false)
    setExecForm({
      descricaoExecutada: plan.descricaoExecutada || plan.descricaoOriginal,
      observacoes: plan.observacoes || ''
    })
  }

  function handleExecutar(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      // Se houver texto executado, consideramos "modificarExecucao", caso contrário só conclui
      if (execForm.descricaoExecutada.trim()) {
        await modificarExecucao(showExecModal.id, execForm.descricaoExecutada, execForm.observacoes)
      } else {
        await concluirPlanejamento(showExecModal.id)
      }
      setShowExecModal(null)
      load()
    })
  }

  function handleReverter(id: string) {
    setConfirmRevertId(id)
  }

  function executeRevert() {
    if(!confirmRevertId) return
    startTransition(async () => {
      await reverterPlanejamento(confirmRevertId)
      setConfirmRevertId(null)
      setShowExecModal(null)
      load()
    })
  }

  function handleDeletePlan(id: string) {
    setConfirmDeleteId(id)
  }

  function executeDelete() {
    if(!confirmDeleteId) return
    startTransition(async () => {
      await deletePlanejamento(confirmDeleteId)
      setConfirmDeleteId(null)
      setShowExecModal(null)
      load()
    })
  }

  // --- RenderHelpers ---
  function renderWeek() {
    const start = getStartOfWeek(currentDate)
    const days = []
    for(let i=0; i<6; i++) { // Seg a Sábado
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      days.push(d)
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, overflowX: 'auto' }}>
        {days.map((d, i) => {
          const dateStr = formatStrDate(d)
          const dayPlans = planejamentos.filter(p => formatStrDate(new Date(p.dataAtividade)) === dateStr)
          const isToday = formatStrDate(d) === formatStrDate(new Date())

          return (
            <div 
              key={i} 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, dateStr)}
              style={{ minWidth: 140, background: '#f8fafc', borderRadius: 8, border: isToday ? '2px solid #660099' : '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', transition: 'background 0.2s' }}
            >
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', background: isToday ? '#faf5ff' : 'transparent', borderRadius: '6px 6px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>
                    {d.getDate()}
                  </div>
                </div>
                <button onClick={() => handleAdd(dateStr)} style={{ background: '#e2e8f0', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}>
                  <Plus size={14} />
                </button>
              </div>
              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 150 }}>
                {dayPlans.map(p => <PlanCard key={p.id} plan={p} onClick={() => handleActionExecute(p)} onDragStart={handleDragStart} />)}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderMonth() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const offset = firstDay === 0 ? 6 : firstDay - 1 // Faz Seg ser 0
    const gridDays = Array.from({ length: 42 })

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(wd => (
          <div key={wd} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#64748b', paddingBottom: 8 }}>{wd}</div>
        ))}
        {gridDays.map((_, i) => {
          const dayNum = i - offset + 1
          const isValid = dayNum > 0 && dayNum <= daysInMonth
          if (!isValid) return <div key={i} style={{ minHeight: 80, background: '#f8fafc', borderRadius: 8, border: '1px dashed #e2e8f0' }} />

          const d = new Date(year, month, dayNum)
          const dateStr = formatStrDate(d)
          const dayPlans = planejamentos.filter(p => formatStrDate(new Date(p.dataAtividade)) === dateStr)

          return (
            <div 
              key={i} 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, dateStr)}
              style={{ minHeight: 80, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 6, display: 'flex', flexDirection: 'column', transition: 'background 0.2s' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#1e293b' }}>{dayNum}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dayPlans.map(p => {
                  const isConcluido = p.status === 'CONCLUIDO'
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => handleActionExecute(p)} 
                      draggable={!isConcluido}
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      style={{ fontSize: 9, padding: '3px 4px', borderRadius: 4, background: PR_COLORS[p.prioridade].bg, borderLeft: `3px solid ${PR_COLORS[p.prioridade].border}`, color: PR_COLORS[p.prioridade].text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: isConcluido ? 'pointer' : 'grab', display: 'flex', alignItems: 'center', gap: 4, opacity: isConcluido ? 0.6 : 1, position: 'relative' }}
                    >
                      {p.tecnico?.fotoUrl ? (
                        <img src={p.tecnico.fotoUrl} alt={p.tecnico.nome} style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} title={p.tecnico.nome} />
                      ) : (
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#660099', color: '#fff', fontSize: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }} title={p.tecnico?.nome}>{p.tecnico?.nome?.substring(0,1).toUpperCase() || 'T'}</div>
                      )}
                      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: isConcluido ? 12 : 0 }}>
                        {p.categoria}
                      </div>
                      {isConcluido && <CheckCircle2 size={10} style={{ position: 'absolute', top: 3, right: 3, color: '#10b981' }} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const getWeekLabel = () => {
    const s = getStartOfWeek(currentDate)
    const e = new Date(s)
    e.setDate(e.getDate() + 6)
    return `${s.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})} a ${e.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', year: 'numeric'})}`
  }

  return (
    <div style={{ paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* HEADER */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays color="#660099" size={24} />
          Planejamento de Atividades
        </h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => handleAdd()} style={{ background: '#660099', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Plus size={16} /> Novo Planejamento
          </button>
        </div>
      </div>

      {/* CONTROLES */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setView('semana')} style={{ background: view === 'semana' ? '#fff' : 'transparent', color: view === 'semana' ? '#660099' : '#64748b', border: 'none', padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', margin: 2, borderRadius: 6 }}>Semana</button>
            <button onClick={() => setView('mes')} style={{ background: view === 'mes' ? '#fff' : 'transparent', color: view === 'mes' ? '#660099' : '#64748b', border: 'none', padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', margin: 2, borderRadius: 6 }}>Mês</button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 8px' }}>
            <button onClick={handlePrev} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}><ChevronLeft size={18} color="#64748b" /></button>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', minWidth: 150, textAlign: 'center' }}>
              {view === 'semana' ? getWeekLabel() : currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
            </span>
            <button onClick={handleNext} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}><ChevronRight size={18} color="#64748b" /></button>
          </div>
        </div>

        {!isTst && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Técnico:</span>
            <div
              onClick={() => setShowSidebarDropdown(v => !v)}
              style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${showSidebarDropdown ? '#660099' : '#e2e8f0'}`, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}
            >
              {selectedTecnico !== 'TODOS' ? (() => {
                const t = tecnicos.find(x => x.id === selectedTecnico)
                return t ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t.fotoUrl ? (
                      <img src={t.fotoUrl} alt={t.nome} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#660099', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#fff' }}>{t.nome.substring(0,2).toUpperCase()}</div>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{t.nome}</span>
                  </div>
                ) : <span style={{ fontSize: 13, color: '#1e293b' }}>Todos os Técnicos</span>
              })() : <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Todos os Técnicos</span>}
              <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 10 }}>{showSidebarDropdown ? '▲' : '▼'}</span>
            </div>
            
            {showSidebarDropdown && (
              <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, width: 260, maxHeight: 300, overflowY: 'auto' }}>
                <div onClick={() => { setSelectedTecnico('TODOS'); setShowSidebarDropdown(false) }}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: selectedTecnico === 'TODOS' ? 'rgba(102,0,153,0.06)' : '#fff', fontSize: 13, fontWeight: 700, color: '#1e293b' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(102,0,153,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = selectedTecnico === 'TODOS' ? 'rgba(102,0,153,0.06)' : '#fff')}
                >
                  Todos os Técnicos
                </div>
                {tecnicos.map(t => (
                  <div key={t.id} onClick={() => { setSelectedTecnico(t.id); setShowSidebarDropdown(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: selectedTecnico === t.id ? 'rgba(102,0,153,0.06)' : '#fff' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(102,0,153,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = selectedTecnico === t.id ? 'rgba(102,0,153,0.06)' : '#fff')}
                  >
                    {t.fotoUrl ? (<img src={t.fotoUrl} alt={t.nome} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />) : (<div style={{ width: 28, height: 28, borderRadius: '50%', background: '#660099', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff', flexShrink:0 }}>{t.nome.substring(0,2).toUpperCase()}</div>)}
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.nome}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CALENDÁRIO */}
      {view === 'semana' ? renderWeek() : renderMonth()}

      {/* MODAL ADICIONAR */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ 
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600,
            display: 'flex', flexDirection: 'column',
            maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              background: '#660099', padding: '20px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, zIndex: 10
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Planejar Atividade</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto' }}>
            <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>DATA</label>
                  <input type="date" required value={form.dataAtividade} onChange={e => setForm({...form, dataAtividade: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>PRIORIDADE</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { val: 'ALTA', label: 'Alta', color: '#ef4444', bg: '#fee2e2' },
                    { val: 'MEDIA', label: 'Média', color: '#f59e0b', bg: '#fef3c7' },
                    { val: 'BAIXA', label: 'Baixa', color: '#6366f1', bg: '#e0e7ff' }
                  ].map(p => (
                    <label key={p.val} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: 8, border: `2px solid ${form.prioridade === p.val ? p.color : '#cbd5e1'}`, background: form.prioridade === p.val ? p.bg : '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <input type="radio" name="prioridade" value={p.val} checked={form.prioridade === p.val} onChange={e => setForm({...form, prioridade: e.target.value})} style={{ display: 'none' }} />
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, marginRight: 8 }}></div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: form.prioridade === p.val ? p.color : '#64748b' }}>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {!isTst ? (
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>TÉCNICO</label>
                  <div
                    onClick={() => setShowTecnicoDropdown(v => !v)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${showTecnicoDropdown ? '#660099' : '#cbd5e1'}`, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s' }}
                  >
                    {form.tecnicoId ? (() => {
                      const t = tecnicos.find(x => x.id === form.tecnicoId)
                      return t ? (<>{t.fotoUrl ? (<img src={t.fotoUrl} alt={t.nome} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />) : (<div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#660099,#9333ea)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff', flexShrink:0 }}>{t.nome.substring(0,2).toUpperCase()}</div>)}<span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{t.nome}</span></>) : null
                    })() : (<span style={{ fontSize: 13, color: '#94a3b8' }}>Selecione um técnico...</span>)}
                    <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 12 }}>{showTecnicoDropdown ? '▲' : '▼'}</span>
                  </div>
                  {showTecnicoDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
                      {tecnicos.filter(t => t.ativo).map(t => (
                        <div key={t.id} onClick={() => { 
                          setForm(p => ({...p, tecnicoId: t.id, local: '', outroLocal: '', cidade: '', estado: 'SP'})); 
                          setShowTecnicoDropdown(false) 
                        }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: form.tecnicoId === t.id ? 'rgba(102,0,153,0.06)' : '#fff', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(102,0,153,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = form.tecnicoId === t.id ? 'rgba(102,0,153,0.06)' : '#fff')}
                        >
                          {t.fotoUrl ? (<img src={t.fotoUrl} alt={t.nome} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e9d5ff', flexShrink: 0 }} />) : (<div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#660099,#9333ea)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff', flexShrink:0 }}>{t.nome.substring(0,2).toUpperCase()}</div>)}
                          <div><div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{t.nome}</div></div>
                          {form.tecnicoId === t.id && <span style={{ marginLeft:'auto', color:'#660099', fontWeight:800 }}>✓</span>}
                        </div>
                      ))}
                      {tecnicos.filter(t => t.ativo).length === 0 && (<div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Nenhum técnico ativo encontrado.</div>)}
                    </div>
                  )}
                  <input type="hidden" required value={form.tecnicoId} onChange={() => {}} />
                </div>
              ) : (() => {
                // TST Role -> Show fixed card
                const t = tecnicos.find(x => x.id === form.tecnicoId) || { nome: session?.user?.name || 'Você', cargo: 'Técnico de Segurança', fotoUrl: null }
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(102,0,153,0.04)', border: '1px solid rgba(102,0,153,0.15)', borderRadius: 10 }}>
                    {t.fotoUrl ? (
                      <img src={t.fotoUrl} alt={t.nome} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e9d5ff', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#660099,#9333ea)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#fff', flexShrink:0 }}>{t.nome.substring(0,2).toUpperCase()}</div>
                    )}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{t.nome}</div>
                      <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>{t.cargo}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Atividade será registrada em seu nome</div>
                    </div>
                  </div>
                )
              })()}

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>CATEGORIA</label>
                <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {form.categoria === 'OUTROS' && (
                  <input type="text" placeholder="Qual categoria?" required value={form.outraCategoria} onChange={e => setForm({...form, outraCategoria: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', marginTop: 8 }} />
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>O QUE ESTÁ PLANEJADO? (Descrição)</label>
                <textarea required rows={3} value={form.descricaoOriginal} onChange={e => setForm({...form, descricaoOriginal: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'none' }} placeholder="Descreva o que foi planejado para este dia..."></textarea>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>LOCAL ESPECÍFICO (UNIDADE)</label>
                {(() => {
                  const filteredUnidades = form.tecnicoId 
                    ? unidades.filter(u => u.tecnicos?.some((t: any) => t.id === form.tecnicoId) || u.baseFixaTecnicos?.some((t: any) => t.id === form.tecnicoId) || u.id === tecnicos.find(t=>t.id===form.tecnicoId)?.baseFixaId)
                    : unidades;

                  // Se a filteredUnidades não cobrir perfeitamente as relations de tecnico vs unidade, usamos uma busca mais resiliente:
                  // Assumindo que tecnico tem unidades e baseFixa (isso não está no state tecnicos completo as vezes).
                  // Como tecnicos tem "unidades"? No state tecnicos, vem o que? 
                  // No getTecnicos() do backend ele manda include: { unidades: true, baseFixa: true }.
                  const t = tecnicos.find(x => x.id === form.tecnicoId)
                  let unidsDoTecnico = unidades
                  if (t) {
                    const idsUnidadesDoTecnico = [...(t.unidades?.map((u:any)=>u.id) || []), t.baseFixaId].filter(Boolean)
                    if (idsUnidadesDoTecnico.length > 0) {
                      unidsDoTecnico = unidades.filter(u => idsUnidadesDoTecnico.includes(u.id))
                    } else {
                      unidsDoTecnico = [] // Técnico não tem unidades atreladas
                    }
                  }

                  return (
                    <select 
                      value={unidsDoTecnico.find(u => u.nome === form.local) ? form.local : form.local === 'OUTROS' ? 'OUTROS' : ''} 
                      onChange={e => {
                        const val = e.target.value;
                        const un = unidsDoTecnico.find(u => u.nome === val);
                        setForm({...form, local: val, outroLocal: '', cidade: un?.cidade || '', estado: un?.estado || 'SP'});
                      }} 
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    >
                      <option value="">Selecione ou digite em Outros...</option>
                      {unidsDoTecnico.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
                      <option value="OUTROS">Outros...</option>
                    </select>
                  )
                })()}
                {(!unidades.find(u => u.nome === form.local) && form.local === 'OUTROS') && (
                  <input type="text" placeholder="Especifique o local..." required value={form.outroLocal} onChange={e => setForm({...form, outroLocal: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', marginTop: 8 }} />
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>CIDADE/ESTADO</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="Cidade" value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} style={{ flex: 2, padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                  <input type="text" placeholder="UF" value={form.estado} maxLength={2} onChange={e => setForm({...form, estado: e.target.value.toUpperCase()})} style={{ width: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 20px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ padding: '10px 20px', borderRadius: 8, background: '#660099', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}>Salvar Planejamento</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXECUÇÃO (CHECK-IN) */}
      {showExecModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 500, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: PR_COLORS[showExecModal.prioridade].text, background: PR_COLORS[showExecModal.prioridade].bg, padding: '4px 8px', borderRadius: 12, marginBottom: 8, display: 'inline-block' }}>
                  PRIORIDADE {showExecModal.prioridade}
                </span>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: '4px 0 0 0', color: '#1e293b' }}>{showExecModal.categoria}</h2>
              </div>
              <button onClick={() => setShowExecModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>

            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '0 0 4px 0' }}>PLANEJADO ORIGINALMENTE:</p>
              <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: 1.5 }}>{showExecModal.descricaoOriginal}</p>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#64748b' }}>
                {showExecModal.cidade && <span><MapPin size={12} style={{display:'inline', marginBottom:-2}} /> {showExecModal.cidade}/{showExecModal.estado}</span>}
                {showExecModal.tecnico && <span><User size={12} style={{display:'inline', marginBottom:-2}} /> {showExecModal.tecnico.nome}</span>}
              </div>
            </div>

            {showExecModal.status === 'CONCLUIDO' ? (
              <div style={{ background: '#ecfdf5', padding: 16, borderRadius: 8, border: '1px solid #10b981', textAlign: 'center' }}>
                <CheckCircle2 color="#10b981" size={32} style={{ marginBottom: 8 }} />
                <h3 style={{ margin: 0, color: '#047857', fontSize: 16, fontWeight: 800 }}>Atividade Concluída</h3>
                {showExecModal.alteradaOriginal && (
                  <p style={{ fontSize: 13, color: '#047857', marginTop: 8 }}>⚠️ Rota/Tarefa foi alterada do planejamento original.</p>
                )}
                {showExecModal.descricaoExecutada && (
                  <div style={{ marginTop: 12, background: '#fff', padding: 12, borderRadius: 8, textAlign: 'left', border: '1px solid #6ee7b7' }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#047857' }}>OBSERVAÇÃO DA EXECUÇÃO:</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#064e3b' }}>{showExecModal.descricaoExecutada}</p>
                  </div>
                )}
                
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed #6ee7b7', display: 'flex', justifyContent: 'center' }}>
                  <button type="button" onClick={() => handleReverter(showExecModal.id)} disabled={pending} style={{ padding: '10px 16px', background: '#ecfdf5', color: '#047857', border: '1px solid #10b981', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, width: '100%', opacity: pending ? 0.7 : 1, transition: 'all 0.2s' }}>
                    <RotateCcw size={16} /> Reverter para Pendente
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecutar}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    OBSERVAÇÃO DA CONCLUSÃO (OPCIONAL)
                  </label>
                  <textarea rows={3} value={execForm.descricaoExecutada} onChange={e => setExecForm({...execForm, descricaoExecutada: e.target.value})} placeholder="Adicione detalhes se algo ocorreu diferente do planejado..." style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'none' }}></textarea>
                </div>
                
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {!isTst && showExecModal.status === 'PENDENTE' && (
                    <button type="button" onClick={() => {
                      setShowExecModal(null)
                      const catBase = CATEGORIES.includes(showExecModal.categoria)
                      const locBase = unidades.find(u => u.nome === showExecModal.local)
                      setForm({
                        id: showExecModal.id,
                        tecnicoId: showExecModal.tecnicoId,
                        dataAtividade: formatStrDate(new Date(showExecModal.dataAtividade)),
                        categoria: catBase ? showExecModal.categoria : 'OUTROS',
                        outraCategoria: catBase ? '' : showExecModal.categoria,
                        descricaoOriginal: showExecModal.descricaoOriginal,
                        equipe: showExecModal.equipe || 'Não se aplica',
                        local: locBase ? showExecModal.local : (showExecModal.local ? 'OUTROS' : ''),
                        outroLocal: locBase ? '' : (showExecModal.local || ''),
                        cidade: showExecModal.cidade || '',
                        estado: showExecModal.estado || 'SP',
                        prioridade: showExecModal.prioridade
                      })
                      setShowAddModal(true)
                    }} style={{ flex: '1 1 180px', padding: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Edit2 size={16} /> Editar Planejamento
                    </button>
                  )}

                  <button type="submit" disabled={pending} style={{ flex: '1 1 180px', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pending ? 0.7 : 1 }}>
                    <Check size={18} /> Concluir Atividade
                  </button>
                </div>
              </form>
            )}

            {/* Apenas líderes ou admin podem deletar do banco livremente, ou o dono se ainda estiver pendente */}
            {!isModifying && (!isTst || showExecModal.status === 'PENDENTE') && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
                <button type="button" onClick={() => handleDeletePlan(showExecModal.id)} style={{ padding: '10px 16px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', transition: 'all 0.2s' }}>
                  <Trash2 size={16} /> Excluir Planejamento
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR DELETE */}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={32} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0' }}>Excluir Atividade</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Tem certeza que deseja excluir este planejamento? <strong style={{ color: '#ef4444' }}>Esta ação não poderá ser revertida.</strong>
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button type="button" onClick={executeDelete} disabled={pending} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}>Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR REVERTER */}
      {confirmRevertId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <RotateCcw size={32} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0' }}>Reverter Status</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              A atividade voltará para "Pendente" e qualquer observação de execução será removida. Deseja continuar?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setConfirmRevertId(null)} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button type="button" onClick={executeRevert} disabled={pending} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}>Sim, Reverter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlanCard({ plan, onClick, onDragStart }: { plan: any, onClick: () => void, onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void }) {
  const c = PR_COLORS[plan.prioridade]
  const isConcluido = plan.status === 'CONCLUIDO'
  return (
    <div 
      onClick={onClick} 
      draggable={!isConcluido}
      onDragStart={(e) => onDragStart(e, plan.id)}
      style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 8, padding: 8, cursor: isConcluido ? 'pointer' : 'grab', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'transform 0.1s', opacity: isConcluido ? 0.6 : 1 }} 
      onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'} 
      onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: c.border }}></div>
      {isConcluido && <CheckCircle2 size={16} color="#10b981" style={{ position: 'absolute', top: 6, right: 6 }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, paddingLeft: 6, paddingRight: isConcluido ? 16 : 0 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: c.text, display: 'flex', alignItems: 'center', gap: 4 }}>
          {plan.tecnico?.fotoUrl ? (
            <img src={plan.tecnico.fotoUrl} alt={plan.tecnico.nome} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} title={plan.tecnico.nome} />
          ) : (
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#660099', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }} title={plan.tecnico?.nome}>{plan.tecnico?.nome?.substring(0,2).toUpperCase() || 'TS'}</div>
          )}
          {plan.categoria}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.4, paddingLeft: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {plan.descricaoOriginal}
      </div>
      {plan.alteradaOriginal && (
        <div style={{ marginTop: 4, paddingLeft: 6, fontSize: 9, color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={10} /> ROTA ALTERADA
        </div>
      )}
    </div>
  )
}
