'use client'

import { useState, useEffect, useMemo, useTransition, useRef } from 'react'
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  PlusCircle,
  UploadCloud,
  History,
  Trash2,
  ExternalLink,
  Mail,
  Loader2,
  X,
  FileCheck,
  Calendar,
  User,
  ShieldAlert,
  Info,
  ChevronDown,
  Layers,
  Settings,
  Send,
  Plus,
  Shield,
  HardHat
} from 'lucide-react'
import {
  getDocumentosTecnicos,
  getTiposDocumentos,
  salvarDocumentoTecnico,
  deleteDocumentoTecnico,
  uploadArquivoDocumento,
  createTipoDocumento,
  deleteTipoDocumento,
  verificarENotificarDocumentosVencendo,
  enviarDocumentosDoTecnicoPorEmail,
} from '@/app/actions/documentosTecnicos'
import { getTecnicos } from '@/app/actions/tecnicos'

const PURPLE = '#660099'
const PURPLE_BG = 'rgba(102,0,153,0.08)'

type TecnicoItem = {
  id: string
  nome: string
  email: string | null
  cargo: string
  ativo: boolean
  fotoUrl: string | null
  matriculaArkium: string | null
}

type TipoDocItem = {
  id: string
  nome: string
  descricao: string | null
  validadeMeses: number | null
  diasAlerta: number
  obrigatorio: boolean
  ativo: boolean
}

type ItemEpi = {
  nome: string
  validadeMeses: number
  dataEntrega: string
  dataVencimento: string
}

type HistoricoItem = {
  id: string
  arquivoUrl: string
  arquivoNome: string
  arquivoTamanho: number | null
  dataEmissao: string
  dataVencimento: string | null
  modificadoPor: string | null
  motivoSubstituicao: string | null
  createdAt: string
}

type DocumentoItem = {
  id: string
  tecnicoId: string
  tipoDocumentoId: string
  titulo: string | null
  arquivoUrl: string
  arquivoNome: string
  arquivoTamanho: number | null
  dataEmissao: string
  dataVencimento: string | null
  status: 'VALIDO' | 'A_VENCER' | 'VENCIDO' | 'SEM_VALIDADE'
  observacoes: string | null
  itensEpi?: ItemEpi[] | null
  cadastradoPor: string | null
  ultimoAlertaEmail: string | null
  createdAt: string
  tecnico: TecnicoItem
  tipoDocumento: TipoDocItem
  historico: HistoricoItem[]
}

