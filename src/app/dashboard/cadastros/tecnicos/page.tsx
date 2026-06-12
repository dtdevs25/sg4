'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Users, UserPlus, Search, Edit2, Mail, Phone, Calendar, Trash2, Camera, Power, X, AlertCircle, Building
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getTecnicos, saveTecnico, toggleTecnicoStatus, uploadFotoTecnico, deleteTecnico } from '@/app/actions/tecnicos'
import { getUnidades } from '@/app/actions/unidades'

export default function TecnicosPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [unidadesList, setUnidadesList] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  
  // Form state
  const [form, setForm] = useState<{
    nome: string; email: string; telefone: string; admissao: string; fotoUrl: string; unidadeIds: string[]
  }>({
    nome: '', email: '', telefone: '',
    admissao: new Date().toLocaleDateString('pt-BR'),
    fotoUrl: '',
    unidadeIds: []
  })
  
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const filtered = tecnicos.filter(t => 
    t.nome.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.cargo.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [resTecnicos, resUnidades] = await Promise.all([
      getTecnicos(),
      getUnidades()
    ])
    if (resTecnicos.success && resTecnicos.data) {
      setTecnicos(resTecnicos.data)
    }
    if (resUnidades.success && resUnidades.data) {
      setUnidadesList(resUnidades.data)
    }
  }

  function handleOpenAdd() {
    setIsEditing(null)
    setForm({
      nome: '', email: '', telefone: '',
      admissao: new Date().toLocaleDateString('pt-BR'),
      fotoUrl: '',
      unidadeIds: []
    })
    setFotoFile(null)
    setPreviewUrl('')
    setShowModal(true)
  }

  function handleOpenEdit(tecnico: any) {
    setIsEditing(tecnico.id)
    const admissao = new Date(tecnico.admissao).toLocaleDateString('pt-BR')
    setForm({
      nome: tecnico.nome, email: tecnico.email || '', telefone: tecnico.telefone || '',
      admissao,
      fotoUrl: tecnico.fotoUrl || '',
      unidadeIds: tecnico.unidades?.map((u: any) => u.id) || []
    })
    setFotoFile(null)
    setPreviewUrl(tecnico.fotoUrl || '')
    setShowModal(true)
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFotoFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.email) return

    startTransition(async () => {
      let finalFotoUrl = form.fotoUrl

      if (fotoFile) {
        const reader = new FileReader()
        reader.readAsDataURL(fotoFile)
        await new Promise((resolve) => {
          reader.onload = async () => {
            const base64 = reader.result as string
            const resUrl = await uploadFotoTecnico(base64, fotoFile.name, fotoFile.type)
            if (resUrl.success) {
              finalFotoUrl = resUrl.url as string
            }
            resolve(true)
          }
        })
      }

      await saveTecnico({
        id: isEditing || undefined,
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        admissao: form.admissao,
        fotoUrl: finalFotoUrl,
        unidadeIds: form.unidadeIds
      })

      setShowModal(false)
      load()
    })
  }

  function toggleStatus(id: string) {
    startTransition(async () => {
      await toggleTecnicoStatus(id)
      load()
    })
  }

  function handleOpenDelete(id: string) {
    setDeletingId(id)
    setShowDeleteModal(true)
  }

  function handleConfirmDelete() {
    if (!deletingId) return
    startTransition(async () => {
      const res = await deleteTecnico(deletingId)
      if (!res.success) {
        alert(res.error)
      } else {
        setShowDeleteModal(false)
        setDeletingId(null)
        load()
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

      {/* ── Cabeçalho Padronizado ── */}
      <div style={{
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users color="#660099" size={22} />
            Equipe de Técnicos
          </h1>
        </div>
        
        {role !== 'TST' && (
          <button
            onClick={handleOpenAdd}
            disabled={pending}
            style={{
              background: '#660099',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: pending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 4px rgba(102,0,153, 0.2)',
              opacity: pending ? 0.7 : 1
            }}
          >
            <UserPlus size={16} />
            Novo Técnico
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar técnico, e-mail ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
          />
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          <span>Total: <b>{tecnicos.length}</b></span>
          <span style={{ margin: '0 8px' }}>•</span>
          <span>Ativos: <b style={{ color: '#10b981' }}>{tecnicos.filter(t => t.ativo).length}</b></span>
        </div>
      </div>

      {/* ── Tabela de Técnicos ── */}
      <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Contato</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Unidades</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Admissão</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tecnico => (
                <tr key={tecnico.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: tecnico.ativo ? 1 : 0.6 }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {tecnico.fotoUrl ? (
                        <img src={tecnico.fotoUrl} alt={tecnico.nome} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #f1f5f9' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f1f5f9', color: '#660099', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                          {tecnico.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>{tecnico.nome}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{tecnico.cargo}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Mail size={12} /> {tecnico.email}</div>
                    <div style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} /> {tecnico.telefone}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {tecnico.unidades?.length > 0 ? tecnico.unidades.map((u: any) => (
                        <span key={u.id} style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building size={10} /> {u.nome}
                        </span>
                      )) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>Nenhuma unidade</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#475569', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12} /> {new Date(tecnico.admissao).toLocaleDateString('pt-BR')}</div>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <span style={{ 
                      display: 'inline-block', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                      background: tecnico.ativo ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: tecnico.ativo ? '#10b981' : '#ef4444'
                    }}>
                      {tecnico.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {role !== 'TST' && (
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                        <button disabled={pending} onClick={() => handleOpenEdit(tecnico)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Editar Técnico">
                          <Edit2 size={18} />
                        </button>
                        <button disabled={pending} onClick={() => toggleStatus(tecnico.id)} style={{ background: 'transparent', border: 'none', color: tecnico.ativo ? '#f59e0b' : '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title={tecnico.ativo ? 'Desativar Técnico' : 'Reativar Técnico'}>
                          <Power size={18} />
                        </button>
                        <button disabled={pending} onClick={() => handleOpenDelete(tecnico.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Excluir Definitivamente">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                    Nenhum técnico encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 500, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginTop: 0, marginBottom: 4 }}>
              {isEditing ? 'Editar Técnico' : 'Novo Técnico'}
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Preencha os dados do técnico de segurança do trabalho.</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <label style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', background: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera color="#94a3b8" size={24} />
                  )}
                  <input type="file" accept="image/*" onChange={handleFotoChange} style={{ display: 'none' }} />
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Nome Completo</label>
                <input type="text" required value={form.nome} onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>E-mail Profissional</label>
                <input type="email" required value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Telefone</label>
                  <input type="text" value={form.telefone} onChange={(e) => setForm(p => ({ ...p, telefone: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Admissão (DD/MM/AAAA)</label>
                  <input type="text" value={form.admissao} onChange={(e) => setForm(p => ({ ...p, admissao: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} placeholder="Ex: 05/08/2025" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Unidades de Atuação</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', maxHeight: 120, overflowY: 'auto' }}>
                  {unidadesList.length === 0 && <span style={{ fontSize: 13, color: '#94a3b8' }}>Nenhuma unidade cadastrada.</span>}
                  {unidadesList.map(u => {
                    const isSelected = form.unidadeIds.includes(u.id)
                    return (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: isSelected ? 'rgba(102,0,153,0.1)' : '#f8fafc', padding: '4px 10px', borderRadius: 20, border: `1px solid ${isSelected ? '#660099' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm(p => ({ ...p, unidadeIds: [...p.unidadeIds, u.id] }))
                            } else {
                              setForm(p => ({ ...p, unidadeIds: p.unidadeIds.filter(id => id !== u.id) }))
                            }
                          }}
                          style={{ margin: 0, accentColor: '#660099' }}
                        />
                        <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#660099' : '#475569' }}>{u.nome}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Cargo</label>
                <input type="text" readOnly value="Técnico de Segurança do Trabalho" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc', color: '#64748b', fontWeight: 600 }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} disabled={pending} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={pending} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#660099', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}>
                  {pending ? 'Processando...' : isEditing ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 400, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle color="#ef4444" size={24} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, marginBottom: 8 }}>
              Excluir Técnico
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
              Tem certeza que deseja excluir permanentemente este técnico? Esta ação <b>não poderá ser desfeita</b> e o registro será apagado do banco de dados.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button disabled={pending} onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}>
                Cancelar
              </button>
              <button disabled={pending} onClick={handleConfirmDelete} style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: pending ? 0.7 : 1 }}>
                {pending ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
