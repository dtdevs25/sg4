'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import {
  FileText, Plus, Search, Calendar, ChevronRight,
  AlertTriangle, UploadCloud, Trash2, Camera, MapPin, Loader2, PlayCircle, Eye, Printer, Edit3
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import {
  getAtividadesRelatorio, addAtividade, deleteAtividade, updateAtividade, uploadFotoRelatorio
} from '@/app/actions/relatorios'
import { getTecnicos } from '@/app/actions/tecnicos'
import Link from 'next/link'

export default function RelatoriosAtividadesPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1)
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())

  const [atividades, setAtividades] = useState<any[]>([])
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  // Modals
  const [showNovaAtividade, setShowNovaAtividade] = useState(false)
  const [showEditModal, setShowEditModal] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null)
  const [showGerarPdfModal, setShowGerarPdfModal] = useState(false)

  // Forms
  const [formAtiv, setFormAtiv] = useState({ tecnicoId: '', data: '', empresa: '', projeto: '', local: '', cidadeUf: '', descricao: '', fotoBase64: '', fileName: '', contentType: '' })
  const [formEdit, setFormEdit] = useState({ data: '', empresa: '', projeto: '', local: '', cidadeUf: '', descricao: '', fotoBase64: '', fileName: '', contentType: '' })
  const [formPdf, setFormPdf] = useState({ empresa: '', tecnicoId: '' })

  // Extract unique companies for the PDF generation dropdown
  const empresasDisponiveis = Array.from(new Set(atividades.map(a => a.empresa)))

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
    const items = await getAtividadesRelatorio(mesAtual, anoAtual)
    setAtividades(items)
    setLoading(false)
  }

  // --- Handlers ---
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, setForm: Function) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm((prev: any) => ({
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
    startTransition(async () => {
      let fotoUrl = undefined
      if (formAtiv.fotoBase64) {
        const up = await uploadFotoRelatorio(formAtiv.fotoBase64, formAtiv.fileName, formAtiv.contentType)
        if (up.success) fotoUrl = up.url
        else return alert('Erro no upload da foto')
      }

      const tId = role === 'TST' ? (session?.user as any).tecnicoId : formAtiv.tecnicoId
      if (!tId) return alert('Selecione o técnico')

      const res = await addAtividade({
        tecnicoId: tId,
        data: new Date(formAtiv.data + 'T12:00:00Z'),
        empresa: formAtiv.empresa,
        projeto: formAtiv.projeto,
        local: formAtiv.local,
        cidadeUf: formAtiv.cidadeUf,
        descricao: formAtiv.descricao,
        fotoUrl
      })

      if (res.success) {
        setShowNovaAtividade(false)
        setFormAtiv({ tecnicoId: '', data: '', empresa: '', projeto: '', local: '', cidadeUf: '', descricao: '', fotoBase64: '', fileName: '', contentType: '' })
        loadData()
      } else {
        alert(res.error)
      }
    })
  }

  async function handleEditAtividade(e: React.FormEvent) {
    e.preventDefault()
    if (!showEditModal) return

    startTransition(async () => {
      let fotoUrl = undefined
      if (formEdit.fotoBase64) {
        const up = await uploadFotoRelatorio(formEdit.fotoBase64, formEdit.fileName, formEdit.contentType)
        if (up.success) fotoUrl = up.url
        else return alert('Erro no upload da nova foto')
      }

      const res = await updateAtividade(showEditModal.id, {
        data: new Date(formEdit.data + 'T12:00:00Z'),
        empresa: formEdit.empresa,
        projeto: formEdit.projeto,
        local: formEdit.local,
        cidadeUf: formEdit.cidadeUf,
        descricao: formEdit.descricao,
        fotoUrl: fotoUrl
      })

      if (res.success) {
        setShowEditModal(null)
        loadData()
      } else {
        alert(res.error)
      }
    })
  }

  async function handleDeleteConfirm() {
    if (!showDeleteModal) return
    startTransition(async () => {
      const res = await deleteAtividade(showDeleteModal)
      if (res.success) loadData()
      else alert(res.error)
      setShowDeleteModal(null)
    })
  }

  function openEdit(a: any) {
    setFormEdit({
      data: new Date(a.data).toISOString().split('T')[0],
      empresa: a.empresa,
      projeto: a.projeto,
      local: a.local,
      cidadeUf: a.cidadeUf,
      descricao: a.descricao,
      fotoBase64: '', fileName: '', contentType: ''
    })
    setShowEditModal(a)
  }

  // --- Render ---
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText color="#3b82f6" /> Lançamento de Atividades (Relatórios)
          </h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>Registre suas atividades para a geração do relatório no final do mês.</p>
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

          <button onClick={() => setShowGerarPdfModal(true)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
            <Printer size={18} /> Gerar PDF
          </button>
          <button onClick={() => setShowNovaAtividade(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
            <Plus size={18} /> Lançar Atividade
          </button>
        </div>
      </div>

      {/* TABELA GERAL */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>DATA</th>
                {(role === 'MASTER' || role === 'ADMIN') && (
                  <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>TÉCNICO</th>
                )}
                <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>EMPRESA / PROJETO</th>
                <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: '#475569' }}>LOCAL / DESCRIÇÃO</th>
                <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>FOTO</th>
                <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: '#475569', textAlign: 'center' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center' }}><Loader2 className="animate-spin inline" color="#3b82f6" size={32} /></td></tr>
              ) : atividades.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Nenhuma atividade registrada para este mês.</td></tr>
              ) : atividades.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: '#1e293b' }}>
                    {new Date(a.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                  </td>
                  {(role === 'MASTER' || role === 'ADMIN') && (
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#475569' }}>
                          {a.tecnico?.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{a.tecnico?.nome}</span>
                      </div>
                    </td>
                  )}
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{a.empresa}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{a.projeto}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}><MapPin size={12} className="inline mr-1"/> {a.local} - {a.cidadeUf}</div>
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.4, maxWidth: 400 }}>{a.descricao}</div>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    {a.fotoUrl ? (
                      <img src={a.fotoUrl} alt="Foto" onClick={() => setShowPhotoModal(a.fotoUrl)} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', margin: '0 auto', border: '1px solid #e2e8f0' }} />
                    ) : (
                      <span style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', padding: '4px 8px', borderRadius: 4 }}>Sem Foto</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button onClick={() => openEdit(a)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4 }} title="Editar">
                        <Edit3 size={18} />
                      </button>
                      <button onClick={() => setShowDeleteModal(a.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVA ATIVIDADE */}
      {showNovaAtividade && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 550, padding: 24, maxHeight: '95vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Camera color="#3b82f6" /> Registrar Atividade</h2>
            <form onSubmit={handleAddAtividade} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              {(role === 'MASTER' || role === 'ADMIN') && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Técnico Responsável</label>
                  <select required value={formAtiv.tecnicoId} onChange={(e) => setFormAtiv(p => ({...p, tecnicoId: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                    <option value="">Selecione...</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Empresa Cliente</label>
                  <input required placeholder="Ex: Vivo S/A" value={formAtiv.empresa} onChange={e => setFormAtiv(p => ({...p, empresa: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Projeto / Área</label>
                  <input required placeholder="Ex: Infraestrutura" value={formAtiv.projeto} onChange={e => setFormAtiv(p => ({...p, projeto: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
              </div>

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
                <textarea required rows={3} placeholder="O que foi feito?" value={formAtiv.descricao} onChange={e => setFormAtiv(p => ({...p, descricao: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', resize: 'none' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Registro Fotográfico (Opcional)</label>
                {formAtiv.fotoBase64 && (
                  <div style={{ marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <img src={formAtiv.fotoBase64} alt="Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                    <button type="button" onClick={() => setFormAtiv(p => ({...p, fotoBase64: ''}))} style={{ background: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: 6, border: 'none', fontWeight: 600 }}>Remover</button>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={e => handleFileChange(e, setFormAtiv)} style={{ display: formAtiv.fotoBase64 ? 'none' : 'block', width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowNovaAtividade(false)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700 }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: 12, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, display: 'flex', justifyContent: 'center' }}>
                  {pending ? <Loader2 className="animate-spin" /> : 'Salvar Atividade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR ATIVIDADE */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 550, padding: 24, maxHeight: '95vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Edit3 color="#3b82f6" /> Editar Atividade</h2>
            <form onSubmit={handleEditAtividade} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Empresa Cliente</label>
                  <input required value={formEdit.empresa} onChange={e => setFormEdit(p => ({...p, empresa: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Projeto / Área</label>
                  <input required value={formEdit.projeto} onChange={e => setFormEdit(p => ({...p, projeto: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Data da Atividade</label>
                  <input type="date" required value={formEdit.data} onChange={e => setFormEdit(p => ({...p, data: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Cidade / UF</label>
                  <input required value={formEdit.cidadeUf} onChange={e => setFormEdit(p => ({...p, cidadeUf: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Local</label>
                <input required value={formEdit.local} onChange={e => setFormEdit(p => ({...p, local: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Descrição</label>
                <textarea required rows={3} value={formEdit.descricao} onChange={e => setFormEdit(p => ({...p, descricao: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', resize: 'none' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Alterar Foto (Opcional)</label>
                {showEditModal.fotoUrl && !formEdit.fotoBase64 && (
                  <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={showEditModal.fotoUrl} alt="Atual" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Imagem Atual</span>
                      <button type="button" onClick={() => { const input = document.getElementById('editAtivPic') as HTMLInputElement; input?.click() }} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Trocar Imagem</button>
                    </div>
                  </div>
                )}
                <input id="editAtivPic" type="file" accept="image/*" onChange={e => handleFileChange(e, setFormEdit)} style={{ display: showEditModal.fotoUrl && !formEdit.fotoBase64 ? 'none' : 'block', width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" disabled={pending} onClick={() => setShowEditModal(null)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700 }}>Cancelar</button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: 12, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, display: 'flex', justifyContent: 'center' }}>
                  {pending ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GERAR PDF */}
      {showGerarPdfModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Printer color="#22c55e" /> Gerar Relatório PDF</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {(role === 'MASTER' || role === 'ADMIN') && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>De qual técnico?</label>
                  <select value={formPdf.tecnicoId} onChange={(e) => setFormPdf(p => ({...p, tecnicoId: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                    <option value="">Selecione um técnico...</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>De qual Empresa?</label>
                <select value={formPdf.empresa} onChange={(e) => setFormPdf(p => ({...p, empresa: e.target.value}))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}>
                  <option value="">Selecione a empresa...</option>
                  {empresasDisponiveis.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                {empresasDisponiveis.length === 0 && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Nenhuma empresa cadastrada neste mês.</p>}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button onClick={() => setShowGerarPdfModal(false)} style={{ flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <Link 
                  href={`/dashboard/relatorios/print?mes=${mesAtual}&ano=${anoAtual}&empresa=${encodeURIComponent(formPdf.empresa)}${formPdf.tecnicoId ? `&tecnicoId=${formPdf.tecnicoId}` : ''}`} 
                  target="_blank"
                  onClick={(e) => {
                    if (!formPdf.empresa || (role !== 'TST' && !formPdf.tecnicoId)) {
                      e.preventDefault()
                      alert('Selecione todos os campos obrigatórios')
                    } else {
                      setShowGerarPdfModal(false)
                    }
                  }}
                  style={{ flex: 1, padding: 12, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none' }}
                >
                  Gerar PDF
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertTriangle size={32} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 10 }}>Confirmar Exclusão</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>Ação irreversível.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button disabled={pending} onClick={() => setShowDeleteModal(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Cancelar</button>
              <button disabled={pending} onClick={handleDeleteConfirm} style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pending ? <Loader2 className="animate-spin" size={18} /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Foto */}
      {showPhotoModal && (
        <div onClick={() => setShowPhotoModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <img src={showPhotoModal} alt="Foto" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}
