'use client'

import { useState, useEffect, useTransition } from 'react'
import { getResumoOrcamentoMes, updateOrcamentoTecnico } from '@/app/actions/abastecimentoOrcamento'
import { Fuel, AlertTriangle, CheckCircle2, AlertCircle, Edit2, Loader2, Save, X } from 'lucide-react'

export default function AbastecimentoOrcamentoPage() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Modal de edição de orçamento
  const [editModal, setEditModal] = useState<{ id: string, nome: string, orcamentoAtual: number } | null>(null)
  const [novoValor, setNovoValor] = useState('')

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
        alert(res.error || 'Erro ao carregar')
      }
      setLoading(false)
    })
  }

  function handleSalvarEdicao(e: React.FormEvent) {
    e.preventDefault()
    if (!editModal) return
    const valor = parseFloat(novoValor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return alert('Valor inválido')
    
    startTransition(async () => {
      const res = await updateOrcamentoTecnico(editModal.id, valor)
      if (res.success) {
        setEditModal(null)
        load()
      } else {
        alert(res.error || 'Erro ao atualizar orçamento')
      }
    })
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Fuel size={28} color="#660099" /> Gestão de Verba de Abastecimento
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
            Monitore o saldo dos TSTs e acompanhe os alertas automáticos via WhatsApp.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, background: '#fff', padding: 8, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f8fafc', fontWeight: 700, color: '#334155', outline: 'none', cursor: 'pointer' }}>
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2024, m-1, 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
            ))}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f8fafc', fontWeight: 700, color: '#334155', outline: 'none', cursor: 'pointer' }}>
            {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
          <Loader2 size={40} className="animate-spin" color="#660099" />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {dados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Nenhum TST encontrado.</div>
          ) : (
            dados.map((item) => (
              <div key={item.tecnico.id} style={{ 
                background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', 
                padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #e2e8f0' }}>
                    {item.tecnico.fotoUrl ? (
                      <img src={item.tecnico.fotoUrl} alt={item.tecnico.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#cbd5e1' }}>{item.tecnico.nome.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{item.tecnico.nome}</h3>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        Verba Mensal: <strong style={{ color: '#334155' }}>R$ {item.orcamento.toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 32, alignItems: 'center', flex: 1.5, justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>GASTO NO MÊS</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>
                      R$ {item.gastoTotal.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>SALDO ATUAL</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: item.saldo <= 100 ? '#f59e0b' : '#10b981' }}>
                      R$ {item.saldo.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
                  {item.status === 'ADEQUADO' && (
                    <div style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} /> ADEQUADO
                    </div>
                  )}
                  {item.status === 'ALERTA_PENDENTE' && (
                    <div style={{ background: '#fef3c7', color: '#d97706', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={14} /> ALERTA PENDENTE
                    </div>
                  )}
                  {item.status === 'ALERTA_ENVIADO' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={14} /> ALERTA ENVIADO
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>
                        Faltam R$ {item.valorExtraCalculado.toFixed(2)} p/ fechar o mês
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setEditModal({ id: item.tecnico.id, nome: item.tecnico.nome, orcamentoAtual: item.orcamento })
                      setNovoValor(item.orcamento.toString())
                    }}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 10, color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
                    title="Editar Orçamento"
                  >
                    <Edit2 size={16} />
                  </button>
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
    </div>
  )
}
