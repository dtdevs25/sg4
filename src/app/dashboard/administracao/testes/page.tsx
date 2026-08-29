'use client'

import { useState, useTransition, useEffect } from 'react'
import { Fuel, CheckCircle2, Loader2, Send } from 'lucide-react'
import { testN8NWebhook } from '@/app/actions/abastecimentoOrcamento'
import { testN8NMetasWebhook } from '@/app/actions/metas'
import { getTecnicos } from '@/app/actions/tecnicos'

export default function TestesPage() {
  const [testandoAbastecimento, setTestandoAbastecimento] = useState(false)
  const [testandoMetas, setTestandoMetas] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [selectedTec, setSelectedTec] = useState('')
  const [telefoneInput, setTelefoneInput] = useState('')

  useEffect(() => {
    getTecnicos().then(res => {
      if (res.success && res.data) {
        setTecnicos(res.data.filter((t: any) => t.ativo))
      }
    })
  }, [])
  
  const handleSelectTecnico = (id: string) => {
    setSelectedTec(id)
    if (id) {
      const tec = tecnicos.find(t => t.id === id)
      if (tec && tec.telefone) {
        setTelefoneInput(tec.telefone)
      } else {
        setTelefoneInput('')
      }
    } else {
      setTelefoneInput('')
    }
  }

  const [notification, setNotification] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      <div style={{
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Send color="#660099" size={22} />
          Painel de Testes do N8N
        </h1>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Teste Abastecimento */}
        <div style={{ flex: 1, minWidth: 300, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Fuel size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>Alerta de Abastecimento</h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>Envia um payload simulando alerta de verba de combustível.</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setTestandoAbastecimento(true)
              startTransition(async () => {
                const res = await testN8NWebhook()
                setTestandoAbastecimento(false)
                if (res.success) {
                  setNotification({ type: 'success', title: 'Teste Abastecimento Enviado', message: 'Mensagem de teste de abastecimento enviada com sucesso!' })
                } else {
                  setNotification({ type: 'error', title: 'Falha no Teste', message: res.error || 'Erro ao enviar o teste de abastecimento' })
                }
              })
            }}
            disabled={testandoAbastecimento || isPending}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: (testandoAbastecimento || isPending) ? 'not-allowed' : 'pointer', opacity: (testandoAbastecimento || isPending) ? 0.7 : 1 }}
          >
            {testandoAbastecimento ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Testar N8N_WEBHOOK_ABASTECIMENTO
          </button>
        </div>

        {/* Teste Metas */}
        <div style={{ flex: 1, minWidth: 300, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>Metas Atingidas</h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>Envia os dados de um técnico real. Insira seu número para receber o teste.</p>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 8 }}>TÉCNICO PARA O TESTE</label>
            <select 
              value={selectedTec}
              onChange={e => handleSelectTecnico(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', backgroundColor: '#f8fafc', outline: 'none' }}
            >
              <option value="">Aleatório (Qualquer técnico)</option>
              {tecnicos.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 8 }}>NÚMERO DE DESTINO</label>
            <input 
              type="text" 
              placeholder="11999999999"
              value={telefoneInput}
              onChange={e => setTelefoneInput(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          <button 
            onClick={() => {
              setTestandoMetas(true)
              startTransition(async () => {
                const res = await testN8NMetasWebhook(telefoneInput, selectedTec || undefined)
                setTestandoMetas(false)
                if (res.success) {
                  setNotification({ type: 'success', title: 'Teste Metas Enviado', message: 'Mensagem de teste de metas enviada com sucesso!' })
                } else {
                  setNotification({ type: 'error', title: 'Falha no Teste', message: res.error || 'Erro ao enviar o teste de metas' })
                }
              })
            }}
            disabled={testandoMetas || isPending}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: (testandoMetas || isPending) ? 'not-allowed' : 'pointer', opacity: (testandoMetas || isPending) ? 0.7 : 1 }}
          >
            {testandoMetas ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Testar N8N_WEBHOOK_METAS
          </button>
        </div>
      </div>

      {/* Modal Notification */}
      {notification && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 360, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: notification.type === 'success' ? '#dcfce7' : '#fee2e2', color: notification.type === 'success' ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              {notification.type === 'success' ? <CheckCircle2 size={32} /> : <Loader2 size={32} />}
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
