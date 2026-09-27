'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { Brain, Loader2, Send, FileText, User, Bot, Paperclip, X } from 'lucide-react'
import { getProcedimentosIa } from '@/app/actions/procedimentosIa'

export default function ChatRevisor() {
  const [procedimentos, setProcedimentos] = useState<any[]>([])
  const [selectedProcedimento, setSelectedProcedimento] = useState<string>('')
  const [selectedFiles, setSelectedFiles] = useState<FileList | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { procedureKey: selectedProcedimento },
    initialInput: '',
  })

  useEffect(() => {
    getProcedimentosIa().then(res => {
      if (res.success && res.data && res.data.length > 0) {
        setProcedimentos(res.data)
        setSelectedProcedimento(res.data[0].nome)
      }
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = (input ?? '').trim()
    if (!trimmed && (!selectedFiles || selectedFiles.length === 0)) return
    const options: any = {}
    if (selectedFiles && selectedFiles.length > 0) {
      options.experimental_attachments = selectedFiles
    }
    handleSubmit(e, options)
    setSelectedFiles(undefined)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const canSend = !isLoading && ((input ?? '').trim().length > 0 || (selectedFiles && selectedFiles.length > 0))

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: 20, padding: '20px' }}>

      {/* SIDEBAR: Especialistas */}
      <div style={{ width: 300, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={18} color="#660099" />
            Cérebro Especialista
          </h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0 0' }}>Selecione o manual que a IA usará como referência.</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {procedimentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>
              Nenhum procedimento carregado ainda.
            </div>
          ) : procedimentos.map(proc => {
            const isSelected = selectedProcedimento === proc.nome
            const shortName = (proc.nome ?? '').split('_').slice(1).join(' ').replace(/_/g, ' ').replace(/\.(pdf|txt|docx|md)$/i, '') || proc.nome
            return (
              <button
                key={proc.nome}
                onClick={() => setSelectedProcedimento(proc.nome)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', width: '100%', textAlign: 'left',
                  background: isSelected ? 'rgba(102,0,153,0.08)' : '#f8fafc',
                  border: `1.5px solid ${isSelected ? '#660099' : '#e2e8f0'}`,
                  borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <div style={{ background: isSelected ? '#660099' : '#e2e8f0', color: isSelected ? '#fff' : '#64748b', padding: 7, borderRadius: 7, flexShrink: 0, marginTop: 1 }}>
                  <FileText size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: isSelected ? '#660099' : '#334155', lineHeight: 1.4, wordBreak: 'break-word' }}>
                    {shortName}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    {isSelected ? '✓ Especialista ativo' : 'Clique para ativar'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(102,0,153,0.1)', padding: 8, borderRadius: 8, color: '#660099' }}>
            <Bot size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Revisor IA</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {selectedProcedimento
                ? `Especialista: ${(selectedProcedimento ?? '').split('_').slice(1).join(' ').replace(/_/g, ' ').replace(/\.(pdf|txt|docx|md)$/i, '')}`
                : 'Nenhum especialista selecionado'}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center', paddingTop: 60 }}>
              <div style={{ background: 'rgba(102,0,153,0.06)', padding: 24, borderRadius: '50%', marginBottom: 16 }}>
                <Brain size={44} color="#660099" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#334155', margin: '0 0 8px 0' }}>Olá! Como posso ajudar?</h3>
              <p style={{ maxWidth: 380, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Selecione um especialista ao lado, depois anexe seu documento (APR, investigação, relatório) e peça para a IA revisar.
              </p>
            </div>
          ) : messages.map((m, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 12, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.role === 'user' ? '#f1f5f9' : 'rgba(102,0,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.role === 'user' ? '#64748b' : '#660099', flexShrink: 0 }}>
                {m.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div style={{ background: m.role === 'user' ? '#660099' : '#f8fafc', color: m.role === 'user' ? '#fff' : '#334155', padding: '14px 18px', borderRadius: 14, borderTopRightRadius: m.role === 'user' ? 4 : 14, borderTopLeftRadius: m.role === 'assistant' ? 4 : 14, maxWidth: '78%', border: m.role === 'user' ? 'none' : '1px solid #e2e8f0', fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {(m.experimental_attachments ?? []).map((attachment: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '6px 10px', borderRadius: 6, marginBottom: 10, fontSize: 12 }}>
                    <FileText size={13} />
                    {attachment.name ?? 'Documento anexado'}
                  </div>
                ))}
                {m.content}
              </div>
            </div>
          ))}

          {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(102,0,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#660099' }}>
                <Bot size={18} />
              </div>
              <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: 14, borderTopLeftRadius: 4, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite', color: '#660099' }} />
                <span style={{ fontSize: 13, color: '#64748b' }}>Analisando com base no procedimento...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
          {selectedFiles && selectedFiles.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {Array.from(selectedFiles).map((file, idx) => (
                <div key={idx} style={{ background: '#ede9fe', color: '#6d28d9', padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <FileText size={13} /> {file.name}
                  <button onClick={() => { setSelectedFiles(undefined); if (fileInputRef.current) fileInputRef.current.value = '' }} style={{ background: 'none', border: 'none', color: '#6d28d9', cursor: 'pointer', padding: 1, display: 'flex', marginLeft: 2 }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={onFormSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', padding: '6px 8px 6px 12px' }}>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ background: '#f1f5f9', border: 'none', padding: 9, borderRadius: 8, cursor: 'pointer', color: '#475569', display: 'flex', flexShrink: 0 }}>
                <Paperclip size={17} />
              </button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) setSelectedFiles(e.target.files) }} accept=".pdf,.txt,.md,.docx,.csv" />
              <input
                value={input ?? ''}
                onChange={handleInputChange}
                placeholder="Digite sua mensagem ou anexe um documento..."
                style={{ flex: 1, border: 'none', outline: 'none', padding: '10px 12px', fontSize: 14, color: '#334155', background: 'transparent' }}
                disabled={isLoading}
              />
            </div>
            <button type="submit" disabled={!canSend}
              style={{ background: canSend ? '#660099' : '#e2e8f0', border: 'none', padding: 14, borderRadius: 12, color: canSend ? '#fff' : '#94a3b8', cursor: canSend ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
              {isLoading ? <Loader2 size={19} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={19} />}
            </button>
          </form>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            A IA pode cometer erros. Verifique as informações importantes antes de aplicar.
          </div>
        </div>
      </div>
    </div>
  )
}
