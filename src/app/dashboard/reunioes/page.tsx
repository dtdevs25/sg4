'use client'

import { useState } from 'react'
import {
  CalendarDays, CheckCircle2, Clock, XCircle,
  PlusCircle, Search, Sparkles, X
} from 'lucide-react'

// Dados reais da planilha "GESTÃO DE PARTICIPAÇÃO E PONTUALIDADE" compilados
const INITIAL_REUNIOES_LOG = [
  { id: '1', data: '05/01/2026', nome: 'ANTONIO CARLOS JUNIOR DIAS', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '2', data: '05/01/2026', nome: 'DANIEL JOSÉ GREGORIO JUNIOR', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '3', data: '05/01/2026', nome: 'DJONATÊ CRUZ DOS SANTOS', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '4', data: '05/01/2026', nome: 'JONAS RODRIGUES PEREIRA', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '5', data: '05/01/2026', nome: 'KARINE NOVAES ASSEM', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '6', data: '05/01/2026', nome: 'ROGÉRIO LIMA DA SILVA', presenca: 'Presente', pontualidade: 'Atrasado', justificada: 'Sim', motivo: 'Investigação de acidente em curso.' },
  { id: '7', data: '05/01/2026', nome: 'ROSICLEIDE FERNANDES SANTOS DAVINO', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  
  { id: '8', data: '12/01/2026', nome: 'ANTONIO CARLOS JUNIOR DIAS', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '9', data: '12/01/2026', nome: 'DANIEL JOSÉ GREGORIO JUNIOR', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '10', data: '12/01/2026', nome: 'DJONATÊ CRUZ DOS SANTOS', presenca: 'Ausente', pontualidade: 'N/A', justificada: 'Sim', motivo: 'Atendimento de urgência em campo' },
  { id: '11', data: '12/01/2026', nome: 'JONAS RODRIGUES PEREIRA', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '12', data: '12/01/2026', nome: 'KARINE NOVAES ASSEM', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  
  { id: '13', data: '19/01/2026', nome: 'ANTONIO CARLOS JUNIOR DIAS', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '14', data: '19/01/2026', nome: 'DANIEL JOSÉ GREGORIO JUNIOR', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '15', data: '19/01/2026', nome: 'DJONATÊ CRUZ DOS SANTOS', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '16', data: '19/01/2026', nome: 'JONAS RODRIGUES PEREIRA', presenca: 'Ausente', pontualidade: 'N/A', justificada: 'Não', motivo: 'Esqueceu o horário' },
  
  { id: '17', data: '02/02/2026', nome: 'ANTONIO CARLOS JUNIOR DIAS', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '18', data: '02/02/2026', nome: 'DANIEL JOSÉ GREGORIO JUNIOR', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
  { id: '19', data: '02/02/2026', nome: 'ROSICLEIDE FERNANDES SANTOS DAVINO', presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' },
]

// Lista de Técnicos
const TECNICOS = [
  'ANTONIO CARLOS JUNIOR DIAS', 'DANIEL JOSÉ GREGORIO JUNIOR', 'DJONATÊ CRUZ DOS SANTOS',
  'JONAS RODRIGUES PEREIRA', 'KARINE NOVAES ASSEM', 'LUIS CLAUDIO SOARES',
  'ROGÉRIO LIMA DA SILVA', 'ROSICLEIDE FERNANDES SANTOS DAVINO', 'SAMUEL DA SILVA SANTOS',
  'DARA AMORIM SILVA DE LIMA'
]

export default function ReunioesPage() {
  const [logs, setLogs] = useState(INITIAL_REUNIOES_LOG)
  const [search, setSearch] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('01')
  const [showModal, setShowModal] = useState(false)

  const [meetingDate, setMeetingDate] = useState('02/03/2026')
  const [attendance, setAttendance] = useState<Record<string, { presenca: string; pontualidade: string; justificada: string; motivo: string }>>(
    TECNICOS.reduce((acc, t) => ({ ...acc, [t]: { presenca: 'Presente', pontualidade: 'Pontual', justificada: 'Não Se Aplica', motivo: '' } }), {})
  )

  const filtered = logs.filter(l => {
    const matchSearch = l.nome.toLowerCase().includes(search.toLowerCase()) || l.motivo.toLowerCase().includes(search.toLowerCase())
    const matchMonth = l.data.split('/')[1] === selectedMonth
    return matchSearch && matchMonth
  })

  const totalMeetings = Array.from(new Set(filtered.map(l => l.data))).length
  const totalPresences = filtered.filter(l => l.presenca === 'Presente').length
  const totalPunctual = filtered.filter(l => l.pontualidade === 'Pontual').length
  const totalAtrasados = filtered.filter(l => l.pontualidade === 'Atrasado').length
  const totalAusentes = filtered.filter(l => l.presenca === 'Ausente').length
  const totalRegistrations = filtered.length

  const presenceRate = totalRegistrations > 0 ? Math.round((totalPresences / totalRegistrations) * 100) : 0
  const punctualityRate = totalPresences > 0 ? Math.round((totalPunctual / totalPresences) * 100) : 0

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const newLogs: typeof INITIAL_REUNIOES_LOG = []
    let idCounter = logs.length + 1

    TECNICOS.forEach(t => {
      const att = attendance[t]
      newLogs.push({
        id: (idCounter++).toString(),
        data: meetingDate, nome: t,
        presenca: att.presenca, pontualidade: att.presenca === 'Ausente' ? 'N/A' : att.pontualidade,
        justificada: att.justificada, motivo: att.motivo
      })
    })

    setLogs(prev => [...newLogs, ...prev])
    setShowModal(false)
  }

  function updateAttendance(nome: string, field: string, value: string) {
    setAttendance(prev => ({ ...prev, [nome]: { ...prev[nome], [field]: value } }))
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
            <CalendarDays color="#e53935" size={22} />
            Presença em Reuniões
          </h1>
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
            Controle de frequência e pontualidade
          </span>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(229,57,53,0.3)',
          }}
        >
          <PlusCircle size={16} />
          Lançar Chamada
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        
        {/* Filtro de Meses */}
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, gridColumn: 'span 2' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Selecionar Mês da Reunião</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { key: '01', label: 'Janeiro' }, { key: '02', label: 'Fevereiro' },
              { key: '03', label: 'Março' }, { key: '04', label: 'Abril' },
              { key: '05', label: 'Maio' }, { key: '06', label: 'Junho' },
              { key: '07', label: 'Julho' }, { key: '08', label: 'Agosto' },
              { key: '09', label: 'Setembro' }, { key: '10', label: 'Outubro' },
              { key: '11', label: 'Novembro' }, { key: '12', label: 'Dezembro' }
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setSelectedMonth(m.key)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: selectedMonth === m.key ? '1px solid #e53935' : '1px solid #e2e8f0',
                  background: selectedMonth === m.key ? '#e53935' : '#f8fafc',
                  color: selectedMonth === m.key ? '#fff' : '#64748b',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card de Estatística */}
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Métricas das Reuniões</span>
            <span style={{ background: 'rgba(229,57,53,0.1)', color: '#e53935', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
              Mês {selectedMonth}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Presença Geral</span>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1e293b' }}>{presenceRate}%</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Pontualidade</span>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>{punctualityRate}%</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', fontWeight: 600, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <span>Reuniões: <b style={{ color: '#1e293b' }}>{totalMeetings}</b></span>
            <span>Atrasos: <b style={{ color: '#f59e0b' }}>{totalAtrasados}</b></span>
            <span>Ausentes: <b style={{ color: '#e53935' }}>{totalAusentes}</b></span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
          <input type="text" placeholder="Filtrar por técnico ou motivo..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Encontrados: <b>{filtered.length}</b> lançamentos</div>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Presença</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Pontualidade</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Justificada?</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>{l.data}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', color: '#e53935', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                        {l.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{l.nome}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: l.presenca === 'Presente' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: l.presenca === 'Presente' ? '#10b981' : '#ef4444' }}>
                      {l.presenca === 'Presente' ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {l.presenca}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: l.pontualidade === 'Pontual' ? 'rgba(16,185,129,0.1)' : l.pontualidade === 'Atrasado' ? 'rgba(245,158,11,0.1)' : '#f1f5f9', color: l.pontualidade === 'Pontual' ? '#10b981' : l.pontualidade === 'Atrasado' ? '#f59e0b' : '#64748b' }}>
                      {l.pontualidade === 'Pontual' ? <CheckCircle2 size={12} /> : l.pontualidade === 'Atrasado' ? <Clock size={12} /> : null} {l.pontualidade}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                    {l.justificada}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: '#64748b', fontStyle: 'italic', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.motivo || '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                    Nenhuma reunião encontrada para o período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lançar Chamada */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 800, maxHeight: '85vh', overflowY: 'auto', padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles color="#e53935" size={20} /> Registrar Chamada de Reunião
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ width: 200 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Data da Reunião</label>
                <input type="text" required value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} placeholder="DD/MM/AAAA" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Chamada dos Técnicos</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {TECNICOS.map((t) => {
                    const att = attendance[t]
                    return (
                      <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', width: 220 }}>{t}</span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <select value={att.presenca} onChange={(e) => updateAttendance(t, 'presenca', e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}>
                            <option value="Presente">Presente</option>
                            <option value="Ausente">Ausente</option>
                          </select>

                          {att.presenca === 'Presente' && (
                            <select value={att.pontualidade} onChange={(e) => updateAttendance(t, 'pontualidade', e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}>
                              <option value="Pontual">Pontual</option>
                              <option value="Atrasado">Atrasado</option>
                            </select>
                          )}

                          <select value={att.justificada} onChange={(e) => updateAttendance(t, 'justificada', e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}>
                            <option value="Não Se Aplica">Justificado?</option>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                          </select>

                          <input type="text" placeholder="Motivo..." value={att.motivo} onChange={(e) => updateAttendance(t, 'motivo', e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, width: 160 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#e53935', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  Confirmar Chamada Geral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
