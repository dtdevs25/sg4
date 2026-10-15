'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getResumoOrcamentoMes,
  updateOrcamentoTecnico,
  createRecargaExtra,
  getExtratoBancarioTecnico,
  type ExtratoBancarioData,
  type ItemExtratoBancario,
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
  const [extratoModalTecnico, setExtratoModalTecnico] = useState<{ id: string, nome: string } | null>(null)
  const [extratoAno, setExtratoAno] = useState<number>(new Date().getFullYear())
  const [extratoMes, setExtratoMes] = useState<number | 'todos'>(new Date().getMonth() + 1)
  const [dadosExtrato, setDadosExtrato] = useState<ExtratoBancarioData | null>(null)
  const [loadingExtrato, setLoadingExtrato] = useState(false)
  const [fotoCupomZoom, setFotoCupomZoom] = useState<string | null>(null)

  // Notificações
  const [notification, setNotification] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null)

  // Toggle dropdown de meses
  const [mesesDropdownOpen, setMesesDropdownOpen] = useState(false)

  const MESES_NOME = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  async function carregarExtrato(tecnicoId: string, anoAlvo: number, mesAlvo: number | 'todos') {
    setLoadingExtrato(true)
    try {
      const res = await getExtratoBancarioTecnico(tecnicoId, anoAlvo, mesAlvo)
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

  function handleAbrirExtrato(tecnicoId: string, nomeTecnico: string) {
    const mesInicial = mesesSelecionados.length === 1 ? mesesSelecionados[0] : (new Date().getMonth() + 1)
    const anoInicial = ano === 0 ? new Date().getFullYear() : ano
    setExtratoAno(anoInicial)
    setExtratoMes(mesInicial)
    setExtratoModalTecnico({ id: tecnicoId, nome: nomeTecnico })
    setDadosExtrato(null)
    carregarExtrato(tecnicoId, anoInicial, mesInicial)
  }

  function handleMudarMesExtrato(novoMes: number | 'todos') {
    setExtratoMes(novoMes)
    if (extratoModalTecnico) {
      carregarExtrato(extratoModalTecnico.id, extratoAno, novoMes)
    }
  }

  function handleMudarAnoExtrato(novoAno: number) {
    setExtratoAno(novoAno)
    if (extratoModalTecnico) {
      carregarExtrato(extratoModalTecnico.id, novoAno, extratoMes)
    }
  }

  function formatarDataHora(dataIso: string) {
    try {
      const d = new Date(dataIso)
      const dia = String(d.getDate()).padStart(2, '0')
      const mes = String(d.getMonth() + 1).padStart(2, '0')
      const ano = d.getFullYear()
      const horas = String(d.getHours()).padStart(2, '0')
      const minutos = String(d.getMinutes()).padStart(2, '0')
      return {
        data: `${dia}/${mes}/${ano}`,
        hora: `${horas}:${minutos}`,
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
      const dataDestino = new Date(anoSelecionado, maxMesSelecionado - 1, 15)

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
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer', background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <input type="checkbox" checked={mostrarOcultos} onChange={e => setMostrarOcultos(e.target.checked)} style={{ accentColor: '#660099', cursor: 'pointer' }} />
              Exibir
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <div className="abast-header-controls">
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
          {dados.filter(item => mostrarOcultos || !(item.orcamento === 0 && item.gastoTotalAcumulado === 0 && item.recargasTotalAcumulado === 0)).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
              Nenhum dado encontrado para o período.
            </div>
          ) : (
            dados.filter(item => mostrarOcultos || !(item.orcamento === 0 && item.gastoTotalAcumulado === 0 && item.recargasTotalAcumulado === 0)).map((item, index) => (
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
                    {mesesSelecionados.length > 0 && item.status === 'ADEQUADO' && (
                      <div style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={14} /> ADEQUADO
                      </div>
                    )}
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
                        onClick={() => handleAbrirExtrato(item.tecnico.id, item.tecnico.nome)}
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

      {/* MODAL DE EXTRATO BANCÁRIO */}
      {extratoModalTecnico && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setExtratoModalTecnico(null)
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 1040,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Header do Extrato Bancário */}
            <div
              style={{
                background: 'linear-gradient(135deg, #3b0764 0%, #660099 50%, #7c3aed 100%)',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(102, 0, 153, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    border: '2px solid rgba(255,255,255,0.5)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {dadosExtrato?.tecnico.fotoUrl ? (
                    <img
                      src={dadosExtrato.tecnico.fotoUrl}
                      alt={dadosExtrato.tecnico.nome}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>
                      {extratoModalTecnico.nome.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#fff' }}>
                      {dadosExtrato?.tecnico.nome || extratoModalTecnico.nome}
                    </h2>
                    <span
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                      }}
                    >
                      Extrato Bancário
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, flexWrap: 'wrap', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                    <span>
                      Cota Base Contratual: <strong style={{ color: '#fff' }}>R$ {(dadosExtrato?.tecnico.orcamentoBase || 0).toFixed(2)}/mês</strong>
                    </span>
                    {dadosExtrato?.tecnico.admissao && (
                      <span>
                        • Admissão: <strong style={{ color: '#fff' }}>{new Date(dadosExtrato.tecnico.admissao).toLocaleDateString('pt-BR')}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExtratoModalTecnico(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                title="Fechar Extrato"
              >
                <X size={20} />
              </button>
            </div>

            {/* Barra de Filtro de Período do Extrato */}
            <div
              style={{
                background: '#f8fafc',
                padding: '12px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} color="#660099" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                  Período do Extrato:
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#660099', background: '#f3e8ff', padding: '3px 8px', borderRadius: 6 }}>
                  {dadosExtrato?.periodo.rotulo || (extratoMes === 'todos' ? `Ano ${extratoAno}` : `${MESES_NOME[(extratoMes as number) - 1]} / ${extratoAno}`)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Seletor de Ano */}
                <select
                  value={extratoAno}
                  onChange={(e) => handleMudarAnoExtrato(Number(e.target.value))}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#1e293b',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {[2026, 2027, 2028].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>

                {/* Botão de Todos os Meses */}
                <button
                  type="button"
                  onClick={() => handleMudarMesExtrato('todos')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: extratoMes === 'todos' ? '1px solid #660099' : '1px solid #e2e8f0',
                    background: extratoMes === 'todos' ? '#660099' : '#fff',
                    color: extratoMes === 'todos' ? '#fff' : '#475569',
                    boxShadow: extratoMes === 'todos' ? '0 2px 8px rgba(102, 0, 153, 0.25)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  Ano Completo (Acumulado)
                </button>

                {/* Pílulas de Meses */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {MESES_NOME.map((nome, idx) => {
                    const mNum = idx + 1
                    const isSelected = extratoMes === mNum
                    const isBeforeMarcoZero = extratoAno === 2026 && mNum < 7
                    if (isBeforeMarcoZero) return null

                    return (
                      <button
                        key={mNum}
                        type="button"
                        onClick={() => handleMudarMesExtrato(mNum)}
                        style={{
                          padding: '5px 9px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                          border: isSelected ? '1px solid #660099' : '1px solid #e2e8f0',
                          background: isSelected ? '#660099' : '#fff',
                          color: isSelected ? '#fff' : '#475569',
                          boxShadow: isSelected ? '0 2px 6px rgba(102, 0, 153, 0.25)' : 'none',
                          transition: 'all 0.15s',
                        }}
                        title={nome}
                      >
                        {nome.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Conteúdo do Extrato */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                background: '#fcfcfd',
              }}
            >
              {loadingExtrato ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 14 }}>
                  <Loader2 className="animate-spin text-purple-600" size={36} />
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                    Processando extrato bancário e calculando saldos progressivos...
                  </span>
                </div>
              ) : dadosExtrato ? (
                <>
                  {/* Resumo Financeiro no Estilo Bancário (5 Cards) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {/* 1. Saldo Anterior */}
                    <div
                      style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: '14px 16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Saldo Anterior
                        </span>
                        <Wallet size={14} color="#64748b" />
                      </div>
                      <span
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: dadosExtrato.resumo.saldoAnterior < 0 ? '#dc2626' : '#334155',
                        }}
                      >
                        R$ {dadosExtrato.resumo.saldoAnterior.toFixed(2)}
                      </span>
                      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                        Carry-over herdado
                      </span>
                    </div>

                    {/* 2. Padrão do Mês */}
                    <div
                      style={{
                        background: '#eff6ff',
                        borderRadius: 12,
                        padding: '14px 16px',
                        border: '1px solid #bfdbfe',
                        boxShadow: '0 2px 6px rgba(37,99,235,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Padrão do Mês
                        </span>
                        <Calendar size={14} color="#1d4ed8" />
                      </div>
                      <span style={{ fontSize: 17, fontWeight: 800, color: '#1e40af' }}>
                        R$ {dadosExtrato.resumo.totalPadrao.toFixed(2)}
                      </span>
                      <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600 }}>
                        Cota base regular
                      </span>
                    </div>

                    {/* 3. Aditivos (Recargas) */}
                    <div
                      style={{
                        background: '#faf5ff',
                        borderRadius: 12,
                        padding: '14px 16px',
                        border: '1px solid #e9d5ff',
                        boxShadow: '0 2px 6px rgba(124,58,237,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Aditivos (Extras)
                        </span>
                        <Sparkles size={14} color="#7c3aed" />
                      </div>
                      <span style={{ fontSize: 17, fontWeight: 800, color: '#6b21a8' }}>
                        + R$ {dadosExtrato.resumo.totalAditivos.toFixed(2)}
                      </span>
                      <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 600 }}>
                        {dadosExtrato.resumo.qtdAditivos} recarga(s) extra(s)
                      </span>
                    </div>

                    {/* 4. Total Saídas */}
                    <div
                      style={{
                        background: '#fef2f2',
                        borderRadius: 12,
                        padding: '14px 16px',
                        border: '1px solid #fecaca',
                        boxShadow: '0 2px 6px rgba(220,38,38,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Total Saídas
                        </span>
                        <TrendingDown size={14} color="#dc2626" />
                      </div>
                      <span style={{ fontSize: 17, fontWeight: 800, color: '#b91c1c' }}>
                        - R$ {dadosExtrato.resumo.totalSaidas.toFixed(2)}
                      </span>
                      <span style={{ fontSize: 10, color: '#f87171', fontWeight: 600 }}>
                        {dadosExtrato.resumo.qtdAbastecimentos} abastecimento(s)
                      </span>
                    </div>

                    {/* 5. Saldo Atual em Conta */}
                    <div
                      style={{
                        background: dadosExtrato.resumo.saldoFinal >= 0 ? '#f0fdf4' : '#fff1f2',
                        borderRadius: 12,
                        padding: '14px 16px',
                        border: dadosExtrato.resumo.saldoFinal >= 0 ? '1px solid #bbf7d0' : '1px solid #fecdd3',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: dadosExtrato.resumo.saldoFinal >= 0 ? '#15803d' : '#be123c',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          Saldo em Conta
                        </span>
                        {dadosExtrato.resumo.saldoFinal >= 0 ? (
                          <CheckCircle2 size={14} color="#15803d" />
                        ) : (
                          <AlertTriangle size={14} color="#be123c" />
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 900,
                          color: dadosExtrato.resumo.saldoFinal >= 0 ? '#166534' : '#9f1239',
                        }}
                      >
                        R$ {dadosExtrato.resumo.saldoFinal.toFixed(2)}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: dadosExtrato.resumo.saldoFinal >= 0 ? '#22c55e' : '#f43f5e',
                        }}
                      >
                        {dadosExtrato.resumo.saldoFinal >= 0 ? 'Saldo Disponível' : 'Estourado / Devedor'}
                      </span>
                    </div>
                  </div>

                  {/* Banner de Diagnóstico Analítico */}
                  <div
                    style={{
                      background:
                        dadosExtrato.resumo.status === 'SUPERAVIT'
                          ? '#f0fdf4'
                          : dadosExtrato.resumo.status === 'DEFICIT'
                          ? '#fef2f2'
                          : '#f8fafc',
                      borderRadius: 12,
                      padding: '14px 18px',
                      border:
                        dadosExtrato.resumo.status === 'SUPERAVIT'
                          ? '1px solid #bbf7d0'
                          : dadosExtrato.resumo.status === 'DEFICIT'
                          ? '1px solid #fecaca'
                          : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        padding: 8,
                        borderRadius: 10,
                        background:
                          dadosExtrato.resumo.status === 'SUPERAVIT'
                            ? '#dcfce7'
                            : dadosExtrato.resumo.status === 'DEFICIT'
                            ? '#fee2e2'
                            : '#f1f5f9',
                        color:
                          dadosExtrato.resumo.status === 'SUPERAVIT'
                            ? '#16a34a'
                            : dadosExtrato.resumo.status === 'DEFICIT'
                            ? '#dc2626'
                            : '#64748b',
                        flexShrink: 0,
                      }}
                    >
                      {dadosExtrato.resumo.status === 'SUPERAVIT' ? (
                        <CheckCircle2 size={18} />
                      ) : dadosExtrato.resumo.status === 'DEFICIT' ? (
                        <AlertTriangle size={18} />
                      ) : (
                        <Info size={18} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                          Diagnóstico do Período:
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background:
                              dadosExtrato.resumo.status === 'SUPERAVIT'
                                ? '#dcfce7'
                                : dadosExtrato.resumo.status === 'DEFICIT'
                                ? '#fee2e2'
                                : '#e2e8f0',
                            color:
                              dadosExtrato.resumo.status === 'SUPERAVIT'
                                ? '#166534'
                                : dadosExtrato.resumo.status === 'DEFICIT'
                                ? '#991b1b'
                                : '#334155',
                          }}
                        >
                          {dadosExtrato.resumo.status === 'SUPERAVIT'
                            ? 'Operação Eficiente'
                            : dadosExtrato.resumo.status === 'DEFICIT'
                            ? 'Déficit / Cota Excedida'
                            : 'Neutro'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                        {dadosExtrato.resumo.diagnostico}
                      </p>
                    </div>
                  </div>

                  {/* Tabela de Extrato Bancário Analítico */}
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: 14,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '14px 20px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={16} color="#660099" />
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1e293b' }}>
                          Histórico Cronológico de Lançamentos
                        </h3>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                        {dadosExtrato.transacoes.length} lançamento(s)
                      </span>
                    </div>

                    {dadosExtrato.transacoes.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                        <Receipt size={32} color="#cbd5e1" style={{ margin: '0 auto 10px auto' }} />
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                          Nenhuma movimentação financeira registrada neste período.
                        </p>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              <th style={{ padding: '12px 18px', width: 140 }}>Data / Hora</th>
                              <th style={{ padding: '12px 18px', width: 170 }}>Tipo</th>
                              <th style={{ padding: '12px 18px' }}>Descrição & Detalhes</th>
                              <th style={{ padding: '12px 18px', textAlign: 'right', width: 140 }}>Valor</th>
                              <th style={{ padding: '12px 18px', textAlign: 'right', width: 160 }}>Saldo em Conta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dadosExtrato.transacoes.map((t, idx) => {
                              const dt = formatarDataHora(t.data)
                              const isEntrada = t.valor > 0
                              const isSaida = t.valor < 0

                              return (
                                <tr
                                  key={t.id || idx}
                                  style={{
                                    borderBottom: '1px solid #f1f5f9',
                                    background: idx % 2 === 0 ? '#fff' : '#fafafa',
                                    transition: 'background 0.15s',
                                  }}
                                >
                                  {/* Data & Hora */}
                                  <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{dt.data}</div>
                                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{dt.hora}</div>
                                  </td>

                                  {/* Tipo da Transação */}
                                  <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
                                    {t.tipo === 'ENTRADA_PADRAO' && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6, background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: 11 }}>
                                        <ArrowDownRight size={13} /> Cota Padrão
                                      </span>
                                    )}
                                    {t.tipo === 'ENTRADA_ADITIVO' && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6, background: '#faf5ff', color: '#7c3aed', fontWeight: 800, fontSize: 11 }}>
                                        <Sparkles size={13} /> Aditivo Extra
                                      </span>
                                    )}
                                    {t.tipo === 'ENTRADA_AJUSTE' && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6, background: '#fffbeb', color: '#b45309', fontWeight: 800, fontSize: 11 }}>
                                        <Edit2 size={13} /> Ajuste Base
                                      </span>
                                    )}
                                    {t.tipo === 'SAIDA_ABASTECIMENTO' && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', fontWeight: 800, fontSize: 11 }}>
                                        <ArrowUpRight size={13} /> Abastecimento
                                      </span>
                                    )}
                                  </td>

                                  {/* Descrição e Comprovante */}
                                  <td style={{ padding: '12px 18px' }}>
                                    <div style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <span>{t.titulo}</span>
                                      {t.userName && (
                                        <span style={{ fontSize: 10, fontWeight: 700, color: '#660099', background: '#f3e8ff', padding: '2px 6px', borderRadius: 4 }}>
                                          Por: {t.userName}
                                        </span>
                                      )}
                                      {t.fotoCupom && (
                                        <button
                                          type="button"
                                          onClick={() => setFotoCupomZoom(t.fotoCupom!)}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '2px 8px',
                                            borderRadius: 4,
                                            background: '#e0f2fe',
                                            border: '1px solid #bae6fd',
                                            color: '#0284c7',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                          }}
                                          title="Visualizar Comprovante / Cupom Fiscal"
                                        >
                                          <Eye size={12} /> Ver Cupom
                                        </button>
                                      )}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                      {t.descricao}
                                    </div>
                                  </td>

                                  {/* Valor Lançado */}
                                  <td style={{ padding: '12px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <span
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 800,
                                        color: isEntrada ? '#16a34a' : isSaida ? '#dc2626' : '#334155',
                                      }}
                                    >
                                      {isEntrada ? `+ R$ ${t.valor.toFixed(2)}` : `- R$ ${Math.abs(t.valor).toFixed(2)}`}
                                    </span>
                                  </td>

                                  {/* Saldo Progressivo */}
                                  <td style={{ padding: '12px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <span
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 800,
                                        color: t.saldoApos < 0 ? '#dc2626' : '#0f172a',
                                      }}
                                    >
                                      R$ {t.saldoApos.toFixed(2)}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Rodapé do Extrato */}
            <div
              style={{
                padding: '12px 24px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 12, color: '#64748b' }}>
                💡 Extrato gerado com cálculo de carry-over progressivo desde o marco zero da operação.
              </span>
              <button
                type="button"
                onClick={() => setExtratoModalTecnico(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                Fechar
              </button>
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
    </div>
  )
}