export default function DocumentosTecnicosPage({
  hideHeader = false,
  onOpenAddRef,
}: {
  hideHeader?: boolean
  onOpenAddRef?: React.MutableRefObject<(() => void) | null>
} = {}) {
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([])
  const [tiposDocs, setTiposDocs] = useState<TipoDocItem[]>([])
  const [tecnicos, setTecnicos] = useState<TecnicoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Filtros
  const [filtroTecnico, setFiltroTecnico] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busca, setBusca] = useState('')

  // Modais
  const [modalUploadAberto, setModalUploadAberto] = useState(false)
  const [modalHistoricoDoc, setModalHistoricoDoc] = useState<DocumentoItem | null>(null)
  const [modalNovoTipoAberto, setModalNovoTipoAberto] = useState(false)
  const [notificandoEmail, setNotificandoEmail] = useState(false)
  const [enviandoDossieTecnicoId, setEnviandoDossieTecnicoId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)

  // Custom Picker de Técnico no Modal
  const [showTecnicoPicker, setShowTecnicoPicker] = useState(false)
  const [tecnicoPickerSearch, setTecnicoPickerSearch] = useState('')

  // Form Upload / Renovação
  const [selectedTecnicoId, setSelectedTecnicoId] = useState('')
  const [selectedTipoId, setSelectedTipoId] = useState('')
  const [tituloDoc, setTituloDoc] = useState('')
  const [dataEmissao, setDataEmissao] = useState('')
  const [dataVencimentoManual, setDataVencimentoManual] = useState('')
  const [usarVencimentoManual, setUsarVencimentoManual] = useState(false)
  const [observacoes, setObservacoes] = useState('')
  const [arquivoFile, setArquivoFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Itens da Ficha de EPI
  const [itensEpi, setItensEpi] = useState<ItemEpi[]>([])
  const [novoItemNome, setNovoItemNome] = useState('')
  const [novoItemValidadeMeses, setNovoItemValidadeMeses] = useState<number>(12)

  // Form Novo Tipo
  const [novoTipoNome, setNovoTipoNome] = useState('')
  const [novoTipoDescricao, setNovoTipoDescricao] = useState('')
  const [novoTipoValidadeMeses, setNovoTipoValidadeMeses] = useState<string>('12')
  const [novoTipoDiasAlerta, setNovoTipoDiasAlerta] = useState<number>(45)
  const [novoTipoObrigatorio, setNovoTipoObrigatorio] = useState(true)

  // Carregar dados iniciais
  const carregarDados = async () => {
    setLoading(true)
    try {
      const [resDocs, resTipos, resTecs] = await Promise.all([
        getDocumentosTecnicos({ apenasAtivos: true }),
        getTiposDocumentos(),
        getTecnicos(),
      ])

      if (resDocs.success && resDocs.data) setDocumentos(resDocs.data as any)
      if (resTipos.success && resTipos.data) setTiposDocs(resTipos.data as any)
      if (resTecs.success && resTecs.data) {
        setTecnicos(resTecs.data.filter((t: any) => t.ativo) as any)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    if (onOpenAddRef) {
      onOpenAddRef.current = () => {
        limparFormUpload()
        setModalUploadAberto(true)
      }
    }
  }, [onOpenAddRef])

  // Verifica se o tipo selecionado é Ficha de EPI
  const isFichaEpi = useMemo(() => {
    const tipo = tiposDocs.find(t => t.id === selectedTipoId)
    return tipo?.nome?.toLowerCase().includes('epi') || false
  }, [selectedTipoId, tiposDocs])

  // Recalcula datas de vencimento dos itens de EPI se a data de emissão mudar
  useEffect(() => {
    if (dataEmissao && isFichaEpi) {
      setItensEpi(prev => prev.map(item => {
        const entrega = item.dataEntrega || dataEmissao
        const d = new Date(entrega)
        d.setMonth(d.getMonth() + item.validadeMeses)
        return {
          ...item,
          dataEntrega: entrega,
          dataVencimento: d.toISOString().split('T')[0],
        }
      }))
    }
  }, [dataEmissao, isFichaEpi])

  // Vencimento estimado padrão ou o item de EPI que vence PRIMEIRO
  const vencimentoEstimado = useMemo(() => {
    if (isFichaEpi && itensEpi.length > 0) {
      const datasValidas = itensEpi
        .map(i => i.dataVencimento ? new Date(i.dataVencimento).getTime() : null)
        .filter((t): t is number => t !== null && !isNaN(t))

      if (datasValidas.length > 0) {
        const minDate = new Date(Math.min(...datasValidas))
        return minDate.toISOString().split('T')[0]
      }
    }

    if (!dataEmissao) return ''
    const tipo = tiposDocs.find(t => t.id === selectedTipoId)
    if (!tipo || !tipo.validadeMeses) return ''

    const dt = new Date(dataEmissao)
    dt.setMonth(dt.getMonth() + tipo.validadeMeses)
    return dt.toISOString().split('T')[0]
  }, [dataEmissao, selectedTipoId, tiposDocs, isFichaEpi, itensEpi])

  // Helpers para manipular itens de EPI
  const handleAtualizarItemEpi = (index: number, campo: keyof ItemEpi, valor: any) => {
    setItensEpi(prev => {
      const novo = [...prev]
      novo[index] = { ...novo[index], [campo]: valor }

      if (campo === 'dataEntrega' || campo === 'validadeMeses') {
        const entrega = campo === 'dataEntrega' ? valor : novo[index].dataEntrega
        const valMeses = campo === 'validadeMeses' ? Number(valor) : novo[index].validadeMeses
        if (entrega && valMeses > 0) {
          const d = new Date(entrega)
          d.setMonth(d.getMonth() + valMeses)
          novo[index].dataVencimento = d.toISOString().split('T')[0]
        }
      }
      return novo
    })
  }

  const handleAdicionarItemEpi = () => {
    if (!novoItemNome.trim()) return
    const entrega = dataEmissao || new Date().toISOString().split('T')[0]
    const d = new Date(entrega)
    d.setMonth(d.getMonth() + (novoItemValidadeMeses || 12))

    setItensEpi(prev => [
      ...prev,
      {
        nome: novoItemNome.trim(),
        validadeMeses: novoItemValidadeMeses || 12,
        dataEntrega: entrega,
        dataVencimento: d.toISOString().split('T')[0],
      }
    ])
    setNovoItemNome('')
    setNovoItemValidadeMeses(12)
  }

  const handleRemoverItemEpi = (index: number) => {
    setItensEpi(prev => prev.filter((_, i) => i !== index))
  }

  // Contadores de estatísticas (Dashboard Cards)
  const contadores = useMemo(() => {
    const total = documentos.length
    const validos = documentos.filter(d => d.status === 'VALIDO').length
    const aVencer = documentos.filter(d => d.status === 'A_VENCER').length
    const vencidos = documentos.filter(d => d.status === 'VENCIDO').length
    const semValidade = documentos.filter(d => d.status === 'SEM_VALIDADE').length
    return { total, validos, aVencer, vencidos, semValidade }
  }, [documentos])

  // Lista filtrada
  const documentosFiltrados = useMemo(() => {
    return documentos.filter(doc => {
      if (filtroTecnico !== 'todos' && doc.tecnicoId !== filtroTecnico) return false
      if (filtroTipo !== 'todos' && doc.tipoDocumentoId !== filtroTipo) return false
      if (filtroStatus !== 'todos' && doc.status !== filtroStatus) return false
      if (busca.trim()) {
        const termo = busca.toLowerCase()
        const matchTec = doc.tecnico?.nome?.toLowerCase().includes(termo)
        const matchTipo = doc.tipoDocumento?.nome?.toLowerCase().includes(termo)
        const matchArq = doc.arquivoNome?.toLowerCase().includes(termo)
        if (!matchTec && !matchTipo && !matchArq) return false
      }
      return true
    })
  }, [documentos, filtroTecnico, filtroTipo, filtroStatus, busca])

  // Submeter Upload de Documento
  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTecnicoId || !selectedTipoId || !dataEmissao) {
      setFeedback({ tipo: 'erro', msg: 'Preencha todos os campos obrigatórios (Técnico, Tipo e Emissão).' })
      return
    }

    if (!arquivoFile) {
      setFeedback({ tipo: 'erro', msg: 'Selecione um arquivo (PDF, imagem ou documento) para enviar.' })
      return
    }

    setUploadProgress(true)
    try {
      const reader = new FileReader()
      reader.readAsDataURL(arquivoFile)
      reader.onload = async () => {
        const base64Data = reader.result as string
        const formData = new FormData()
        formData.append('fileData', base64Data)
        formData.append('fileName', arquivoFile.name)
        formData.append('contentType', arquivoFile.type)

        const uploadRes = await uploadArquivoDocumento(formData)
        if (!uploadRes.success || !uploadRes.url) {
          setUploadProgress(false)
          setFeedback({ tipo: 'erro', msg: uploadRes.error || 'Falha no upload do arquivo.' })
          return
        }

        const dataVencFinal = usarVencimentoManual && dataVencimentoManual
          ? dataVencimentoManual
          : (vencimentoEstimado || null)

        const saveRes = await salvarDocumentoTecnico({
          tecnicoId: selectedTecnicoId,
          tipoDocumentoId: selectedTipoId,
          titulo: tituloDoc,
          arquivoUrl: uploadRes.url,
          arquivoNome: arquivoFile.name,
          arquivoTamanho: uploadRes.sizeBytes,
          dataEmissao,
          dataVencimento: dataVencFinal,
          observacoes,
          itensEpi: isFichaEpi ? itensEpi : undefined,
        })

        setUploadProgress(false)
        if (saveRes.success) {
          setModalUploadAberto(false)
          limparFormUpload()
          setFeedback({ tipo: 'sucesso', msg: 'Documento registrado e versionado com sucesso!' })
          carregarDados()
        } else {
          setFeedback({ tipo: 'erro', msg: saveRes.error || 'Erro ao registrar documento.' })
        }
      }
    } catch (err: any) {
      setUploadProgress(false)
      setFeedback({ tipo: 'erro', msg: 'Ocorreu um erro ao processar o envio.' })
    }
  }

  const limparFormUpload = () => {
    setSelectedTecnicoId('')
    setSelectedTipoId('')
    setTituloDoc('')
    setDataEmissao('')
    setDataVencimentoManual('')
    setUsarVencimentoManual(false)
    setObservacoes('')
    setArquivoFile(null)
    setShowTecnicoPicker(false)
    setTecnicoPickerSearch('')
    setItensEpi([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Criar Novo Tipo de Documento
  const handleCriarTipo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoTipoNome.trim()) return

    startTransition(async () => {
      const res = await createTipoDocumento({
        nome: novoTipoNome,
        descricao: novoTipoDescricao,
        validadeMeses: novoTipoValidadeMeses ? Number(novoTipoValidadeMeses) : null,
        diasAlerta: novoTipoDiasAlerta || 45,
        obrigatorio: novoTipoObrigatorio,
      })

      if (res.success) {
        setModalNovoTipoAberto(false)
        setNovoTipoNome('')
        setNovoTipoDescricao('')
        setFeedback({ tipo: 'sucesso', msg: 'Novo tipo de documento adicionado!' })
        const tiposRes = await getTiposDocumentos()
        if (tiposRes.success && tiposRes.data) setTiposDocs(tiposRes.data as any)
      } else {
        setFeedback({ tipo: 'erro', msg: res.error || 'Erro ao criar tipo de documento.' })
      }
    })
  }

  // Excluir Tipo de Documento / Treinamento
  const handleExcluirTipo = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente remover o tipo de treinamento "${nome}"?`)) return

    startTransition(async () => {
      const res = await deleteTipoDocumento(id)
      if (res.success) {
        setFeedback({ tipo: 'sucesso', msg: `Tipo "${nome}" excluído com sucesso.` })
        const tiposRes = await getTiposDocumentos()
        if (tiposRes.success && tiposRes.data) setTiposDocs(tiposRes.data as any)
      } else {
        setFeedback({ tipo: 'erro', msg: res.error || 'Erro ao excluir tipo de documento.' })
      }
    })
  }

  // Excluir Documento
  const handleExcluir = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente remover o documento "${nome}"? O histórico associado também será excluído.`)) return

    startTransition(async () => {
      const res = await deleteDocumentoTecnico(id)
      if (res.success) {
        setFeedback({ tipo: 'sucesso', msg: 'Documento excluído com sucesso.' })
        carregarDados()
      } else {
        setFeedback({ tipo: 'erro', msg: res.error || 'Falha ao excluir documento.' })
      }
    })
  }

  // Disparar Verificação Manual de Notificação por E-mail
  const handleDispararNotificacoes = async () => {
    setNotificandoEmail(true)
    try {
      const res = await verificarENotificarDocumentosVencendo()
      if (res.success) {
        setFeedback({ tipo: 'sucesso', msg: res.message || 'Verificação concluída!' })
        carregarDados()
      } else {
        setFeedback({ tipo: 'erro', msg: res.message || res.error || 'Erro ao disparar notificações.' })
      }
    } catch (e) {
      setFeedback({ tipo: 'erro', msg: 'Falha na comunicação com o servidor de e-mail.' })
    } finally {
      setNotificandoEmail(false)
    }
  }

  // Enviar Dossiê com Todos os Documentos do Técnico por E-mail
  const handleEnviarDossieTecnico = async (tecId: string, tecNome: string) => {
    if (!confirm(`Deseja enviar por e-mail para os administradores todos os documentos atualizados de ${tecNome}?`)) return

    setEnviandoDossieTecnicoId(tecId)
    try {
      const res = await enviarDocumentosDoTecnicoPorEmail(tecId)
      if (res.success) {
        setFeedback({ tipo: 'sucesso', msg: res.message || 'Dossiê enviado com sucesso!' })
      } else {
        setFeedback({ tipo: 'erro', msg: res.error || 'Erro ao enviar documentos por e-mail.' })
      }
    } catch (e) {
      setFeedback({ tipo: 'erro', msg: 'Falha ao enviar e-mail.' })
    } finally {
      setEnviandoDossieTecnicoId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* ─── TOPO / CABEÇALHO ─── */}
      {!hideHeader && (
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
              <FileCheck size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Documentos dos Técnicos
              </h1>
            </div>
          </div>

          <button
            onClick={() => {
              limparFormUpload()
              setModalUploadAberto(true)
            }}
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
            + Doc./Renovação
          </button>
        </div>
      )}

      {/* ─── BARRA DE GUIAS / AÇÕES AUXILIARES FORA DO TÍTULO ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        {/* Envio rápido por Técnico */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {filtroTecnico !== 'todos' && (
            <button
              onClick={() => {
                const tec = tecnicos.find(t => t.id === filtroTecnico)
                if (tec) handleEnviarDossieTecnico(tec.id, tec.nome)
              }}
              disabled={enviandoDossieTecnicoId === filtroTecnico}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 8,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                fontSize: 13,
                fontWeight: 700,
                cursor: enviandoDossieTecnicoId ? 'not-allowed' : 'pointer',
              }}
            >
              {enviandoDossieTecnicoId === filtroTecnico ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} color="#16a34a" />
              )}
              Enviar Documentos do Técnico por E-mail
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setModalNovoTipoAberto(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 8,
              background: '#fff',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <Settings size={15} color={PURPLE} /> Tipos de Documentos & Validades
          </button>

          <button
            onClick={handleDispararNotificacoes}
            disabled={notificandoEmail}
            title="Verifica vencimentos com 45 dias de antecedência e envia e-mail aos administradores"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 8,
              background: '#fff',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: notificandoEmail ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            {notificandoEmail ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} color={PURPLE} />}
            Verificar & Notificar E-mails
          </button>
        </div>
      </div>

      {/* ─── ALERTAS / FEEDBACK ─── */}
      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: feedback.tipo === 'sucesso' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${feedback.tipo === 'sucesso' ? '#bbf7d0' : '#fecaca'}`,
          color: feedback.tipo === 'sucesso' ? '#166534' : '#991b1b',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {feedback.tipo === 'sucesso' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─── CARDS DE STATUS / RESUMO (FINOS E COMPACTOS) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div style={{
          background: '#fff',
          borderRadius: 10,
          padding: '14px 18px',
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{contadores.total}</div>
            <FileText size={18} color="#64748b" />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginTop: 6 }}>
            Total Cadastrados
          </div>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: 10,
          padding: '14px 18px',
          border: '1px solid #f1f5f9',
          borderLeft: '4px solid #10b981',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{contadores.validos}</div>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginTop: 6 }}>
            Válidos
          </div>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: 10,
          padding: '14px 18px',
          border: '1px solid #f1f5f9',
          borderLeft: '4px solid #f59e0b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{contadores.aVencer}</div>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginTop: 6 }}>
            A Vencer (&le; 45 dias)
          </div>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: 10,
          padding: '14px 18px',
          border: '1px solid #f1f5f9',
          borderLeft: '4px solid #ef4444',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{contadores.vencidos}</div>
            <AlertTriangle size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginTop: 6 }}>
            Vencidos
          </div>
        </div>
      </div>

      {/* ─── FILTROS & BUSCA ─── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '16px 20px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 14,
        alignItems: 'center',
      }}>
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            placeholder="Buscar por técnico, documento ou arquivo..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        <div style={{ minWidth: 200 }}>
          <select
            value={filtroTecnico}
            onChange={e => setFiltroTecnico(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 13,
              background: '#fff',
              outline: 'none',
            }}
          >
            <option value="todos">Todos os Técnicos Ativos</option>
            {tecnicos.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 200 }}>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 13,
              background: '#fff',
              outline: 'none',
            }}
          >
            <option value="todos">Todos os Tipos de Documento</option>
            {tiposDocs.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 160 }}>
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 13,
              background: '#fff',
              outline: 'none',
            }}
          >
            <option value="todos">Todos os Status</option>
            <option value="VALIDO">Válido</option>
            <option value="A_VENCER">A Vencer (&le; 45 dias)</option>
            <option value="VENCIDO">Vencido</option>
            <option value="SEM_VALIDADE">Sem Validade Fixa</option>
          </select>
        </div>
      </div>

      {/* ─── TABELA DE DOCUMENTOS ─── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: PURPLE }} />
            <p>Carregando documentos...</p>
          </div>
        ) : documentosFiltrados.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, fontSize: 15 }}>Nenhum documento encontrado.</p>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              Clique em "+ Doc./Renovação" para anexar o primeiro arquivo.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
                  <th style={{ padding: '12px 18px' }}>Técnico</th>
                  <th style={{ padding: '12px 18px' }}>Documento</th>
                  <th style={{ padding: '12px 18px' }}>Emissão</th>
                  <th style={{ padding: '12px 18px' }}>Vencimento</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px' }}>Arquivo Ativo</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Histórico</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {documentosFiltrados.map((doc) => {
                  const emissaoFmt = new Date(doc.dataEmissao).toLocaleDateString('pt-BR')
                  const vencimentoFmt = doc.dataVencimento ? new Date(doc.dataVencimento).toLocaleDateString('pt-BR') : 'Sem validade'

                  let statusBadge = { bg: '#ecfdf5', color: '#059669', label: 'Válido' }
                  if (doc.status === 'A_VENCER') statusBadge = { bg: '#fffbeb', color: '#d97706', label: 'A Vencer' }
                  if (doc.status === 'VENCIDO') statusBadge = { bg: '#fef2f2', color: '#dc2626', label: 'Vencido' }
                  if (doc.status === 'SEM_VALIDADE') statusBadge = { bg: '#f1f5f9', color: '#475569', label: 'Sem Validade' }

                  const temItensEpi = Array.isArray(doc.itensEpi) && (doc.itensEpi as any[]).length > 0

                  return (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Técnico */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#475569',
                            overflow: 'hidden',
                          }}>
                            {doc.tecnico?.fotoUrl ? (
                              <img src={doc.tecnico.fotoUrl} alt={doc.tecnico.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              doc.tecnico?.nome?.charAt(0) || 'T'
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{doc.tecnico?.nome}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{doc.tecnico?.cargo || 'Técnico de Segurança'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Tipo de Documento */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{doc.tipoDocumento?.nome}</div>
                        {doc.titulo && <div style={{ fontSize: 11, color: '#64748b' }}>{doc.titulo}</div>}
                        {temItensEpi && (
                          <div style={{ fontSize: 11, color: PURPLE, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <HardHat size={12} />
                            {(doc.itensEpi as any[]).length} item(ns) de EPI controlados
                          </div>
                        )}
                      </td>

                      {/* Emissão */}
                      <td style={{ padding: '14px 18px', color: '#475569' }}>
                        {emissaoFmt}
                      </td>

                      {/* Vencimento */}
                      <td style={{ padding: '14px 18px', fontWeight: doc.status === 'VENCIDO' ? 700 : 500, color: doc.status === 'VENCIDO' ? '#dc2626' : '#334155' }}>
                        {vencimentoFmt}
                        {temItensEpi && (
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>Regido pelo item mais recente</div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          background: statusBadge.bg,
                          color: statusBadge.color,
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-block',
                        }}>
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Link Arquivo */}
                      <td style={{ padding: '14px 18px' }}>
                        <a
                          href={doc.arquivoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: PURPLE,
                            textDecoration: 'none',
                            fontWeight: 600,
                            maxWidth: 160,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={doc.arquivoNome}
                        >
                          <ExternalLink size={14} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.arquivoNome}</span>
                        </a>
                      </td>

                      {/* Histórico / Versões */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <button
                          onClick={() => setModalHistoricoDoc(doc)}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 6,
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#475569',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <History size={14} />
                          {doc.historico?.length || 0} rev.
                        </button>
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => handleEnviarDossieTecnico(doc.tecnicoId, doc.tecnico?.nome)}
                            title={`Enviar por e-mail todos os documentos de ${doc.tecnico?.nome} aos administradores`}
                            disabled={enviandoDossieTecnicoId === doc.tecnicoId}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#16a34a',
                              cursor: 'pointer',
                              padding: 6,
                              borderRadius: 4,
                            }}
                          >
                            <Send size={16} />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedTecnicoId(doc.tecnicoId)
                              setSelectedTipoId(doc.tipoDocumentoId)
                              setModalUploadAberto(true)
                            }}
                            title="Renovar / Substituir por nova versão"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: PURPLE,
                              cursor: 'pointer',
                              padding: 6,
                              borderRadius: 4,
                            }}
                          >
                            <UploadCloud size={16} />
                          </button>

                          <button
                            onClick={() => handleExcluir(doc.id, doc.tipoDocumento?.nome)}
                            title="Excluir documento"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: 6,
                              borderRadius: 4,
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL PADRÃO SG4: UPLOAD / RENOVAÇÃO DE DOCUMENTO ─── */}
      {modalUploadAberto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 620,
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header Modal - Gradiente Roxo Padrão SG4 */}
            <div style={{
              padding: '18px 24px',
              background: `linear-gradient(135deg, ${PURPLE} 0%, #4a0072 100%)`,
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>
                    Registrar / Renovar Documento
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                    Gestão de Documentos SST & Ficha de EPI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalUploadAberto(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                  borderRadius: 6,
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulário com Scroll Interno */}
            <form onSubmit={handleSubmitUpload} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
                {/* Técnico Responsável — Custom Picker Padrão com Avatar */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    TÉCNICO DE SEGURANÇA (ATIVO) *
                  </label>
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
                    {selectedTecnicoId ? (() => {
                      const t = tecnicos.find(x => x.id === selectedTecnicoId)
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
                            <div style={{ fontSize: 11, color: '#64748b' }}>{t.cargo || 'TST'}</div>
                          </div>
                        </>
                      ) : null
                    })() : (
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>Selecione o técnico...</span>
                    )}
                    <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 'auto', transform: showTecnicoPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {/* Dropdown de Técnicos */}
                  {showTecnicoPicker && (
                    <div style={{
                      border: `1px solid ${PURPLE}`,
                      borderTop: 'none',
                      borderRadius: '0 0 8px 8px',
                      background: '#fff',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      maxHeight: 220,
                      overflowY: 'auto',
                      marginTop: 2,
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
                        .filter(t => t.nome.toLowerCase().includes(tecnicoPickerSearch.toLowerCase()))
                        .map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => { setSelectedTecnicoId(t.id); setShowTecnicoPicker(false); setTecnicoPickerSearch('') }}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              background: selectedTecnicoId === t.id ? PURPLE_BG : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            {t.fotoUrl ? (
                              <img src={t.fotoUrl} alt={t.nome} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 26, height: 26, borderRadius: '50%', background: PURPLE_BG, color: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                                {t.nome.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{t.nome}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{t.cargo}</div>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Tipo de Documento */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    TIPO DE DOCUMENTO / CAPACITAÇÃO *
                  </label>
                  <select
                    required
                    value={selectedTipoId}
                    onChange={e => setSelectedTipoId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  >
                    <option value="">Selecione o tipo de documento...</option>
                    {tiposDocs.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nome} {t.validadeMeses ? `(${t.validadeMeses} meses de validade padrão)` : '(sem validade periódica)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Módulo Especial: Controle de Itens da Ficha de EPI */}
                {isFichaEpi && (
                  <div style={{
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: 10,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: PURPLE, fontSize: 13 }}>
                        <HardHat size={16} />
                        Itens da Ficha de EPI (Validade Individual)
                      </div>
                      <span style={{ fontSize: 11, color: '#7e22ce', fontWeight: 600 }}>
                        Vence no item mais recente/próximo
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {itensEpi.map((item, idx) => (
                        <div key={idx} style={{
                          display: 'grid',
                          gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto',
                          gap: 8,
                          alignItems: 'center',
                          background: '#fff',
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid #f3e8ff',
                          fontSize: 12,
                        }}>
                          <div>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.nome}</span>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Validade</label>
                            <input
                              type="number"
                              min="1"
                              value={item.validadeMeses}
                              onChange={e => handleAtualizarItemEpi(idx, 'validadeMeses', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Entrega</label>
                            <input
                              type="date"
                              value={item.dataEntrega}
                              onChange={e => handleAtualizarItemEpi(idx, 'dataEntrega', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Vence em</label>
                            <span style={{ fontWeight: 700, color: '#dc2626' }}>
                              {item.dataVencimento ? new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoverItemEpi(idx)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Adicionar novo item de EPI à ficha */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <input
                        type="text"
                        placeholder="Nome do EPI (ex: Bota de Segurança, Protetor Auricular...)"
                        value={novoItemNome}
                        onChange={e => setNovoItemNome(e.target.value)}
                        style={{ flex: 2, padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none' }}
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Meses"
                        value={novoItemValidadeMeses}
                        onChange={e => setNovoItemValidadeMeses(Number(e.target.value))}
                        style={{ width: 80, padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={handleAdicionarItemEpi}
                        style={{
                          background: PURPLE,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '0 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>
                  </div>
                )}

                {/* Título ou Observação Específica */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    TÍTULO / OBSERVAÇÃO ADICIONAL (OPCIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Treinamento NR-35 turma 2026 / Periódico Anual"
                    value={tituloDoc}
                    onChange={e => setTituloDoc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Datas de Emissão e Vencimento */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      DATA DE EMISSÃO / ENTREGA *
                    </label>
                    <input
                      type="date"
                      required
                      value={dataEmissao}
                      onChange={e => setDataEmissao(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      VENCIMENTO {usarVencimentoManual ? '(MANUAL)' : '(CALCULADO)'}
                    </label>
                    {usarVencimentoManual ? (
                      <input
                        type="date"
                        value={dataVencimentoManual}
                        onChange={e => setDataVencimentoManual(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={vencimentoEstimado ? new Date(vencimentoEstimado + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem validade padrão'}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          fontSize: 13,
                          color: '#475569',
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="chkManual"
                    checked={usarVencimentoManual}
                    onChange={e => setUsarVencimentoManual(e.target.checked)}
                    style={{ accentColor: PURPLE }}
                  />
                  <label htmlFor="chkManual" style={{ fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                    Informar data de vencimento personalizada / diferente do cálculo
                  </label>
                </div>

                {/* Upload do Arquivo (Bucket S3) */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    ARQUIVO DO DOCUMENTO (BUCKET sg4-docststs) *
                  </label>
                  <div style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: 10,
                    padding: 18,
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setArquivoFile(e.target.files[0])
                        }
                      }}
                    />
                    <UploadCloud size={30} color={PURPLE} style={{ margin: '0 auto 8px' }} />
                    {arquivoFile ? (
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{arquivoFile.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{(arquivoFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>Clique para selecionar o arquivo</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>PDF, PNG, JPG (Armazenado com histórico)</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    OBSERVAÇÕES (OPCIONAL)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Renovação periódica, observações adicionais..."
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              {/* Footer Modal Padrão SG4 */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
              }}>
                <button
                  type="button"
                  onClick={() => setModalUploadAberto(false)}
                  disabled={uploadProgress}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    background: '#fff',
                    border: '1px solid #cbd5e1',
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
                  disabled={uploadProgress}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 8,
                    background: `linear-gradient(135deg, ${PURPLE}, #4a0072)`,
                    border: 'none',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: uploadProgress ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(102,0,153,0.25)',
                  }}
                >
                  {uploadProgress ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                  {uploadProgress ? 'Enviando...' : 'Salvar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL HISTÓRICO DE VERSÕES DO DOCUMENTO ─── */}
      {modalHistoricoDoc && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 650,
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: '18px 24px',
              background: `linear-gradient(135deg, ${PURPLE} 0%, #4a0072 100%)`,
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <History size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>
                    Histórico de Versões
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                    {modalHistoricoDoc.tipoDocumento?.nome} - {modalHistoricoDoc.tecnico?.nome}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalHistoricoDoc(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: 6, padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
              {/* Versão Atual Ativa */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: PURPLE, textTransform: 'uppercase' }}>
                    Versão Atual Ativa
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Cadastrado em {new Date(modalHistoricoDoc.createdAt).toLocaleDateString('pt-BR')} por {modalHistoricoDoc.cadastradoPor || 'Admin'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{modalHistoricoDoc.arquivoNome}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Emissão: {new Date(modalHistoricoDoc.dataEmissao).toLocaleDateString('pt-BR')} | Vencimento: {modalHistoricoDoc.dataVencimento ? new Date(modalHistoricoDoc.dataVencimento).toLocaleDateString('pt-BR') : 'Sem validade'}
                    </div>
                  </div>
                  <a
                    href={modalHistoricoDoc.arquivoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: PURPLE,
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: 6,
                      textDecoration: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <ExternalLink size={14} /> Visualizar
                  </a>
                </div>
              </div>

              {/* Versões Anteriores */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 12, textTransform: 'uppercase' }}>
                  Versões Anteriores Preservadas ({modalHistoricoDoc.historico?.length || 0})
                </h3>

                {modalHistoricoDoc.historico?.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
                    Nenhuma versão anterior cadastrada. Esta é a primeira via do documento.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {modalHistoricoDoc.historico?.map((hist) => (
                      <div
                        key={hist.id}
                        style={{
                          border: '1px solid #f1f5f9',
                          borderRadius: 8,
                          padding: 12,
                          background: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>{hist.arquivoNome}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            Substituído em {new Date(hist.createdAt).toLocaleDateString('pt-BR')} por {hist.modificadoPor || 'Admin'}
                          </div>
                          {hist.motivoSubstituicao && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              Motivo: {hist.motivoSubstituicao}
                            </div>
                          )}
                        </div>
                        <a
                          href={hist.arquivoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#334155',
                            padding: '6px 12px',
                            borderRadius: 6,
                            textDecoration: 'none',
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <ExternalLink size={14} /> Abrir Cópia
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL PADRÃO: CADASTRAR TIPO DE DOCUMENTO / VALIDADES ─── */}
      {modalNovoTipoAberto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 520,
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }}>
            <div style={{
              padding: '18px 24px',
              background: `linear-gradient(135deg, ${PURPLE} 0%, #4a0072 100%)`,
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>
                    Tipos de Treinamentos & Validades
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                    Configuração de regras e prazos de vencimento
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNovoTipoAberto(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: 6, padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCriarTipo} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  NOME DO DOCUMENTO / TREINAMENTO *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treinamento NR-35, Treinamento NR-33, ASO..."
                  value={novoTipoNome}
                  onChange={e => setNovoTipoNome(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  DESCRIÇÃO DA NORMA / FINALIDADE
                </label>
                <input
                  type="text"
                  placeholder="Ex: Certificado de capacitação periódica ou reciclagem"
                  value={novoTipoDescricao}
                  onChange={e => setNovoTipoDescricao(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    VALIDADE PADRÃO (MESES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 12 ou 24"
                    value={novoTipoValidadeMeses}
                    onChange={e => setNovoTipoValidadeMeses(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Vazio = sem validade periódica</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    ALERTA PRÉVIO (DIAS)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={novoTipoDiasAlerta}
                    onChange={e => setNovoTipoDiasAlerta(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Padrão: 45 dias antes</span>
                </div>
              </div>

              {/* Lista dos tipos já cadastrados no banco */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 4 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  TIPOS CADASTRADOS NO BANCO ({tiposDocs.length})
                </label>
                {tiposDocs.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                    Nenhum tipo cadastrado no momento. Cadastre acima para que apareça nas opções.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                    {tiposDocs.map(tipo => (
                      <div
                        key={tipo.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: '#f8fafc',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ overflow: 'hidden' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{tipo.nome}</span>
                          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
                            {tipo.validadeMeses ? `${tipo.validadeMeses} meses` : 'Sem validade'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleExcluirTipo(tipo.id, tipo.nome)}
                          disabled={isPending}
                          title="Remover tipo de treinamento do banco de dados"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 4,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                margin: '12px -24px -24px -24px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
              }}>
                <button
                  type="button"
                  onClick={() => setModalNovoTipoAberto(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    background: '#fff',
                    border: '1px solid #cbd5e1',
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
                  disabled={isPending}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 8,
                    background: `linear-gradient(135deg, ${PURPLE}, #4a0072)`,
                    border: 'none',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(102,0,153,0.25)',
                  }}
                >
                  {isPending ? 'Salvando...' : 'Salvar Tipo de Treinamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
