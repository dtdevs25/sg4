'use client'

import { useState, useEffect, useMemo, useTransition, useRef } from 'react'
import {
  ShieldAlert,
  FileText,
  AlertTriangle,
  Search,
  PlusCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Eye,
  Trash2,
  Edit2,
  Loader2,
  X,
  UploadCloud,
  Car,
  Link as LinkIcon,
  User,
  HelpCircle,
  FileCheck
} from 'lucide-react'
import {
  getMedidasAdministrativas,
  createMedidaAdministrativa,
  updateMedidaAdministrativa,
  deleteMedidaAdministrativa,
  uploadDocumentoMedida,
  getMultasParaVinculo
} from '@/app/actions/medidasAdministrativas'
import { getTecnicos } from '@/app/actions/tecnicos'

const PURPLE = '#660099'
const PURPLE_BG = 'rgba(102,0,153,0.08)'

type MedidaItem = {
  id: string
  tecnicoId: string
  tipo: 'ADVERTENCIA_VERBAL' | 'ADVERTENCIA_ESCRITA' | 'SUSPENSAO' | 'ORIENTACAO_FEEDBACK'
  data: string
  motivo: string
  descricao: string | null
  status: 'PENDENTE_ASSINATURA' | 'APLICADA' | 'CANCELADA'
  aplicadoPor: string | null
  multaAvariaId: string | null
  documentoUrl: string | null
  createdAt: string
  tecnico?: {
    id: string
    nome: string
    fotoUrl: string | null
    veiculo: string | null
    ativo: boolean
  }
  multaAvaria?: {
    id: string
    tipo: 'MULTA' | 'AVARIA'
    dataOcorrencia: string
    valor: number
    placaVeiculo: string | null
    descricao: string | null
  } | null
}

type MultaOption = {
  id: string
  tipo: string
  dataOcorrencia: string
  valor: number
  placaVeiculo: string | null
  descricao: string | null
  tecnico?: { nome: string }
}

const TIPO_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; iconColor: string }
> = {
  ADVERTENCIA_ESCRITA: {
    label: 'Advertência Escrita',
    bg: '#fee2e2',
    text: '#991b1b',
    border: '#fca5a5',
    iconColor: '#dc2626',
  },
  ADVERTENCIA_VERBAL: {
    label: 'Advertência Verbal',
    bg: '#fef3c7',
    text: '#92400e',
    border: '#fcd34d',
    iconColor: '#d97706',
  },
  SUSPENSAO: {
    label: 'Suspensão',
    bg: '#f3e8ff',
    text: '#6b21a8',
    border: '#d8b4fe',
    iconColor: '#9333ea',
  },
  ORIENTACAO_FEEDBACK: {
    label: 'Orientação / Feedback',
    bg: '#e0f2fe',
    text: '#075985',
    border: '#7dd3fc',
    iconColor: '#0284c7',
  },
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  APLICADA: {
    label: 'Aplicada',
    bg: '#dcfce7',
    text: '#15803d',
    border: '#86efac',
  },
  PENDENTE_ASSINATURA: {
    label: 'Pendente de Assinatura',
    bg: '#fef9c3',
    text: '#854d0e',
    border: '#fde047',
  },
  CANCELADA: {
    label: 'Cancelada',
    bg: '#f1f5f9',
    text: '#64748b',
    border: '#cbd5e1',
  },
}

const MOTIVOS_COMUNS = [
  'Infração de Trânsito',
  'Excesso de Velocidade no Veículo da Empresa',
  'Avaria no Veículo sem Comunicação Imediata',
  'Uso Indevido do Veículo da Frota',
  'Não Utilização de EPI Obrigatório',
  'Descumprimento de Procedimento Operacional / Regras de Segurança',
  'Ausência Injustificada ou Atraso Reiterado',
  'Outro Motivo',
]

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

