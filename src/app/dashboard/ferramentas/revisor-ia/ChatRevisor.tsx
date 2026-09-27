'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { Brain, Loader2, Send, FileText, User, Bot, Paperclip, X, Sparkles } from 'lucide-react'
import { getProcedimentosIa } from '@/app/actions/procedimentosIa'

function getNomeAmigavel(nomeArquivo: string): string {
  if (!nomeArquivo) return 'Revisor'
  const semTimestamp = nomeArquivo.replace(/^procedimentos-ia\//, '').replace(/^\d+_/, '')
  const semExtensao = semTimestamp.replace(/\.(pdf|txt|docx|md|csv)$/i, '')
  return semExtensao.replace(/[_-]+/g, ' ').trim() || 'Revisor'
}

export default function ChatRevisor() {
  const [procedimentos, setProcedimentos] = useState<any[]>([])
  const [selectedProcedimento, setSelectedProcedimento] = useState<string>('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [textInput, setTextInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { messages, isLoading, append } = useChat({ api: '/api/chat' })

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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px'
    }
  }, [textInput])

  async function handleSend() {
    const trimmed = textInput.trim()
    if ((!trimmed && selectedFiles.length === 0) || isLoading) return

    // Converter arquivos para base64 attachments
    const attachments: any[] = []
    for (const file of selectedFiles) {
      const bytes = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))
      attachments.push({
        name: file.name,
        contentType: file.type || 'application/octet-stream',
        url: `data:${file.type};base64,${base64}`,
      })
    }

    const content = trimmed || `Por favor, analise o(s) documento(s) enviado(s): ${selectedFiles.map(f => f.name).join(', ')}`

    setTextInput('')
    setSelectedFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''

    await append(
      {
        role: 'user',
        content,
        experimental_attachments: attachments.length > 0 ? attachments : undefined,
      } as any,
      { body: { procedureKey: selectedProcedimento } }
    )
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const nomeEspecialista = getNomeAmigavel(selectedProcedimento)
  const canSend = !isLoading && (textInput.trim().length > 0 || selectedFiles.length > 0)

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <div style={{ width: 280, background: '#1e1e2e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(192,132,252,0.2)', padding: 8, borderRadius: 10 }}>
              <Brain size={18} color="#c084fc" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>Revisor IA</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Especialistas disponíveis</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          {procedimentos.length === 0 ? (
            <div style={{ padding: 20, color: '#475569', fontSize: 12, textAlign: 'center' }}>
              Nenhum procedimento carregado.<br />Acesse Administração → Procedimentos IA.
            </div>
          ) : procedimentos.map(proc => {
            const sel = selectedProcedimento === proc.nome
            const nome = getNomeAmigavel(proc.nome ?? '')
            return (
              <button key={proc.nome} onClick={() => setSelectedProcedimento(proc.nome)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', width: '100%', textAlign: 'left',
                background: sel ? 'rgba(192,132,252,0.15)' : 'transparent',
                border: `1px solid ${sel ? 'rgba(192,132,252,0.35)' : 'transparent'}`,
                borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', marginBottom: 4
              }}>
                <div style={{ background: sel ? 'rgba(192,132,252,0.3)' : 'rgba(255,255,255,0.07)', padding: 8, borderRadius: 8, flexShrink: 0 }}>
                  <FileText size={15} color={sel ? '#c084fc' : '#64748b'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: sel ? '#e2e8f0' : '#94a3b8', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {nome}
                  </div>
                </div>
                {sel && <Sparkles size={12} color="#c084fc" style={{ flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── CHAT ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#660099,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Revisor IA</div>
            <div style={{ fontSize: 11, color: selectedProcedimento ? '#22c55e' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
              {selectedProcedimento && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />}
              {selectedProcedimento ? `Especialista: ${nomeEspecialista}` : 'Selecione um especialista na barra lateral'}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>
          <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, textAlign: 'center', gap: 16 }}>
                <div style={{ width: 68, height: 68, borderRadius: 20, background: 'linear-gradient(135deg,#660099,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(102,0,153,0.2)' }}>
                  <Brain size={32} color="#fff" />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 6px 0' }}>Sou o Revisor IA</h2>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, maxWidth: 380, lineHeight: 1.7 }}>
                    Selecione o especialista ao lado, depois anexe ou descreva seu documento para que eu possa revisar.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['Revise minha APR', 'Analise esta investigação de acidente', 'Este documento está correto?'].map(s => (
                    <button key={s} onClick={() => setTextInput(s)} style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: m.role === 'user' ? '50%' : 10, background: m.role === 'user' ? '#e2e8f0' : 'linear-gradient(135deg,#660099,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {m.role === 'user' ? <User size={17} color="#64748b" /> : <Bot size={17} color="#fff" />}
                </div>
                <div style={{
                  background: m.role === 'user' ? '#660099' : '#fff',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  padding: '12px 16px',
                  borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  maxWidth: '78%', border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                  boxShadow: m.role === 'assistant' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
                }}>
                  {((m as any).experimental_attachments ?? []).map((a: any, j: number) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '5px 10px', borderRadius: 6, marginBottom: 8, fontSize: 12 }}>
                      <FileText size={13} /> {a.name ?? 'Documento'}
                    </div>
                  ))}
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#660099,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={17} color="#fff" />
                </div>
                <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '4px 16px 16px 16px', border: '1px solid #e2e8f0', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(k => (
                    <span key={k} style={{ width: 8, height: 8, borderRadius: '50%', background: '#660099', display: 'inline-block', animation: `dotBounce 1.2s ease-in-out ${k * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: '14px 24px 18px', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            {selectedFiles.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {selectedFiles.map((f, i) => (
                  <div key={i} style={{ background: '#f3e8ff', color: '#7e22ce', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FileText size={12} /> {f.name}
                    <button onClick={() => setSelectedFiles(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7e22ce', padding: 0, display: 'flex', marginLeft: 2 }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: '#f8fafc', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '8px 10px' }}>
              <button type="button" onClick={() => fileInputRef.current?.click()} title="Anexar documento"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 6, display: 'flex', borderRadius: 8, flexShrink: 0 }}>
                <Paperclip size={20} />
              </button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept=".pdf,.txt,.md,.docx,.csv"
                onChange={e => { if (e.target.files) { setSelectedFiles(p => [...p, ...Array.from(e.target.files!)]) } e.target.value = '' }} />
              <textarea
                ref={textareaRef}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Escreva sua mensagem... (Enter envia, Shift+Enter nova linha)"
                rows={1}
                disabled={isLoading}
                style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', fontSize: 14, color: '#334155', background: 'transparent', lineHeight: 1.6, padding: '5px 8px', fontFamily: 'inherit', minHeight: 28, maxHeight: 140, overflowY: 'auto' }}
              />
              <button type="button" onClick={handleSend} disabled={!canSend}
                style={{ background: canSend ? 'linear-gradient(135deg,#660099,#9333ea)' : '#e2e8f0', border: 'none', padding: '10px 11px', borderRadius: 10, color: canSend ? '#fff' : '#94a3b8', cursor: canSend ? 'pointer' : 'not-allowed', display: 'flex', flexShrink: 0, transition: 'all 0.2s' }}>
                {isLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
              </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#cbd5e1', margin: '8px 0 0 0' }}>
              O Revisor IA pode cometer erros. Valide as informações antes de aplicar.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dotBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
      `}</style>
    </div>
  )
}
