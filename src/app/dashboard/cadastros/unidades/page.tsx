'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  MapPin, User, Search, Edit2, Trash2, Plus, AlertCircle, X, Check, Building
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getUnidades, saveUnidade, deleteUnidade } from '@/app/actions/unidades'

export default function UnidadesPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [unidades, setUnidades] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  
  // Form state
  const [form, setForm] = useState({
    nome: '', endereco: '', cidade: '', estado: 'SP', responsavel: ''
  })

  const filtered = unidades.filter(u => 
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.endereco?.toLowerCase().includes(search.toLowerCase()) ||
    u.responsavel?.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const res = await getUnidades()
    if (res.success && res.data) {
      setUnidades(res.data)
    }
  }

  function handleOpenAdd() {
    setIsEditing(null)
    setForm({ nome: '', endereco: '', cidade: '', estado: 'SP', responsavel: '' })
    setShowModal(true)
  }

  function handleOpenEdit(unidade: any) {
    setIsEditing(unidade.id)
    setForm({
      nome: unidade.nome,
      endereco: unidade.endereco || '',
      cidade: unidade.cidade || '',
      estado: unidade.estado || 'SP',
      responsavel: unidade.responsavel || ''
    })
    setShowModal(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome) return

    startTransition(async () => {
      const payload = {
        id: isEditing || undefined,
        ...form
      }

      const res = await saveUnidade(payload)
      if (res.success) {
        setShowModal(false)
        load()
      } else {
        alert(res.error || 'Erro ao salvar unidade.')
      }
    })
  }

  function confirmDelete(id: string) {
    setDeletingId(id)
    setShowDeleteModal(true)
  }

  function handleDelete() {
    if (!deletingId) return
    startTransition(async () => {
      const res = await deleteUnidade(deletingId)
      if (res.success) {
        setShowDeleteModal(false)
        setDeletingId(null)
        load()
      } else {
        alert(res.error || 'Erro ao excluir unidade.')
      }
    })
  }

  const isTst = role === 'TST'

  return (
    <div style={{ paddingBottom: 40, maxWidth: 1000, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building size={28} color="#660099" />
            Unidades de Atendimento
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Gerencie as bases e unidades onde os técnicos atuam.</p>
        </div>
        {!isTst && (
          <button 
            onClick={handleOpenAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#660099', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(102,0,153,0.3)', transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Plus size={18} /> Nova Unidade
          </button>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 11 }} />
          <input 
            type="text" 
            placeholder="Buscar unidade, endereço ou responsável..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 14, outline: 'none', color: '#334155', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* ── Listagem ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <Building size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>Nenhuma unidade encontrada.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Unidade</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Endereço</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Responsável</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Técnicos</th>
                  {!isTst && <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#660099', fontWeight: 800 }}>
                          <Building size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{u.nome}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13 }}>
                        <MapPin size={14} />
                        {u.endereco || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13 }}>
                        <User size={14} />
                        {u.responsavel || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                        {u._count?.tecnicos || 0}
                      </span>
                    </td>
                    {!isTst && (
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button onClick={() => handleOpenEdit(u)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#334155' }} onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b' }}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => confirmDelete(u.id)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626' }} onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de Cadastro/Edição ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ 
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500,
            display: 'flex', flexDirection: 'column',
            maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header Fixo Roxo */}
            <div style={{
              background: '#660099', padding: '20px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, zIndex: 10
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>
                {isEditing ? 'Editar Unidade' : 'Nova Unidade'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: 24, overflowY: 'auto' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Nome da Unidade *</label>
                  <input 
                    required
                    type="text"
                    placeholder="Ex: Base Central, CD Sul, etc."
                    value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', outlineColor: '#660099' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Endereço</label>
                  <input 
                    type="text"
                    placeholder="Ex: Av. Paulista, 1000"
                    value={form.endereco}
                    onChange={e => setForm({ ...form, endereco: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', outlineColor: '#660099' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Cidade</label>
                    <input 
                      type="text"
                      placeholder="Cidade"
                      value={form.cidade}
                      onChange={e => setForm({ ...form, cidade: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', outlineColor: '#660099' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Estado (UF)</label>
                    <input 
                      type="text"
                      placeholder="UF"
                      maxLength={2}
                      value={form.estado}
                      onChange={e => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', outlineColor: '#660099' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Responsável</label>
                  <input 
                    type="text"
                    placeholder="Nome do gerente ou responsável pela base"
                    value={form.responsavel}
                    onChange={e => setForm({ ...form, responsavel: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', outlineColor: '#660099' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={pending} style={{ padding: '10px 20px', borderRadius: 8, background: '#660099', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: pending ? 0.7 : 1 }}>
                  {pending ? 'Salvando...' : <><Check size={18} /> Salvar</>}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Exclusão ── */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Excluir Unidade?</h3>
                <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                  Tem certeza que deseja remover esta unidade? Esta ação não poderá ser desfeita. Técnicos vinculados a esta unidade não serão excluídos, mas perderão este vínculo.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ padding: '10px 16px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={pending} style={{ padding: '10px 16px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}>
                {pending ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
