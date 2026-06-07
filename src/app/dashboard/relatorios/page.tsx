'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import {
  FileText, Plus, Search, Calendar, ChevronRight,
  AlertTriangle, UploadCloud, Trash2, Camera, MapPin, Loader2, PlayCircle, Eye, Printer
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import {
  getRelatorios, createRelatorio, deleteRelatorio, updateRelatorio, getRelatorioById,
  addAtividade, deleteAtividade, uploadFotoRelatorio
} from '@/app/actions/relatorios'
import { getTecnicos } from '@/app/actions/tecnicos'
import Link from 'next/link'

export default function RelatoriosPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1)
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())

  const [relatorios, setRelatorios] = useState<any[]>([])
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  // Modals
  const [showNovoModal, setShowNovoModal] = useState(false)
  const [showAtividadesModal, setShowAtividadesModal] = useState<string | null>(null)
  const [relatorioAtivo, setRelatorioAtivo] = useState<any>(null)
  
  const [showNovaAtividade, setShowNovaAtividade] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null)

  // Forms
  const [formNovo, setFormNovo] = useState({ tecnicoId: '', empresa: '', projeto: '', dataReferencia: '' })
  const [formAtiv, setFormAtiv] = useState({ data: '', local: '', cidadeUf: '', descricao: '', fotoBase64: '', fileName: '', contentType: '' })

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
    if (role === 'MASTER' || role === 'ADMIN') {
      getTecnicos().then(res => {
        if (res.success && res.data) setTecnicos(res.data)
      })
    }
  }, [mesAtual, anoAtual, role])

  async function loadData() {
    setLoading(true)
    const items = await getRelatorios(mesAtual, anoAtual)
    setRelatorios(items)
    
    // Reload active report if modal is open
    if (showAtividadesModal) {
      const updated = await getRelatorioById(showAtividadesModal)
      setRelatorioAtivo(updated)
    }
    setLoading(false)
  }

  // --- Handlers Relatório ---
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const dataRef = new Date(formNovo.dataReferencia + 'T12:00:00Z')
      const tId = role === 'TST' ? (session?.user as any).tecnicoId : formNovo.tecnicoId
      
      const res = await createRelatorio({
        tecnicoId: tId,
        empresa: formNovo.empresa,
        projeto: formNovo.projeto,
        dataReferencia: dataRef
      })
      
      if (res.success) {
        setShowNovoModal(false)
        setFormNovo({ tecnicoId: '', empresa: '', projeto: '', dataReferencia: '' })
        loadData()
      } else {
        alert(res.error)
      }
    })
  }

  async function handleDeleteRelatorio(id: string) {
    if (!confirm('Deseja excluir este relatório e todas as suas atividades?')) return
    startTransition(async () => {
      const res = await deleteRelatorio(id)
      if (res.success) loadData()
      else alert(res.error)
    })
  }

  // --- Handlers Atividade ---
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setFormAtiv(prev => ({
        ...prev,
        fotoBase64: ev.target?.result as string,
        fileName: file.name,
        contentType: file.type
      }))
    }
    reader.readAsDataURL(file)
  }

  async function handleAddAtividade(e: React.FormEvent) {
    e.preventDefault()
    if (!relatorioAtivo) return

    startTransition(async () => {
      let fotoUrl = undefined
      if (formAtiv.fotoBase64) {
        const up = await uploadFotoRelatorio(formAtiv.fotoBase64, formAtiv.fileName, formAtiv.contentType)
        if (up.success) fotoUrl = up.url
        else return alert('Erro no upload da foto')
      }

      const res = await addAtividade(relatorioAtivo.id, {
        data: new Date(formAtiv.data + 'T12:00:00Z'),
        local: formAtiv.local,
        cidadeUf: formAtiv.cidadeUf,
        descricao: formAtiv.descricao,
        fotoUrl
      })

      if (res.success) {
        setShowNovaAtividade(false)
        setFormAtiv({ data: '', local: '', cidadeUf: '', descricao: '', fotoBase64: '', fileName: '', contentType: '' })
        loadData() // also reloads relatorioAtivo
      } else {
        alert(res.error)
      }
    })
  }

  async function handleDeleteAtiv(id: string) {
    if (!confirm('Excluir esta atividade?')) return
    startTransition(async () => {
      const res = await deleteAtividade(id)
      if (res.success) loadData()
      else alert(res.error)
    })
  }

  // --- Render ---
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText color="#3b82f6" /> Relatórios de Atividades
          </h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>Crie e gerencie relatórios padronizados.</p>
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#fff', borderRadius: 8, padding: 4, border: '1px solid #e2e8f0' }}>
            <select value={mesAtual} onChange={e => setMesAtual(Number(e.target.value))} style={{ border: 'none', background: 'transparent', padding: '8px 12px', fontWeight: 600, color: '#334155', outline: 'none', cursor: 'pointer' }}>
              {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}</option>)}
            </select>
            <div style={{ width: 1, background: '#e2e8f0', margin: '4px 0' }} />
            <select value={anoAtual} onChange={e => setAnoAtual(Number(e.target.value))} style={{ border: 'none', background: 'transparent', padding: '8px 12px', fontWeight: 600, color: '#334155', outline: 'none', cursor: 'pointer' }}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button onClick={() => setShowNovoModal(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
            <Plus size={18} /> Novo Relatório
          </button>
        </div>
      </div>

      {/* LISTA DE RELATORIOS */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 className="animate-spin" color="#3b82f6" size={40} /></div>
      ) : relatorios.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FileText size={32} color="#94a3b8" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#334155' }}>Nenhum relatório encontrado</h3>
          <p style={{ color: '#64748b', marginTop: 8 }}>Crie um novo relatório para este mês.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {relatorios.map(r => (
            <div key={r.id} style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{r.projeto}</h3>
                  <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{r.empresa}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#475569' }}>
                  {new Date(r.dataReferencia).toLocaleString('pt-BR', {month: 'long', year: 'numeric', timeZone: 'UTC'})}
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#475569', flex: 1, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#475569' }}>
                    {r.tecnico?.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600 }}>{r.tecnico?.nome || 'Desconhecido'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color="#94a3b8" />
                  {r.atividades.length} atividades cadastradas
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '16px 0' }} />

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => {
                  setRelatorioAtivo(r)
                  setShowAtividadesModal(r.id)
                }} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#3b82f6', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                  <Eye size={16} /> Gerir Atividades
                </button>
                <Link href={`/dashboard/relatorios/${r.id}/print`} target="_blank" style={{ padding: '10px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="Imprimir PDF">
                  <Printer size={18} />
                </Link>
                {(role === 'MASTER' || role === 'ADMIN') && (
                  <button onClick={() => handleDeleteRelatorio(r.id)} style={{ padding: '10px 14px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer' }} title="Excluir Relatório">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NOVO RELATÓRIO */}
      {showNovoModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><FileText color="#3b82f6" /> Criar Relatório</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(role === 'MASTER' || role === 'ADMIN') && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Técnico Responsável</label>
                  <select required value={formNovo.tecnicoId} onChange={(e) => setFormNovo(p => ({...p, tecnicoId: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                    <option value="">Selecione...</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Empresa Cliente</label>
                <input required placeholder="Ex: VIVO S/A" value={formNovo.empresa} onChange={(e) => setFormNovo(p => ({...p, empresa: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Projeto / Área</label>
                <input required placeholder="Ex: Projeto Infraestrutura" value={formNovo.projeto} onChange={(e) => setFormNovo(p => ({...p, projeto: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Mês de Referência (Apenas para exibir no relatório)</label>
                <input type="date" required value={formNovo.dataReferencia} onChange={(e) => setFormNovo(p => ({...p, dataReferencia: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowNovoModal(false)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700 }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: 12, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, display: 'flex', justifyContent: 'center' }}>
                  {pending ? <Loader2 className="animate-spin" /> : 'Criar Relatório'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GERIR ATIVIDADES */}
      {showAtividadesModal && relatorioAtivo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#f8fafc', borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header Modal */}
            <div style={{ background: '#fff', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{relatorioAtivo.projeto}</h2>
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{relatorioAtivo.empresa} - {new Date(relatorioAtivo.dataReferencia).toLocaleString('pt-BR', {month:'long', year:'numeric', timeZone:'UTC'})}</p>
              </div>
              <button onClick={() => setShowAtividadesModal(null)} style={{ background: '#f1f5f9', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                Fechar
              </button>
            </div>

            {/* Content Atividades */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#334155' }}>Itens Registrados ({relatorioAtivo.atividades?.length || 0})</h3>
                <button onClick={() => setShowNovaAtividade(true)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <Plus size={16} /> Lançar Atividade
                </button>
              </div>

              {relatorioAtivo.atividades?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#64748b' }}>Nenhuma atividade registrada neste relatório ainda.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {relatorioAtivo.atividades.map((a: any) => (
                    <div key={a.id} style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 16 }}>
                      {a.fotoUrl ? (
                        <img src={a.fotoUrl} alt="Registro" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} onClick={() => setShowPhotoModal(a.fotoUrl)} />
                      ) : (
                        <div style={{ width: 80, height: 80, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Camera color="#cbd5e1" />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: 4 }}>
                            {new Date(a.data).toLocaleDateString('pt-BR', {timeZone:'UTC'})}
                          </span>
                          <button onClick={() => handleDeleteAtiv(a.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12}/> {a.local} - {a.cidadeUf}</p>
                        <p style={{ fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 1.4 }}>{a.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA ATIVIDADE (ITEM) */}
      {showNovaAtividade && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, padding: 24, maxHeight: '95vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Camera color="#10b981" /> Registrar Atividade</h2>
            <form onSubmit={handleAddAtividade} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Data da Atividade</label>
                  <input type="date" required value={formAtiv.data} onChange={e => setFormAtiv(p => ({...p, data: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Cidade / UF</label>
                  <input required placeholder="Ex: João Pessoa/PB" value={formAtiv.cidadeUf} onChange={e => setFormAtiv(p => ({...p, cidadeUf: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Local (Nome do Prédio/Site)</label>
                <input required placeholder="Ex: Base Vivo, Cristo Redentor" value={formAtiv.local} onChange={e => setFormAtiv(p => ({...p, local: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Descrição / Relato da Atividade</label>
                <textarea required rows={4} placeholder="O que foi feito? Quem participou?" value={formAtiv.descricao} onChange={e => setFormAtiv(p => ({...p, descricao: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', resize: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Registro Fotográfico</label>
                {formAtiv.fotoBase64 && (
                  <div style={{ marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <img src={formAtiv.fotoBase64} alt="Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                    <button type="button" onClick={() => setFormAtiv(p => ({...p, fotoBase64: ''}))} style={{ background: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: 6, border: 'none', fontWeight: 600 }}>Remover</button>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: formAtiv.fotoBase64 ? 'none' : 'block', width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowNovaAtividade(false)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700 }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: 12, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, display: 'flex', justifyContent: 'center' }}>
                  {pending ? <Loader2 className="animate-spin" /> : 'Salvar Atividade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Foto */}
      {showPhotoModal && (
        <div onClick={() => setShowPhotoModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <img src={showPhotoModal} alt="Foto SG4" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}
