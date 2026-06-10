'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Search, Shield, Trash2, Power, X, Sparkles, AlertCircle, Mail } from 'lucide-react'
import { getUsuarios, toggleUserStatus, createUsuario, deleteUsuario, resendInvitation } from '@/app/actions/usuarios'
import { getTecnicos } from '@/app/actions/tecnicos'
import { useSession } from 'next-auth/react'

export default function UsuariosPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [usuarios, setUsuarios] = useState<any[]>([])
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showResendModal, setShowResendModal] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'TST',
    tecnicoId: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [resUsers, resTecs] = await Promise.all([
      getUsuarios(),
      getTecnicos()
    ])
    
    if (resUsers.success) setUsuarios(resUsers.data || [])
    if (resTecs.success) setTecnicos(resTecs.data || [])
    setLoading(false)
  }

  const filtered = usuarios.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleToggle(id: string) {
    const res = await toggleUserStatus(id)
    if (res.success) {
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, active: res.active } : u))
    } else {
      alert(res.error)
    }
  }

  function handleOpenDelete(id: string) {
    setDeletingId(id)
    setShowDeleteModal(true)
  }

  async function handleConfirmDelete() {
    if (!deletingId) return
    const res = await deleteUsuario(deletingId)
    if (res.success) {
      setUsuarios(prev => prev.filter(u => u.id !== deletingId))
      setShowDeleteModal(false)
      setDeletingId(null)
    } else {
      alert(res.error)
    }
  }

  function handleOpenResend(id: string) {
    setResendingId(id)
    setShowResendModal(true)
  }

  async function handleConfirmResend() {
    if (!resendingId) return
    setIsResending(true)
    const res = await resendInvitation(resendingId)
    setIsResending(false)
    if (res.success) {
      setShowResendModal(false)
      setResendingId(null)
    } else {
      alert(res.error)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const res = await createUsuario(form)
    if (res.success) {
      setShowAddModal(false)
      setForm({ name: '', email: '', role: 'TST', tecnicoId: '' })
      fetchData()
    } else {
      alert(res.error)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Carregando usuários...</div>
  }

  if (role !== 'MASTER' && role !== 'ADMIN') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#660099', background: '#fff', borderRadius: 10 }}>
        <AlertCircle size={40} style={{ margin: '0 auto 16px' }} />
        <h2 style={{ margin: 0, fontSize: 18 }}>Acesso Negado</h2>
        <p style={{ marginTop: 8, fontSize: 14 }}>Você não tem permissão para gerenciar usuários.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[24px] pb-[40px]">
      {/* ── Cabeçalho Padronizado ── */}
      <div className="bg-white rounded-[10px] border border-[#f1f5f9] shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-[20px] py-[14px] flex items-center justify-between flex-wrap gap-[16px]">
        <div className="flex items-baseline gap-[10px]">
          <h1 className="text-[20px] font-extrabold text-[#1e293b] m-0 flex items-center gap-[8px]">
            <Users color="#660099" size={22} />
            Gestão de Usuários
          </h1>
          
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#660099', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(102,0,153,0.3)',
          }}
        >
          <Plus size={16} />
          Novo Usuário
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between bg-white px-[20px] py-[12px] rounded-[10px] border border-[#f1f5f9] gap-[16px]">
        <div className="relative w-full md:w-[300px]">
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
          />
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Encontrados: <b>{filtered.length}</b></div>
      </div>

      <div className="bg-white border border-[#f1f5f9] rounded-[10px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left min-w-[800px]">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Usuário</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Perfil</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico Associado</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: u.active ? 1 : 0.6 }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #660099, #4a0072)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, background: u.role === 'MASTER' ? 'rgba(139, 92, 246, 0.1)' : u.role === 'ADMIN' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: u.role === 'MASTER' ? '#8b5cf6' : u.role === 'ADMIN' ? '#3b82f6' : '#f59e0b' }}>
                      <Shield size={12} /> {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                    {u.tecnico?.nome || '—'}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: u.active ? '#10b981' : '#ef4444' }}>
                      {u.active ? 'ATIVO' : 'BLOQUEADO'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <button onClick={() => handleToggle(u.id)} style={{ background: 'transparent', border: 'none', color: u.active ? '#f59e0b' : '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title={u.active ? 'Bloquear' : 'Ativar'}>
                        <Power size={18} />
                      </button>
                      <button onClick={() => handleOpenResend(u.id)} style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Reenviar e-mail de definição de senha">
                        <Mail size={18} />
                      </button>
                      <button onClick={() => handleOpenDelete(u.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Excluir Definitivamente">
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

      {showAddModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px] p-[20px]">
          <div className="bg-white rounded-[16px] w-full max-w-[480px] p-[24px] shadow-2xl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles color="#660099" size={20} /> Cadastrar Usuário
              </h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Nome Completo</label>
                <input type="text" required value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>E-mail (Login)</label>
                <input type="email" required value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                  <b style={{ display: 'block', marginBottom: 4 }}>Segurança Aprimorada</b>
                  Um e-mail será enviado automaticamente para o usuário com um link válido por 48 horas para que ele mesmo cadastre sua senha de acesso.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Perfil</label>
                  <select value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff' }}>
                    <option value="TST">TST (Somente Leitura/Criação)</option>
                    <option value="ADMIN">ADMIN (Pode gerenciar menos logs/Master)</option>
                    {role === 'MASTER' && <option value="MASTER">MASTER (Controle Total)</option>}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Vincular Técnico (Opcional)</label>
                  <select value={form.tecnicoId} onChange={(e) => setForm(p => ({ ...p, tecnicoId: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff' }}>
                    <option value="">Não vincular</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 1, padding: '12px', background: '#660099', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px] p-[20px]">
          <div className="bg-white rounded-[16px] w-full max-w-[400px] p-[24px] shadow-2xl text-center">
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle color="#ef4444" size={24} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, marginBottom: 8 }}>
              Excluir Usuário
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
              Tem certeza que deseja excluir permanentemente este usuário? Esta ação <b>não poderá ser desfeita</b> e ele perderá o acesso ao sistema.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleConfirmDelete} style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Confirmation Modal */}
      {showResendModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px] p-[20px]">
          <div className="bg-white rounded-[16px] w-full max-w-[400px] p-[24px] shadow-2xl text-center">
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Mail color="#6366f1" size={24} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, marginBottom: 8 }}>
              Reenviar E-mail
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
              Deseja gerar um novo link de acesso e reenviar para o e-mail deste usuário? O link anterior será invalidado.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button disabled={isResending} onClick={() => setShowResendModal(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: isResending ? 0.7 : 1 }}>
                Cancelar
              </button>
              <button disabled={isResending} onClick={handleConfirmResend} style={{ flex: 1, padding: '10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: isResending ? 0.7 : 1 }}>
                {isResending ? 'Enviando...' : 'Sim, Reenviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
