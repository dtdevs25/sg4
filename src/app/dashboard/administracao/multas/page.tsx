'use client'

import { useState, useEffect, useMemo, useTransition, useRef } from 'react'
import {
  AlertTriangle,
  Car,
  Search,
  PlusCircle,
  Clock,
  CheckCircle2,
  DollarSign,
  Calendar,
  MapPin,
  Camera,
  Eye,
  Trash2,
  Edit2,
  Loader2,
  X,
  FileText,
  Filter,
  ArrowUpDown,
  UploadCloud,
  ChevronDown
} from 'lucide-react'
import {
  getMultasAvarias,
  createMultaAvaria,
  updateMultaAvaria,
  deleteMultaAvaria,
  uploadFotoMulta
} from '@/app/actions/multas'
import { getTecnicos } from '@/app/actions/tecnicos'

const PURPLE = '#660099'
const PURPLE_BG = 'rgba(102,0,153,0.08)'

type MultaAvariaItem = {
  id: string
  tecnicoId: string
  tipo: 'MULTA' | 'AVARIA'
  placaVeiculo: string | null
  dataOcorrencia: string
  valor: number
  status: 'PENDENTE' | 'PAGO' | 'DESCONTADO_FOLHA' | 'EM_CONTESTACAO' | 'CONCLUIDO'
  descricao: string | null
  localidade: string | null
  fotoUrl: string | null
  comprovanteUrl: string | null
  createdAt: string
  tecnico?: {
    id: string
    nome: string
    fotoUrl: string | null
    veiculo: string | null
    ativo: boolean
  }
}

type TecnicoSimple = {
  id: string
  nome: string
  veiculo: string | null
  ativo: boolean
  fotoUrl: string | null
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDENTE: {
    label: 'Pendente',
    bg: '#fef3c7',
    text: '#b45309',
    border: '#fde68a',
  },
  PAGO: {
    label: 'Pago',
    bg: '#dcfce7',
    text: '#15803d',
    border: '#bbf7d0',
  },
  DESCONTADO_FOLHA: {
    label: 'Descontado em Folha',
    bg: '#dbeafe',
    text: '#1d4ed8',
    border: '#bfdbfe',
  },
  EM_CONTESTACAO: {
    label: 'Em Contestação',
    bg: '#f3e8ff',
    text: '#7e22ce',
    border: '#e9d5ff',
  },
  CONCLUIDO: {
    label: 'Concluído',
    bg: '#f1f5f9',
    text: '#334155',
    border: '#e2e8f0',
  },
}

