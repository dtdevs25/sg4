'use client'

import { useState } from 'react'
import {
  FileCheck, Calendar, Filter, User, CheckCircle2,
  AlertTriangle, Clock, Search, PlusCircle, Award, ShieldAlert, X, Sparkles, Trash2
} from 'lucide-react'
import { useSession } from 'next-auth/react'

// Dados reais da planilha "GESTÃO DAS ENTREGAS 2026"
const INITIAL_ENTREGAS = [
  { id: '1', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '02/03/2026 a 06/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '09/03/2026 14:05', status: 'Atrasado' },
  { id: '2', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '02/03/2026 a 06/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '09/03/2026 09:12', status: 'No Prazo' },
  { id: '3', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '09/03/2026 a 13/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '16/03/2026 12:02', status: 'Atrasado' },
  { id: '4', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '09/03/2026 a 13/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '16/03/2026 08:33', status: 'No Prazo' },
  { id: '5', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '16/03/2026 a 20/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '23/03/2026 11:39', status: 'No Prazo' },
  { id: '6', tecnico: 'ANTONIO CARLOS JUNIOR DIAS', periodo: '16/03/2026 a 20/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '23/03/2026 07:44', status: 'No Prazo' },

  { id: '7', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '02/03/2026 a 06/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '09/03/2026 08:28', status: 'No Prazo' },
  { id: '8', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '02/03/2026 a 06/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '09/03/2026 07:36', status: 'No Prazo' },
  { id: '9', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '09/03/2026 a 13/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '16/03/2026 09:13', status: 'No Prazo' },
  { id: '10', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '09/03/2026 a 13/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '13/03/2026 17:00', status: 'No Prazo' },
  { id: '11', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '16/03/2026 a 20/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '23/03/2026 11:00', status: 'No Prazo' },
  { id: '12', tecnico: 'DANIEL JOSÉ GREGORIO JUNIOR', periodo: '16/03/2026 a 20/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '23/03/2026 15:29', status: 'Atrasado' },

  { id: '13', tecnico: 'DJONATÊ CRUZ DOS SANTOS', periodo: '02/03/2026 a 06/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '09/03/2026 14:49', status: 'Atrasado' },
  { id: '14', tecnico: 'DJONATÊ CRUZ DOS SANTOS', periodo: '02/03/2026 a 06/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '09/03/2026 11:12', status: 'No Prazo' },
  { id: '15', tecnico: 'DJONATÊ CRUZ DOS SANTOS', periodo: '09/03/2026 a 13/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '16/03/2026 10:15', status: 'Atrasado' },
  { id: '16', tecnico: 'DJONATÊ CRUZ DOS SANTOS', periodo: '09/03/2026 a 13/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '16/03/2026 15:30', status: 'Atrasado' },

  { id: '17', tecnico: 'ROSICLEIDE FERNANDES SANTOS DAVINO', periodo: '02/03/2026 a 06/03/2026', tipo: 'Relatório de Atividades', dataEntrega: '06/03/2026 16:30', status: 'No Prazo' },
  { id: '18', tecnico: 'ROSICLEIDE FERNANDES SANTOS DAVINO', periodo: '02/03/2026 a 06/03/2026', tipo: 'Registro de KM Inicial/Final', dataEntrega: '09/03/2026 08:01', status: 'No Prazo' },
]

const PERIODS = [
  '02/03/2026 a 06/03/2026',
  '09/03/2026 a 13/03/2026',
  '16/03/2026 a 20/03/2026',
  '23/03/2026 a 27/03/2026',
]

const TECNICOS = [
  'ANTONIO CARLOS JUNIOR DIAS', 'DANIEL JOSÉ GREGORIO JUNIOR', 'DJONATÊ CRUZ DOS SANTOS',
  'JONAS RODRIGUES PEREIRA', 'KARINE NOVAES ASSEM', 'LUIS CLAUDIO SOARES',
  'ROGÉRIO LIMA DA SILVA', 'ROSICLEIDE FERNANDES SANTOS DAVINO', 'SAMUEL DA SILVA SANTOS',
  'DARA AMORIM SILVA DE LIMA'
]

export default function EntregasPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [entregas, setEntregas] = useState(INITIAL_ENTREGAS)
  const [selectedTecnico, setSelectedTecnico] = useState('TODOS')
  const [selectedType, setSelectedType] = useState('TODOS')
  const [showAddModal, setShowAddModal] = useState(false)

  const [form, setForm] = useState({
    tecnico: 'ANTONIO CARLOS JUNIOR DIAS',
    periodo: '23/03/2026 a 27/03/2026',
    tipo: 'Relatório de Atividades',
    dataEntrega: '',
    status: 'No Prazo'
  })

  const filtered = entregas.filter(e => {
    const matchTec = selectedTecnico === 'TODOS' || e.tecnico === selectedTecnico
    const matchType = selectedType === 'TODOS' || e.tipo === selectedType
    return matchTec && matchType
  })

  const total = filtered.length
  const noPrazo = filtered.filter(e => e.status === 'No Prazo').length
  const atrasados = filtered.filter(e => e.status === 'Atrasado').length
  const eficiencia = total > 0 ? Math.round((noPrazo / total) * 100) : 0

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const newId = 'ent-' + Date.now()
    setEntregas(prev => [ { id: newId, ...form }, ...prev ])
    setShowAddModal(false)
    setForm(p => ({ ...p, dataEntrega: '' }))
  }

  function deleteEntrega(id: string) {
    setEntregas(prev => prev.filter(e => e.id !== id))
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
            <FileCheck color="#e53935" size={22} />
            Controle de Entregas
          </h1>
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
            Relatórios e registros da equipe
          </span>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(229,57,53,0.3)',
          }}
        >
          <PlusCircle size={16} />
          Lançar Entrega
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Eficiência</span>
            <Award color="#10b981" size={18} />
          </div>
          <div style={{ margin: '12px 0' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{eficiencia}%</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Entregas no prazo legal</div>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{ background: '#10b981', height: '100%', width: `${eficiencia}%` }} />
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Lançado</span>
          <div style={{ margin: '12px 0' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Registros semanais</div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Dentro do Prazo</span>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
          </div>
          <div style={{ margin: '12px 0' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{noPrazo}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Relatórios em conformidade</div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Atrasados</span>
            <ShieldAlert color="#ef4444" size={16} />
          </div>
          <div style={{ margin: '12px 0' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{atrasados}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Requer atenção do gestor</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
          <select value={selectedTecnico} disabled={role === 'TST'} onChange={(e) => setSelectedTecnico(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#64748b', fontWeight: 600 }}>
            <option value="TODOS">Todos os Técnicos</option>
            {TECNICOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', minWidth: 200 }}>
            <option value="TODOS">Todos os Tipos</option>
            <option value="Relatório de Atividades">Relatório de Atividades</option>
            <option value="Registro de KM Inicial/Final">Registro de KM</option>
          </select>
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Encontradas: <b>{filtered.length}</b> entregas</div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Período</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Tipo</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Data da Entrega</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                {role !== 'TST' && <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>{e.periodo}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', color: '#e53935', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                        {e.tecnico.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{e.tecnico}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#475569', fontWeight: 500 }}>{e.tipo}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{e.dataEntrega || '—'}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: e.status === 'No Prazo' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: e.status === 'No Prazo' ? '#10b981' : '#ef4444' }}>
                      {e.status === 'No Prazo' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {e.status}
                    </span>
                  </td>
                  {role !== 'TST' && (
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <button onClick={() => deleteEntrega(e.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                    Nenhuma entrega encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 500, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles color="#e53935" size={20} /> Lançar Nova Entrega
              </h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Técnico</label>
                <select value={form.tecnico} disabled={role === 'TST'} onChange={(e) => setForm(p => ({ ...p, tecnico: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: role === 'TST' ? '#f1f5f9' : '#fff' }}>
                  {TECNICOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Período Semanal</label>
                <select value={form.periodo} onChange={(e) => setForm(p => ({ ...p, periodo: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff' }}>
                  {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Tipo da Entrega</label>
                <select value={form.tipo} onChange={(e) => setForm(p => ({ ...p, tipo: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff' }}>
                  <option value="Relatório de Atividades">Relatório de Atividades</option>
                  <option value="Registro de KM Inicial/Final">Registro de KM Inicial/Final</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Data/Hora</label>
                  <input type="text" required placeholder="DD/MM/AAAA HH:MM" value={form.dataEntrega} onChange={(e) => setForm(p => ({ ...p, dataEntrega: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Status</label>
                  <select value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff' }}>
                    <option value="No Prazo">No Prazo</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#e53935', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  Registrar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
