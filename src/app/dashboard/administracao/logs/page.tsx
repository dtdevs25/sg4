'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
  ShieldAlert, Search, RefreshCw, Filter, User2,
  Clock, Tag, Hash, Globe, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Info, Trash2, Edit3,
  LogIn, LogOut, Plus, Eye, Download, Upload
} from 'lucide-react'
import { getLogs, getLogEntities, type AuditLogEntry } from '@/app/actions/logs'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function getActionMeta(action: string): { label: string; color: string; bg: string; icon: React.ElementType } {
  const a = action.toUpperCase()
  if (a.includes('LOGIN'))    return { label: 'Login',    color: '#0ea5e9', bg: '#e0f2fe', icon: LogIn }
  if (a.includes('LOGOUT'))   return { label: 'Logout',   color: '#64748b', bg: '#f1f5f9', icon: LogOut }
  if (a.includes('CREATE') || a.includes('CRIAR') || a.includes('CADASTR'))
    return { label: 'Criação',  color: '#16a34a', bg: '#dcfce7', icon: Plus }
  if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('ALTERAR') || a.includes('ATUALIZ'))
    return { label: 'Edição',   color: '#d97706', bg: '#fef3c7', icon: Edit3 }
  if (a.includes('DELETE') || a.includes('EXCLU') || a.includes('REMOV'))
    return { label: 'Exclusão', color: '#dc2626', bg: '#fee2e2', icon: Trash2 }
  if (a.includes('VIEW') || a.includes('ACESSO') || a.includes('LISTAR'))
    return { label: 'Consulta', color: '#7c3aed', bg: '#ede9fe', icon: Eye }
  if (a.includes('IMPORT'))   return { label: 'Importação', color: '#0891b2', bg: '#cffafe', icon: Upload }
  if (a.includes('EXPORT') || a.includes('DOWNLOAD'))
    return { label: 'Export',   color: '#4f46e5', bg: '#e0e7ff', icon: Download }
  return { label: action, color: '#660099', bg: '#f5f0ff', icon: Info }
}

function getRoleBadge(role: string) {
  if (role === 'MASTER') return { label: 'Master', color: '#660099', bg: 'rgba(102,0,153,0.1)' }
  if (role === 'ADMIN')  return { label: 'Admin',  color: '#d97706', bg: '#fef3c7' }
  return { label: 'Técnico', color: '#64748b', bg: '#f1f5f9' }
}

