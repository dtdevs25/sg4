'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getResumoOrcamentoMes,
  updateOrcamentoTecnico,
  createRecargaExtra,
  getExtratoBancarioTecnico,
  getPrevisaoDepositosProximoMes,
  dispararNotificacaoPrevisaoDepositos,
  type ExtratoBancarioData,
  type ItemExtratoBancario,
  type PrevisaoDepositosResultado,
  type ItemPrevisaoDeposito,
} from '@/app/actions/abastecimentoOrcamento'
import {
  Fuel,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Loader2,
  Save,
  X,
  PlusCircle,
  History,
  ChevronDown,
  ChevronUp,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Wallet,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Eye,
  FileText,
  DollarSign,
  User,
  Info,
  ExternalLink,
  Search,
  Car,
  Send,
  Download,
  Copy,
  Check,
} from 'lucide-react'

export default function AbastecimentoOrcamentoPage({ hideHeader = false }: { hideHeader?: boolean }) {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mesesSelecionados, setMesesSelecionados] = useState<number[]>([new Date().getMonth() + 1])
  
  const [dados, setDados] = useState<any[]>([])
  const [mostrarOcultos, setMostrarOcultos] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Modal de edição de orçamento
  const [editModal, setEditModal] = useState<{ id: string, nome: string, orcamentoBase: number, orcamentoEfetivo: number } | null>(null)
  const [novoValor, setNovoValor] = useState('')
  const [tipoEdicao, setTipoEdicao] = useState<'mes' | 'definitivo'>('mes')

  // Modal de Recarga
  const [recargaModal, setRecargaModal] = useState<{ id: string, nome: string } | null>(null)
  const [recargaValor, setRecargaValor] = useState('')
  const [recargaObs, setRecargaObs] = useState('')

  // Modal Extrato Bancário
  const [extratoModalTecnico, setExtratoModalTecnico] = useState<{ id: string, nome: string, fotoUrl?: string | null, veiculo?: string | null } | null>(null)
  const [dataInicioExtrato, setDataInicioExtrato] = useState<string>('')
  const [dataFimExtrato, setDataFimExtrato] = useState<string>('')
  const [dadosExtrato, setDadosExtrato] = useState<ExtratoBancarioData | null>(null)
  const [loadingExtrato, setLoadingExtrato] = useState(false)
  const [fotoCupomZoom, setFotoCupomZoom] = useState<string | null>(null)

  // Filtro de pesquisa de colaboradores
  const [buscaColaborador, setBuscaColaborador] = useState('')

  // Modal Previsão Inteligente de Depósitos
  const [modalPrevisaoOpen, setModalPrevisaoOpen] = useState(false)
  const [loadingPrevisao, setLoadingPrevisao] = useState(false)
  const [dadosPrevisao, setDadosPrevisao] = useState<PrevisaoDepositosResultado | null>(null)
  const [enviandoN8N, setEnviandoN8N] = useState(false)
  const [copiadoTexto, setCopiadoTexto] = useState(false)
  const [buscaTecnicoPrevisao, setBuscaTecnicoPrevisao] = useState('')

  // Notificações
  const [notification, setNotification] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null)

  // Toggle dropdown de meses
  const [mesesDropdownOpen, setMesesDropdownOpen] = useState(false)

  const MESES_NOME = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  function getDataHojeFormatada() {
    const hoje = new Date()
    const a = hoje.getFullYear()
    const m = String(hoje.getMonth() + 1).padStart(2, '0')
    const d = String(hoje.getDate()).padStart(2, '0')
    return `${a}-${m}-${d}`
  }

  function getDatasMesAtual() {
    const hoje = new Date()
    const a = hoje.getFullYear()
    const m = hoje.getMonth() + 1
    const ultDia = new Date(a, m, 0).getDate()
    const dataFimMes = `${a}-${String(m).padStart(2, '0')}-${String(ultDia).padStart(2, '0')}`
    const hojeFmt = getDataHojeFormatada()
    return {
      inicio: `${a}-${String(m).padStart(2, '0')}-01`,
      // Bloqueia para não exceder o dia atual
      fim: dataFimMes > hojeFmt ? hojeFmt : dataFimMes,
    }
  }

  function getDatasUltimos90Dias() {
    const hoje = new Date()
    const antes = new Date()
    antes.setDate(hoje.getDate() - 90)
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const hojeFmt = getDataHojeFormatada()
    return { inicio: fmt(antes), fim: hojeFmt }
  }

  async function carregarExtrato(tecnicoId: string, dInicio: string, dFim: string) {
    setLoadingExtrato(true)
    try {
      const res = await getExtratoBancarioTecnico(tecnicoId, dInicio, dFim)
      if (res.success && res.data) {
        setDadosExtrato(res.data)
      } else {
        setNotification({
          type: 'error',
          title: 'Erro no Extrato',
          message: res.error || 'Não foi possível carregar o extrato bancário.',
        })
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        title: 'Erro Inesperado',
        message: err.message || 'Falha ao buscar dados do extrato.',
      })
    } finally {
      setLoadingExtrato(false)
    }
  }

  function handleAbrirExtrato(tecnicoId: string, nomeTecnico: string, fotoUrl?: string | null, veiculo?: string | null) {
    const { inicio, fim } = getDatasMesAtual()
    setDataInicioExtrato(inicio)
    setDataFimExtrato(fim)
    setExtratoModalTecnico({ id: tecnicoId, nome: nomeTecnico, fotoUrl, veiculo })
    setDadosExtrato(null)
    carregarExtrato(tecnicoId, inicio, fim)
  }

  function handleFiltrarExtrato(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!extratoModalTecnico) return
    const hojeFmt = getDataHojeFormatada()
    let fimVal = dataFimExtrato
    if (dataFimExtrato > hojeFmt) {
      fimVal = hojeFmt
      setDataFimExtrato(hojeFmt)
    }
    carregarExtrato(extratoModalTecnico.id, dataInicioExtrato, fimVal)
  }

  function aplicarAtalho90Dias() {
    const { inicio, fim } = getDatasUltimos90Dias()
    setDataInicioExtrato(inicio)
    setDataFimExtrato(fim)
    if (extratoModalTecnico) {
      carregarExtrato(extratoModalTecnico.id, inicio, fim)
    }
  }

  function formatarDataHora(dataIso: string) {
    try {
      const d = new Date(dataIso)
      if (isNaN(d.getTime())) return { data: dataIso, hora: '' }
      const formatterData = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      const formatterHora = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      return {
        data: formatterData.format(d),
        hora: formatterHora.format(d),
      }
    } catch {
      return { data: dataIso, hora: '' }
    }
  }

  useEffect(() => {
    load()
  }, [ano, mesesSelecionados])

  function load() {
    setLoading(true)
    startTransition(async () => {
      const res = await getResumoOrcamentoMes(ano, mesesSelecionados)
      if (res.success && res.data) {
        setDados(res.data)
      } else {
        setNotification({ type: 'error', title: 'Erro de Carregamento', message: res.error || 'Erro ao carregar dados' })
      }
      setLoading(false)
    })
  }

  function handleMesToggle(m: number) {
    setMesesSelecionados(prev => {
      if (prev.includes(m)) {
        return prev.filter(x => x !== m)
      } else {
        return [...prev, m]
      }
    })
  }

  function handleSalvarEdicao(e: React.FormEvent) {
    e.preventDefault()
    if (!editModal) return
    const valor = parseFloat(novoValor.replace(',', '.'))
    if (isNaN(valor) || valor < 0) return setNotification({ type: 'error', title: 'Valor Inválido', message: 'O valor não pode ser negativo.' })
    
    startTransition(async () => {
      // Define a data baseada no mês que o usuário está visualizando (o maior selecionado, ou o mês atual)
      const maxMesSelecionado = mesesSelecionados.length > 0 ? Math.max(...mesesSelecionados) : new Date().getMonth() + 1
      const anoSelecionado = ano === 0 ? new Date().getFullYear() : ano
      const dataDestino = new Date(anoSelecionado, maxMesSelecionado - 1, 15) // Dia 15 para garantir que cai no meio do mês
      
      if (tipoEdicao === 'definitivo') {
        const res = await updateOrcamentoTecnico(editModal.id, valor)
        if (res.success) {
          setEditModal(null)
          setNotification({ type: 'success', title: 'Sucesso', message: 'Orçamento atualizado para todos os meses!' })
          load()
        } else {
          setNotification({ type: 'error', title: 'Erro', message: res.error || 'Erro ao atualizar orçamento' })
        }
      } else {
        const res = await createRecargaExtra(editModal.id, valor, `Ajuste manual (substituição) da verba base do mês`, dataDestino, true)
        if (res.success) {
          setEditModal(null)
          setNotification({ type: 'success', title: 'Sucesso', message: `Base alterada apenas para o mês selecionado (${MESES_NOME[maxMesSelecionado-1]})!` })
          load()
        } else {
          setNotification({ type: 'error', title: 'Erro', message: res.error || 'Erro ao alterar base do mês' })
        }
      }
    })
  }

  function handleSalvarRecarga(e: React.FormEvent) {
    e.preventDefault()
    if (!recargaModal) return
    const valor = parseFloat(recargaValor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return setNotification({ type: 'error', title: 'Valor Inválido', message: 'A recarga precisa ser maior que zero.' })
    
    startTransition(async () => {
      const maxMesSelecionado = mesesSelecionados.length > 0 ? Math.max(...mesesSelecionados) : new Date().getMonth() + 1
      const anoSelecionado = ano === 0 ? new Date().getFullYear() : ano
      const hoje = new Date()
      let dataDestino: Date
      if (anoSelecionado === hoje.getFullYear() && maxMesSelecionado === (hoje.getMonth() + 1)) {
        dataDestino = new Date()
      } else {
        dataDestino = new Date(anoSelecionado, maxMesSelecionado - 1, 15, 12, 0, 0)
      }

      const res = await createRecargaExtra(recargaModal.id, valor, recargaObs, dataDestino)
      if (res.success) {
        setRecargaModal(null)
        setRecargaValor('')
        setRecargaObs('')
        setNotification({ type: 'success', title: 'Sucesso', message: `Recarga extra lançada no mês de ${MESES_NOME[maxMesSelecionado-1]}!` })
        load()
      } else {
        setNotification({ type: 'error', title: 'Erro', message: res.error || 'Erro ao registrar recarga extra' })
      }
    })
  }

  async function handleAbrirModalPrevisao() {
    setModalPrevisaoOpen(true)
    setLoadingPrevisao(true)
    try {
      const res = await getPrevisaoDepositosProximoMes()
      if (res.success && res.data) {
        setDadosPrevisao(res.data)
      } else {
        setNotification({
          type: 'error',
          title: 'Erro na Previsão',
          message: res.error || 'Não foi possível calcular a previsão de depósitos.',
        })
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        title: 'Erro Inesperado',
        message: err.message || 'Falha ao buscar dados da previsão.',
      })
    } finally {
      setLoadingPrevisao(false)
    }
  }

  function handleAlterarDepositoSugerido(tecnicoId: string, novoValor: number) {
    if (!dadosPrevisao) return
    const valorAjustado = Math.max(0, isNaN(novoValor) ? 0 : novoValor)
    const novosItens = dadosPrevisao.itens.map(item => {
      if (item.tecnicoId === tecnicoId) {
        return { ...item, depositoSugerido: valorAjustado, motivoSugerido: 'Ajuste manual pelo gestor' }
      }
      return item
    })
    const novoTotalSugerido = novosItens.reduce((acc, i) => acc + i.depositoSugerido, 0)
    const novaEconomia = Math.max(0, dadosPrevisao.totalCotaFixa - novoTotalSugerido)
    setDadosPrevisao({
      ...dadosPrevisao,
      totalSugerido: novoTotalSugerido,
      economiaEstimada: novaEconomia,
      itens: novosItens,
    })
  }

  function gerarTextoWhatsAppPrevisao() {
    if (!dadosPrevisao) return ''
    let t = `*⛽ PREVISÃO DE DEPÓSITOS DE ABASTECIMENTO*\n`
    t += `📅 *Mês de Referência:* ${dadosPrevisao.mesReferencia}\n`
    t += `💰 *Total Sugerido para a Frota:* R$ ${dadosPrevisao.totalSugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
    t += `📉 *Economia Estimada vs Cota Fixa:* R$ ${dadosPrevisao.economiaEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
    t += `👥 *Total de Técnicos Ativos:* ${dadosPrevisao.qtdTecnicos}\n\n`
    t += `*📋 DETALHAMENTO DE VALORES PARA O DIA 1º:*\n`
    for (const item of dadosPrevisao.itens) {
      const veic = item.veiculo ? ` (${item.veiculo})` : ''
      t += `• *${item.nome}*${veic}\n`
      t += `   Consumo Est.: R$ ${item.consumoEstimado.toFixed(2)} | Saldo Atual: R$ ${item.saldoAtual.toFixed(2)}\n`
      t += `   👉 *Depósito Sugerido: R$ ${item.depositoSugerido.toFixed(2)}*\n`
      t += `   _${item.motivoSugerido}_\n\n`
    }
    t += `ℹ️ _Relatório gerado automaticamente pelo SG4 no penúltimo dia útil._`
    return t
  }

  async function handleCopiarWhatsApp() {
    const texto = gerarTextoWhatsAppPrevisao()
    if (!texto) return
    try {
      await navigator.clipboard.writeText(texto)
      setCopiadoTexto(true)
      setTimeout(() => setCopiadoTexto(false), 2500)
    } catch {
      setNotification({
        type: 'error',
        title: 'Erro ao Copiar',
        message: 'Não foi possível copiar o texto automaticamente.',
      })
    }
  }

  async function handleDispararN8N() {
    setEnviandoN8N(true)
    try {
      const res = await dispararNotificacaoPrevisaoDepositos(true)
      if (res.success) {
        if (res.webhookEnviado) {
          setNotification({
            type: 'success',
            title: 'Enviado com Sucesso!',
            message: 'A tabela de previsão de pagamentos foi enviada ao N8N / Financeiro.',
          })
        } else {
          setNotification({
            type: 'success',
            title: 'Previsão Processada',
            message: res.aviso || 'Dados gerados com sucesso. (Configure N8N_WEBHOOK_PREVISAO_ABASTECIMENTO para envio automático).',
          })
        }
      } else {
        setNotification({
          type: 'error',
          title: 'Erro ao Enviar',
          message: res.error || 'Falha ao despachar notificação.',
        })
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        title: 'Erro Inesperado',
        message: err.message || 'Falha ao acionar envio.',
      })
    } finally {
      setEnviandoN8N(false)
    }
  }

  function handleExportarCSV() {
    if (!dadosPrevisao) return
    const cabecalho = ['Técnico', 'Veículo', dadosPrevisao.itens[0]?.rotulosMeses[2] || 'M-3', dadosPrevisao.itens[0]?.rotulosMeses[1] || 'M-2', dadosPrevisao.itens[0]?.rotulosMeses[0] || 'M-1', 'Consumo Estimado', 'Saldo Atual', 'Depósito Sugerido', 'Cota Fixa Base', 'Justificativa']
    const linhas = dadosPrevisao.itens.map(item => [
      `"${item.nome}"`,
      `"${item.veiculo || 'Não informado'}"`,
      item.consumoMes3.toFixed(2),
      item.consumoMes2.toFixed(2),
      item.consumoMes1.toFixed(2),
      item.consumoEstimado.toFixed(2),
      item.saldoAtual.toFixed(2),
      item.depositoSugerido.toFixed(2),
      item.orcamentoBase.toFixed(2),
      `"${item.motivoSugerido}"`
    ])
    const conteudoCSV = '\uFEFF' + [cabecalho.join(';'), ...linhas.map(l => l.join(';'))].join('\n')
    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `previsao_depositos_abastecimento_${dadosPrevisao.mesReferencia.replace('/', '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      <style>{`
        .abast-card { display: flex; flex-direction: column; gap: 16px; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .abast-main-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .abast-info { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 250px; }
        .abast-stats { display: flex; gap: 32px; align-items: center; flex: 1.5; justify-content: center; flex-wrap: wrap; }
        .abast-actions { flex: 1; display: flex; justify-content: flex-end; align-items: center; gap: 16px; flex-wrap: wrap; }
        .abast-header-controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .meses-dropdown { position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); padding: 8px; z-index: 50; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; min-width: 260px; margin-top: 4px; }
        .meses-dropdown label { display: flex; align-items: center; gap: 8px; padding: 6px; cursor: pointer; border-radius: 4px; }
        .meses-dropdown label:hover { background: #f1f5f9; }
        .detalhes-meses { margin-top: 16px; padding-top: 16px; border-top: 1px dashed #cbd5e1; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .detalhe-mes-box { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
        
        @media (max-width: 768px) {
          .abast-main-row { flex-direction: column; align-items: flex-start; }
          .abast-info, .abast-stats, .abast-actions, .abast-header-controls { width: 100%; }
          .abast-stats { justify-content: space-between; gap: 16px; }
          .abast-actions { justify-content: space-between; flex-direction: row; }
        }
      `}</style>
      
      {!hideHeader ? (
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
              <Fuel color="#660099" size={22} />
              Gestão de Verba de Abastecimento
            </h1>
          </div>

          <div className="abast-header-controls">
            {/* Botão de Sugestão Inteligente Próximo Mês */}
            <button
              type="button"
              onClick={handleAbrirModalPrevisao}
              style={{
                background: 'linear-gradient(135deg, #660099 0%, #7c3aed 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(102, 0, 153, 0.25)',
              }}
              title="Previsão inteligente de depósitos com base no consumo dos últimos 3 meses"
            >
              <Sparkles size={15} />
              Sugestão Próx. Mês
            </button>

            {/* Campo de pesquisa por colaborador */}
            <div style={{ position: 'relative' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Pesquisar colaborador..."
                value={buscaColaborador}
                onChange={e => setBuscaColaborador(e.target.value)}
                style={{
                  padding: '6px 26px 6px 30px',
                  fontSize: 13,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  outline: 'none',
                  color: '#1e293b',
                  width: 190,
                }}
              />
              {buscaColaborador && (
                <button
                  type="button"
                  onClick={() => setBuscaColaborador('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer', background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <input type="checkbox" checked={mostrarOcultos} onChange={e => setMostrarOcultos(e.target.checked)} style={{ accentColor: '#660099', cursor: 'pointer' }} />
              Exibir Inativos
            </label>

            <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 6, position: 'relative' }}>
              <button 
                onClick={() => setMesesDropdownOpen(!mesesDropdownOpen)}
                style={{ padding: '6px 12px', fontSize: 13, borderRadius: 4, border: 'none', background: '#fff', fontWeight: 700, color: '#334155', outline: 'none', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {mesesSelecionados.length === 0 ? 'Acumulado (Todos)' : `${mesesSelecionados.length} Mês(es) Selecionado(s)`}
                {mesesDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              
              {mesesDropdownOpen && (
                <div className="meses-dropdown">
                  <div style={{ gridColumn: '1 / -1', padding: '0 6px 8px 6px', borderBottom: '1px solid #e2e8f0', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Selecione os meses</span>
                    <button onClick={() => setMesesSelecionados([])} style={{ fontSize: 11, background: 'none', border: 'none', color: '#660099', cursor: 'pointer', fontWeight: 600 }}>Limpar</button>
                  </div>
                  {MESES_NOME.map((nome, idx) => (
                    <label key={idx}>
                      <input 
                        type="checkbox" 
                        checked={mesesSelecionados.includes(idx + 1)} 
                        onChange={() => handleMesToggle(idx + 1)}
                        style={{ accentColor: '#660099' }}
                      />
                      <span style={{ fontSize: 12, color: '#334155' }}>{nome}</span>
                    </label>
                  ))}
                </div>
              )}

              <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 4, border: 'none', background: '#fff', fontWeight: 700, color: '#334155', outline: 'none', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {[2026, 2027, 2028].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          {/* Campo de pesquisa por colaborador */}
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Pesquisar colaborador..."
              value={buscaColaborador}
              onChange={e => setBuscaColaborador(e.target.value)}
              style={{
                padding: '7px 26px 7px 30px',
                fontSize: 13,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#fff',
                outline: 'none',
                color: '#1e293b',
                width: 220,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            />
            {buscaColaborador && (
              <button
                type="button"
                onClick={() => setBuscaColaborador('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="abast-header-controls">
            {/* Botão de Sugestão Inteligente Próximo Mês */}
            <button
              type="button"
              onClick={handleAbrirModalPrevisao}
              style={{
                background: 'linear-gradient(135deg, #660099 0%, #7c3aed 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(102, 0, 153, 0.25)',
              }}
              title="Previsão inteligente de depósitos com base no consumo dos últimos 3 meses"
            >
              <Sparkles size={15} />
              Sugestão Próx. Mês
            </button>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer', background: '#fff', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <input type="checkbox" checked={mostrarOcultos} onChange={e => setMostrarOcultos(e.target.checked)} style={{ accentColor: '#660099', cursor: 'pointer' }} />
              Exibir Inativos
            </label>

            <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 6, position: 'relative' }}>
              <button 
                onClick={() => setMesesDropdownOpen(!mesesDropdownOpen)}
                style={{ padding: '6px 12px', fontSize: 13, borderRadius: 4, border: 'none', background: '#fff', fontWeight: 700, color: '#334155', outline: 'none', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {mesesSelecionados.length === 0 ? 'Acumulado (Todos)' : `${mesesSelecionados.length} Mês(es) Selecionado(s)`}
                {mesesDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              
              {mesesDropdownOpen && (
                <div className="meses-dropdown">
                  <div style={{ gridColumn: '1 / -1', padding: '0 6px 8px 6px', borderBottom: '1px solid #e2e8f0', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Selecione os meses</span>
                    <button onClick={() => setMesesSelecionados([])} style={{ fontSize: 11, background: 'none', border: 'none', color: '#660099', cursor: 'pointer', fontWeight: 600 }}>Limpar</button>
                  </div>
                  {MESES_NOME.map((nome, idx) => (
                    <label key={idx}>
                      <input 
                        type="checkbox" 
                        checked={mesesSelecionados.includes(idx + 1)} 
                        onChange={() => handleMesToggle(idx + 1)}
                        style={{ accentColor: '#660099' }}
                      />
                      <span style={{ fontSize: 12, color: '#334155' }}>{nome}</span>
                    </label>
                  ))}
                </div>
              )}

              <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 4, border: 'none', background: '#fff', fontWeight: 700, color: '#334155', outline: 'none', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {[2026, 2027, 2028].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 className="animate-spin text-purple-600" size={32} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {dados.filter(item => {
            const isVazio = item.orcamento === 0 && item.gastoTotalAcumulado === 0 && item.recargasTotalAcumulado === 0
            if (!mostrarOcultos && isVazio) return false
            if (buscaColaborador.trim()) {
              const termo = buscaColaborador.toLowerCase().trim()
              return item.tecnico.nome.toLowerCase().includes(termo)
            }
            return true
          }).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
              {buscaColaborador.trim() ? `Nenhum colaborador encontrado com "${buscaColaborador}".` : 'Nenhum dado encontrado para o período.'}
            </div>
          ) : (
            dados.filter(item => {
              const isVazio = item.orcamento === 0 && item.gastoTotalAcumulado === 0 && item.recargasTotalAcumulado === 0
              if (!mostrarOcultos && isVazio) return false
              if (buscaColaborador.trim()) {
                const termo = buscaColaborador.toLowerCase().trim()
                return item.tecnico.nome.toLowerCase().includes(termo)
              }
              return true
            }).map((item, index) => (
              <div key={item.tecnico.id} className="abast-card">
                
                <div className="abast-main-row">
                  <div className="abast-info">
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #e2e8f0', flexShrink: 0 }}>
                      {item.tecnico.fotoUrl ? (
                        <img src={item.tecnico.fotoUrl} alt={item.tecnico.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#cbd5e1' }}>{item.tecnico.nome.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{item.tecnico.nome}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                          Base do Período: <strong style={{ color: '#334155' }}>
                            R$ {(mesesSelecionados.length > 0 ? item.orcamentoTotalPeriodo + item.recargasTotalPeriodo : item.orcamentoAcumulado).toFixed(2)}
                          </strong>
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                          ({mesesSelecionados.length > 0 ? mesesSelecionados.length : item.mesesValidos} meses exibidos)
                        </span>
                        {mesesSelecionados.length > 0 && item.orcamentoTotalPeriodo + item.recargasTotalPeriodo !== item.orcamento * mesesSelecionados.length && (
                           <span style={{ fontSize: 10, color: '#660099', fontWeight: 700 }}>
                             *Inclui ajustes/recargas do mês
                           </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="abast-stats">
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>
                        GASTO TOTAL PERÍODO
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>
                        R$ {(mesesSelecionados.length > 0 ? item.gastoTotalPeriodo : item.gastoTotalAcumulado).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>
                        SALDO ATUAL
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: item.saldo <= 100 ? '#f59e0b' : '#10b981' }}>
                        R$ {(mesesSelecionados.length > 0 ? item.saldo : item.saldoAcumuladoTotal).toFixed(2)}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginTop: 4 }}>
                        (Restante p/ uso)
                      </div>
                    </div>
                  </div>

                  <div className="abast-actions">
                    {mesesSelecionados.length > 0 && item.status === 'ALERTA_PENDENTE' && (
                      <div style={{ background: '#fef3c7', color: '#d97706', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={14} /> ALERTA PENDENTE
                      </div>
                    )}
                    {mesesSelecionados.length > 0 && item.status === 'ALERTA_ENVIADO' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertCircle size={14} /> ALERTA ENVIADO
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>
                          Faltam R$ {item.valorExtraCalculado.toFixed(2)} p/ fechar
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        onClick={() => handleAbrirExtrato(item.tecnico.id, item.tecnico.nome, item.tecnico.fotoUrl, item.tecnico.veiculo)}
                        style={{
                          background: 'linear-gradient(135deg, rgba(102,0,153,0.06), rgba(124,58,237,0.12))',
                          border: '1px solid rgba(102,0,153,0.25)',
                          borderRadius: 8,
                          padding: '8px 14px',
                          color: '#660099',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                        title="Abrir Extrato Bancário Analítico"
                      >
                        <Receipt size={15} />
                        Extrato
                      </button>
                      <button
                        onClick={() => {
                          setRecargaModal({ id: item.tecnico.id, nome: item.tecnico.nome })
                        }}
                        style={{
                          background: '#dcfce7',
                          border: '1px solid #bbf7d0',
                          borderRadius: 8,
                          padding: '8px 12px',
                          color: '#16a34a',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                        title="Adicionar Recarga Extra"
                      >
                        <PlusCircle size={15} />
                        Aditivo
                      </button>
                      <button
                        onClick={() => {
                          const orcEfetivo = mesesSelecionados.length > 0 ? (item.orcamentoTotalPeriodo + item.recargasTotalPeriodo) : item.orcamentoAcumulado
                          setEditModal({ id: item.tecnico.id, nome: item.tecnico.nome, orcamentoBase: item.orcamento, orcamentoEfetivo: orcEfetivo })
                          setNovoValor(orcEfetivo.toString())
                          setTipoEdicao('mes') // Padrão
                        }}
                        style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, color: '#475569', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center' }}
                        title="Editar Orçamento Base"
                      >
                        <Edit2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* VISÃO POR MÊS SELECIONADO */}
                {mesesSelecionados.length > 1 && item.dadosPorMes.length > 0 && (
                  <div className="detalhes-meses">
                    {item.dadosPorMes.map((dm: any) => (
                      <div key={dm.mes} className="detalhe-mes-box">
                        <div style={{ fontWeight: 800, color: '#334155', marginBottom: 8, fontSize: 13 }}>
                          {MESES_NOME[dm.mes - 1]} / {ano}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: '#64748b' }}>Gasto:</span>
                          <span style={{ fontWeight: 700, color: '#ef4444' }}>R$ {dm.gastoMes.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: '#64748b' }}>Recargas:</span>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>+ R$ {dm.recargasMes.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingTop: 6, borderTop: '1px solid #e2e8f0', marginTop: 4 }}>
                          <span style={{ color: '#64748b', fontWeight: 700 }}>Saldo Fim Mês:</span>
                          <span style={{ fontWeight: 800, color: dm.saldoMes < 0 ? '#ef4444' : '#10b981' }}>R$ {dm.saldoMes.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Editar Orçamento */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#660099', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit2 size={18} /> Orçamento do TST
              </h2>
              <button onClick={() => setEditModal(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSalvarEdicao} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
                Ajustando a verba de abastecimento para <strong>{editModal.nome}</strong>.<br/>
                Valor recorrente: <strong>R$ {editModal.orcamentoBase.toFixed(2)}</strong>.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer', fontWeight: tipoEdicao === 'mes' ? 700 : 500 }}>
                  <input 
                    type="radio" 
                    name="tipoEdicao" 
                    checked={tipoEdicao === 'mes'} 
                    onChange={() => {
                      setTipoEdicao('mes')
                      setNovoValor(editModal.orcamentoEfetivo.toString())
                    }} 
                    style={{ accentColor: '#660099' }}
                  />
                  Apenas este mês (Atual: R$ {editModal.orcamentoEfetivo.toFixed(2)})
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer', fontWeight: tipoEdicao === 'definitivo' ? 700 : 500 }}>
                  <input 
                    type="radio" 
                    name="tipoEdicao" 
                    checked={tipoEdicao === 'definitivo'} 
                    onChange={() => {
                      setTipoEdicao('definitivo')
                      setNovoValor(editModal.orcamentoBase.toString())
                    }}
                    style={{ accentColor: '#660099' }}
                  />
                  Definitivo (Muda a base recorrente)
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 8 }}>NOVO VALOR (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={novoValor}
                  onChange={e => setNovoValor(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setEditModal(null)} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={isPending} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#660099', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isPending ? 0.7 : 1 }}>
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Recarga Extra */}
      {recargaModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#10b981', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlusCircle size={18} /> Adicionar Recarga Extra
              </h2>
              <button onClick={() => setRecargaModal(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSalvarRecarga} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
                Lançar valor complementar depositado para <strong>{recargaModal.nome}</strong>.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 8 }}>VALOR DA RECARGA (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={recargaValor}
                  onChange={e => setRecargaValor(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 8 }}>MOTIVO / OBSERVAÇÃO</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Complemento via N8N"
                  value={recargaObs}
                  onChange={e => setRecargaObs(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setRecargaModal(null)} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={isPending} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isPending ? 0.7 : 1 }}>
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Notification */}
      {notification && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 360, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: notification.type === 'success' ? '#dcfce7' : '#fee2e2', color: notification.type === 'success' ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              {notification.type === 'success' ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>{notification.title}</h2>
            <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.5 }}>{notification.message}</p>
            <button onClick={() => setNotification(null)} style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: notification.type === 'success' ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 800, cursor: 'pointer', marginTop: 12 }}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE EXTRATO BANCÁRIO (SIMPLES, EFICIENTE E COM SCROLL SUAVE) */}
      {extratoModalTecnico && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setExtratoModalTecnico(null)
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 720,
              height: '85vh',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            {/* Header do Extrato (padrão do sistema) */}
            {/* Header do Extrato (padrão do sistema, com foto do colaborador e dados do veículo) */}
            <div
              style={{
                flexShrink: 0,
                background: '#660099',
                padding: '14px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                {/* Foto do Colaborador */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.4)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {(dadosExtrato?.tecnico.fotoUrl ?? extratoModalTecnico.fotoUrl) ? (
                    <img
                      src={(dadosExtrato?.tecnico.fotoUrl ?? extratoModalTecnico.fotoUrl)!}
                      alt={dadosExtrato?.tecnico.nome || extratoModalTecnico.nome}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                      {(dadosExtrato?.tecnico.nome || extratoModalTecnico.nome).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Nome do Colaborador e Dados do Veículo */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#e9d5ff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Extrato Bancário
                    </span>
                  </div>
                  <h2
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: '#fff',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {dadosExtrato?.tecnico.nome || extratoModalTecnico.nome}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Car size={13} color="#e9d5ff" />
                    <span style={{ fontSize: 12, color: '#f3e8ff', fontWeight: 600 }}>
                      {(dadosExtrato?.tecnico.veiculo || extratoModalTecnico.veiculo)
                        ? `Veículo: ${dadosExtrato?.tecnico.veiculo || extratoModalTecnico.veiculo}`
                        : 'Veículo não informado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão Fechar no Topo */}
              <button
                type="button"
                onClick={() => setExtratoModalTecnico(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.2s',
                }}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Barra de Filtro de Período (Data Inicial e Data Final com bloqueio até a data atual + Atalho Único 90 Dias) */}
            <div
              style={{
                flexShrink: 0,
                background: '#f8fafc',
                padding: '12px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <form
                onSubmit={handleFiltrarExtrato}
                style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>De:</label>
                  <input
                    type="date"
                    value={dataInicioExtrato}
                    onChange={(e) => setDataInicioExtrato(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#1e293b',
                      background: '#fff',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Até:</label>
                  <input
                    type="date"
                    value={dataFimExtrato}
                    max={getDataHojeFormatada()}
                    onChange={(e) => {
                      const val = e.target.value
                      const hojeFmt = getDataHojeFormatada()
                      if (val && val > hojeFmt) {
                        setDataFimExtrato(hojeFmt)
                      } else {
                        setDataFimExtrato(val)
                      }
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#1e293b',
                      background: '#fff',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingExtrato}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#660099',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {loadingExtrato ? <Loader2 size={13} className="animate-spin" /> : null}
                  Filtrar
                </button>
              </form>

              {/* Atalho Único: Últimos 90 Dias */}
              <div>
                <button
                  type="button"
                  onClick={aplicarAtalho90Dias}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#660099',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Carregar últimos 90 dias até hoje"
                >
                  <Calendar size={13} />
                  Últimos 90 Dias
                </button>
              </div>
            </div>

            {/* TABELA DE EXTRATO ROLÁVEL COM SCROLL SUAVE */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'auto',
                minHeight: 200,
                background: '#fff',
                position: 'relative',
              }}
            >
              {loadingExtrato ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
                  <Loader2 className="animate-spin text-purple-600" size={32} />
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                    Consultando extrato bancário...
                  </span>
                </div>
              ) : dadosExtrato ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <th style={{ padding: '10px 14px', width: 90 }}>Data</th>
                      <th style={{ padding: '10px 14px' }}>Histórico</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', width: 110 }}>Valor</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', width: 110 }}>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Linha do Saldo Anterior Transportado */}
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>
                        {formatarDataHora(dadosExtrato.periodo.dataInicio).data}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        SALDO ANTERIOR
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                      <td
                        style={{
                          padding: '10px 16px',
                          textAlign: 'right',
                          color: dadosExtrato.resumo.saldoAnterior < 0 ? '#dc2626' : '#1e293b',
                          fontWeight: 800,
                        }}
                      >
                        R$ {dadosExtrato.resumo.saldoAnterior.toFixed(2)}
                      </td>
                    </tr>

                    {/* Linhas de Lançamentos */}
                    {dadosExtrato.transacoes.map((t, idx) => {
                      const dt = formatarDataHora(t.data)
                      const isEntrada = t.valor > 0
                      const isSaida = t.valor < 0

                      return (
                        <tr
                          key={t.id || idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: idx % 2 === 0 ? '#fff' : '#fcfcfd',
                          }}
                        >
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: 600, color: '#334155' }}>
                            {dt.data}
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {t.tipo === 'ENTRADA_PADRAO' && 'Depósito da Empresa (1º Dia Útil)'}
                              {t.tipo === 'ENTRADA_AJUSTE' && 'Depósito da Empresa (Cota Ajustada)'}
                              {t.tipo === 'ENTRADA_ADITIVO' && 'Carga Complementar ao Depósito Mensal'}
                              {t.tipo === 'SAIDA_ABASTECIMENTO' && 'Abastecimento'}
                              {t.fotoCupom && (
                                <button
                                  type="button"
                                  onClick={() => setFotoCupomZoom(t.fotoCupom!)}
                                  style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', color: '#660099', cursor: 'pointer', padding: 0 }}
                                  title="Ver Cupom"
                                >
                                  <Eye size={14} />
                                </button>
                              )}
                            </div>
                            {t.descricao && (
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                {t.descricao}{t.userName && t.tipo !== 'ENTRADA_PADRAO' ? ` • ${t.userName}` : ''}
                              </div>
                            )}
                          </td>

                          <td
                            style={{
                              padding: '10px 16px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              fontWeight: 800,
                              color: isEntrada ? '#16a34a' : isSaida ? '#dc2626' : '#1e293b',
                            }}
                          >
                            {isEntrada ? `+ R$ ${t.valor.toFixed(2)}` : `- R$ ${Math.abs(t.valor).toFixed(2)}`}
                          </td>

                          <td
                            style={{
                              padding: '10px 16px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              fontWeight: 800,
                              color: t.saldoApos < 0 ? '#dc2626' : '#1e293b',
                            }}
                          >
                            R$ {t.saldoApos.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}

                    {/* Linha do Saldo Final */}
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {formatarDataHora(dadosExtrato.periodo.dataFim).data}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#1e293b' }}>
                        SALDO FINAL
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          color: dadosExtrato.resumo.saldoFinal < 0 ? '#dc2626' : '#16a34a',
                          fontSize: 14,
                        }}
                      >
                        R$ {dadosExtrato.resumo.saldoFinal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : null}
            </div>

            {/* Rodapé do Extrato */}
            <div
              style={{
                flexShrink: 0,
                padding: '10px 20px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Total de <strong>{dadosExtrato?.transacoes.length || 0}</strong> lançamento(s) no período.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ZOOM DO CUPOM FISCAL */}
      {fotoCupomZoom && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(5px)',
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setFotoCupomZoom(null)
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 600,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 20px',
                background: '#1e293b',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={16} /> Comprovante / Cupom Fiscal
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <a
                  href={fotoCupomZoom}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={14} /> Abrir original
                </a>
                <button
                  type="button"
                  onClick={() => setFotoCupomZoom(null)}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div style={{ padding: 16, maxHeight: '75vh', overflowY: 'auto', display: 'flex', justifyContent: 'center', background: '#0f172a' }}>
              <img
                src={fotoCupomZoom}
                alt="Cupom Fiscal"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUGESTÃO INTELIGENTE DE DEPÓSITOS (PRÓXIMO MÊS) */}
      {modalPrevisaoOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalPrevisaoOpen(false)
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 980,
              height: '90vh',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                flexShrink: 0,
                background: '#660099',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} /> Sugestão Inteligente de Depósitos — {dadosPrevisao?.mesReferencia || 'Próximo Mês'}
                </h2>
                <span style={{ fontSize: 12, color: '#e9d5ff', marginTop: 2, display: 'block' }}>
                  Estimativa calculada pelo consumo dos últimos 3 meses com abatimento do saldo em conta
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalPrevisaoOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* KPI Cards & Status */}
            {dadosPrevisao && (
              <div
                style={{
                  flexShrink: 0,
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  padding: '14px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  {/* Total Sugerido */}
                  <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 10, border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Total Sugerido (Frota)
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>
                      R$ {dadosPrevisao.totalSugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      {dadosPrevisao.qtdTecnicos} técnico(s) ativo(s)
                    </span>
                  </div>

                  {/* Cota Fixa Tradicional */}
                  <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Cota Fixa Tradicional
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#64748b', marginTop: 2 }}>
                      R$ {dadosPrevisao.totalCotaFixa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      Se depositasse a cota cheia para todos
                    </span>
                  </div>

                  {/* Economia Estimada */}
                  <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 10, border: '1px solid #e9d5ff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#660099', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Economia Imediata de Caixa
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#660099', marginTop: 2 }}>
                      R$ {dadosPrevisao.economiaEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>
                      {dadosPrevisao.totalCotaFixa > 0 ? `${((dadosPrevisao.economiaEstimada / dadosPrevisao.totalCotaFixa) * 100).toFixed(1)}% de verba poupada` : ''}
                    </span>
                  </div>
                </div>

                {/* Barra de Ações: Busca + Botões */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                  <div style={{ position: 'relative', minWidth: 220, flex: 1, maxWidth: 320 }}>
                    <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="Filtrar por técnico..."
                      value={buscaTecnicoPrevisao}
                      onChange={e => setBuscaTecnicoPrevisao(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 24px 6px 30px',
                        fontSize: 12,
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {buscaTecnicoPrevisao && (
                      <button
                        type="button"
                        onClick={() => setBuscaTecnicoPrevisao('')}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleCopiarWhatsApp}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        color: copiadoTexto ? '#16a34a' : '#334155',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      title="Copiar tabela e resumo para o WhatsApp"
                    >
                      {copiadoTexto ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                      {copiadoTexto ? 'Copiado!' : 'Copiar p/ WhatsApp'}
                    </button>

                    <button
                      type="button"
                      onClick={handleExportarCSV}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#334155',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      title="Baixar planilha CSV para o Excel"
                    >
                      <Download size={14} />
                      Exportar CSV
                    </button>

                    <button
                      type="button"
                      onClick={handleDispararN8N}
                      disabled={enviandoN8N}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#660099',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      title="Enviar tabela via webhook para o N8N (WhatsApp/E-mail do Financeiro)"
                    >
                      {enviandoN8N ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Disparar p/ Financeiro (N8N)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabela de Previsão */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', background: '#fff' }}>
              {loadingPrevisao ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
                  <Loader2 className="animate-spin text-purple-600" size={32} />
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                    Analisando histórico de consumo dos últimos 3 meses e saldos...
                  </span>
                </div>
              ) : dadosPrevisao ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <th style={{ padding: '10px 14px' }}>Colaborador</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>{dadosPrevisao.itens[0]?.rotulosMeses[2] || 'M-3'}</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>{dadosPrevisao.itens[0]?.rotulosMeses[1] || 'M-2'}</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>{dadosPrevisao.itens[0]?.rotulosMeses[0] || 'M-1'}</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Média Est.</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Saldo Atual</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', width: 140 }}>Depósito Sugerido</th>
                      <th style={{ padding: '10px 14px' }}>Justificativa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosPrevisao.itens
                      .filter(item => !buscaTecnicoPrevisao.trim() || item.nome.toLowerCase().includes(buscaTecnicoPrevisao.toLowerCase().trim()))
                      .map((item, idx) => (
                        <tr
                          key={item.tecnicoId}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: idx % 2 === 0 ? '#fff' : '#fcfcfd',
                          }}
                        >
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                                {item.fotoUrl ? (
                                  <img src={item.fotoUrl} alt={item.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: 13, fontWeight: 800, color: '#64748b' }}>{item.nome.charAt(0)}</span>
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{item.nome}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                  {item.veiculo || 'Sem veículo cadastrado'} • Cota Base: R$ {item.orcamentoBase.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '10px 10px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>
                            R$ {item.consumoMes3.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>
                            R$ {item.consumoMes2.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'right', color: '#334155', fontWeight: 700 }}>
                            R$ {item.consumoMes1.toFixed(2)}
                          </td>

                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#660099', fontWeight: 800 }}>
                            R$ {item.consumoEstimado.toFixed(2)}
                          </td>

                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: item.saldoAtual <= 100 ? '#f59e0b' : '#10b981' }}>
                            R$ {item.saldoAtual.toFixed(2)}
                          </td>

                          <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>R$</span>
                              <input
                                type="number"
                                step="10"
                                min="0"
                                value={item.depositoSugerido}
                                onChange={e => handleAlterarDepositoSugerido(item.tecnicoId, parseFloat(e.target.value))}
                                style={{
                                  width: 85,
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #cbd5e1',
                                  fontSize: 13,
                                  fontWeight: 800,
                                  textAlign: 'right',
                                  color: item.depositoSugerido === 0 ? '#64748b' : '#16a34a',
                                  background: item.depositoSugerido === 0 ? '#f8fafc' : '#f0fdf4',
                                  outline: 'none',
                                }}
                              />
                            </div>
                          </td>

                          <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748b' }}>
                            {item.motivoSugerido}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : null}
            </div>

            {/* Rodapé */}
            <div
              style={{
                flexShrink: 0,
                padding: '12px 20px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 13, color: '#475569' }}>
                Total a depositar no dia 1º: <strong style={{ color: '#16a34a', fontSize: 15 }}>R$ {dadosPrevisao?.totalSugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                {' '}({dadosPrevisao?.itens.length || 0} colaboradores ativos)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
