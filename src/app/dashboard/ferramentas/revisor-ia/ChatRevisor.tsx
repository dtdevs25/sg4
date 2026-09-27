'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { Brain, Loader2, Send, FileText, User, Bot, Paperclip, X } from 'lucide-react'
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
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, data } = useChat({
    api: '/api/chat',
    body: {
      procedureKey: selectedProcedimento
    }
  })

  const [selectedFiles, setSelectedFiles] = useState<FileList | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const res = await getProcedimentosIa()
      if (res.success && res.data) {
        setProcedimentos(res.data)
        if (res.data.length > 0) {
          setSelectedProcedimento(res.data[0].nome)
        }
      }
    }
    load()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!input.trim() && (!selectedFiles || selectedFiles.length === 0)) return

    const options: any = {}
    
    if (selectedFiles && selectedFiles.length > 0) {
      options.experimental_attachments = selectedFiles
    }

    handleSubmit(e, options)
    setSelectedFiles(undefined)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files)
    }
  }

  const clearFiles = () => {
    setSelectedFiles(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: 24, padding: '24px' }}>
      
      {/* SIDEBAR: Especialistas */}
      <div style={{ width: 320, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={20} color="#660099" />
            Cérebro Especialista
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>Escolha o manual que a IA deve seguir para fazer a revisão.</p>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {procedimentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>
              Nenhum procedimento carregado no sistema.
            </div>
          ) : (
            procedimentos.map(proc => {
              const isSelected = selectedProcedimento === proc.nome
              const shortName = getNomeAmigavel(proc.nome)
              
              return (
                <button
                  key={proc.nome}
                  onClick={() => setSelectedProcedimento(proc.nome)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12, width: '100%', textAlign: 'left',
                    background: isSelected ? 'rgba(102,0,153,0.08)' : 'transparent',
                    border: `1px solid ${isSelected ? '#660099' : 'transparent'}`,
                    borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ background: isSelected ? '#660099' : '#e2e8f0', color: isSelected ? '#fff' : '#64748b', padding: 8, borderRadius: 8 }}>
                    <FileText size={18} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#660099' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {shortName}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Especialista ativo</div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center' }}>
              <div style={{ background: 'rgba(102,0,153,0.05)', padding: 24, borderRadius: '50%', marginBottom: 16 }}>
                <Brain size={48} color="#660099" opacity={0.8} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#334155', margin: 0 }}>Olá! Como posso te ajudar hoje?</h3>
              <p style={{ maxWidth: 400, marginTop: 8 }}>Faça o upload do seu documento (APR, relatório, etc) e eu vou revisá-lo seguindo as regras do especialista selecionado ao lado.</p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 16, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: m.role === 'user' ? '#f1f5f9' : 'rgba(102,0,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.role === 'user' ? '#64748b' : '#660099', flexShrink: 0 }}>
                  {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div style={{ background: m.role === 'user' ? '#660099' : '#f8fafc', color: m.role === 'user' ? '#fff' : '#334155', padding: '16px 20px', borderRadius: 16, borderTopRightRadius: m.role === 'user' ? 4 : 16, borderTopLeftRadius: m.role === 'assistant' ? 4 : 16, maxWidth: '80%', border: m.role === 'user' ? 'none' : '1px solid #e2e8f0', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {m.experimental_attachments?.map((attachment, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
                      <FileText size={16} />
                      {attachment.name ?? 'Documento anexado'}
                    </div>
                  ))}
                  {m.content}
                </div>
              </div>
            ))
          )}
          {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div style={{ display: 'flex', gap: 16, flexDirection: 'row' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(102,0,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#660099', flexShrink: 0 }}>
                <Bot size={20} />
              </div>
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 16, borderTopLeftRadius: 4, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={16} className="animate-spin" color="#660099" />
                <span style={{ fontSize: 14, color: '#64748b' }}>Analisando documento...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: 20, borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
          
          {selectedFiles && selectedFiles.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {Array.from(selectedFiles).map((file, idx) => (
                <div key={idx} style={{ background: '#e0e7ff', color: '#4f46e5', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} />
                  {file.name}
                  <button onClick={clearFiles} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: 2, display: 'flex' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={onFormSubmit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative', background: '#fff', borderRadius: 12, border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', padding: '8px 12px', transition: 'border 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: '#f1f5f9', border: 'none', padding: 10, borderRadius: 8, cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                <Paperclip size={18} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".pdf,.txt,.md,.csv,.docx"
                multiple
              />

              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Peça para a IA revisar o documento ou faça uma pergunta..."
                style={{ flex: 1, border: 'none', outline: 'none', padding: '12px 16px', fontSize: 14, color: '#334155', background: 'transparent' }}
                disabled={isLoading}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading || (!input.trim() && (!selectedFiles || selectedFiles.length === 0))}
              style={{ background: '#660099', border: 'none', padding: '16px', borderRadius: 12, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isLoading || (!input.trim() && (!selectedFiles || selectedFiles.length === 0)) ? 0.5 : 1, transition: 'all 0.2s' }}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
            A IA pode cometer erros. Considere verificar informações importantes.
          </div>
        </div>

      </div>
    </div>
  )
}