// Funções de formatação de interface
const formatarNomeAbreviado = (nome: string) => {
  if (!nome) return '';
  const partes = nome.trim().split(' ').filter(Boolean);
  if (partes.length === 1) return partes[0];
  const primeiro = partes[0];
  let segundo = partes[1];
  if (["da", "de", "di", "do", "du", "dos", "das"].includes(segundo.toLowerCase()) && partes.length > 2) {
    segundo = partes[2];
  }
  return `${primeiro} ${segundo[0].toUpperCase()}.`;
};

const formatarVeiculo = (veiculoStr: string) => {
  if (!veiculoStr) return '';
  let limpo = veiculoStr.replace(/renault\s+kwid/ig, '').trim();
  // Limpar hifens soltos ou espaços duplos
  limpo = limpo.replace(/\s{2,}/g, ' ');
  limpo = limpo.replace(/^\s*-\s*|\s*-\s*$/g, '');
  if (limpo.indexOf('-') === -1 && limpo.length > 7) {
      const partes = limpo.split(' ');
      if (partes.length >= 2) {
          limpo = `${partes[0]} - ${partes.slice(1).join(' ')}`;
      }
  }
  return limpo || veiculoStr;
};

export default function MedidasAdministrativasPage() {
  const [itens, setItens] = useState<MedidaItem[]>([])
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [multasDisponiveis, setMultasDisponiveis] = useState<MultaOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Filtros
  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<string>('ALL')
  const [statusFiltro, setStatusFiltro] = useState<string>('ALL')
  const [tecnicoFiltro, setTecnicoFiltro] = useState<string>('ALL')
  const [anoFiltro, setAnoFiltro] = useState<number | 'ALL'>(new Date().getFullYear())
  const [mesesFiltro, setMesesFiltro] = useState<number[]>([new Date().getMonth() + 1])
  const [mesesDropdownOpen, setMesesDropdownOpen] = useState(false)
  const MESES_NOME = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  const handleMesToggle = (m: number) => {
    setMesesFiltro(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  // Picker de colaborador no modal
  const [showTecnicoPicker, setShowTecnicoPicker] = useState(false)
  const [tecnicoPickerSearch, setTecnicoPickerSearch] = useState('')
  const [mostrarInativos, setMostrarInativos] = useState(false)

  // Modais
  const [modalAberto, setModalAberto] = useState(false)
  const [itemEdicao, setItemEdicao] = useState<MedidaItem | null>(null)
  const [itemExclusao, setItemExclusao] = useState<MedidaItem | null>(null)
  const [docVisualizar, setDocVisualizar] = useState<{ url: string; titulo: string } | null>(null)

  // Formulário Modal
  const [formTipo, setFormTipo] = useState<
    'ADVERTENCIA_VERBAL' | 'ADVERTENCIA_ESCRITA' | 'SUSPENSAO' | 'ORIENTACAO_FEEDBACK'
  >('ADVERTENCIA_ESCRITA')
  const [formTecnicoId, setFormTecnicoId] = useState('')
  const [formDataMedida, setFormDataMedida] = useState(new Date().toISOString().split('T')[0])
  const [formMotivo, setFormMotivo] = useState(MOTIVOS_COMUNS[0])
  const [formDescricao, setFormDescricao] = useState('')
  const [formStatus, setFormStatus] = useState<'PENDENTE_ASSINATURA' | 'APLICADA' | 'CANCELADA'>('APLICADA')
  const [formAplicadoPor, setFormAplicadoPor] = useState('')
  const [formMultaAvariaId, setFormMultaAvariaId] = useState('')

  // Upload Documento
  const [docFileBase64, setDocFileBase64] = useState<string | null>(null)
  const [docFileName, setDocFileName] = useState<string | null>(null)
  const [docFileType, setDocFileType] = useState<string | null>(null)
  const [docUrlExistente, setDocUrlExistente] = useState<string | null>(null)
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    carregarTecnicos()
  }, [])

  useEffect(() => {
    carregarDados()
  }, [anoFiltro, mesesFiltro, tipoFiltro, statusFiltro, tecnicoFiltro])

  async function carregarTecnicos() {
    const res = await getTecnicos()
    if (res.success && res.data) {
      setTecnicos(res.data)
    }
  }

  function carregarDados() {
    setLoading(true)
    startTransition(async () => {
      const primMes = mesesFiltro.length === 1 ? mesesFiltro[0] : undefined
      const res = await getMedidasAdministrativas({
        ano: anoFiltro === 'ALL' ? undefined : Number(anoFiltro),
        mes: primMes,
        tipo: tipoFiltro,
        status: statusFiltro,
        tecnicoId: tecnicoFiltro,
      })
      if (res.success && res.data) {
        const dadosFiltrados = mesesFiltro.length === 0 || mesesFiltro.length === 1
          ? (res.data as any[])
          : (res.data as any[]).filter(i => {
              if (!i.dataMedida) return false;
              const dt = new Date(i.dataMedida)
              return mesesFiltro.includes(dt.getUTCMonth() + 1)
            })
        setItens(dadosFiltrados as any)
      } else {
        showToast(res.error || 'Erro ao carregar dados', 'error')
      }
      setLoading(false)
    })
  }

  async function carregarMultasDoTecnico(tecnicoId?: string) {
    const res = await getMultasParaVinculo(tecnicoId)
    if (res.success && res.data) {
      setMultasDisponiveis(res.data as any)
    }
  }

  // Ao selecionar técnico no modal, buscar multas desse técnico
  function handleSelectTecnico(tId: string) {
    setFormTecnicoId(tId)
    setFormMultaAvariaId('')
    if (tId) {
      carregarMultasDoTecnico(tId)
    } else {
      setMultasDisponiveis([])
    }
  }

  // Abrir Modal para Criar
  function handleAbrirCriar() {
    setItemEdicao(null)
    setFormTipo('ADVERTENCIA_ESCRITA')
    setFormTecnicoId('')
    setFormDataMedida(new Date().toISOString().split('T')[0])
    setFormMotivo(MOTIVOS_COMUNS[0])
    setFormDescricao('')
    setFormStatus('APLICADA')
    setFormAplicadoPor('')
    setFormMultaAvariaId('')
    setDocFileBase64(null)
    setDocFileName(null)
    setDocFileType(null)
    setDocUrlExistente(null)
    setMultasDisponiveis([])
    setShowTecnicoPicker(false)
    setTecnicoPickerSearch('')
    setMostrarInativos(false)
    setModalAberto(true)
  }

  // Abrir Modal para Editar
  function handleAbrirEditar(item: MedidaItem) {
    setItemEdicao(item)
    setFormTipo(item.tipo)
    setFormTecnicoId(item.tecnicoId)
    setFormDataMedida(
      item.data ? new Date(item.data).toISOString().split('T')[0] : ''
    )
    setFormMotivo(item.motivo || MOTIVOS_COMUNS[0])
    setFormDescricao(item.descricao || '')
    setFormStatus(item.status)
    setFormAplicadoPor(item.aplicadoPor || '')
    setFormMultaAvariaId(item.multaAvariaId || '')
    setDocFileBase64(null)
    setDocFileName(null)
    setDocFileType(null)
    setDocUrlExistente(item.documentoUrl || null)
    setShowTecnicoPicker(false)
    setTecnicoPickerSearch('')
    setMostrarInativos(false)

    if (item.tecnicoId) {
      carregarMultasDoTecnico(item.tecnicoId)
    }
    setModalAberto(true)
  }

  // File Change
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('O documento selecionado é muito grande. O limite é 10MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      setDocFileBase64(evt.target?.result as string)
      setDocFileName(file.name)
      setDocFileType(file.type)
    }
    reader.readAsDataURL(file)
  }

  // Salvar
  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!formTecnicoId) {
      alert('Selecione o colaborador/técnico.')
      return
    }
    if (!formMotivo.trim()) {
      alert('Informe o motivo da medida administrativa.')
      return
    }

    startTransition(async () => {
      let finalDocUrl = docUrlExistente

      if (docFileBase64 && docFileName) {
        setIsUploadingDoc(true)
        const formData = new FormData()
        formData.append('fileData', docFileBase64)
        formData.append('fileName', docFileName)
        formData.append('contentType', docFileType || 'application/pdf')

        const uploadRes = await uploadDocumentoMedida(formData)
        setIsUploadingDoc(false)

        if (uploadRes.success && uploadRes.url) {
          finalDocUrl = uploadRes.url
        } else {
          showToast(uploadRes.error || 'Erro ao enviar termo assinado para o bucket', 'error')
          return
        }
      }

      if (itemEdicao) {
        // Atualizar
        const res = await updateMedidaAdministrativa(itemEdicao.id, {
          tecnicoId: formTecnicoId,
          tipo: formTipo,
          data: formDataMedida,
          motivo: formMotivo,
          descricao: formDescricao,
          status: formStatus,
          aplicadoPor: formAplicadoPor,
          multaAvariaId: formMultaAvariaId || null,
          documentoUrl: finalDocUrl || null,
        })

        if (res.success) {
          showToast('Medida administrativa atualizada!')
          setModalAberto(false)
          carregarDados()
        } else {
          showToast(res.error || 'Erro ao atualizar', 'error')
        }
      } else {
        // Criar
        const res = await createMedidaAdministrativa({
          tecnicoId: formTecnicoId,
          tipo: formTipo,
          data: formDataMedida,
          motivo: formMotivo,
          descricao: formDescricao,
          status: formStatus,
          aplicadoPor: formAplicadoPor,
          multaAvariaId: formMultaAvariaId || undefined,
          documentoUrl: finalDocUrl || undefined,
        })

        if (res.success) {
          showToast('Medida administrativa registrada!')
          setModalAberto(false)
          carregarDados()
        } else {
          showToast(res.error || 'Erro ao registrar', 'error')
        }
      }
    })
  }

  // Confirmar Exclusão
  function handleConfirmarExclusao() {
    if (!itemExclusao) return
    startTransition(async () => {
      const res = await deleteMedidaAdministrativa(itemExclusao.id)
      if (res.success) {
        showToast('Medida administrativa excluída com sucesso!')
        setItemExclusao(null)
        carregarDados()
      } else {
        showToast(res.error || 'Erro ao excluir', 'error')
      }
    })
  }

  // Filtrados por busca
  const itensFiltrados = useMemo(() => {
    return itens.filter((i) => {
      const query = search.toLowerCase()
      const matchesSearch =
        (i.tecnico?.nome || '').toLowerCase().includes(query) ||
        (i.motivo || '').toLowerCase().includes(query) ||
        (i.descricao || '').toLowerCase().includes(query) ||
        (i.aplicadoPor || '').toLowerCase().includes(query) ||
        (i.multaAvaria?.placaVeiculo || '').toLowerCase().includes(query)
      return matchesSearch
    })
  }, [itens, search])

  // KPIs
  const stats = useMemo(() => {
    const total = itens.length
    const escritas = itens.filter((i) => i.tipo === 'ADVERTENCIA_ESCRITA').length
    const verbais = itens.filter((i) => i.tipo === 'ADVERTENCIA_VERBAL').length
    const suspensoes = itens.filter((i) => i.tipo === 'SUSPENSAO').length
    const comMulta = itens.filter((i) => !!i.multaAvariaId).length
    const pendenteAssinatura = itens.filter((i) => i.status === 'PENDENTE_ASSINATURA').length

    return {
      total,
      escritas,
      verbais,
      suspensoes,
      comMulta,
      pendenteAssinatura,
    }
  }, [itens])

  const anosDisponiveis = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2,
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .multas-table-wrap { overflow-x: auto; }
        .multas-table { width: 100%; border-collapse: collapse; text-align: left; }
        .multas-dot-tip { position: relative; display: inline-block; z-index: 1; }
        .multas-dot-tip .tip-box {
          visibility: hidden; opacity: 0;
          position: absolute; bottom: 130%; left: 50%; transform: translateX(-50%);
          background: #1e293b; color: #fff; font-size: 11px; font-weight: 700;
          padding: 5px 10px; border-radius: 6px; white-space: nowrap;
          pointer-events: none; transition: opacity 0.15s;
          z-index: 99999;
        }
        .multas-dot-tip .tip-box::after {
          content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          border: 5px solid transparent; border-top-color: #1e293b;
        }
        .multas-dot-tip:hover { z-index: 999; }
        .multas-dot-tip:hover .tip-box { visibility: visible; opacity: 1; }
        @media (max-width: 768px) {
          .multas-table-wrap table thead { display: none; }
          .multas-table-wrap table tbody tr {
            display: block;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            margin-bottom: 12px;
            padding: 12px 16px;
            background: #fff;
            box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          }
          .multas-table-wrap table tbody td {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 5px 0 !important;
            font-size: 13px;
            border-bottom: 1px solid #f8fafc;
          }
          .multas-table-wrap table tbody td:last-child { border-bottom: none; }
          .multas-table-wrap table tbody td::before {
            content: attr(data-label);
            font-size: 10px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            min-width: 100px;
            flex-shrink: 0;
          }
        }
      `}</style>
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
            <ShieldAlert size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Medidas Administrativas
            </h1>
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
          }}
        >
          + Medida
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
        {/* Total Geral */}
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
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total de Medidas
            </span>
            <FileText size={16} color="#64748b" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{stats.total}</div>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Registros no período</span>
        </div>

        {/* Advertências Escritas */}
        <div
          style={{
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #fee2e2',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderLeft: '4px solid #dc2626',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
              Escritas
            </span>
            <FileCheck size={16} color="#dc2626" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{stats.escritas}</div>
          <span style={{ fontSize: 10, color: '#991b1b', fontWeight: 600 }}>Advertências formais</span>
        </div>

        {/* Advertências Verbais */}
        <div
          style={{
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #fef3c7',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderLeft: '4px solid #d97706',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
              Verbais
            </span>
            <AlertTriangle size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{stats.verbais}</div>
          <span style={{ fontSize: 10, color: '#92400e', fontWeight: 600 }}>Registros de alinhamento</span>
        </div>

        {/* Suspensões */}
        <div
          style={{
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #f3e8ff',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderLeft: '4px solid #9333ea',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>
              Suspensões
            </span>
            <ShieldAlert size={16} color="#9333ea" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#9333ea' }}>{stats.suspensoes}</div>
          <span style={{ fontSize: 10, color: '#6b21a8', fontWeight: 600 }}>Casos gravíssimos</span>
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
          {/* Filtros Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
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
              <option value="ALL">Todos os Tipos</option>
              <option value="ADVERTENCIA_ESCRITA">Advertência Escrita</option>
              <option value="ADVERTENCIA_VERBAL">Advertência Verbal</option>
              <option value="SUSPENSAO">Suspensão</option>
              <option value="ORIENTACAO_FEEDBACK">Orientação / Feedback</option>
            </select>

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
              <option value="APLICADA">Aplicada</option>
              <option value="PENDENTE_ASSINATURA">Pendente de Assinatura</option>
              <option value="CANCELADA">Cancelada</option>
            </select>

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
              <option value="ALL">Todos os Colaboradores</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatarNomeAbreviado(t.nome)} {t.ativo === false ? '(Inativo)' : ''}
                </option>
              ))}
            </select>

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

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMesesDropdownOpen(!mesesDropdownOpen)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                <Calendar size={14} />
                {mesesFiltro.length === 0
                  ? 'Todos os Meses'
                  : mesesFiltro.length === 1
                    ? MESES_NOME[mesesFiltro[0] - 1]
                    : `${mesesFiltro.length} meses`}
                <ChevronDown size={13} style={{ transform: mesesDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {mesesDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  zIndex: 200,
                  background: '#fff',
                  borderRadius: 10,
                  border: `1px solid ${PURPLE}`,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
                  padding: '10px 12px',
                  minWidth: 200,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>SELECIONE OS MESES</span>
                    <button onClick={() => setMesesFiltro([])} style={{ fontSize: 11, background: 'none', border: 'none', color: PURPLE, cursor: 'pointer', fontWeight: 700 }}>Limpar</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                    {MESES_NOME.map((nome, idx) => (
                      <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155', cursor: 'pointer', padding: '4px 0' }}>
                        <input
                          type="checkbox"
                          checked={mesesFiltro.includes(idx + 1)}
                          onChange={() => handleMesToggle(idx + 1)}
                          style={{ accentColor: PURPLE, cursor: 'pointer' }}
                        />
                        {nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Busca */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por colaborador, motivo da medida, descrição, quem aplicou..."
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

      {/* Tabela de Medidas */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <div className="multas-table-wrap">
          <table className="multas-table">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Tipo de Medida
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Data
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Colaborador
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Motivo
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Vínculo com Multa
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Aplicado Por
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '60px 0', textAlign: 'center' }}>
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
                  <td colSpan={8} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <ShieldAlert size={40} color="#cbd5e1" />
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>
                        Nenhuma medida administrativa encontrada
                      </span>
                      <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                        Não há registros para os filtros selecionados. Clique em "Nova Medida Administrativa" para cadastrar.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => {
                  const tipoConf = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.ADVERTENCIA_ESCRITA
                  const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.APLICADA

                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Tipo */}
                      <td data-label="Tipo" style={{ padding: '14px 20px' }}>
                        <div className="multas-dot-tip">
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: tipoConf.iconColor }} />
                          <div className="tip-box">{tipoConf.label}</div>
                        </div>
                      </td>

                      {/* Data */}
                      <td data-label="Data" style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                        {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '-'}
                      </td>

                      {/* Colaborador */}
                      <td data-label="Colaborador" style={{ padding: '14px 20px' }}>
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
                              {item.tecnico?.nome ? formatarNomeAbreviado(item.tecnico.nome) : 'Não Vinculado'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Motivo e Descrição */}
                      <td data-label="Motivo" style={{ padding: '14px 20px', maxWidth: 260 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                          {item.motivo}
                        </div>
                        {item.descricao && (
                          <div
                            style={{
                              fontSize: 11,
                              color: '#64748b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: 2,
                            }}
                            title={item.descricao}
                          >
                            {item.descricao}
                          </div>
                        )}
                      </td>

                      {/* Vínculo com Multa */}
                      <td data-label="Vínculo" style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        {item.multaAvaria ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1e40af',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            <Car size={13} />
                            {item.multaAvaria.tipo === 'MULTA' ? 'Multa' : 'Avaria'}
                            {item.multaAvaria.placaVeiculo ? ` (${formatarVeiculo(item.multaAvaria.placaVeiculo)})` : ''}
                            {item.multaAvaria.valor > 0 ? ` - R$ ${item.multaAvaria.valor.toLocaleString('pt-BR')}` : ''}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Sem multa vinculada</span>
                        )}
                      </td>

                      {/* Aplicado Por */}
                      <td data-label="Aplicado Por" style={{ padding: '14px 20px', fontSize: 12, color: '#475569', fontWeight: 600 }}>
                        {item.aplicadoPor || 'Gestão / TST'}
                      </td>

                      {/* Status */}
                      <td data-label="Status" style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                        <div className="multas-dot-tip">
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: statusConf.text }} />
                          <div className="tip-box">{statusConf.label}</div>
                        </div>
                      </td>

                      {/* Ações */}
                      <td data-label="Ações" style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {item.documentoUrl && (
                            <button
                              onClick={() =>
                                setDocVisualizar({
                                  url: item.documentoUrl!,
                                  titulo: `${tipoConf.label} - ${item.tecnico?.nome || ''}`,
                                })
                              }
                              title="Ver Termo"
                              style={{
                                padding: 6,
                                borderRadius: 6,
                                background: '#f8fafc',
                                color: '#660099',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer',
                              }}
                            >
                              <Eye size={15} />
                            </button>
                          )}
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

      {/* Modal Criar / Editar Medida */}
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
              overflow: 'hidden',
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
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>
                    {itemEdicao ? 'Editar Medida Administrativa' : 'Aplicar Medida Administrativa'}
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                    Controle Disciplinar de Colaboradores
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
            <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
                {/* Tipo de Medida */}
                <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  TIPO DE MEDIDA DISCIPLINAR *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setFormTipo('ADVERTENCIA_ESCRITA')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: formTipo === 'ADVERTENCIA_ESCRITA' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                      background: formTipo === 'ADVERTENCIA_ESCRITA' ? '#fee2e2' : '#f8fafc',
                      color: formTipo === 'ADVERTENCIA_ESCRITA' ? '#991b1b' : '#64748b',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    📝 Advertência Escrita
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTipo('ADVERTENCIA_VERBAL')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: formTipo === 'ADVERTENCIA_VERBAL' ? '2px solid #d97706' : '1px solid #e2e8f0',
                      background: formTipo === 'ADVERTENCIA_VERBAL' ? '#fef3c7' : '#f8fafc',
                      color: formTipo === 'ADVERTENCIA_VERBAL' ? '#92400e' : '#64748b',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    🗣️ Advertência Verbal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTipo('SUSPENSAO')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: formTipo === 'SUSPENSAO' ? '2px solid #9333ea' : '1px solid #e2e8f0',
                      background: formTipo === 'SUSPENSAO' ? '#f3e8ff' : '#f8fafc',
                      color: formTipo === 'SUSPENSAO' ? '#6b21a8' : '#64748b',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    ⛔ Suspensão
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTipo('ORIENTACAO_FEEDBACK')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: formTipo === 'ORIENTACAO_FEEDBACK' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: formTipo === 'ORIENTACAO_FEEDBACK' ? '#e0f2fe' : '#f8fafc',
                      color: formTipo === 'ORIENTACAO_FEEDBACK' ? '#075985' : '#64748b',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    💡 Orientação / Feedback
                  </button>
                </div>
              </div>

              {/* Colaborador / Técnico — Custom Picker com Avatar */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                    COLABORADOR / TÉCNICO *
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

                {/* Botão de seleção atual */}
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
                    const t = tecnicos.find((x: any) => x.id === formTecnicoId)
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
                        {t.ativo === false && <span style={{ fontSize: 10, background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>Inativo</span>}
                      </>
                    ) : null
                  })() : (
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Selecione o colaborador...</span>
                  )}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ marginLeft: 'auto', flexShrink: 0, transform: showTecnicoPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>
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
                        placeholder="Buscar colaborador..."
                        value={tecnicoPickerSearch}
                        onChange={(e) => setTecnicoPickerSearch(e.target.value)}
                        autoFocus
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none' }}
                      />
                    </div>
                    {tecnicos
                      .filter((t: any) => mostrarInativos ? true : t.ativo !== false)
                      .filter((t: any) => t.nome.toLowerCase().includes(tecnicoPickerSearch.toLowerCase()))
                      .map((t: any) => (
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
                          {t.ativo === false && <span style={{ fontSize: 10, background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>Inativo</span>}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Data e Quem Aplicou */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    DATA DA MEDIDA *
                  </label>
                  <input
                    type="date"
                    value={formDataMedida}
                    onChange={(e) => setFormDataMedida(e.target.value)}
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

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    APLICADO POR (LÍDER/GESTOR)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos (Coordenador de SST)"
                    value={formAplicadoPor}
                    onChange={(e) => setFormAplicadoPor(e.target.value)}
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

              {/* Motivo Principal */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  MOTIVO PRINCIPAL DA MEDIDA *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <select
                    value={MOTIVOS_COMUNS.includes(formMotivo) ? formMotivo : 'Outro Motivo'}
                    onChange={(e) => {
                      if (e.target.value !== 'Outro Motivo') {
                        setFormMotivo(e.target.value)
                      } else {
                        setFormMotivo('')
                      }
                    }}
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
                    {MOTIVOS_COMUNS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  {(!MOTIVOS_COMUNS.includes(formMotivo) || formMotivo === 'Outro Motivo') && (
                    <input
                      type="text"
                      placeholder="Especifique o motivo personalizado..."
                      value={formMotivo === 'Outro Motivo' ? '' : formMotivo}
                      onChange={(e) => setFormMotivo(e.target.value)}
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
                  )}
                </div>
              </div>

              {/* Vínculo com Multa / Ocorrência */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  VINCULAR A UMA MULTA / AVARIA (OPCIONAL)
                </label>
                <select
                  value={formMultaAvariaId}
                  onChange={(e) => setFormMultaAvariaId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 600,
                    color: formMultaAvariaId ? '#1e40af' : '#64748b',
                    outline: 'none',
                    background: formMultaAvariaId ? '#eff6ff' : '#fff',
                  }}
                >
                  <option value="">Nenhuma multa vinculada</option>
                  {multasDisponiveis.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.tipo}] {new Date(m.dataOcorrencia).toLocaleDateString('pt-BR')} - {m.placaVeiculo ? `Placa ${m.placaVeiculo}` : ''} {m.valor > 0 ? `(R$ ${m.valor.toLocaleString('pt-BR')})` : ''} - {m.descricao || 'Sem descrição'}
                    </option>
                  ))}
                </select>
                <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Permite rastrear o motivo da advertência caso tenha sido originada por infração de trânsito ou sinistro.
                </span>
              </div>

              {/* Descrição Detalhada */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  DESCRIÇÃO CIRCUNSTANCIADA DOS FATOS
                </label>
                <textarea
                  rows={3}
                  placeholder="Relate detalhadamente o ocorrido, artigos ou regras descumpridas e compromissos acordados..."
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

              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  STATUS DA MEDIDA
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
                  <option value="APLICADA">Aplicada</option>
                  <option value="PENDENTE_ASSINATURA">Pendente de Assinatura pelo Colaborador</option>
                  <option value="CANCELADA">Cancelada / Anulada</option>
                </select>
              </div>

              {/* Anexo: Termo Assinado / Documento */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  TERMO ASSINADO / COMPROVANTE (BUCKET SG4-KM)
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
                    {docFileBase64 || docUrlExistente ? 'Trocar Termo / Documento' : 'Selecionar Documento / Foto'}
                  </button>

                  {(docFileBase64 || docUrlExistente) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocFileBase64(null)
                        setDocFileName(null)
                        setDocUrlExistente(null)
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

                {docFileName && (
                  <span style={{ display: 'block', fontSize: 12, color: PURPLE, fontWeight: 700, marginTop: 6 }}>
                    Arquivo pronto para envio: {docFileName}
                  </span>
                )}
                {docUrlExistente && !docFileName && (
                  <span style={{ display: 'block', fontSize: 12, color: '#15803d', fontWeight: 700, marginTop: 6 }}>
                    ✓ Documento atual gravado no sistema
                  </span>
                )}
              </div>

              </div>

              {/* Botões do Rodapé */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                  padding: '16px 24px',
                  borderTop: '1px solid #f1f5f9',
                  background: '#f8fafc',
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
                  disabled={isPending || isUploadingDoc}
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
                    cursor: isPending || isUploadingDoc ? 'not-allowed' : 'pointer',
                    opacity: isPending || isUploadingDoc ? 0.7 : 1,
                  }}
                >
                  {(isPending || isUploadingDoc) && (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  )}
                  {itemEdicao ? 'Salvar Alterações' : 'Aplicar Medida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizador de Documento / Foto */}
      {docVisualizar && (
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
          onClick={() => setDocVisualizar(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
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
              <span style={{ fontSize: 15, fontWeight: 700 }}>{docVisualizar.titulo}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <a
                  href={docVisualizar.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: PURPLE,
                    color: '#fff',
                    textDecoration: 'none',
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Abrir em Nova Aba
                </a>
                <button
                  onClick={() => setDocVisualizar(null)}
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
            </div>

            {docVisualizar.url.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={docVisualizar.url}
                title="Documento PDF"
                style={{
                  width: '100%',
                  height: '75vh',
                  borderRadius: 10,
                  background: '#fff',
                  border: 'none',
                }}
              />
            ) : (
              <img
                src={docVisualizar.url}
                alt={docVisualizar.titulo}
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  borderRadius: 10,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  objectFit: 'contain',
                }}
              />
            )}
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
              Deseja realmente excluir este registro de medida administrativa do colaborador{' '}
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
