'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Fuel,
  CheckCircle2,
  Loader2,
  Send,
  Cake,
  Lock,
  Unlock
} from 'lucide-react'
import { testN8NWebhook } from '@/app/actions/abastecimentoOrcamento'
import { testN8NMetasWebhook } from '@/app/actions/metas'
import { testN8NAniversarioWebhook } from '@/app/actions/aniversarios'
import { getTecnicos } from '@/app/actions/tecnicos'
import {
  isAbastecimentoWebBloqueadoParaTecnicos,
  setAbastecimentoWebBloqueadoParaTecnicos
} from '@/app/actions/configuracao'

export default function TestesPage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const [testandoAbastecimento, setTestandoAbastecimento] = useState(false)
  const [testandoMetas, setTestandoMetas] = useState(false)
  const [testandoAniversario, setTestandoAniversario] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [selectedTec, setSelectedTec] = useState('')
  const [telefoneInput, setTelefoneInput] = useState('')

  // Controle de bloqueio do abastecimento web para técnicos
  const [bloqueioAbastecimento, setBloqueioAbastecimento] = useState<boolean>(false)
  const [loadingBloqueio, setLoadingBloqueio] = useState<boolean>(true)
  const [savingBloqueio, setSavingBloqueio] = useState<boolean>(false)

  useEffect(() => {
    getTecnicos().then(res => {
      if (res.success && res.data) {
        setTecnicos(res.data.filter((t: any) => t.ativo))
      }
    })

    isAbastecimentoWebBloqueadoParaTecnicos().then(bloqueado => {
      setBloqueioAbastecimento(bloqueado)
      setLoadingBloqueio(false)
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

  const handleToggleBloqueio = async () => {
    if (savingBloqueio) return
    setSavingBloqueio(true)
    const novoValor = !bloqueioAbastecimento
    const res = await setAbastecimentoWebBloqueadoParaTecnicos(novoValor)
    setSavingBloqueio(false)
    if (res.success) {
      setBloqueioAbastecimento(novoValor)
      setNotification({
        type: 'success',
        title: novoValor ? 'Quilometragem Web Desabilitada para Técnicos' : 'Quilometragem Web Liberada para Técnicos',
        message: novoValor
          ? 'O menu Quilometragem (KM, Abastecimento e Manutenção) foi removido e bloqueado no sistema web para todos os técnicos (TST). Eles deverão fazer esses lançamentos exclusivamente no aplicativo SG4 Mobile, garantindo a captura de geolocalização. Técnicos já logados precisam apenas recarregar a página.'
          : 'O menu Quilometragem (KM, Abastecimento e Manutenção) foi liberado novamente no sistema web para os técnicos.'
      })
    } else {
      setNotification({
        type: 'error',
        title: 'Falha ao salvar configuração',
        message: res.error || 'Ocorreu um erro ao atualizar o banco de dados.'
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {!hideHeader && (
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
            Painel de Testes e Configurações
          </h1>
        </div>
      )}

      {/* ── CARD DE CONTROLE: DESABILITAR ABASTECIMENTO WEB PARA TÉCNICOS ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          border: bloqueioAbastecimento ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
          padding: 24,
          boxShadow: bloqueioAbastecimento ? '0 4px 16px rgba(239, 68, 68, 0.08)' : '0 4px 12px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, maxWidth: 760 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: bloqueioAbastecimento ? '#fee2e2' : '#f1f5f9',
              color: bloqueioAbastecimento ? '#dc2626' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
          >
            {bloqueioAbastecimento ? <Lock size={26} /> : <Unlock size={26} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Desabilitar Quilometragem no Sistema Web para Técnicos
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: bloqueioAbastecimento ? '#fef2f2' : '#f0fdf4',
                  color: bloqueioAbastecimento ? '#dc2626' : '#16a34a',
                  border: bloqueioAbastecimento ? '1px solid #fecaca' : '1px solid #bbf7d0',
                }}
              >
                {bloqueioAbastecimento ? 'BLOQUEADO NO WEB (EXIGIR MOBILE)' : 'HABILITADO NO WEB'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.5 }}>
              Quando este flag está <b>ativado</b>, o menu <b>Quilometragem</b> inteiro (<b>KM, Abastecimento e Manutenção</b>) <b>desaparece para os técnicos de segurança no sistema web</b>. O bloqueio também é feito no servidor: acesso direto pela URL é redirecionado e qualquer tentativa de gravar/alterar/excluir esses registros pelo web é recusada. Assim, os técnicos serão obrigados a lançar exclusivamente pelo <b>aplicativo SG4 Mobile</b>, garantindo a captura de geolocalização via GPS.
              Administradores e usuários Master continuam com visualização e controle normais no sistema web.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleBloqueio}
          disabled={loadingBloqueio || savingBloqueio}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 22px',
            borderRadius: 10,
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            cursor: (loadingBloqueio || savingBloqueio) ? 'not-allowed' : 'pointer',
            background: bloqueioAbastecimento ? '#dc2626' : '#660099',
            color: '#ffffff',
            boxShadow: bloqueioAbastecimento ? '0 4px 14px rgba(220, 38, 38, 0.25)' : '0 4px 14px rgba(102, 0, 153, 0.25)',
            transition: 'all 0.2s',
            opacity: (loadingBloqueio || savingBloqueio) ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {savingBloqueio ? (
            <Loader2 size={18} className="animate-spin" />
          ) : bloqueioAbastecimento ? (
            <Unlock size={18} />
          ) : (
            <Lock size={18} />
          )}
          {savingBloqueio
            ? 'Salvando...'
            : bloqueioAbastecimento
            ? 'Reativar no Web'
            : 'Desabilitar para Técnicos no Web'}
        </button>
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

        {/* Teste Aniversários */}
        <div style={{ flex: 1, minWidth: 300, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fce7f3', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cake size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>Feliz Aniversário</h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>Envia os dados de aniversário do técnico selecionado.</p>
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
              setTestandoAniversario(true)
              startTransition(async () => {
                const res = await testN8NAniversarioWebhook(telefoneInput, selectedTec || undefined)
                setTestandoAniversario(false)
                if (res.success) {
                  setNotification({ type: 'success', title: 'Teste Aniversário Enviado', message: 'Mensagem de teste de aniversário enviada com sucesso!' })
                } else {
                  setNotification({ type: 'error', title: 'Falha no Teste', message: res.error || 'Erro ao enviar o teste de aniversário' })
                }
              })
            }}
            disabled={testandoAniversario || isPending}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, background: '#db2777', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: (testandoAniversario || isPending) ? 'not-allowed' : 'pointer', opacity: (testandoAniversario || isPending) ? 0.7 : 1 }}
          >
            {testandoAniversario ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Testar N8N_WEBHOOK_ANIVERSARIO
          </button>
        </div>
      </div>

      {/* Modal Notification */}
      {notification && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: notification.type === 'success' ? '#dcfce7' : '#fee2e2', color: notification.type === 'success' ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              {notification.type === 'success' ? <CheckCircle2 size={32} /> : <Loader2 size={32} />}
            </div>
            
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>
              {notification.title}
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              {notification.message}
            </p>

            <button 
              onClick={() => setNotification(null)}
              style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: notification.type === 'success' ? '#16a34a' : '#dc2626', color: '#fff', fontWeight: 800, cursor: 'pointer', marginTop: 8 }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
