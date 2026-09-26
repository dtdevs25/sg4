'use client'

import { useState, useEffect } from 'react'
import { getProcedimentosIa, uploadProcedimentoIa, deleteProcedimentoIa } from '@/app/actions/procedimentosIa'
import { FileText, Trash2, Upload, Loader2, AlertCircle, FilePlus } from 'lucide-react'

export default function ProcedimentosIaPage() {
  const [arquivos, setArquivos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadArquivos()
  }, [])

  async function loadArquivos() {
    setLoading(true)
    const res = await getProcedimentosIa()
    if (res.success) {
      setArquivos(res.data || [])
    } else {
      setError(res.error || 'Erro ao carregar')
    }
    setLoading(false)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    // Validar tipo e tamanho
    if (file.size > 15 * 1024 * 1024) {
      setError('Arquivo muito grande. O limite é 15MB.')
      return
    }

    setUploading(true)
    setError('')
    
    const formData = new FormData()
    formData.append('file', file)

    const res = await uploadProcedimentoIa(formData)
    
    if (res.success) {
      await loadArquivos()
    } else {
      setError(res.error || 'Falha no upload')
    }
    
    setUploading(false)
    e.target.value = '' // Limpar input
  }

  async function handleDelete(nome: string) {
    if (!confirm('Tem certeza que deseja apagar este procedimento? O Revisor IA deixará de lê-lo.')) return
    
    setDeletingId(nome)
    const res = await deleteProcedimentoIa(nome)
    
    if (res.success) {
      setArquivos(prev => prev.filter(a => a.nome !== nome))
    } else {
      alert('Erro ao apagar arquivo.')
    }
    
    setDeletingId(null)
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ background: 'rgba(102,0,153,0.1)', padding: 12, borderRadius: 12, color: '#660099' }}>
          <FilePlus size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0 }}>Procedimentos da IA</h1>
          <p style={{ color: '#64748b', margin: 0, marginTop: 4 }}>Gerencie a base de conhecimento do Revisor IA. Faça upload dos procedimentos oficiais (PDF, TXT) para treinar o cérebro da IA.</p>
        </div>
      </div>
      
      {error && (
        <div style={{ marginTop: 24, background: '#fee2e2', color: '#ef4444', padding: '12px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Upload Card */}
        <div style={{ border: '2px dashed #cbd5e1', borderRadius: 16, padding: 32, textAlign: 'center', background: '#f8fafc', transition: 'all 0.2s', position: 'relative' }}>
          <input 
            type="file" 
            accept=".pdf,.txt,.docx,.md"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: uploading ? 'not-allowed' : 'pointer' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#64748b' }}>
            <div style={{ background: '#e2e8f0', padding: 16, borderRadius: '50%', color: '#64748b' }}>
              {uploading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
            </div>
            {uploading ? (
              <span style={{ fontWeight: 700 }}>Enviando arquivo...</span>
            ) : (
              <>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#334155' }}>Clique ou arraste um documento para cá</span>
                <span style={{ fontSize: 14 }}>Formatos aceitos: PDF, TXT, DOCX. Limite de 15MB.</span>
              </>
            )}
          </div>
        </div>

        {/* Lista de Arquivos */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, color: '#334155' }}>
            Documentos Carregados no Cérebro ({arquivos.length})
          </div>
          
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Loader2 className="animate-spin" size={24} />
              Carregando documentos...
            </div>
          ) : arquivos.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              Nenhum procedimento cadastrado ainda. O Cérebro da IA está vazio.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {arquivos.map((arq, idx) => (
                <div key={arq.nome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: idx < arquivos.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: 'rgba(59,130,246,0.1)', padding: 10, borderRadius: 8, color: '#3b82f6' }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#334155', wordBreak: 'break-all' }}>{arq.nome.split('_').slice(1).join('_') || arq.nome}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                        {formatBytes(arq.tamanho)} • Adicionado em {arq.data ? new Date(arq.data).toLocaleDateString('pt-BR') : 'Desconhecida'}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(arq.nome)}
                    disabled={deletingId === arq.nome}
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: 8, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {deletingId === arq.nome ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  )
}