const MESES = [
  { value: 'ALL', label: 'Todos os Meses' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

export default function MultasAvariasPage() {
  const [itens, setItens] = useState<MultaAvariaItem[]>([])
  const [tecnicos, setTecnicos] = useState<TecnicoSimple[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Filtros
  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<'ALL' | 'MULTA' | 'AVARIA'>('ALL')
  const [statusFiltro, setStatusFiltro] = useState<string>('ALL')
  const [tecnicoFiltro, setTecnicoFiltro] = useState<string>('ALL')
  const [anoFiltro, setAnoFiltro] = useState<number | 'ALL'>(new Date().getFullYear())
  const [mesFiltro, setMesFiltro] = useState<string>('ALL')

  // Picker de técnico no modal
  const [showTecnicoPicker, setShowTecnicoPicker] = useState(false)
  const [tecnicoPickerSearch, setTecnicoPickerSearch] = useState('')
  const [mostrarInativos, setMostrarInativos] = useState(false)

  // Modais
  const [modalAberto, setModalAberto] = useState(false)
  const [itemEdicao, setItemEdicao] = useState<MultaAvariaItem | null>(null)
  const [itemExclusao, setItemExclusao] = useState<MultaAvariaItem | null>(null)
  const [fotoVisualizar, setFotoVisualizar] = useState<{ url: string; titulo: string } | null>(null)

  // Formulário Modal
  const [formTipo, setFormTipo] = useState<'MULTA' | 'AVARIA'>('MULTA')
  const [formTecnicoId, setFormTecnicoId] = useState('')
  const [formPlacaVeiculo, setFormPlacaVeiculo] = useState('')
  const [formDataOcorrencia, setFormDataOcorrencia] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [formValor, setFormValor] = useState('')
  const [formStatus, setFormStatus] = useState<
    'PENDENTE' | 'PAGO' | 'DESCONTADO_FOLHA' | 'EM_CONTESTACAO' | 'CONCLUIDO'
  >('PENDENTE')
  const [formDescricao, setFormDescricao] = useState('')
  const [formLocalidade, setFormLocalidade] = useState('')

  // Upload Foto
  const [fotoFileBase64, setFotoFileBase64] = useState<string | null>(null)
  const [fotoFileName, setFotoFileName] = useState<string | null>(null)
  const [fotoFileType, setFotoFileType] = useState<string | null>(null)
  const [fotoUrlExistente, setFotoUrlExistente] = useState<string | null>(null)
  const [isUploadingFoto, setIsUploadingFoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Feedback Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // Carregar dados
  useEffect(() => {
    carregarTecnicos()
  }, [])

  useEffect(() => {
    carregarDados()
  }, [anoFiltro, mesFiltro, tipoFiltro, statusFiltro, tecnicoFiltro])

  async function carregarTecnicos() {
    const res = await getTecnicos()
    if (res.success && res.data) {
      setTecnicos(res.data as any)
    }
  }

  function carregarDados() {
    setLoading(true)
    startTransition(async () => {
      const res = await getMultasAvarias({
        ano: anoFiltro === 'ALL' ? undefined : Number(anoFiltro),
        mes: mesFiltro === 'ALL' ? undefined : Number(mesFiltro),
        tipo: tipoFiltro,
        status: statusFiltro,
        tecnicoId: tecnicoFiltro,
      })
      if (res.success && res.data) {
        setItens(res.data as any)
      } else {
        showToast(res.error || 'Erro ao carregar dados', 'error')
      }
      setLoading(false)
    })
  }

  // Atualizar veículo ao selecionar técnico no formulário
  function handleSelectTecnico(tId: string) {
    setFormTecnicoId(tId)
    const tec = tecnicos.find((t) => t.id === tId)
    if (tec && tec.veiculo) {
      setFormPlacaVeiculo(tec.veiculo)
    }
  }

  // Abrir Modal para Criar
  function handleAbrirCriar() {
    setItemEdicao(null)
    setFormTipo('MULTA')
    setFormTecnicoId('')
    setFormPlacaVeiculo('')
    setFormDataOcorrencia(new Date().toISOString().split('T')[0])
    setFormValor('')
    setFormStatus('PENDENTE')
    setFormDescricao('')
    setFormLocalidade('')
    setFotoFileBase64(null)
    setFotoFileName(null)
    setFotoFileType(null)
    setFotoUrlExistente(null)
    setShowTecnicoPicker(false)
    setTecnicoPickerSearch('')
    setMostrarInativos(false)
    setModalAberto(true)
  }

  // Abrir Modal para Editar
  function handleAbrirEditar(item: MultaAvariaItem) {
    setItemEdicao(item)
    setFormTipo(item.tipo)
    setFormTecnicoId(item.tecnicoId)
    setFormPlacaVeiculo(item.placaVeiculo || '')
    setFormDataOcorrencia(
      item.dataOcorrencia ? new Date(item.dataOcorrencia).toISOString().split('T')[0] : ''
    )
    setFormValor(item.valor ? String(item.valor) : '')
    setFormStatus(item.status)
    setFormDescricao(item.descricao || '')
    setFormLocalidade(item.localidade || '')
    setFotoFileBase64(null)
    setFotoFileName(null)
    setFotoFileType(null)
    setFotoUrlExistente(item.fotoUrl || item.comprovanteUrl || null)
    setShowTecnicoPicker(false)
    setTecnicoPickerSearch('')
    setMostrarInativos(false)
    setModalAberto(true)
  }

  // Upload Foto Handler
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 8 * 1024 * 1024) {
      alert('A foto selecionada é muito grande. O limite é 8MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      setFotoFileBase64(evt.target?.result as string)
      setFotoFileName(file.name)
      setFotoFileType(file.type)
    }
    reader.readAsDataURL(file)
  }

  // Salvar (Criar ou Atualizar)
  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!formTecnicoId) {
      alert('Selecione o técnico responsável.')
      return
    }
    if (!formDataOcorrencia) {
      alert('Informe a data da ocorrência.')
      return
    }

    startTransition(async () => {
      let finalFotoUrl = fotoUrlExistente

      // Se há um novo arquivo selecionado para upload
      if (fotoFileBase64 && fotoFileName) {
        setIsUploadingFoto(true)
        const formData = new FormData()
        formData.append('fileData', fotoFileBase64)
        formData.append('fileName', fotoFileName)
        formData.append('contentType', fotoFileType || 'image/jpeg')

        const uploadRes = await uploadFotoMulta(formData)
        setIsUploadingFoto(false)

        if (uploadRes.success && uploadRes.url) {
          finalFotoUrl = uploadRes.url
        } else {
          showToast(uploadRes.error || 'Erro ao enviar foto para o bucket', 'error')
          return
        }
      }

      const valorNumerico = formValor ? parseFloat(formValor.replace(',', '.')) : 0

      if (itemEdicao) {
        // Atualizar
        const res = await updateMultaAvaria(itemEdicao.id, {
          tecnicoId: formTecnicoId,
          tipo: formTipo,
          placaVeiculo: formPlacaVeiculo,
          dataOcorrencia: formDataOcorrencia,
          valor: isNaN(valorNumerico) ? 0 : valorNumerico,
          status: formStatus,
          descricao: formDescricao,
          localidade: formLocalidade,
          fotoUrl: finalFotoUrl || undefined,
        })

        if (res.success) {
          showToast('Registro atualizado com sucesso!')
          setModalAberto(false)
          carregarDados()
        } else {
          showToast(res.error || 'Erro ao atualizar registro', 'error')
        }
      } else {
        // Criar
        const res = await createMultaAvaria({
          tecnicoId: formTecnicoId,
          tipo: formTipo,
          placaVeiculo: formPlacaVeiculo,
          dataOcorrencia: formDataOcorrencia,
          valor: isNaN(valorNumerico) ? 0 : valorNumerico,
          status: formStatus,
          descricao: formDescricao,
          localidade: formLocalidade,
          fotoUrl: finalFotoUrl || undefined,
        })

        if (res.success) {
          showToast('Registro criado com sucesso!')
          setModalAberto(false)
          carregarDados()
        } else {
          showToast(res.error || 'Erro ao criar registro', 'error')
        }
      }
    })
  }

  // Confirmar Exclusão
  function handleConfirmarExclusao() {
    if (!itemExclusao) return
    startTransition(async () => {
      const res = await deleteMultaAvaria(itemExclusao.id)
      if (res.success) {
        showToast('Registro excluído com sucesso!')
        setItemExclusao(null)
        carregarDados()
      } else {
        showToast(res.error || 'Erro ao excluir registro', 'error')
      }
    })
  }

  // Filtragem de busca em tela
  const itensFiltrados = useMemo(() => {
    return itens.filter((i) => {
      const query = search.toLowerCase()
      const matchesSearch =
        (i.tecnico?.nome || '').toLowerCase().includes(query) ||
        (i.placaVeiculo || '').toLowerCase().includes(query) ||
        (i.descricao || '').toLowerCase().includes(query) ||
        (i.localidade || '').toLowerCase().includes(query)
      return matchesSearch
    })
  }, [itens, search])

  // Métricas de Resumo
  const stats = useMemo(() => {
    const total = itens.length
    const multas = itens.filter((i) => i.tipo === 'MULTA')
    const avarias = itens.filter((i) => i.tipo === 'AVARIA')
    const valorMultas = multas.reduce((acc, curr) => acc + (curr.valor || 0), 0)
    const valorAvarias = avarias.reduce((acc, curr) => acc + (curr.valor || 0), 0)
    const pendentes = itens.filter((i) => i.status === 'PENDENTE').length
    const concluidos = itens.filter(
      (i) => i.status === 'PAGO' || i.status === 'CONCLUIDO' || i.status === 'DESCONTADO_FOLHA'
    ).length

    return {
      total,
      qtdMultas: multas.length,
      valorMultas,
      qtdAvarias: avarias.length,
      valorAvarias,
      pendentes,
      concluidos,
      valorTotalGeral: valorMultas + valorAvarias,
    }
  }, [itens])

  const anosDisponiveis = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2,
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Toast Notificação */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: PURPLE_BG,
              color: PURPLE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Car size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Multas e Avarias de Veículos
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              Gestão de infrações de trânsito, avarias e sinistros da frota dos técnicos
            </p>
          </div>
        </div>

        <button
          onClick={handleAbrirCriar}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 8,
            background: `linear-gradient(135deg, ${PURPLE}, #4a0072)`,
            color: '#fff',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(102,0,153,0.25)',
            transition: 'all 0.15s',
          }}
        >
          <PlusCircle size={18} />
          Nova Ocorrência
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
          gap: 12,
        }}
      >
        {/* Total Ocorrências */}
        <div
          style={{
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #f1f5f9',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderLeft: '4px solid #64748b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Geral
            </span>
            <FileText size={16} color="#64748b" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{stats.total}</div>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
            R$ {stats.valorTotalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Multas */}
        <div
          style={{
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #fef3c7',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Multas
            </span>
            <AlertTriangle size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#b45309' }}>{stats.qtdMultas}</div>
          <span style={{ fontSize: 10, color: '#b45309', fontWeight: 700 }}>
            R$ {stats.valorMultas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Avarias */}
        <div
          style={{
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #fee2e2',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderLeft: '4px solid #ef4444',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Avarias
            </span>
            <Car size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{stats.qtdAvarias}</div>
          <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>
            R$ {stats.valorAvarias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Pendentes */}
        <div
          style={{
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #fed7aa',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderLeft: '4px solid #ea580c',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Pendentes
            </span>
            <Clock size={16} color="#ea580c" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#ea580c' }}>{stats.pendentes}</div>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Aguardando ação</span>
        </div>

        {/* Concluídos */}
        <div
          style={{
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #dcfce7',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderLeft: '4px solid #10b981',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Concluídos / Pagos
            </span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{stats.concluidos}</div>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Liquidados ou resolvidos</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Seletor Tipo (Tabs) */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 8, gap: 4 }}>
            <button
              onClick={() => setTipoFiltro('ALL')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                transition: 'all 0.15s',
                background: tipoFiltro === 'ALL' ? '#fff' : 'transparent',
                color: tipoFiltro === 'ALL' ? PURPLE : '#64748b',
                boxShadow: tipoFiltro === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Todos ({itens.length})
            </button>
            <button
              onClick={() => setTipoFiltro('MULTA')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                transition: 'all 0.15s',
                background: tipoFiltro === 'MULTA' ? '#fff' : 'transparent',
                color: tipoFiltro === 'MULTA' ? '#b45309' : '#64748b',
                boxShadow: tipoFiltro === 'MULTA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Multas ({stats.qtdMultas})
            </button>
            <button
              onClick={() => setTipoFiltro('AVARIA')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                transition: 'all 0.15s',
                background: tipoFiltro === 'AVARIA' ? '#fff' : 'transparent',
                color: tipoFiltro === 'AVARIA' ? '#ef4444' : '#64748b',
                boxShadow: tipoFiltro === 'AVARIA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Avarias ({stats.qtdAvarias})
            </button>
          </div>

          {/* Filtros Dropdowns (Período, Técnico, Status) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Status */}
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago</option>
              <option value="DESCONTADO_FOLHA">Descontado em Folha</option>
              <option value="EM_CONTESTACAO">Em Contestação</option>
              <option value="CONCLUIDO">Concluído</option>
            </select>

            {/* Técnico */}
            <select
              value={tecnicoFiltro}
              onChange={(e) => setTecnicoFiltro(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                background: '#fff',
                maxWidth: 200,
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Todos os Técnicos</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} {t.ativo === false ? '(Inativo)' : ''}
                </option>
              ))}
            </select>

            {/* Ano */}
            <select
              value={anoFiltro}
              onChange={(e) => setAnoFiltro(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Todos os Anos</option>
              {anosDisponiveis.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {/* Mês */}
            <select
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              {MESES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Input de Busca */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }}
          />
          <input
            type="text"
            placeholder="Buscar por técnico, placa do veículo, descrição, localidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 13,
              outline: 'none',
              background: '#f8fafc',
            }}
          />
        </div>
      </div>

      {/* Tabela de Ocorrências */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Tipo
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Data
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Técnico / Veículo
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Localidade
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Descrição / Motivo
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Valor (R$)
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>
                  Comprovante
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '60px 0', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <Loader2 size={32} color={PURPLE} style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                        Carregando registros...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <Car size={40} color="#cbd5e1" />
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                        Nenhuma ocorrência encontrada
                      </span>
                      <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                        Não há registros para os filtros selecionados. Clique em "Nova Ocorrência" para cadastrar.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => {
                  const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDENTE
                  const fotoUrl = item.fotoUrl || item.comprovanteUrl

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Tipo */}
                      <td style={{ padding: '14px 20px' }}>
                        {item.tipo === 'MULTA' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                            }}
                          >
                            <AlertTriangle size={13} />
                            MULTA
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                            }}
                          >
                            <Car size={13} />
                            AVARIA
                          </span>
                        )}
                      </td>

                      {/* Data */}
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                        {item.dataOcorrencia
                          ? new Date(item.dataOcorrencia).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>

                      {/* Técnico / Veículo */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {item.tecnico?.fotoUrl ? (
                            <img
                              src={item.tecnico.fotoUrl}
                              alt={item.tecnico.nome}
                              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: PURPLE_BG,
                                color: PURPLE,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {(item.tecnico?.nome || '??').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                              {item.tecnico?.nome || 'Técnico Não Vinculado'}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                              {item.placaVeiculo ? `Placa/Carro: ${item.placaVeiculo}` : (item.tecnico?.veiculo || 'Sem placa')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Localidade */}
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#475569', fontWeight: 500 }}>
                        {item.localidade || '-'}
                      </td>

                      {/* Descrição */}
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#334155', maxWidth: 280 }}>
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                          title={item.descricao || ''}
                        >
                          {item.descricao || '-'}
                        </div>
                      </td>

                      {/* Valor */}
                      <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>
                        {item.valor
                          ? `R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : 'R$ 0,00'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: statusConf.bg,
                            color: statusConf.text,
                            border: `1px solid ${statusConf.border}`,
                          }}
                        >
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Comprovante / Foto */}
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        {fotoUrl ? (
                          <button
                            onClick={() =>
                              setFotoVisualizar({
                                url: fotoUrl,
                                titulo: `${item.tipo === 'MULTA' ? 'Multa' : 'Avaria'} - ${item.tecnico?.nome || ''}`,
                              })
                            }
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              background: PURPLE_BG,
                              color: PURPLE,
                              border: 'none',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Eye size={13} />
                            Ver Foto
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                            Sem anexo
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleAbrirEditar(item)}
                            title="Editar"
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              background: '#f1f5f9',
                              color: '#334155',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setItemExclusao(item)}
                            title="Excluir"
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              background: '#fee2e2',
                              color: '#ef4444',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar */}
      {modalAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 620,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header Modal - Roxo */}
            <div
              style={{
                padding: '18px 24px',
                background: `linear-gradient(135deg, ${PURPLE} 0%, #4a0072 100%)`,
                borderRadius: '16px 16px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Car size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>
                    {itemEdicao ? 'Editar Ocorrência' : 'Cadastrar Nova Ocorrência'}
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                    Multas e Avarias de Veículos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: 6, padding: 4, display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSalvar} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Seletor Tipo */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  TIPO DE OCORRÊNCIA *
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setFormTipo('MULTA')}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: formTipo === 'MULTA' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                      background: formTipo === 'MULTA' ? '#fef3c7' : '#f8fafc',
                      color: formTipo === 'MULTA' ? '#b45309' : '#64748b',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={18} />
                    Multa de Trânsito
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTipo('AVARIA')}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: formTipo === 'AVARIA' ? '2px solid #ef4444' : '1px solid #e2e8f0',
                      background: formTipo === 'AVARIA' ? '#fee2e2' : '#f8fafc',
                      color: formTipo === 'AVARIA' ? '#b91c1c' : '#64748b',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Car size={18} />
                    Avaria do Veículo
                  </button>
                </div>
              </div>

              {/* Técnico Responsável — Custom Picker com Avatar */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                    TÉCNICO RESPONSÁVEL *
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={mostrarInativos}
                      onChange={(e) => setMostrarInativos(e.target.checked)}
                      style={{ accentColor: PURPLE }}
                    />
                    Incluir inativos
                  </label>
                </div>

                {/* Campo de seleção atual */}
                <button
                  type="button"
                  onClick={() => setShowTecnicoPicker(!showTecnicoPicker)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: showTecnicoPicker ? `2px solid ${PURPLE}` : '1px solid #cbd5e1',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {formTecnicoId ? (() => {
                    const t = tecnicos.find(x => x.id === formTecnicoId)
                    return t ? (
                      <>
                        {t.fotoUrl ? (
                          <img src={t.fotoUrl} alt={t.nome} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: PURPLE_BG, color: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                            {t.nome.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.nome}</div>
                          {t.veiculo && <div style={{ fontSize: 11, color: '#64748b' }}>{t.veiculo}</div>}
                        </div>
                        {!t.ativo && <span style={{ fontSize: 10, background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>Inativo</span>}
                      </>
                    ) : null
                  })() : (
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Selecione o técnico responsável...</span>
                  )}
                  <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 'auto', flexShrink: 0, transform: showTecnicoPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {/* Dropdown de seleção */}
                {showTecnicoPicker && (
                  <div style={{
                    border: `1px solid ${PURPLE}`,
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    background: '#fff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    maxHeight: 260,
                    overflowY: 'auto',
                    zIndex: 100,
                  }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff' }}>
                      <input
                        type="text"
                        placeholder="Buscar técnico..."
                        value={tecnicoPickerSearch}
                        onChange={(e) => setTecnicoPickerSearch(e.target.value)}
                        autoFocus
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none' }}
                      />
                    </div>
                    {tecnicos
                      .filter(t => mostrarInativos ? true : t.ativo !== false)
                      .filter(t => t.nome.toLowerCase().includes(tecnicoPickerSearch.toLowerCase()))
                      .map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => { handleSelectTecnico(t.id); setShowTecnicoPicker(false); setTecnicoPickerSearch('') }}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: formTecnicoId === t.id ? PURPLE_BG : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            borderBottom: '1px solid #f8fafc',
                          }}
                        >
                          {t.fotoUrl ? (
                            <img src={t.fotoUrl} alt={t.nome} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: PURPLE_BG, color: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                              {t.nome.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: formTecnicoId === t.id ? PURPLE : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.nome}</div>
                            {t.veiculo && <div style={{ fontSize: 11, color: '#64748b' }}>{t.veiculo}</div>}
                          </div>
                          {!t.ativo && <span style={{ fontSize: 10, background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>Inativo</span>}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Linha dupla: Placa/Veículo + Data */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    PLACA / VEÍCULO
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ABC-1234 ou Gol Branco"
                    value={formPlacaVeiculo}
                    onChange={(e) => setFormPlacaVeiculo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    DATA DA OCORRÊNCIA *
                  </label>
                  <input
                    type="date"
                    value={formDataOcorrencia}
                    onChange={(e) => setFormDataOcorrencia(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Linha dupla: Valor + Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    VALOR ESTIMADO / MULTA (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    STATUS
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1e293b',
                      outline: 'none',
                      background: '#fff',
                    }}
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="PAGO">Pago</option>
                    <option value="DESCONTADO_FOLHA">Descontado em Folha</option>
                    <option value="EM_CONTESTACAO">Em Contestação</option>
                    <option value="CONCLUIDO">Concluído</option>
                  </select>
                </div>
              </div>

              {/* Localidade / Base */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  LOCALIDADE / BASE ONDE OCORREU
                </label>
                <input
                  type="text"
                  placeholder="Ex: Rodovia BR-101 km 45 / Base São Paulo"
                  value={formLocalidade}
                  onChange={(e) => setFormLocalidade(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Descrição / Motivo */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  DESCRIÇÃO / MOTIVO DA OCORRÊNCIA
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva os detalhes da infração de trânsito ou a avaria identificada no veículo..."
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Foto / Comprovante (Bucket sg4-km) */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  FOTO OU COMPROVANTE (BUCKET SG4-KM)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: '1px dashed #cbd5e1',
                      background: '#f8fafc',
                      color: '#475569',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <UploadCloud size={18} color={PURPLE} />
                    {fotoFileBase64 || fotoUrlExistente ? 'Trocar Foto' : 'Selecionar Foto / Documento'}
                  </button>

                  {(fotoFileBase64 || fotoUrlExistente) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFotoFileBase64(null)
                        setFotoFileName(null)
                        setFotoUrlExistente(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: '#fee2e2',
                        color: '#ef4444',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Remover
                    </button>
                  )}
                </div>

                {/* Preview Foto */}
                {(fotoFileBase64 || fotoUrlExistente) && (
                  <div style={{ marginTop: 12 }}>
                    <img
                      src={fotoFileBase64 || fotoUrlExistente!}
                      alt="Preview"
                      style={{
                        width: '100%',
                        maxHeight: 180,
                        objectFit: 'contain',
                        borderRadius: 8,
                        background: '#0f172a',
                        border: '1px solid #e2e8f0',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                  marginTop: 10,
                  paddingTop: 16,
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || isUploadingFoto}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: PURPLE,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isPending || isUploadingFoto ? 'not-allowed' : 'pointer',
                    opacity: isPending || isUploadingFoto ? 0.7 : 1,
                  }}
                >
                  {(isPending || isUploadingFoto) && (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  )}
                  {itemEdicao ? 'Salvar Alterações' : 'Cadastrar Ocorrência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizador de Foto */}
      {fotoVisualizar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setFotoVisualizar(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#fff',
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700 }}>{fotoVisualizar.titulo}</span>
              <button
                onClick={() => setFotoVisualizar(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={fotoVisualizar.url}
              alt={fotoVisualizar.titulo}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                borderRadius: 10,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}

      {/* Modal Confirmação de Exclusão */}
      {itemExclusao && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1500,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 420,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Trash2 size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 17, fontWeight: 800, color: '#1e293b' }}>
              Confirmar Exclusão
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Deseja realmente excluir este registro de{' '}
              <b>{itemExclusao.tipo === 'MULTA' ? 'Multa' : 'Avaria'}</b> do técnico{' '}
              <b>{itemExclusao.tecnico?.nome || 'Não vinculado'}</b>? Esta ação não pode ser desfeita.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setItemExclusao(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                disabled={isPending}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
