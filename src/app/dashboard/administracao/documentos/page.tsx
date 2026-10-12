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
  Settings
} from 'lucide-react'
import {
  getDocumentosTecnicos,
  getTiposDocumentos,
  salvarDocumentoTecnico,
  deleteDocumentoTecnico,
  uploadArquivoDocumento,
  createTipoDocumento,
  verificarENotificarDocumentosVencendo,
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
  cadastradoPor: string | null
  ultimoAlertaEmail: string | null
  createdAt: string
  tecnico: TecnicoItem
  tipoDocumento: TipoDocItem
  historico: HistoricoItem[]
}

export default function DocumentosTecnicosPage() {
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
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)

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
        // Apenas técnicos ativos conforme regra de negócio
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

  // Atualiza vencimento estimado quando altera tipo ou emissão
  const vencimentoEstimado = useMemo(() => {
    if (!dataEmissao) return ''
    const tipo = tiposDocs.find(t => t.id === selectedTipoId)
    if (!tipo || !tipo.validadeMeses) return ''

    const dt = new Date(dataEmissao)
    dt.setMonth(dt.getMonth() + tipo.validadeMeses)
    return dt.toISOString().split('T')[0]
  }, [dataEmissao, selectedTipoId, tiposDocs])

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
      // 1. Converte para base64 para envio S3
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

        // 2. Salva o registro e versiona no banco
        const saveRes = await salvarDocumentoTecnico({
          tecnicoId: selectedTecnicoId,
          tipoDocumentoId: selectedTipoId,
          titulo: tituloDoc,
          arquivoUrl: uploadRes.url,
          arquivoNome: arquivoFile.name,
          arquivoTamanho: uploadRes.sizeBytes,
          dataEmissao,
          dataVencimento: usarVencimentoManual && dataVencimentoManual ? dataVencimentoManual : (vencimentoEstimado || null),
          observacoes,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* ─── TOPO / CABEÇALHO ─── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: PURPLE_BG,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FileCheck color={PURPLE} size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Documentos dos Técnicos
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Gestão de Fichas de EPI, ASO, NRs e certificados com cálculo de vencimento e histórico
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setModalNovoTipoAberto(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 14px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Settings size={16} /> Tipos de Documentos
          </button>

          <button
            onClick={handleDispararNotificacoes}
            disabled={notificandoEmail}
            title="Verifica vencimentos com 45 dias de antecedência e envia e-mail aos administradores"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 14px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: notificandoEmail ? 'not-allowed' : 'pointer',
            }}
          >
            {notificandoEmail ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} color={PURPLE} />}
            Verificar & Notificar E-mails
          </button>

          <button
            onClick={() => {
              limparFormUpload()
              setModalUploadAberto(true)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 8,
              background: PURPLE,
              border: 'none',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(102,0,153,0.25)',
            }}
          >
            <PlusCircle size={18} /> Novo Documento / Renovação
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

      {/* ─── CARDS DE STATUS / RESUMO ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '18px 20px',
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Total Cadastrados</span>
            <FileText size={18} color="#64748b" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>{contadores.total}</div>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Documentos vigentes</span>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '18px 20px',
          border: '1px solid #f1f5f9',
          borderLeft: '4px solid #10b981',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>Válidos</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>{contadores.validos}</div>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Dentro do prazo</span>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '18px 20px',
          border: '1px solid #f1f5f9',
          borderLeft: '4px solid #f59e0b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>A Vencer (&le; 45 dias)</span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>{contadores.aVencer}</div>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Notificação disparada</span>
        </div>

        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '18px 20px',
          border: '1px solid #f1f5f9',
          borderLeft: '4px solid #ef4444',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Vencidos</span>
            <AlertTriangle size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#ef4444' }}>{contadores.vencidos}</div>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Requer renovação imediata</span>
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
              Clique em "Novo Documento / Renovação" para anexar o primeiro arquivo.
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
                      </td>

                      {/* Emissão */}
                      <td style={{ padding: '14px 18px', color: '#475569' }}>
                        {emissaoFmt}
                      </td>

                      {/* Vencimento */}
                      <td style={{ padding: '14px 18px', fontWeight: doc.status === 'VENCIDO' ? 700 : 500, color: doc.status === 'VENCIDO' ? '#dc2626' : '#334155' }}>
                        {vencimentoFmt}
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

      {/* ─── MODAL UPLOAD / RENOVAÇÃO DE DOCUMENTO ─── */}
      {modalUploadAberto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 580,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <UploadCloud color={PURPLE} size={20} />
                Registrar / Renovar Documento
              </h2>
              <button
                onClick={() => setModalUploadAberto(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitUpload} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Seleção do Técnico */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Técnico de Segurança (Ativo) *
                </label>
                <select
                  required
                  value={selectedTecnicoId}
                  onChange={e => setSelectedTecnicoId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    outline: 'none',
                  }}
                >
                  <option value="">Selecione o técnico...</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nome} ({t.cargo || 'TST'})</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Documento */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Tipo de Documento *
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
                    fontSize: 14,
                    outline: 'none',
                  }}
                >
                  <option value="">Selecione o tipo...</option>
                  {tiposDocs.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nome} {t.validadeMeses ? `(${t.validadeMeses} meses de validade)` : '(sem validade periódica)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Título ou Observação Específica */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Título / Identificador Adicional (Opcional)
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
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Datas de Emissão e Vencimento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Data de Emissão / Conclusão *
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
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Vencimento {usarVencimentoManual ? '(Manual)' : '(Automático)'}
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
                        fontSize: 14,
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
                        fontSize: 14,
                        color: '#64748b',
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
                />
                <label htmlFor="chkManual" style={{ fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                  Informar data de vencimento personalizada / diferente do padrão
                </label>
              </div>

              {/* Upload do Arquivo */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Arquivo do Documento (PDF, Imagem ou DOC) *
                </label>
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 10,
                  padding: 20,
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
                  <UploadCloud size={32} color={PURPLE} style={{ margin: '0 auto 8px' }} />
                  {arquivoFile ? (
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{arquivoFile.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{(arquivoFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600, color: '#334155', fontSize: 14 }}>Clique para selecionar o arquivo</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>PDF, PNG, JPG até 25MB (Upload para Bucket S3)</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Observações / Motivo da Versão (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Renovação periódica do ASO após exames clínicos..."
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

              {/* Botões do Rodapé */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setModalUploadAberto(false)}
                  disabled={uploadProgress}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    background: '#f1f5f9',
                    border: 'none',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
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
                    background: PURPLE,
                    border: 'none',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: uploadProgress ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
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
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 650,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <History color={PURPLE} size={20} />
                  Histórico de Versões
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                  {modalHistoricoDoc.tipoDocumento?.nome} - {modalHistoricoDoc.tecnico?.nome}
                </p>
              </div>
              <button
                onClick={() => setModalHistoricoDoc(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Versão Atual Ativa */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: PURPLE, textTransform: 'uppercase' }}>
                    Versão Atual Ativa
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
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
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
                  Versões Anteriores Preservadas ({modalHistoricoDoc.historico?.length || 0})
                </h3>

                {modalHistoricoDoc.historico?.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
                    Nenhuma versão anterior cadastrada. Esta é a primeira via do documento.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {modalHistoricoDoc.historico?.map((hist, idx) => (
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
                          <div style={{ fontSize: 12, color: '#64748b' }}>
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

      {/* ─── MODAL GERENCIAR / NOVO TIPO DE DOCUMENTO ─── */}
      {modalNovoTipoAberto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 520,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings color={PURPLE} size={20} />
                Cadastrar Novo Tipo de Documento
              </h2>
              <button
                onClick={() => setModalNovoTipoAberto(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCriarTipo} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Nome do Tipo de Documento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treinamento NR-18, ASO Admissional..."
                  value={novoTipoNome}
                  onChange={e => setNovoTipoNome(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Descrição
                </label>
                <input
                  type="text"
                  placeholder="Finalidade ou detalhes da norma regulamentadora"
                  value={novoTipoDescricao}
                  onChange={e => setNovoTipoDescricao(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Validade Padrão (Meses)
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
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Deixe vazio se não tiver validade fixa</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Alerta Prévio (Dias)
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
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Padrão: 45 dias antes</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setModalNovoTipoAberto(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    background: '#f1f5f9',
                    border: 'none',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
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
                    background: PURPLE,
                    border: 'none',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isPending ? 'Salvando...' : 'Cadastrar Tipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
