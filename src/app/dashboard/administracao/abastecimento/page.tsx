'use client'

import { useState, useEffect, useTransition } from 'react'
import { getResumoOrcamentoMes, updateOrcamentoTecnico, createRecargaExtra } from '@/app/actions/abastecimentoOrcamento'
import { Fuel, AlertTriangle, CheckCircle2, AlertCircle, Edit2, Loader2, Save, X, PlusCircle, History, ChevronDown, ChevronUp } from 'lucide-react'

export default function AbastecimentoOrcamentoPage() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mesesSelecionados, setMesesSelecionados] = useState<number[]>([new Date().getMonth() + 1])
  
  const [dados, setDados] = useState<any[]>([])
  const [mostrarOcultos, setMostrarOcultos] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Modal de edição de orçamento
  const [editModal, setEditModal] = useState<{ id: string, nome: string, orcamentoAtual: number } | null>(null)
  const [novoValor, setNovoValor] = useState('')

  // Modal de Recarga
  const [recargaModal, setRecargaModal] = useState<{ id: string, nome: string } | null>(null)
  const [recargaValor, setRecargaValor] = useState('')
  const [recargaObs, setRecargaObs] = useState('')

  // Notificações
  const [notification, setNotification] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null)

  // Toggle dropdown de meses
  const [mesesDropdownOpen, setMesesDropdownOpen] = useState(false)

  // Controle de expansão do histórico de recargas
  const [expandedHistoricoId, setExpandedHistoricoId] = useState<string | null>(null)

  const MESES_NOME = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

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
      const res = await updateOrcamentoTecnico(editModal.id, valor)
      if (res.success) {
        setEditModal(null)
        setNotification({ type: 'success', title: 'Sucesso', message: 'Orçamento atualizado com sucesso!' })
        load()
      } else {
        setNotification({ type: 'error', title: 'Erro', message: res.error || 'Erro ao atualizar orçamento' })
      }
    })
  }

  function handleSalvarRecarga(e: React.FormEvent) {
    e.preventDefault()
    if (!recargaModal) return
    const valor = parseFloat(recargaValor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return setNotification({ type: 'error', title: 'Valor Inválido', message: 'A recarga precisa ser maior que zero.' })
    
    startTransition(async () => {
      const res = await createRecargaExtra(recargaModal.id, valor, recargaObs)
      if (res.success) {
        setRecargaModal(null)
        setRecargaValor('')
        setRecargaObs('')
        setNotification({ type: 'success', title: 'Sucesso', message: 'Recarga extra lançada com sucesso!' })
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
                    <span style={{ fontSize: 13, color: '#334155' }}>{nome}</span>
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
                          Base Mensal: <strong style={{ color: '#334155' }}>R$ {item.orcamento.toFixed(2)}</strong>
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                          ({item.mesesValidos} meses apurados)
                        </span>
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
                        (Teto: R$ {(mesesSelecionados.length > 0 ? item.orcamentoTotalPeriodo + item.recargasTotalPeriodo : item.orcamentoAcumulado).toFixed(2)})
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

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setExpandedHistoricoId(expandedHistoricoId === item.tecnico.id ? null : item.tecnico.id)
                        }}
                        style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 10, color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
                        title="Ver Histórico de Recargas Extras"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setRecargaModal({ id: item.tecnico.id, nome: item.tecnico.nome })
                        }}
                        style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: 10, color: '#16a34a', cursor: 'pointer', transition: 'all 0.2s' }}
                        title="Adicionar Recarga Extra"
                      >
                        <PlusCircle size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditModal({ id: item.tecnico.id, nome: item.tecnico.nome, orcamentoAtual: item.orcamento })
                          setNovoValor(item.orcamento.toString())
                        }}
                        style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 10, color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
                        title="Editar Orçamento Base"
                      >
                        <Edit2 size={16} />
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

                {/* HISTÓRICO DE RECARGAS EXPANSÍVEL */}
                {expandedHistoricoId === item.tecnico.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed #cbd5e1' }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <History size={16} color="#660099" /> Histórico de Recargas Extras
                    </h4>
                    {item.recargasHistorico.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#64748b' }}>Nenhuma recarga extra registrada no período geral.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {item.recargasHistorico.map((r: any) => (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                                + R$ {r.valor.toFixed(2)}
                              </span>
                              <span style={{ fontSize: 12, color: '#64748b' }}>
                                {r.observacao || 'Sem observação'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                                {new Date(r.data).toLocaleDateString('pt-BR')} às {new Date(r.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              <span style={{ fontSize: 11, color: '#660099', fontWeight: 700, background: '#f3e8ff', padding: '2px 6px', borderRadius: 4 }}>
                                Feito por: {r.userName || 'Sistema'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                Alterando a verba mensal para <strong>{editModal.nome}</strong>. <br/>
                O padrão do sistema é R$ 800,00.
              </p>
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
    </div>
  )
}
