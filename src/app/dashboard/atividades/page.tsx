'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  CalendarDays, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Plus, Edit2, CheckCircle2, AlertTriangle, User, MapPin, Search, FileText, 
  X, Check, AlertCircle, Trash2, RotateCcw, Camera, UploadCloud, Loader2, Circle
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getTecnicos } from '@/app/actions/tecnicos'
import {
  getPlanejamentos, savePlanejamento, savePlanejamentoBatch, modificarExecucao, concluirPlanejamento, deletePlanejamento, moverPlanejamento, reverterPlanejamento, togglePlanejamentoChecklist, concluirETransferirPendencias
} from '@/app/actions/planejamento'
import { getUnidades } from '@/app/actions/unidades'
import { addAtividade, uploadFotoRelatorio } from '@/app/actions/relatorios'
import { saveDssAliado } from '@/app/actions/dssAliado'
import { optimizeTextWithAI } from '@/app/actions/ai'

// --- Cores de Prioridade ---
const PR_COLORS: any = {
  ALTA: { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' },
  MEDIA: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
  BAIXA: { bg: '#e0e7ff', border: '#6366f1', text: '#4338ca' }
}

const CATEGORIES = [
  'ADMINISTRATIVA',
  'AUDITORIA',
  'AVALIAÇÃO ERGONÔMICA',
  'CAMPANHA SST',
  'CIPA',
  'COMBATE A INCÊNDIO',
  'DSS',
  'EPI',
  'GESTÃO DE ACIDENTES',
  'INSPEÇÃO DE SEGURANÇA',
  'KIT ERGONÔMICO',
  'PGR',
  'REUNIÃO',
  'TREINAMENTO',
  'OUTROS'
]

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
  const [showUnidadeDropdown, setShowUnidadeDropdown] = useState(false)
  const [unidadeSearchTerm, setUnidadeSearchTerm] = useState('')

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null)

  // Form State
  const [form, setForm] = useState({
    id: '', tecnicoId: '', dataAtividade: '', categoria: 'INSPEÇÃO DE SEGURANÇA', outraCategoria: '',
    descricaoOriginal: '', equipe: 'Não se aplica', local: '', outroLocal: '', cidade: '', estado: 'SP',
    prioridade: 'MEDIA', checklist: [] as any[]
  })
  const [newItemHora, setNewItemHora] = useState('08:00')
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [newItemData, setNewItemData] = useState('')
  const [newItemTitulo, setNewItemTitulo] = useState('')
  const [newItemText, setNewItemText] = useState('')
  const [newItemCategoria, setNewItemCategoria] = useState(CATEGORIES[0])
  const [newItemOutraCategoria, setNewItemOutraCategoria] = useState('')
  const [newItemPrioridade, setNewItemPrioridade] = useState<'ALTA'|'MEDIA'|'BAIXA'>('MEDIA')
  const [newItemLocal, setNewItemLocal] = useState('')
  const [newItemOutroLocal, setNewItemOutroLocal] = useState('')
  const [newItemCidade, setNewItemCidade] = useState('')
  const [newItemEstado, setNewItemEstado] = useState('SP')
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  
  const [execForm, setExecForm] = useState({
    descricaoExecutada: '', observacoes: ''
  })
  
  // Estado para edição inline do checklist no modal de execução
  const [editingChecklistItem, setEditingChecklistItem] = useState<string | null>(null)
  const [editingChecklistText, setEditingChecklistText] = useState('')
  const [editingChecklistCategoria, setEditingChecklistCategoria] = useState('')
  const [editingChecklistOutraCategoria, setEditingChecklistOutraCategoria] = useState('')
  const [aiLoadingEditItem, setAiLoadingEditItem] = useState(false)


  // Novos modais
  const [showTransferPrompt, setShowTransferPrompt] = useState<any>(null)
  const [transferDate, setTransferDate] = useState('')

  // Relatório Integration
  const [showPromptRelatorio, setShowPromptRelatorio] = useState<{plan: any, itemId: string, itemText: string} | null>(null)
  const [showFormRelatorio, setShowFormRelatorio] = useState<{plan: any, itemId: string, itemText: string} | null>(null)
  const [formRelatorio, setFormRelatorio] = useState({ empresa: 'Telefônica Brasil S.A', projeto: 'VIVO', local: '', outroLocal: '', cidadeUf: '', descricao: '', fotoBase64: '', fileName: '', contentType: '' })
  const [aiLoadingRel, setAiLoadingRel] = useState(false)
  const [aiLoadingExec, setAiLoadingExec] = useState(false)
  const [aiLoadingNewItem, setAiLoadingNewItem] = useState(false)
  const [aiLoadingTituloNew, setAiLoadingTituloNew] = useState(false)
  const [aiLoadingDescNew, setAiLoadingDescNew] = useState(false)

  // DSS Aliado Modal
  const [showDssModal, setShowDssModal] = useState<{plan: any, itemId: string, itemText: string} | null>(null)
  const [showDssForm, setShowDssForm] = useState<{plan: any, itemId: string, itemText: string} | null>(null)
  const [formDssAliado, setFormDssAliado] = useState({ tema: '', fotoBase64: '', fileName: '', contentType: '' })
  const [dssLoading, setDssLoading] = useState(false)

  // Concluir Direto
  const [showConcluirModal, setShowConcluirModal] = useState<any | null>(null)
  const [concluirLoading, setConcluirLoading] = useState(false)

  useEffect(() => {
    getTecnicos().then(res => {
      if (res.success && res.data) setTecnicos(res.data)
    })
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
      prioridade: 'MEDIA', checklist: []
    })
    setNewItemHora('08:00')
    setNewItemTitulo('')
    setNewItemText('')
    setNewItemCategoria(CATEGORIES[0])
    setNewItemOutraCategoria('')
    setNewItemPrioridade('MEDIA')
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
    
    const plan = planejamentos.find(p => p.id === planId)
    if (!plan) return
    
    startTransition(async () => {
      const checklist = plan.checklist || []
      const pendingItems = checklist.filter((i: any) => !i.concluido)
      const completedItems = checklist.filter((i: any) => i.concluido)
      
      if (completedItems.length > 0 && pendingItems.length > 0) {
        // Mantém as concluídas na data original e move as pendentes para a nova data
        const res = await concluirETransferirPendencias(
          plan.id,
          new Date(`${dateStr}T12:00:00Z`),
          completedItems,
          pendingItems,
          plan.descricaoExecutada || '',
          pendingItems.map((c: any) => `- ${c.texto}`).join('\n'),
          plan.observacoes || ''
        )
        if (!res.success) {
          alert(res.error)
        }
        load() // Sempre recarrega para pegar o novo ID do card duplicado
      } else {
        // Otimisticamente move tudo se não houver itens parciais concluídos
        setPlanejamentos(prev => prev.map(p => p.id === planId ? { ...p, dataAtividade: new Date(`${dateStr}T12:00:00Z`) } : p))
        
        const res = await moverPlanejamento(planId, new Date(`${dateStr}T12:00:00Z`))
        if (!res.success) {
          alert(res.error)
          load() // reverte
        }
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
      const base = {
        tecnicoId: form.tecnicoId,
        dataAtividade: new Date(`${form.dataAtividade}T12:00:00Z`),
        equipe: form.equipe,
        local: form.local === 'OUTROS' && form.outroLocal ? form.outroLocal : form.local,
        cidade: form.cidade,
        estado: form.estado,
      }

      if (!form.checklist || form.checklist.length === 0) {
        alert('Por favor, adicione atividades na lista abaixo.');
        return;
      }
      if (!form.tecnicoId) { alert('Selecione um técnico.'); return; }
      if (!form.dataAtividade) { alert('Selecione uma data.'); return; }

      const items = form.checklist.map((c: any) => ({
        dataAtividade: c.dataAtividade ? new Date(c.dataAtividade) : undefined,
        hora: c.hora || '12:00',
        titulo: c.titulo || 'Atividade Planejada',
        categoria: c.categoria || 'OUTROS',
        descricaoOriginal: c.texto || '',
        prioridade: (c.prioridade || 'MEDIA') as any,
        local: c.local,
        cidade: c.cidade,
        estado: c.estado
      }))
      
      const res = await savePlanejamentoBatch(base, items)
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
      descricaoExecutada: plan.descricaoExecutada || (plan.checklist && plan.checklist.length > 0 ? '' : plan.descricaoOriginal),
      observacoes: plan.observacoes || ''
    })
  }

  function handleExecutar(e: React.FormEvent) {
    e.preventDefault()
    
    const checklist = showExecModal.checklist || []
    const pendingItems = checklist.filter((i: any) => !i.concluido)
    const completedItems = checklist.filter((i: any) => i.concluido)
    
    if (pendingItems.length > 0 && checklist.length > 0) {
      setShowTransferPrompt({ plan: showExecModal, completedItems, pendingItems })
      setTransferDate(formatStrDate(new Date(showExecModal.dataAtividade)))
      return
    }

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

  function handleConfirmTransfer(e: React.FormEvent) {
    e.preventDefault()
    if (!transferDate) return alert('Selecione a data para a nova atividade')
    startTransition(async () => {
      const { plan, completedItems, pendingItems } = showTransferPrompt
      const res = await concluirETransferirPendencias(
        plan.id, 
        new Date(`${transferDate}T12:00:00Z`), 
        completedItems, 
        pendingItems,
        execForm.descricaoExecutada,
        pendingItems.map((c: any) => `- ${c.texto}`).join('\n'),
        execForm.observacoes
      )
      if (res.success) {
        setShowTransferPrompt(null)
        setShowExecModal(null)
        load()
      } else {
        alert(res.error)
      }
    })
  }

  function toggleItemChecklist(planId: string, itemId: string) {
    const plan = planejamentos.find(p => p.id === planId)
    if (!plan || !plan.checklist) return;
    const item = plan.checklist.find((c: any) => c.id === itemId)
    if (!item) return;

    if (!item.concluido) {
      // O usuário está MARCANDO o item como concluído
      // Vamos interceptar e perguntar se ele quer lançar no relatório ou DSS
      if (item.categoria === 'DSS') {
        setShowDssModal({ plan, itemId, itemText: item.texto })
      } else {
        setShowPromptRelatorio({ plan, itemId, itemText: item.texto })
      }
      return; // Interrompe o fluxo normal aqui.
    }

    // Se estiver desmarcando, fluxo normal:
    const newChecklist = plan.checklist.map((c: any) => c.id === itemId ? { ...c, concluido: false } : c)
    const allChecked = newChecklist.length > 0 && newChecklist.every((i:any) => i.concluido)
    setPlanejamentos(prev => prev.map(p => p.id === planId ? { ...p, checklist: newChecklist, status: allChecked ? 'CONCLUIDO' : 'PENDENTE' } : p))
    setShowExecModal((prev: any) => prev && prev.id === planId ? { ...prev, checklist: newChecklist, status: allChecked ? 'CONCLUIDO' : 'PENDENTE' } : prev)
    
    startTransition(async () => {
      await togglePlanejamentoChecklist(planId, newChecklist)
    })
  }

  function deleteItemChecklist(planId: string, itemId: string) {
    if (!confirm('Deseja excluir este item do planejamento?')) return;
    const plan = planejamentos.find(p => p.id === planId)
    if (!plan || !plan.checklist) return;
    
    const newChecklist = plan.checklist.filter((c: any) => c.id !== itemId)
    const allChecked = newChecklist.length > 0 && newChecklist.every((i:any) => i.concluido)
    setPlanejamentos(prev => prev.map(p => p.id === planId ? { ...p, checklist: newChecklist, status: allChecked ? 'CONCLUIDO' : 'PENDENTE' } : p))
    setShowExecModal((prev: any) => prev && prev.id === planId ? { ...prev, checklist: newChecklist, status: allChecked ? 'CONCLUIDO' : 'PENDENTE' } : prev)
    
    startTransition(async () => {
      await togglePlanejamentoChecklist(planId, newChecklist)
    })
  }

  function editItemChecklist(planId: string, itemId: string, newText: string, newCategoria: string) {
    if (!newText.trim()) return;
    const plan = planejamentos.find(p => p.id === planId)
    if (!plan || !plan.checklist) return;
    
    const newChecklist = plan.checklist.map((c: any) => c.id === itemId ? { ...c, texto: newText, categoria: newCategoria } : c)
    const allChecked = newChecklist.length > 0 && newChecklist.every((i:any) => i.concluido)
    setPlanejamentos(prev => prev.map(p => p.id === planId ? { ...p, checklist: newChecklist, status: allChecked ? 'CONCLUIDO' : 'PENDENTE' } : p))
    setShowExecModal((prev: any) => prev && prev.id === planId ? { ...prev, checklist: newChecklist, status: allChecked ? 'CONCLUIDO' : 'PENDENTE' } : prev)
    
    startTransition(async () => {
      await togglePlanejamentoChecklist(planId, newChecklist)
    })
  }

  // Função chamada se o usuário disser "NÃO" no prompt ou após salvar o relatório:
  function confirmToggleItemChecklist(planId: string, itemId: string, markAsDone: boolean) {
    const plan = planejamentos.find(p => p.id === planId)
    if (!plan || !plan.checklist) return;
    
    const newChecklist = plan.checklist.map((c: any) => c.id === itemId ? { ...c, concluido: markAsDone } : c)
    const allChecked = newChecklist.length > 0 && newChecklist.every((i:any) => i.concluido)
    setPlanejamentos(prev => prev.map(p => p.id === planId ? { ...p, checklist: newChecklist, status: allChecked ? 'CONCLUIDO' : 'PENDENTE' } : p))
    setShowExecModal((prev: any) => prev && prev.id === planId ? { ...prev, checklist: newChecklist, status: allChecked ? 'CONCLUIDO' : 'PENDENTE' } : prev)
    
    startTransition(async () => {
      await togglePlanejamentoChecklist(planId, newChecklist)
      load() // Refresh to sync
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

  function handleFileChange(e: any, setFormState: any) {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('A foto deve ter no máximo 10MB.')
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        setFormState((p:any) => ({...p, fotoBase64: ev.target?.result as string, fileName: file.name, contentType: file.type}))
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleOptimizeTextRelatorio() {
    if (!formRelatorio.descricao || formRelatorio.descricao.trim().length === 0) return
    setAiLoadingRel(true)
    const res = await optimizeTextWithAI(formRelatorio.descricao)
    setAiLoadingRel(false)
    if (res.success && res.text) {
      setFormRelatorio(p => ({...p, descricao: res.text}))
    } else {
      alert(res.error || 'Erro ao otimizar o texto.')
    }
  }

  async function handleOptimizeTextExec() {
    if (!execForm.descricaoExecutada || execForm.descricaoExecutada.trim().length === 0) return
    setAiLoadingExec(true)
    const res = await optimizeTextWithAI(execForm.descricaoExecutada)
    setAiLoadingExec(false)
    if (res.success && res.text) {
      setExecForm(p => ({...p, descricaoExecutada: res.text}))
    } else {
      alert(res.error || 'Erro ao otimizar o texto.')
    }
  }

  async function handleOptimizeTituloNew() {
    if (!newItemTitulo || newItemTitulo.trim().length === 0) return
    setAiLoadingTituloNew(true)
    const res = await optimizeTextWithAI(newItemTitulo)
    setAiLoadingTituloNew(false)
    if (res.success && res.text) {
      setNewItemTitulo(res.text)
    } else {
      alert(res.error || 'Erro ao otimizar o texto.')
    }
  }

  async function handleOptimizeDescNew() {
    if (!newItemText || newItemText.trim().length === 0) return
    setAiLoadingDescNew(true)
    const res = await optimizeTextWithAI(newItemText)
    setAiLoadingDescNew(false)
    if (res.success && res.text) {
      setNewItemText(res.text)
    } else {
      alert(res.error || 'Erro ao otimizar o texto.')
    }
  }

  async function handleOptimizeTextEditItem() {
    if (!editingChecklistText || editingChecklistText.trim().length === 0) return
    setAiLoadingEditItem(true)
    const res = await optimizeTextWithAI(editingChecklistText)
    setAiLoadingEditItem(false)
    if (res.success && res.text) {
      setEditingChecklistText(res.text)
    } else {
      alert(res.error || 'Erro ao otimizar o texto.')
    }
  }

  function handleConcluirDireto(e: React.MouseEvent, plan: any) {
    e.stopPropagation()
    const checklist = plan.checklist || []
    const pendingItems = checklist.filter((i: any) => !i.concluido)

    if (pendingItems.length === 1) {
      const item = pendingItems[0]
      if (item.categoria === 'DSS') {
        setShowDssModal({ plan, itemId: item.id, itemText: item.texto })
      } else {
        setShowPromptRelatorio({ plan, itemId: item.id, itemText: item.texto })
      }
    } else if (pendingItems.length > 1) {
      alert('Esta atividade possui múltiplos itens. Por favor, abra o card para concluí-los individualmente.')
      handleActionExecute(plan)
    } else {
      setShowConcluirModal(plan)
    }
  }

  async function confirmConcluirDireto() {
    if (!showConcluirModal) return
    setConcluirLoading(true)
    const plan = showConcluirModal
    
    let newChecklist = plan.checklist || []
    if (newChecklist.length > 0) {
      newChecklist = newChecklist.map((c:any) => ({...c, concluido: true}))
    }
    
    const resSave = await savePlanejamento({
      id: plan.id, tecnicoId: plan.tecnicoId, dataAtividade: plan.dataAtividade,
      categoria: plan.categoria, descricaoOriginal: plan.descricaoOriginal, checklist: newChecklist
    })
    
    if (resSave.success) {
      await modificarExecucao(plan.id, plan.descricaoExecutada || plan.descricaoOriginal, plan.observacoes)
      startTransition(() => {
        setPlanejamentos(prev => prev.map(p => p.id === plan.id ? { ...p, checklist: newChecklist, status: 'CONCLUIDO' } : p))
      })
      setShowConcluirModal(null)
    } else {
      alert(resSave.error)
    }
    setConcluirLoading(false)
  }

  async function handleAddRelatorio(e: React.FormEvent) {
    e.preventDefault()
    if (!showFormRelatorio) return

    let finalFotoUrl = ''
    if (formRelatorio.fotoBase64 && formRelatorio.fileName && formRelatorio.contentType) {
      const formData = new FormData();
      formData.append('fileData', formRelatorio.fotoBase64);
      formData.append('fileName', formRelatorio.fileName);
      formData.append('contentType', formRelatorio.contentType);
      const uploadRes = await uploadFotoRelatorio(formData)
      if (uploadRes.success && uploadRes.url) {
        finalFotoUrl = uploadRes.url
      } else {
        alert('Erro ao fazer upload da foto: ' + uploadRes.error)
        return
      }
    }

    startTransition(async () => {
      // Usar a data do planejamento
      const planDate = new Date(showFormRelatorio.plan.dataAtividade)
      
      const res = await addAtividade({
        tecnicoId: showFormRelatorio.plan.tecnicoId,
        data: planDate,
        empresa: formRelatorio.empresa,
        projeto: formRelatorio.projeto,
        local: formRelatorio.local === 'OUTROS' ? formRelatorio.outroLocal : formRelatorio.local,
        cidadeUf: formRelatorio.cidadeUf,
        descricao: formRelatorio.descricao,
        fotoUrl: finalFotoUrl
      })
      
      if (res.success) {
        confirmToggleItemChecklist(showFormRelatorio.plan.id, showFormRelatorio.itemId, true)
        setShowFormRelatorio(null)
      } else {
        alert('Erro ao salvar relatório: ' + res.error)
      }
    })
  }

  async function handleSaveDssAliado(e: React.FormEvent) {
    e.preventDefault()
    if (!showDssForm) return
    if (!formDssAliado.tema.trim()) {
      alert('Informe o tema do DSS.')
      return
    }
    setDssLoading(true)
    const planDate = new Date(showDssForm.plan.dataAtividade)
    const res = await saveDssAliado({
      tecnicoId: showDssForm.plan.tecnicoId,
      data: planDate,
      tema: formDssAliado.tema,
      fotoBase64: formDssAliado.fotoBase64 || undefined,
      fileName: formDssAliado.fileName || undefined,
      contentType: formDssAliado.contentType || undefined,
      planejamentoItemRef: showDssForm.itemText
    })
    setDssLoading(false)
    if (res.success) {
      // Marca o item como concluído no checklist
      confirmToggleItemChecklist(showDssForm.plan.id, showDssForm.itemId, true)
      setShowDssForm(null)
      setFormDssAliado({ tema: '', fotoBase64: '', fileName: '', contentType: '' })
    } else {
      alert('Erro ao salvar DSS com Aliado: ' + res.error)
    }
  }

  // --- RenderHelpers ---
  function renderWeek() {
    const start = getStartOfWeek(currentDate)
    const days = []
    for(let i=0; i<5; i++) { // Seg a Sexta
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      days.push(d)
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, overflowX: 'auto' }}>
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
                {dayPlans.map(p => <PlanCard key={p.id} plan={p} onClick={() => handleActionExecute(p)} onDragStart={handleDragStart} onConcluir={handleConcluirDireto} />)}
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
    const gridDays = Array.from({ length: 42 }).map((_, i) => i)

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map(wd => (
          <div key={wd} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#64748b', paddingBottom: 8 }}>{wd}</div>
        ))}
        {gridDays.filter(i => i % 7 < 5).map((i) => {
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
                      title={p.descricaoOriginal}
                      style={{ fontSize: 9, padding: '3px 4px', borderRadius: 4, background: PR_COLORS[p.prioridade].bg, borderLeft: `3px solid ${PR_COLORS[p.prioridade].border}`, color: PR_COLORS[p.prioridade].text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: isConcluido ? 'pointer' : 'grab', display: 'flex', alignItems: 'center', gap: 4, opacity: isConcluido ? 0.6 : 1, position: 'relative', paddingRight: 16 }}
                    >
                      {p.tecnico?.fotoUrl ? (
                        <img src={p.tecnico.fotoUrl} alt={p.tecnico.nome} style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} title={p.tecnico.nome} />
                      ) : (
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#660099', color: '#fff', fontSize: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }} title={p.tecnico?.nome}>{p.tecnico?.nome?.substring(0,1).toUpperCase() || 'T'}</div>
                      )}
                      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.titulo || p.categoria}
                      </div>
                      {isConcluido ? (
                        <CheckCircle2 size={10} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: 4, color: '#10b981' }} />
                      ) : (
                        <button 
                          onClick={(e) => handleConcluirDireto(e, p)} 
                          style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', opacity: 0.5 }}
                          title="Concluir"
                        >
                          <Circle size={10} />
                        </button>
                      )}
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
                {tecnicos.filter(t => t.ativo).map(t => (
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
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>LISTA DE ATIVIDADES</span>
                  <span style={{ color: '#660099' }}>{form.checklist?.length || 0} {form.checklist?.length === 1 ? 'atividade' : 'atividades'}</span>
                </label>
                {form.checklist?.length > 0 && (
                  <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 8px 0', lineHeight: 1.4 }}>Cada item será criado como uma atividade individual no calendário.</p>
                )}
                
                <div style={{ marginBottom: 20 }}>
                  <button type="button" onClick={() => { setNewItemData(form.dataAtividade); setShowAddItemModal(true); }} style={{ background: '#f3e8ff', color: '#7e22ce', border: '1px dashed #7e22ce', borderRadius: 8, padding: '16px', fontWeight: 800, cursor: 'pointer', fontSize: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    + Incluir Atividade
                  </button>
                </div>
                
                {form.checklist && form.checklist.length > 0 ? (
                  <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {form.checklist.map((item: any, i: number) => {
                      const pr = {ALTA: ['#ef4444','#fee2e2'], MEDIA: ['#f59e0b','#fef3c7'], BAIXA: ['#6366f1','#e0e7ff']}[item.prioridade as string] || ['#94a3b8','#f1f5f9'];
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', width: 20 }}>{i + 1}.</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: pr[0], background: pr[1], padding: '2px 6px', borderRadius: 4 }}>{item.prioridade || 'MEDIA'}</span>
                                {item.dataAtividade && <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{formatStrDate(item.dataAtividade).substring(0,5)} {item.hora}</span>}
                                {item.local && (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#660099', background: 'rgba(102,0,153,0.06)', padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <MapPin size={10} />
                                    {item.local === 'OUTROS' ? item.outroLocal || 'Outros' : item.local} {item.cidade && `- ${item.cidade}`}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{item.titulo}</span>
                                <span style={{ fontSize: 11, color: '#64748b', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.texto}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', background: '#f8fafc', padding: '4px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>{item.categoria}</span>
                            
                            <button type="button" onClick={() => {
                              setNewItemData(item.dataAtividade ? formatStrDate(item.dataAtividade) : '')
                              setNewItemHora(item.hora || '08:00')
                              setNewItemTitulo(item.titulo || '')
                              setNewItemText(item.texto || '')
                              setNewItemCategoria(item.categoria || CATEGORIES[0])
                              setNewItemPrioridade(item.prioridade || 'MEDIA')
                              setNewItemLocal(item.local || '')
                              setNewItemCidade(item.cidade || '')
                              setNewItemEstado(item.estado || 'SP')
                              setEditingDraftId(item.id)
                              setShowAddItemModal(true)
                            }} style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', color: '#4f46e5', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#e0e7ff'}
                            onMouseOut={e => e.currentTarget.style.background = '#e0e7ff'}
                            title="Editar item">
                              <Edit2 size={14} />
                            </button>

                            <button type="button" onClick={() => {
                              setForm(prev => ({ ...prev, checklist: prev.checklist.filter((c: any) => c.id !== item.id) }))
                            }} style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#ef4444', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
                            onMouseOut={e => e.currentTarget.style.background = '#fee2e2'}
                            title="Remover item">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: 12 }}>
                    Nenhuma atividade na lista. Adicione atividades acima para planejar o dia.
                  </div>
                )}
              </div>

              {/* Os campos de local e cidade foram movidos para o modal de inclusão de item */}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 20px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ padding: '10px 20px', borderRadius: 8, background: '#660099', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}>Salvar Planejamento</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INCLUIR ATIVIDADE */}
      {showAddItemModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 550, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#7e22ce', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>{editingDraftId ? 'Editar Atividade' : 'Incluir Atividade'}</h2>
              <button onClick={() => { setShowAddItemModal(false); setEditingDraftId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>LOCAL ESPECÍFICO (UNIDADE)</label>
                {(() => {
                  let t = tecnicos.find(x => x.id === form.tecnicoId)
                  if (!t && isTst) t = tecnicos.find(x => x.id === userTecnicoId)
                  let unidsDoTecnico = unidades
                  if (role === 'MASTER' || role === 'ADMIN') {
                    unidsDoTecnico = unidades
                  } else if (t) {
                    const idsUnidadesDoTecnico = [...(t.unidades?.map((u:any)=>u.id) || []), t.baseFixaId].filter(Boolean)
                    if (idsUnidadesDoTecnico.length > 0) {
                      unidsDoTecnico = unidades.filter(u => idsUnidadesDoTecnico.includes(u.id))
                    } else {
                      unidsDoTecnico = []
                    }
                  } else if (isTst) {
                    unidsDoTecnico = []
                  }

                  return (
                    <div style={{ position: 'relative' }}>
                      <div
                        onClick={() => setShowUnidadeDropdown(v => !v)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${showUnidadeDropdown ? '#660099' : '#cbd5e1'}`, cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}
                      >
                        <span style={{ fontSize: 14, color: newItemLocal ? '#1e293b' : '#94a3b8', fontWeight: newItemLocal ? 700 : 400 }}>
                          {newItemLocal ? (unidsDoTecnico.find(u => u.nome === newItemLocal) ? newItemLocal : newItemLocal === 'OUTROS' ? 'Outros...' : newItemLocal) : 'Selecione ou busque a unidade...'}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>{showUnidadeDropdown ? '▲' : '▼'}</span>
                      </div>

                      {showUnidadeDropdown && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <div style={{ padding: 8, borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10 }} />
                              <input 
                                autoFocus 
                                type="text" 
                                placeholder="Buscar unidade..." 
                                value={unidadeSearchTerm}
                                onChange={e => setUnidadeSearchTerm(e.target.value)}
                                onKeyDown={e => { if(e.key === 'Enter') e.preventDefault() }}
                                style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                              />
                            </div>
                          </div>
                          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                            {Array.from(new Map(unidsDoTecnico.map(u => [u.id, u])).values())
                              .filter(u => u.nome.toLowerCase().includes(unidadeSearchTerm.toLowerCase()) || (u.cidade || '').toLowerCase().includes(unidadeSearchTerm.toLowerCase()))
                              .map(u => (
                              <div key={u.id} onClick={() => { 
                                setNewItemLocal(u.nome)
                                setNewItemOutroLocal('')
                                setNewItemCidade(u.cidade || '')
                                setNewItemEstado(u.estado || 'SP')
                                setShowUnidadeDropdown(false);
                                setUnidadeSearchTerm('');
                              }}
                                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: newItemLocal === u.nome ? 'rgba(102,0,153,0.06)' : '#fff', display: 'flex', flexDirection: 'column', gap: 4 }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(102,0,153,0.08)')}
                                onMouseLeave={e => (e.currentTarget.style.background = newItemLocal === u.nome ? 'rgba(102,0,153,0.06)' : '#fff')}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: 13, color: '#334155', fontWeight: 700 }}>{u.nome}</span>
                                  {newItemLocal === u.nome && <Check size={14} color="#660099" />}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                  {u.endereco ? u.endereco + ' - ' : ''}{u.cidade}/{u.estado}
                                </div>
                              </div>
                            ))}
                            {unidsDoTecnico.filter(u => u.nome.toLowerCase().includes(unidadeSearchTerm.toLowerCase())).length === 0 && (
                              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Nenhuma unidade encontrada.</div>
                            )}
                            <div onClick={() => { 
                                setNewItemLocal('OUTROS')
                                setNewItemOutroLocal('')
                                setNewItemCidade('')
                                setNewItemEstado('SP')
                                setShowUnidadeDropdown(false);
                                setUnidadeSearchTerm('');
                              }}
                              style={{ padding: '10px 14px', cursor: 'pointer', background: newItemLocal === 'OUTROS' ? 'rgba(102,0,153,0.06)' : '#fff', fontSize: 13, color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(102,0,153,0.08)')}
                              onMouseLeave={e => (e.currentTarget.style.background = newItemLocal === 'OUTROS' ? 'rgba(102,0,153,0.06)' : '#fff')}
                            >
                              <span>Outros...</span>
                              {newItemLocal === 'OUTROS' && <Check size={14} color="#660099" />}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
                {(!unidades.find(u => u.nome === newItemLocal) && newItemLocal === 'OUTROS') && (
                  <input type="text" placeholder="Especifique o local..." required value={newItemOutroLocal} onChange={e => setNewItemOutroLocal(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginTop: 8 }} />
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>CIDADE/ESTADO</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="Cidade" value={newItemCidade} onChange={e => setNewItemCidade(e.target.value)} style={{ flex: 2, padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  <input type="text" placeholder="UF" value={newItemEstado} maxLength={2} onChange={e => setNewItemEstado(e.target.value.toUpperCase())} style={{ width: 80, padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>DIA</label>
                  <input type="date" value={newItemData} onChange={e => setNewItemData(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>HORA</label>
                  <input type="time" value={newItemHora} onChange={e => setNewItemHora(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block' }}>TÍTULO DA ATIVIDADE</label>
                  <button 
                    type="button" 
                    onClick={handleOptimizeTituloNew}
                    disabled={aiLoadingTituloNew}
                    style={{ 
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', 
                      borderRadius: 6, border: 'none', background: '#f3e8ff', color: '#7e22ce',
                      cursor: aiLoadingTituloNew ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 
                    }}
                  >
                    {aiLoadingTituloNew ? <Loader2 size={12} className="animate-spin" /> : <span>✨ Corrigir com IA</span>}
                  </button>
                </div>
                <input type="text" placeholder="Ex: Inspeção de Extintores" value={newItemTitulo} onChange={e => setNewItemTitulo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>CATEGORIA</label>
                  <select value={newItemCategoria} onChange={e => setNewItemCategoria(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>PRIORIDADE</label>
                  <div style={{ display: 'flex', gap: 4, height: 40 }}>
                    {([['ALTA','#ef4444','#fee2e2'],['MEDIA','#f59e0b','#fef3c7'],['BAIXA','#6366f1','#e0e7ff']] as const).map(([val, color, bg]) => (
                      <button key={val} type="button" onClick={() => setNewItemPrioridade(val as any)}
                        style={{ flex: 1, padding: '0', borderRadius: 8, border: `2px solid ${newItemPrioridade === val ? color : '#e2e8f0'}`, background: newItemPrioridade === val ? bg : '#fff', color: newItemPrioridade === val ? color : '#94a3b8', fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {newItemCategoria === 'OUTROS' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>QUAL CATEGORIA?</label>
                  <input type="text" placeholder="Digite a categoria" value={newItemOutraCategoria} onChange={e => setNewItemOutraCategoria(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block' }}>DESCRIÇÃO (Opcional)</label>
                  <button 
                    type="button" 
                    onClick={handleOptimizeDescNew}
                    disabled={aiLoadingDescNew}
                    style={{ 
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', 
                      borderRadius: 6, border: 'none', background: '#f3e8ff', color: '#7e22ce',
                      cursor: aiLoadingDescNew ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 
                    }}
                  >
                    {aiLoadingDescNew ? <Loader2 size={12} className="animate-spin" /> : <span>✨ Corrigir com IA</span>}
                  </button>
                </div>
                <textarea 
                  value={newItemText} 
                  onChange={e => setNewItemText(e.target.value)} 
                  placeholder="Detalhes adicionais da atividade..." 
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', minHeight: 60, resize: 'vertical', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowAddItemModal(false); setEditingDraftId(null); }} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  Cancelar
                </button>
                <button type="button" onClick={() => {
                  if (newItemText.trim() || newItemTitulo.trim()) {
                    const finalCat = newItemCategoria === 'OUTROS' && newItemOutraCategoria ? newItemOutraCategoria : newItemCategoria;
                    const parsedDate = newItemData ? new Date(`${newItemData}T12:00:00Z`) : undefined;
                    const finalLocal = newItemLocal === 'OUTROS' && newItemOutroLocal ? newItemOutroLocal : newItemLocal;
                    
                    if (editingDraftId) {
                      setForm(prev => ({
                        ...prev,
                        checklist: prev.checklist.map((c: any) => c.id === editingDraftId ? {
                          ...c,
                          dataAtividade: parsedDate, 
                          hora: newItemHora, 
                          titulo: newItemTitulo.trim(), 
                          texto: newItemText.trim(), 
                          categoria: finalCat, 
                          prioridade: newItemPrioridade, 
                          local: finalLocal,
                          cidade: newItemCidade,
                          estado: newItemEstado
                        } : c)
                      }));
                      setEditingDraftId(null);
                    } else {
                      setForm(prev => ({ ...prev, checklist: [...(prev.checklist || []), { 
                        id: Math.random().toString(36).substr(2, 9), 
                        dataAtividade: parsedDate, 
                        hora: newItemHora, 
                        titulo: newItemTitulo.trim(), 
                        texto: newItemText.trim(), 
                        categoria: finalCat, 
                        prioridade: newItemPrioridade, 
                        local: finalLocal,
                        cidade: newItemCidade,
                        estado: newItemEstado,
                        concluido: false 
                      }] }));
                    }
                    
                    setNewItemText('');
                    setNewItemTitulo('');
                    setNewItemOutraCategoria('');
                    setNewItemLocal('');
                    setNewItemOutroLocal('');
                    setNewItemCidade('');
                    setNewItemEstado('SP');
                    setShowAddItemModal(false);
                  } else {
                    alert("Preencha o título ou a descrição.");
                  }
                }} style={{ background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>
                  {editingDraftId ? 'Salvar Edição' : 'Adicionar na Lista'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXECUÇÃO (CHECK-IN) */}
      {showExecModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ background: '#660099', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Detalhes da Atividade
              </h2>
              <button onClick={() => setShowExecModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px 0', color: '#1e293b' }}>
                    {showExecModal.titulo || showExecModal.categoria}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: PR_COLORS[showExecModal.prioridade]?.text || '#475569', background: PR_COLORS[showExecModal.prioridade]?.bg || '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>
                      PRIORIDADE {showExecModal.prioridade}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> {showExecModal.dataAtividade ? formatStrDate(showExecModal.dataAtividade) : ''}
                    </span>
                    {showExecModal.hora && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {showExecModal.hora}
                      </span>
                    )}
                    {showExecModal.local && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> {showExecModal.local === 'OUTROS' ? showExecModal.outroLocal : showExecModal.local} {showExecModal.cidade ? `- ${showExecModal.cidade}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#64748b', margin: '0 0 6px 0', textTransform: 'uppercase' }}>O que estava planejado?</p>
                {!showExecModal.checklist || showExecModal.checklist.length === 0 ? (
                  <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: 1.5 }}>{showExecModal.descricaoOriginal}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    {showExecModal.checklist.map((item: any) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', transition: 'all 0.2s' }}>
                        <input 
                          type="checkbox" 
                          checked={item.concluido} 
                          onChange={() => toggleItemChecklist(showExecModal.id, item.id)}
                          style={{ marginTop: 2, cursor: 'pointer', accentColor: '#10b981', width: 16, height: 16, flexShrink: 0 }}
                        />
                        {editingChecklistItem === item.id ? (
                           <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                             <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                               <select value={CATEGORIES.includes(editingChecklistCategoria) ? editingChecklistCategoria : 'OUTROS'} onChange={e => {
                                 const val = e.target.value;
                                 setEditingChecklistCategoria(val);
                                 if (val !== 'OUTROS') setEditingChecklistOutraCategoria('');
                               }} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none', height: 32 }}>
                                 {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                               {(!CATEGORIES.includes(editingChecklistCategoria) || editingChecklistCategoria === 'OUTROS') && (
                                 <input type="text" placeholder="Qual categoria?" value={editingChecklistOutraCategoria} onChange={e => setEditingChecklistOutraCategoria(e.target.value)} style={{ width: 130, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, height: 32, boxSizing: 'border-box', outline: 'none' }} />
                               )}
                             </div>
                             
                             <input type="text" value={editingChecklistText} onChange={e => setEditingChecklistText(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { const finalEditCat = editingChecklistCategoria === 'OUTROS' && editingChecklistOutraCategoria ? editingChecklistOutraCategoria : editingChecklistCategoria; editItemChecklist(showExecModal.id, item.id, editingChecklistText, finalEditCat); setEditingChecklistItem(null); } }} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', minWidth: 200, height: 32, boxSizing: 'border-box', outline: 'none' }} autoFocus />
                             
                             <div style={{ display: 'flex', gap: 6 }}>
                               <button type="button" onClick={handleOptimizeTextEditItem} disabled={aiLoadingEditItem} style={{ background: '#f3e8ff', color: '#7e22ce', border: 'none', borderRadius: 6, padding: '0 10px', height: 32, cursor: aiLoadingEditItem ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11 }}>
                                 {aiLoadingEditItem ? <Loader2 size={12} className="animate-spin" /> : <span>✨ IA</span>}
                               </button>
                               <button type="button" onClick={() => { const finalEditCat = editingChecklistCategoria === 'OUTROS' && editingChecklistOutraCategoria ? editingChecklistOutraCategoria : editingChecklistCategoria; editItemChecklist(showExecModal.id, item.id, editingChecklistText, finalEditCat); setEditingChecklistItem(null); }} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '0 10px', height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Check size={14}/></button>
                               <button type="button" onClick={() => setEditingChecklistItem(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '0 10px', height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={14}/></button>
                             </div>
                           </div>
                        ) : (
                           <>
                             <span style={{ fontSize: 13, color: item.concluido ? '#94a3b8' : '#334155', textDecoration: item.concluido ? 'line-through' : 'none', lineHeight: 1.4, cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }} onClick={() => toggleItemChecklist(showExecModal.id, item.id)}>
                               <span style={{ paddingTop: 2 }}>{item.texto}</span>
                             </span>
                             {(!isTst || showExecModal.status === 'PENDENTE') && (
                               <div style={{ display: 'flex', gap: 6, paddingLeft: 10 }}>
                                 <button type="button" title="Editar item" onClick={() => { setEditingChecklistItem(item.id); setEditingChecklistText(item.texto); setEditingChecklistCategoria(CATEGORIES.includes(item.categoria) ? item.categoria : 'OUTROS'); setEditingChecklistOutraCategoria(CATEGORIES.includes(item.categoria) ? '' : item.categoria); }} style={{ background: '#f0f9ff', border: 'none', color: '#0ea5e9', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background='#e0f2fe'} onMouseOut={e => e.currentTarget.style.background='#f0f9ff'}><Edit2 size={14} /></button>
                                 <button type="button" title="Excluir item" onClick={() => deleteItemChecklist(showExecModal.id, item.id)} style={{ background: '#fef2f2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background='#fee2e2'} onMouseOut={e => e.currentTarget.style.background='#fef2f2'}><Trash2 size={14} /></button>
                               </div>
                             )}
                             {item.concluido && (
                               <div style={{ display: 'flex', gap: 6, paddingLeft: 10 }}>
                                 {item.categoria === 'DSS' ? (
                                   <button 
                                     type="button" 
                                     onClick={(e) => { e.stopPropagation(); setShowDssModal({plan: showExecModal, itemId: item.id, itemText: item.texto}); }}
                                     style={{ background: '#fdf4ff', border: '1px solid #f0abfc', color: '#c026d3', cursor: 'pointer', padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                                   >
                                     <FileText size={12} /> Gerar DSS
                                   </button>
                                 ) : (
                                   <button 
                                     type="button" 
                                     onClick={(e) => { e.stopPropagation(); setShowPromptRelatorio({plan: showExecModal, itemId: item.id, itemText: item.texto}); }}
                                     style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', cursor: 'pointer', padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                                   >
                                     <FileText size={12} /> Relatório
                                   </button>
                                 )}
                               </div>
                             )}
                           </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 14, borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                  {showExecModal.tecnico && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {showExecModal.tecnico.fotoUrl ? (
                        <img src={showExecModal.tecnico.fotoUrl} alt={showExecModal.tecnico.nome} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>{showExecModal.tecnico.nome.substring(0, 2).toUpperCase()}</div>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{showExecModal.tecnico.nome}</span>
                    </div>
                  )}
                </div>
              </div>

              {showExecModal.status === 'CONCLUIDO' ? (
                <div style={{ background: '#ecfdf5', padding: 12, borderRadius: 8, border: '1px solid #10b981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showExecModal.descricaoExecutada || showExecModal.alteradaOriginal ? 10 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 color="#10b981" size={20} />
                      <h3 style={{ margin: 0, color: '#047857', fontSize: 14, fontWeight: 800 }}>Atividade Concluída</h3>
                    </div>
                    <button type="button" onClick={() => handleReverter(showExecModal.id)} disabled={pending} style={{ padding: '6px 10px', background: '#fff', color: '#047857', border: '1px solid #10b981', borderRadius: 6, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, opacity: pending ? 0.7 : 1, transition: 'all 0.2s' }}>
                      <RotateCcw size={12} /> Reverter
                    </button>
                  </div>
                  
                  {showExecModal.alteradaOriginal && (
                    <div style={{ fontSize: 12, color: '#b45309', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                      <AlertTriangle size={14} /> Rota/Tarefa alterada do original.
                    </div>
                  )}
                  {showExecModal.descricaoExecutada && (
                    <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #6ee7b7', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#047857' }}>OBSERVAÇÃO DA EXECUÇÃO:</span>
                      <span style={{ fontSize: 13, color: '#064e3b' }}>{showExecModal.descricaoExecutada}</span>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleExecutar}>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block' }}>
                        OBSERVAÇÃO DA CONCLUSÃO (OPCIONAL)
                      </label>
                      <button 
                        type="button" 
                        onClick={handleOptimizeTextExec}
                        disabled={aiLoadingExec}
                        style={{ 
                          fontSize: 11, fontWeight: 700, padding: '4px 10px', 
                          borderRadius: 6, border: 'none', background: '#f3e8ff', color: '#7e22ce',
                          cursor: aiLoadingExec ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 
                        }}
                      >
                        {aiLoadingExec ? <Loader2 size={12} className="animate-spin" /> : <span>✨ Corrigir com IA</span>}
                      </button>
                    </div>
                    <textarea rows={3} value={execForm.descricaoExecutada} onChange={e => setExecForm({...execForm, descricaoExecutada: e.target.value})} placeholder="Adicione detalhes se algo ocorreu diferente do planejado..." style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'none' }}></textarea>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {(!isTst || showExecModal.status === 'PENDENTE') && showExecModal.status === 'PENDENTE' && (
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
                          prioridade: showExecModal.prioridade,
                          checklist: showExecModal.checklist || []
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
    {/* MODAL MIGRAR PENDÊNCIAS */}
    {showTransferPrompt && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <RotateCcw size={32} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', textAlign: 'center' }}>Migrar Tarefas Pendentes</h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.5, textAlign: 'center' }}>
            Você ainda possui <strong style={{color: '#ef4444'}}>{showTransferPrompt.pendingItems.length} tarefa(s) pendente(s)</strong> neste planejamento. Deseja transferi-las para uma nova data?
          </p>
          
          <form onSubmit={handleConfirmTransfer}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>NOVA DATA PARA PENDÊNCIAS</label>
              <input type="date" required value={transferDate} onChange={e => setTransferDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => {
                setShowTransferPrompt(null)
              }} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" disabled={pending} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#4338ca', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}>Transferir e Concluir</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* MODAL PROMPT RELATÓRIO */}
    {showPromptRelatorio && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ background: '#660099', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={20} /> Lançar no Relatório?</h2>
            <button onClick={() => setShowPromptRelatorio(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={20} /></button>
          </div>
          
          <div style={{ padding: 24 }}>
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Deseja registrar a conclusão deste item no seu relatório diário de atividades automaticamente?
            </p>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#334155', border: '1px solid #e2e8f0' }}>
              <strong>Item:</strong> {showPromptRelatorio.itemText}
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => {
                // Cancela relatorio, mas marca como concluído no planejamento
                confirmToggleItemChecklist(showPromptRelatorio.plan.id, showPromptRelatorio.itemId, true)
                setShowPromptRelatorio(null)
              }} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Não, apenas concluir</button>
              <button type="button" onClick={() => {
                // Se a categoria do plano for GESTÃO DSS ou DSS, pergunta sobre DSS com Aliado
                if (showPromptRelatorio.plan.categoria === 'GESTÃO DSS' || showPromptRelatorio.plan.categoria === 'DSS') {
                  setShowDssModal(showPromptRelatorio)
                  setShowPromptRelatorio(null)
                  return
                }
                setFormRelatorio({
                  empresa: 'Telefônica Brasil S.A', projeto: 'VIVO',
                  local: showPromptRelatorio.plan.local === 'OUTROS' ? 'OUTROS' : showPromptRelatorio.plan.local || '',
                  outroLocal: showPromptRelatorio.plan.outroLocal || '',
                  cidadeUf: `${showPromptRelatorio.plan.cidade || ''} / ${showPromptRelatorio.plan.estado || ''}`.replace(/^ \/ | \/ $/g, ''),
                  descricao: showPromptRelatorio.itemText,
                  fotoBase64: '', fileName: '', contentType: ''
                })
                setShowFormRelatorio(showPromptRelatorio)
                setShowPromptRelatorio(null)
              }} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#660099', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Sim, lançar relatório</button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showFormRelatorio && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
          <div style={{ background: '#660099', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Lançar Relatório da Atividade</h2>
            <button onClick={() => {
              // Se cancelar o modal do relatório, não marca a checkbox
              setShowFormRelatorio(null)
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16, fontWeight: 'bold' }}>X</button>
          </div>
          
          <div style={{ padding: 24, overflowY: 'auto' }}>
            <form onSubmit={handleAddRelatorio} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Empresa Cliente</label>
                  <input required placeholder="Ex: Vivo S/A" value={formRelatorio.empresa} onChange={e => setFormRelatorio(p => ({...p, empresa: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Projeto / Área</label>
                  <input required placeholder="Ex: Infraestrutura" value={formRelatorio.projeto} onChange={e => setFormRelatorio(p => ({...p, projeto: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Unidade / Local</label>
                  <input required placeholder="Ex: Base SP" value={formRelatorio.local} onChange={e => setFormRelatorio(p => ({...p, local: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Cidade / UF</label>
                  <input required placeholder="Ex: São Paulo/SP" value={formRelatorio.cidadeUf} onChange={e => setFormRelatorio(p => ({...p, cidadeUf: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block' }}>Descrição / Relato da Atividade</label>
                  <button 
                    type="button" 
                    onClick={handleOptimizeTextRelatorio}
                    disabled={aiLoadingRel}
                    style={{ 
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', 
                      borderRadius: 6, border: 'none', background: '#f3e8ff', color: '#7e22ce',
                      cursor: aiLoadingRel ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 
                    }}
                  >
                    {aiLoadingRel ? <Loader2 size={12} className="animate-spin" /> : <span>✨ Corrigir com IA</span>}
                  </button>
                </div>
                <textarea required rows={3} placeholder="O que foi feito?" value={formRelatorio.descricao} onChange={e => setFormRelatorio(p => ({...p, descricao: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', resize: 'none' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Registro Fotográfico (Opcional)</label>
                {formRelatorio.fotoBase64 ? (
                  <div style={{ marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <img src={formRelatorio.fotoBase64} alt="Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                    <button type="button" onClick={() => setFormRelatorio(p => ({...p, fotoBase64: ''}))} style={{ background: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: 6, border: 'none', fontWeight: 600 }}>Remover</button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button type="button" onClick={() => document.getElementById('fotoGaleriaRel')?.click()}
                      style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: '18px 12px', cursor: 'pointer', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                    >
                      <UploadCloud color="#64748b" size={24} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Galeria</span>
                    </button>
                    <button type="button" onClick={() => document.getElementById('fotoCameraRel')?.click()}
                      style={{ border: '2px dashed #7c3aed', borderRadius: 8, padding: '18px 12px', cursor: 'pointer', background: 'rgba(124,58,237,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                    >
                      <Camera color="#7c3aed" size={24} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed' }}>Câmera</span>
                    </button>
                  </div>
                )}
                <input id="fotoGaleriaRel" type="file" accept="image/*" onChange={e => handleFileChange(e, setFormRelatorio)} style={{ display: 'none' }} />
                <input id="fotoCameraRel" type="file" accept="image/*" capture="environment" onChange={e => handleFileChange(e, setFormRelatorio)} style={{ display: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" onClick={() => setShowFormRelatorio(null)} style={{ flex: 1, padding: '12px', background: '#e2e8f0', color: '#475569', borderRadius: 8, fontWeight: 700, border: 'none' }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', opacity: pending ? 0.7 : 1 }}>
                  {pending ? 'Salvando...' : 'Salvar e Concluir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}

    {/* MODAL PERGUNTA DSS COM ALIADO */}
    {showDssModal && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, padding: 28, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>🤝</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', textAlign: 'center' }}>DSS com Aliado?</h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 8px 0', lineHeight: 1.5, textAlign: 'center' }}>
            Este DSS foi realizado com um <strong>aliado</strong> (equipe parceira)?
          </p>
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#92400e', fontWeight: 600, textAlign: 'center' }}>
            📋 Item: {showDssModal.itemText}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={() => {
              setFormRelatorio({
                empresa: 'Telefônica Brasil S.A', projeto: 'VIVO',
                local: showDssModal.plan.local === 'OUTROS' ? 'OUTROS' : showDssModal.plan.local || '',
                outroLocal: showDssModal.plan.outroLocal || '',
                cidadeUf: `${showDssModal.plan.cidade || ''} / ${showDssModal.plan.estado || ''}`.replace(/^ \/ | \/ $/g, ''),
                descricao: showDssModal.itemText,
                fotoBase64: '', fileName: '', contentType: ''
              })
              setShowFormRelatorio(showDssModal)
              setShowDssModal(null)
            }} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Não, sem aliado</button>
            <button type="button" onClick={() => {
              setFormDssAliado({ tema: '', fotoBase64: '', fileName: '', contentType: '' })
              setShowDssForm(showDssModal)
              setShowDssModal(null)
            }} style={{ flex: 1, padding: '12px', borderRadius: 8, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>✅ Sim, com Aliado!</button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL FORMULÁRIO DSS COM ALIADO */}
    {showDssForm && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }}>
          <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>🤝 DSS com Aliado</h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: '4px 0 0 0' }}>Registre os dados do DSS realizado com equipe parceira</p>
            </div>
            <button onClick={() => setShowDssForm(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: 8, padding: '6px 10px', fontWeight: 800, fontSize: 14 }}>✕</button>
          </div>
          <div style={{ padding: 24, overflowY: 'auto' }}>
            <form onSubmit={handleSaveDssAliado} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#64748b', textTransform: 'uppercase' }}>Tema do DSS *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: EPI, Trabalho em altura, PCMSO..."
                  value={formDssAliado.tema}
                  onChange={e => setFormDssAliado(p => ({...p, tema: e.target.value}))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '2px solid #fcd34d', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#64748b', textTransform: 'uppercase' }}>Foto da Lista de Presença (Opcional)</label>
                {formDssAliado.fotoBase64 ? (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: '#fef3c7', borderRadius: 8, border: '1px solid #fcd34d' }}>
                    <img src={formDssAliado.fotoBase64} alt="Preview" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{formDssAliado.fileName}</div>
                      <button type="button" onClick={() => setFormDssAliado(p => ({...p, fotoBase64: '', fileName: '', contentType: ''}))} style={{ marginTop: 6, background: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Remover</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button type="button" onClick={() => document.getElementById('fotoDssGaleriaAtiv')?.click()}
                      style={{ border: '2px dashed #fcd34d', borderRadius: 8, padding: '18px 12px', cursor: 'pointer', background: '#fffbeb', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <UploadCloud color="#d97706" size={24} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>Galeria</span>
                    </button>
                    <button type="button" onClick={() => document.getElementById('fotoDssCameraAtiv')?.click()}
                      style={{ border: '2px dashed #d97706', borderRadius: 8, padding: '18px 12px', cursor: 'pointer', background: 'rgba(217,119,6,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Camera color="#d97706" size={24} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>Câmera</span>
                    </button>
                  </div>
                )}
                <input id="fotoDssGaleriaAtiv" type="file" accept="image/*" onChange={e => handleFileChange(e, setFormDssAliado)} style={{ display: 'none' }} />
                <input id="fotoDssCameraAtiv" type="file" accept="image/*" capture="environment" onChange={e => handleFileChange(e, setFormDssAliado)} style={{ display: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => { setShowDssForm(null); setFormDssAliado({ tema: '', fotoBase64: '', fileName: '', contentType: '' }) }} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={dssLoading} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', borderRadius: 8, fontWeight: 800, border: 'none', cursor: dssLoading ? 'not-allowed' : 'pointer', opacity: dssLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {dssLoading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : '✅ Salvar DSS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}

    {/* MODAL CONCLUIR ATIVIDADE DIRETO */}
    {showConcluirModal && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, padding: 28, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#10b981' }}>
            <CheckCircle2 size={32} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', textAlign: 'center' }}>Concluir Atividade?</h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5, textAlign: 'center' }}>
            Deseja marcar <strong>{showConcluirModal.titulo || showConcluirModal.categoria}</strong> como concluída? 
            {showConcluirModal.checklist && showConcluirModal.checklist.length > 0 && " Todos os itens do checklist serão marcados como finalizados."}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={() => setShowConcluirModal(null)} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            <button type="button" onClick={confirmConcluirDireto} disabled={concluirLoading} style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 800, cursor: concluirLoading ? 'not-allowed' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: concluirLoading ? 0.7 : 1 }}>
              {concluirLoading ? <><Loader2 size={16} className="animate-spin" /> Concluindo...</> : '✅ Sim, concluir!'}
            </button>
          </div>
        </div>
      </div>
    )}

    </div>
  )
}

function PlanCard({ plan, onClick, onDragStart, onConcluir }: { plan: any, onClick: () => void, onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void, onConcluir?: (e: React.MouseEvent, plan: any) => void }) {
  const c = PR_COLORS[plan.prioridade]
  const isConcluido = plan.status === 'CONCLUIDO'
  
  const checklist = plan.checklist || []
  const hasChecklist = checklist.length > 0
  const totalItems = checklist.length
  const completedItems = checklist.filter((i: any) => i.concluido).length
  const progressPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  return (
    <div 
      draggable={!isConcluido}
      onDragStart={(e) => onDragStart(e, plan.id)}
      onClick={onClick}
      title={plan.descricaoOriginal}
      style={{ background: '#fff', border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 10px 10px 14px', cursor: isConcluido ? 'pointer' : 'grab', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'transform 0.1s', opacity: isConcluido ? 0.65 : 1, paddingRight: 24 }} 
      onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'} 
      onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: c.border }}></div>
      
      {isConcluido ? (
        <div style={{ position: 'absolute', top: 8, right: 8 }} title="Concluído">
          <CheckCircle2 size={14} color="#10b981" />
        </div>
      ) : (
        <button 
          onClick={(e) => onConcluir && onConcluir(e, plan)} 
          style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#cbd5e1' }}
          title="Marcar como concluído"
        >
          <Circle size={14} />
        </button>
      )}

      {/* Técnico */}
      {plan.tecnico && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          {plan.tecnico.fotoUrl ? (
            <img src={plan.tecnico.fotoUrl} alt={plan.tecnico.nome} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#660099', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{plan.tecnico?.nome?.substring(0,2).toUpperCase() || 'TS'}</div>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.tecnico.nome}</span>
        </div>
      )}

      {/* Categoria */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#4338ca', background: '#e0e7ff', padding: '2px 6px', borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{plan.categoria}</span>
      </div>

      {/* Descrição - Removido para diminuir altura, adicionado no title do card */}
      <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>{plan.titulo || 'Atividade Planejada'}</div>

      {plan.alteradaOriginal && (
        <div style={{ marginTop: 6, fontSize: 9, color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={10} /> ROTA ALTERADA
        </div>
      )}
    </div>
  )
}

