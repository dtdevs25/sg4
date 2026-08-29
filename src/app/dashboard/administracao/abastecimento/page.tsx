'use client'

import { useState, useEffect, useTransition } from 'react'
import { getResumoOrcamentoMes, updateOrcamentoTecnico, testN8NWebhook, createRecargaExtra } from '@/app/actions/abastecimentoOrcamento'
import { Fuel, AlertTriangle, CheckCircle2, AlertCircle, Edit2, Loader2, Save, X, Send, PlusCircle } from 'lucide-react'

export default function AbastecimentoOrcamentoPage() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
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

  // Notificações (Substitui os alerts nativos)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null)

  useEffect(() => {
    load()
  }, [ano, mes])

  function load() {
    setLoading(true)
    startTransition(async () => {
      const res = await getResumoOrcamentoMes(ano, mes)
      if (res.success && res.data) {
        setDados(res.data)
      } else {
        setNotification({ type: 'error', title: 'Erro de Carregamento', message: res.error || 'Erro ao carregar dados' })
      }
      setLoading(false)
    })
  }

  const [testandoN8N, setTestandoN8N] = useState(false)

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
        .abast-card { display: flex; align-items: center; justify-content: space-between; gap: 16; }
        .abast-info { display: flex; align-items: center; gap: 16; flex: 1; min-width: 0; }
        .abast-stats { display: flex; gap: 32px; align-items: center; flex: 1.5; justify-content: center; flex-wrap: wrap; }
        .abast-actions { flex: 1; display: flex; justify-content: flex-end; align-items: center; gap: 16; flex-wrap: wrap; }
        .abast-header-controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .abast-card { flex-direction: column; align-items: flex-start; gap: 16px; }
          .abast-info { width: 100%; }
          .abast-stats { width: 100%; justify-content: space-around; gap: 16px; }
          .abast-actions { width: 100%; justify-content: space-between; flex-direction: row; align-items: center; }
          .abast-header-controls { width: 100%; justify-content: space-between; }
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

          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              onClick={() => {
                setTestandoN8N(true)
                startTransition(async () => {
                  const res = await testN8NWebhook()
                  setTestandoN8N(false)
                  if (res.success) {
                    setNotification({ type: 'success', title: 'Teste Abastecimento Enviado', message: 'Mensagem de teste de abastecimento enviada com sucesso!' })
                  } else {
                    setNotification({ type: 'error', title: 'Falha no Teste', message: res.error || 'Erro ao enviar o teste de abastecimento' })
                  }
                })
              }}
              disabled={testandoN8N}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: '#e0e7ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 6, cursor: testandoN8N ? 'not-allowed' : 'pointer' }}
              title="Disparar teste de Abastecimento para N8N"
            >
              {testandoN8N ? <Loader2 size={16} className="animate-spin" /> : <Fuel size={16} />}
            </button>

            <button 
              onClick={() => {
                setTestandoN8N(true)
                startTransition(async () => {
                  const { testN8NMetasWebhook } = await import('@/app/actions/metas')
                  const res = await testN8NMetasWebhook()
                  setTestandoN8N(false)
                  if (res.success) {
                    setNotification({ type: 'success', title: 'Teste Metas Enviado', message: 'Mensagem de teste de metas enviada com sucesso!' })
                  } else {
                    setNotification({ type: 'error', title: 'Falha no Teste', message: res.error || 'Erro ao enviar o teste de metas' })
                  }
                })
              }}
              disabled={testandoN8N}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, cursor: testandoN8N ? 'not-allowed' : 'pointer' }}
              title="Disparar teste de Metas (DSS) para N8N"
            >
              {testandoN8N ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 6 }}>
            <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ padding: '4px 8px', fontSize: 13, borderRadius: 4, border: 'none', background: '#fff', fontWeight: 700, color: '#334155', outline: 'none', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <option value={0}>Acumulado (Todos)</option>
              {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(2024, m-1, 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
              ))}
            </select>
            <select value={ano} onChange={e => setAno(Number(e.target.value))} disabled={mes === 0} style={{ padding: '4px 8px', fontSize: 13, borderRadius: 4, border: 'none', background: '#fff', fontWeight: 700, color: '#334155', outline: 'none', cursor: mes === 0 ? 'not-allowed' : 'pointer', opacity: mes === 0 ? 0.5 : 1, boxShadow: mes === 0 ? 'none' : '0 1px 3px rgba(0,0,0,0.1)' }}>
              <option value={0}>Acumulado (Todos)</option>
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
              <div key={item.tecnico.id} style={{ 
                background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', 
                padding: 24,
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }} className="abast-card">
                <div className="abast-info">
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #e2e8f0' }}>
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
                      {(ano === 0 ? item.recargasTotalAcumulado : item.recargasMesSelecionado) > 0 && (
                        <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700, background: '#d1fae5', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>
                          + R$ {(ano === 0 ? item.recargasTotalAcumulado : item.recargasMesSelecionado).toFixed(2)} extra
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="abast-stats">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>
                      {ano === 0 ? 'GASTO TOTAL' : 'GASTO ACUMULADO'}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>
                      R$ {item.gastoTotalAcumulado.toFixed(2)}
                    </div>
                    {ano !== 0 && (
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginTop: 4 }}>
                        Apenas neste mês: R$ {item.gastoMesSelecionado.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>
                      {ano === 0 ? 'SALDO CONSOLIDADO' : 'SALDO ATUAL ACUMULADO'}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: item.saldo <= 100 ? '#f59e0b' : '#10b981' }}>
                      R$ {item.saldo.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginTop: 4 }}>
                        (Teto acumulado: R$ {item.orcamentoAcumulado.toFixed(2)})
                    </div>
                  </div>
                </div>

                <div className="abast-actions">
                  {ano !== 0 && item.status === 'ADEQUADO' && (
                    <div style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} /> ADEQUADO
                    </div>
                  )}
                  {ano !== 0 && item.status === 'ALERTA_PENDENTE' && (
                    <div style={{ background: '#fef3c7', color: '#d97706', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={14} /> ALERTA PENDENTE
                    </div>
                  )}
                  {ano !== 0 && item.status === 'ALERTA_ENVIADO' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={14} /> ALERTA ENVIADO
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>
                        Faltam R$ {item.valorExtraCalculado.toFixed(2)} p/ fechar o mês
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
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
                <button type="button" onClick={() => setEditModal(null)} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 800, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#660099', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isPending ? 0.7 : 1 }}>
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar
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
                Lançar valor complementar depositado para <strong>{recargaModal.nome}</strong>. Esse valor aumenta o teto acumulado dele.
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
                <button type="button" onClick={() => setRecargaModal(null)} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 800, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isPending ? 0.7 : 1 }}>
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar
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
            
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
              {notification.title}
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
              {notification.message}
            </p>

            <button 
              onClick={() => setNotification(null)}
              style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: notification.type === 'success' ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 800, cursor: 'pointer', marginTop: 12 }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