const RED = '#660099'
const LIMIT = 30

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LogsPage() {
  const [logs, setLogs]           = useState<AuditLogEntry[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [entity, setEntity]       = useState('all')
  const [entities, setEntities]   = useState<string[]>([])
  const [loading, startTransition] = useTransition()
  const [error, setError]         = useState('')

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const load = useCallback((p: number, s: string, e: string) => {
    startTransition(async () => {
      const res = await getLogs({ page: p, limit: LIMIT, search: s || undefined, entity: e })
      if (res.success) {
        setLogs(res.data ?? [])
        setTotal(res.total ?? 0)
        setError('')
      } else {
        setError(res.error ?? 'Erro ao carregar logs')
      }
    })
  }, [])

  useEffect(() => {
    getLogEntities().then(setEntities)
    load(1, '', 'all')
  }, [load])

  const handleSearch = (v: string) => {
    setSearch(v)
    setPage(1)
    load(1, v, entity)
  }

  const handleEntity = (v: string) => {
    setEntity(v)
    setPage(1)
    load(1, search, v)
  }

  const handlePage = (p: number) => {
    setPage(p)
    load(p, search, entity)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>

      {/* ── Header ── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(102,0,153,0.12), rgba(102,0,153,0.05))',
            border: '1px solid rgba(102,0,153,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldAlert size={20} color={RED} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Logs de Auditoria
            </h1>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              {total.toLocaleString('pt-BR')} registros encontrados
            </p>
          </div>
        </div>

        <button
          onClick={() => load(page, search, entity)}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: `1px solid rgba(102,0,153,0.25)`,
            background: 'rgba(102,0,153,0.05)', color: RED, fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '14px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            placeholder="Buscar por ação, entidade, usuário..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 34px',
              borderRadius: 8, border: '1px solid #e2e8f0',
              fontSize: 13, color: '#1e293b', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Entity filter */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} color="#94a3b8" />
          <select
            value={entity}
            onChange={e => handleEntity(e.target.value)}
            style={{
              padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
              fontSize: 13, color: '#1e293b', background: '#fff', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="all">Todas as entidades</option>
            {entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5',
          borderRadius: 10, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
          color: '#dc2626', fontSize: 13, fontWeight: 500,
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {loading && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `3px solid rgba(102,0,153,0.15)`,
              borderTopColor: RED,
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }} />
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Carregando logs...</p>
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <ShieldAlert size={40} style={{ color: '#e2e8f0', marginBottom: 12 }} />
            <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>
              Nenhum log de auditoria encontrado
            </p>
            <p style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>
              As ações dos usuários aparecerão aqui automaticamente
            </p>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  {['Ação', 'Usuário', 'Entidade', 'ID da Entidade', 'IP', 'Data / Hora'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: '#94a3b8',
                      textTransform: 'uppercase', letterSpacing: '0.6px',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const meta = getActionMeta(log.action)
                  const Icon = meta.icon
                  const roleBadge = log.user ? getRoleBadge(log.user.role) : null

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: i < logs.length - 1 ? '1px solid #f8fafc' : 'none',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Ação */}
                      <td style={{ padding: '12px 16px', minWidth: 140 }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 10px', borderRadius: 999,
                          background: meta.bg, color: meta.color,
                          fontSize: 12, fontWeight: 700,
                        }}>
                          <Icon size={12} />
                          {log.action}
                        </div>
                      </td>

                      {/* Usuário */}
                      <td style={{ padding: '12px 16px', minWidth: 180 }}>
                        {log.user ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: `linear-gradient(135deg, ${RED}, #4a0072)`,
                              color: '#fff', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 11, fontWeight: 800,
                              flexShrink: 0,
                            }}>
                              {log.user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                                {log.user.name}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                {roleBadge && (
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                                    background: roleBadge.bg, color: roleBadge.color,
                                  }}>
                                    {roleBadge.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>Sistema</span>
                        )}
                      </td>

                      {/* Entidade */}
                      <td style={{ padding: '12px 16px' }}>
                        {log.entity ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Tag size={12} color="#94a3b8" />
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                              {log.entity}
                            </span>
                          </div>
                        ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                      </td>

                      {/* Entity ID */}
                      <td style={{ padding: '12px 16px' }}>
                        {log.entityId ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Hash size={12} color="#94a3b8" />
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                              {log.entityId}
                            </span>
                          </div>
                        ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                      </td>

                      {/* IP */}
                      <td style={{ padding: '12px 16px' }}>
                        {log.ipAddress ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Globe size={12} color="#94a3b8" />
                            <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748b' }}>
                              {log.ipAddress}
                            </span>
                          </div>
                        ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                      </td>

                      {/* Data */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={12} color="#94a3b8" />
                          <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '12px 20px',
          flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Página <b>{page}</b> de <b>{totalPages}</b> · {total} registros
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => handlePage(page - 1)}
              disabled={page <= 1 || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid #e2e8f0', background: page <= 1 ? '#f8fafc' : '#fff',
                color: page <= 1 ? '#cbd5e1' : '#475569', fontSize: 13, fontWeight: 600,
                cursor: page <= 1 ? 'default' : 'pointer',
              }}
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <button
              onClick={() => handlePage(page + 1)}
              disabled={page >= totalPages || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid #e2e8f0', background: page >= totalPages ? '#f8fafc' : '#fff',
                color: page >= totalPages ? '#cbd5e1' : '#475569', fontSize: 13, fontWeight: 600,
                cursor: page >= totalPages ? 'default' : 'pointer',
              }}
            >
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
