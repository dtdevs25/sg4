'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { Brain, Loader2, Send, FileText, User, Bot, Paperclip, X, ChevronLeft, Sparkles } from 'lucide-react'
import { getProcedimentosIa } from '@/app/actions/procedimentosIa'

// Gera um nome amigável a partir do nome do arquivo
function getNomeAmigavel(nomeArquivo: string): string {
  if (!nomeArquivo) return 'Revisor'
  // Remove timestamp inicial (números_) e extensão
  const semTimestamp = nomeArquivo.replace(/^\d+_/, '')
  const semExtensao = semTimestamp.replace(/\.(pdf|txt|docx|md|csv)$/i, '')
  // Converte _ e - em espaços
  const legivel = semExtensao.replace(/[_-]+/g, ' ').trim()
  // Limita tamanho
  return legivel.length > 40 ? legivel.substring(0, 40) + '...' : legivel
}

// Extrai iniciais para o avatar
function getIconeEspecialista(nome: string): string {
  const palavras = nome.split(' ').filter(p => p.length > 3)
  if (palavras.length === 0) return 'IA'
  if (palavras.length === 1) return palavras[0].substring(0, 2).toUpperCase()
  return (palavras[0][0] + palavras[1][0]).toUpperCase()
}

export default function ChatRevisor() {
  const [procedimentos, setProcedimentos] = useState<any[]>([])
  const [selectedProcedimento, setSelectedProcedimento] = useState<string>('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [textInput, setTextInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { messages, isLoading, append } = useChat({
    api: '/api/chat',
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

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [textInput])

  const handleSend = async () => {
    const trimmed = textInput.trim()
    if (!trimmed && selectedFiles.length === 0) return
    if (isLoading) return

    // Converte arquivos para attachments base64
    const attachments: any[] = []
    for (const file of selectedFiles) {
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      attachments.push({
        name: file.name,
        contentType: file.type || 'application/octet-stream',
        url: `data:${file.type};base64,${base64}`,
      })
    }

    setTextInput('')
    setSelectedFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''

    await append(
      {
        role: 'user',
        content: trimmed || `[Documento enviado: ${selectedFiles.map(f => f.name).join(', ')}]`,
        experimental_attachments: attachments.length > 0 ? attachments : undefined,
      },
      { body: { procedureKey: selectedProcedimento } }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const especialistaNome = selectedProcedimento ? getNomeAmigavel(selectedProcedimento) : 'Nenhum especialista selecionado'
  const especialistaIcone = selectedProcedimento ? getIconeEspecialista(getNomeAmigavel(selectedProcedimento)) : 'IA'

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: '#f9fafb', overflow: 'hidden' }}>

      {/* SIDEBAR */}
      <div style={{
        width: sidebarOpen ? 280 : 0,
        background: '#1e1e2e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.3s ease',
        flexShrink: 0,
      }}>
        <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ background: 'rgba(102,0,153,0.6)', padding: 8, borderRadius: 10 }}>
            <Brain size={18} color="#c084fc" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>Revisor IA</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Escolha o especialista</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 6px 8px' }}>Especialistas</div>
          {procedimentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: '#475569', fontSize: 12 }}>
              Nenhum procedimento carregado.
            </div>
          ) : procedimentos.map(proc => {
            const isSelected = selectedProcedimento === proc.nome
            const nome = getNomeAmigavel(proc.nome ?? '')
            const icone = getIconeEspecialista(nome)
            return (
              <button
                key={proc.nome}
                onClick={() => setSelectedProcedimento(proc.nome)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', width: '100%', textAlign: 'left',
                  background: isSelected ? 'rgba(192,132,252,0.15)' : 'transparent',
                  border: `1px solid ${isSelected ? 'rgba(192,132,252,0.4)' : 'transparent'}`,
                  borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: isSelected ? 'rgba(192,132,252,0.3)' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: isSelected ? '#c084fc' : '#64748b'
                }}>
                  {icone}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? '#e2e8f0' : '#94a3b8', lineHeight: 1.3, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {nome}
                  </div>
                </div>
                {isSelected && <Sparkles size={12} color="#c084fc" style={{ flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* MAIN CHAT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 6, borderRadius: 8, transition: 'background 0.15s' }}>
            <ChevronLeft size={18} style={{ transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
          </button>
          {selectedProcedimento ? (
            <>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #660099, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {especialistaIcone}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{especialistaNome}</div>
                <div style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  Especialista ativo
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: '#94a3b8' }}>Selecione um especialista na barra lateral</div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #660099, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 8px 32px rgba(102,0,153,0.25)' }}>
                  <Brain size={36} color="#fff" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0' }}>Olá! Sou o Revisor IA</h2>
                <p style={{ fontSize: 14, color: '#64748b', maxWidth: 400, lineHeight: 1.7, margin: 0 }}>
                  Sou especialista nos procedimentos da sua empresa. Anexe um documento (APR, Investigação de Acidente, Relatório) e peça para eu revisar ou tirar dúvidas sobre os procedimentos.
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['Revise minha APR', 'Analise esta investigação', 'O documento está correto?'].map(sugestao => (
                    <button key={sugestao} onClick={() => setTextInput(sugestao)} style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', fontWeight: 500 }}>
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            ) : messages.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 14, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                {/* Avatar */}
                {m.role === 'user' ? (
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={17} color="#64748b" />
                  </div>
                ) : (
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #660099, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#fff' }}>
                    {especialistaIcone}
                  </div>
                )}
                {/* Bubble */}
                <div style={{
                  background: m.role === 'user' ? '#660099' : '#fff',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  padding: '12px 16px',
                  borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  maxWidth: '75%',
                  border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                  boxShadow: m.role === 'user' ? 'none' : '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  {((m as any).experimental_attachments ?? []).map((att: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '6px 10px', borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
                      <FileText size={13} />{att.name ?? 'Documento'}
                    </div>
                  ))}
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #660099, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#fff' }}>
                  {especialistaIcone}
                </div>
                <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '4px 16px 16px 16px', border: '1px solid #e2e8f0', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#660099', opacity: 0.7, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div style={{ padding: '16px 24px 20px', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>

            {/* Arquivos selecionados */}
            {selectedFiles.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {selectedFiles.map((file, idx) => (
                  <div key={idx} style={{ background: '#f3e8ff', color: '#7e22ce', padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FileText size={13} />{file.name}
                    <button
                      onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: '#7e22ce', cursor: 'pointer', padding: '0 0 0 4px', display: 'flex', lineHeight: 1 }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input box */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: '#f8fafc', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: '10px 12px', transition: 'border 0.2s' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', flexShrink: 0, transition: 'color 0.15s' }}
                title="Anexar documento"
              >
                <Paperclip size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                multiple
                accept=".pdf,.txt,.md,.docx,.csv"
                onChange={e => {
                  if (e.target.files) {
                    setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])
                  }
                  e.target.value = ''
                }}
              />
              <textarea
                ref={textareaRef}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mensagem ao Revisor IA (Enter para enviar, Shift+Enter para nova linha)..."
                rows={1}
                disabled={isLoading}
                style={{
                  flex: 1, border: 'none', outline: 'none', resize: 'none',
                  fontSize: 14, color: '#334155', background: 'transparent',
                  lineHeight: 1.6, padding: '4px 0', fontFamily: 'inherit',
                  minHeight: 28, maxHeight: 120, overflowY: 'auto'
                }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading || (textInput.trim() === '' && selectedFiles.length === 0)}
                style={{
                  background: (isLoading || (textInput.trim() === '' && selectedFiles.length === 0)) ? '#e2e8f0' : 'linear-gradient(135deg, #660099, #9333ea)',
                  border: 'none', padding: '9px 10px', borderRadius: 10,
                  color: (isLoading || (textInput.trim() === '' && selectedFiles.length === 0)) ? '#94a3b8' : '#fff',
                  cursor: (isLoading || (textInput.trim() === '' && selectedFiles.length === 0)) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'all 0.2s'
                }}
              >
                {isLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
              </button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 8 }}>
              Revisor IA pode cometer erros. Verifique informações importantes antes de aplicar.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>
    </div>
  )
}
