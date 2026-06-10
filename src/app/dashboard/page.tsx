'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  ClipboardCheck, Clock, FileText, Award, ChevronDown, X, Target, TrendingUp, Loader2
} from 'lucide-react'

import { getAtividades } from '@/app/actions/atividades'
import { getTecnicos } from '@/app/actions/tecnicos'
import { getQuilometragens } from '@/app/actions/quilometragem'
import { getAtividadesRelatorio } from '@/app/actions/relatorios'
import { getDssArkium } from '@/app/actions/dssArkium'
import { getInspecoesArkium } from '@/app/actions/inspecoesArkium'

/* ── Constantes Visuais ── */
const RED   = '#660099'
const RED2  = '#4a0072'
const COLORS = {
  dss: '#660099',    // Vermelho
  insp: '#8e44ad',   // Roxo
}

/* ── Constantes Dinâmicas ── */
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_MAP: Record<string, string> = {
  JANEIRO: 'Jan', FEVEREIRO: 'Fev', MARCO: 'Mar', ABRIL: 'Abr',
  MAIO: 'Mai', JUNHO: 'Jun', JULHO: 'Jul', AGOSTO: 'Ago',
  SETEMBRO: 'Set', OUTUBRO: 'Out', NOVEMBRO: 'Nov', DEZEMBRO: 'Dez'
}

const META_DSS_POR_TEC = 8
const META_INSP_POR_TEC = 20

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function getArkiumMonthYear(dateStr?: string | null): { month: number, year: number } {
  if (!dateStr) return { month: 0, year: 0 }
  let month = 0, year = 0
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/')
    if (parts.length >= 3) { month = parseInt(parts[1], 10); year = parseInt(parts[2], 10); if (parts[2].length === 2) year += 2000 }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-')
    if (parts.length >= 3) { year = parseInt(parts[0], 10); month = parseInt(parts[1], 10) }
  } else {
    const excelDateNum = Number(dateStr)
    if (!isNaN(excelDateNum) && excelDateNum > 20000) {
      const jsDate = new Date(Math.round((excelDateNum - 25569) * 86400 * 1000))
      month = jsDate.getUTCMonth() + 1; year = jsDate.getUTCFullYear()
    }
  }
  return { month, year }
}

const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
function matchTecnico(nomePlanilha: string | null | undefined, nomeBd: string) {
  if (!nomePlanilha || !nomeBd) return false
  const nP = removeAccents(nomePlanilha.toLowerCase().trim())
  const nB = removeAccents(nomeBd.toLowerCase().trim())
  if (nP === nB) return true
  const planTokens = nP.split(' ')
  const dbTokens = nB.split(' ')
  if (planTokens[0] === dbTokens[0]) {
     if (planTokens.length === 1 || dbTokens.length === 1) return true
     for (let i = 1; i < planTokens.length; i++) {
        for (let j = 1; j < dbTokens.length; j++) {
           if (planTokens[i] === dbTokens[j] || (planTokens[i] === 'jr' && dbTokens[j] === 'junior') || (planTokens[i] === 'junior' && dbTokens[j] === 'jr')) {
              return true
           }
        }
     }
  }
  return false
}

/* ── Componentes de UI ── */
function DualStatCard({ icon: Icon, label, value, percent, subtitle, bg, bgDark, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      style={{
        background: bg, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        overflow: 'hidden', cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .15s', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', flex: 1,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 8, letterSpacing: 0.3 }}>{label}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={{ color: '#fff', fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: -1, margin: 0 }}>{value}</h3>
            <div style={{ width: 2, height: 32, background: 'rgba(255,255,255,0.3)' }} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ color: '#fff', fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>{percent}%</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 700 }}>concluído</span>
            </div>
          </div>
          {subtitle && <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600, marginTop: 10, background: 'rgba(0,0,0,0.15)', padding: '4px 8px', borderRadius: 6, display: 'inline-block', alignSelf: 'flex-start' }}>Meta: {subtitle}</div>}
        </div>
        <Icon size={72} strokeWidth={1.2} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
      </div>
      <div style={{ height: 10, background: bgDark }} />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, bg, bgDark, subtitle, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      style={{
        background: bg,
        borderRadius: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .15s',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flex: 1,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 4, letterSpacing: 0.3 }}>{label}</p>
          <h3 style={{ color: '#fff', fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>{value}</h3>
          {subtitle && <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, marginTop: 6, background: 'rgba(0,0,0,0.1)', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>{subtitle}</div>}
        </div>
        <Icon size={72} strokeWidth={1.2} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
      </div>
      <div style={{ height: 10, background: bgDark }} />
    </div>
  )
}

function ChartCard({ icon: Icon, title, children, style }: any) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}>
      <div style={{
        background: RED,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: '#fff',
        fontWeight: 700,
        fontSize: 15,
      }}>
        <Icon size={18} />
        <span>{title}</span>
      </div>
      <div style={{ flex: 1, padding: 20, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight: 700, color: '#334155', marginBottom: 4, fontSize: 12 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{p.value} {p.name}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Helper de Medalha ── */
function getMedal(index: number) {
  if (index === 0) return { bg: 'linear-gradient(135deg, #FDE047 0%, #EAB308 100%)', color: '#713F12', border: '2px solid #CA8A04', label: '1' } // Ouro
  if (index === 1) return { bg: 'linear-gradient(135deg, #F1F5F9 0%, #CBD5E1 100%)', color: '#334155', border: '2px solid #94A3B8', label: '2' } // Prata
  if (index === 2) return { bg: 'linear-gradient(135deg, #FED7AA 0%, #F97316 100%)', color: '#7C2D12', border: '2px solid #EA580C', label: '3' } // Bronze
  return { bg: '#f8fafc', color: '#94a3b8', border: '2px solid transparent', label: (index + 1).toString() }
}

/* ── Página ── */
export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(' ')[0] || 'Gestor'
  const role = (session?.user as any)?.role

  const currentYear = new Date().getFullYear().toString()
  const [ano, setAno] = useState(currentYear)
  const [mes, setMes] = useState<string | null>(null)
  const [modalData, setModalData] = useState<any>(null) // Modal state

  const [atividadesDb, setAtividadesDb] = useState<any[]>([])
  const [tecnicosDb, setTecnicosDb] = useState<any[]>([])
  const [kmDb, setKmDb] = useState<any[]>([])
  const [relatoriosDb, setRelatoriosDb] = useState<any[]>([])
  const [dssArkiumDb, setDssArkiumDb] = useState<any[]>([])
  const [inspecoesArkiumDb, setInspecoesArkiumDb] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch real data
  useEffect(() => {
    async function loadData() {
      if (!role) return
      setLoading(true)
      try {
        const [ativRes, tecRes, kmRes, dssRes, inspRes, ...relRes] = await Promise.all([
          getAtividades(),
          getTecnicos(),
          getQuilometragens(parseInt(ano)),
          getDssArkium(),
          getInspecoesArkium(),
          ...Array.from({ length: 12 }).map((_, i) => getAtividadesRelatorio(i + 1, parseInt(ano)))
        ])
        if (ativRes.success) setAtividadesDb(ativRes.data || [])
        if (tecRes.success) setTecnicosDb(tecRes.data || [])
        if (kmRes.success) setKmDb(kmRes.data || [])
        if (dssRes.success) setDssArkiumDb(dssRes.data || [])
        if (inspRes.success) setInspecoesArkiumDb(inspRes.data || [])
        setRelatoriosDb(relRes.flat())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [role, ano])

  const anosSet = new Set<string>()
  dssArkiumDb.forEach(a => { const { year } = getArkiumMonthYear(a.dataFechamento); if (year > 2000) anosSet.add(year.toString()) })
  inspecoesArkiumDb.forEach(a => { const { year } = getArkiumMonthYear(a.dataAbertura || a.dataFechamento); if (year > 2000) anosSet.add(year.toString()) })
  relatoriosDb.forEach(a => { const year = new Date(a.data).getFullYear(); if (year > 2000) anosSet.add(year.toString()) })
  
  const ANOS = Array.from(anosSet).sort().reverse()
  if (!ANOS.includes(currentYear)) ANOS.push(currentYear)

  // Computa DADOS_MENSAIS e tecnicosStats para o ANO selecionado usando Arkium
  const dssAno = dssArkiumDb.filter(a => {
    const { year } = getArkiumMonthYear(a.dataFechamento)
    return year.toString() === ano
  })
  const inspAno = inspecoesArkiumDb.filter(a => {
    const { year } = getArkiumMonthYear(a.dataAbertura || a.dataFechamento)
    return year.toString() === ano
  })
  
  const dadosMensais = MESES.reduce((acc, m) => {
    acc[m] = { dss: 0, insp: 0 }
    return acc
  }, {} as Record<string, { dss: number; insp: number }>)

  dssAno.forEach(a => {
    const { month } = getArkiumMonthYear(a.dataFechamento)
    if (month >= 1 && month <= 12) {
      dadosMensais[MESES[month - 1]].dss += 1
    }
  })

  inspAno.forEach(a => {
    const { month } = getArkiumMonthYear(a.dataAbertura || a.dataFechamento)
    if (month >= 1 && month <= 12) {
      dadosMensais[MESES[month - 1]].insp += 1
    }
  })

  const dssFiltrados = mes
    ? dssAno.filter(a => { const { month } = getArkiumMonthYear(a.dataFechamento); return month >= 1 && month <= 12 && MESES[month - 1] === mes })
    : dssAno

  const inspFiltradas = mes
    ? inspAno.filter(a => { const { month } = getArkiumMonthYear(a.dataAbertura || a.dataFechamento); return month >= 1 && month <= 12 && MESES[month - 1] === mes })
    : inspAno

  // Dados de Relatório de Atividades
  const relatoriosFiltrados = mes 
    ? relatoriosDb.filter(r => new Date(r.data).getUTCMonth() === MESES.indexOf(mes))
    : relatoriosDb
  const totalRelatorios = relatoriosFiltrados.length

  const tecnicosStats = tecnicosDb.filter(t => t.ativo).map(t => {
    const dss = dssFiltrados.filter(a => matchTecnico(a.nome, t.nome)).length
    const insp = inspFiltradas.filter(a => matchTecnico(a.nomeAuditor, t.nome) || a.tecnicoId === t.id).length
    const relTec = relatoriosFiltrados.filter(r => r.tecnicoId === t.id)
    const rel = relTec.length
    return {
      nome: t.nome,
      fotoUrl: t.fotoUrl,
      dss,
      insp,
      rel
    }
  })

  // Lógica de Metas
  const nTecnicos = tecnicosDb.filter(t => t.ativo).length || 1
  const metaDssTotal = mes ? (nTecnicos * META_DSS_POR_TEC) : (nTecnicos * META_DSS_POR_TEC * 12)
  const metaInspTotal = mes ? (nTecnicos * META_INSP_POR_TEC) : (nTecnicos * META_INSP_POR_TEC * 12)

  // Valores reais baseados no filtro
  const totalDss = mes ? dadosMensais[mes].dss : Object.values(dadosMensais).reduce((a, v) => a + v.dss, 0)
  const totalInsp = mes ? dadosMensais[mes].insp : Object.values(dadosMensais).reduce((a, v) => a + v.insp, 0)

  // Percentuais
  const pctDss = metaDssTotal > 0 ? Math.round((totalDss / metaDssTotal) * 100) : 0
  const pctInsp = metaInspTotal > 0 ? Math.round((totalInsp / metaInspTotal) * 100) : 0



  // Dados de Quilometragem (média)
  const kmFiltrados = mes 
    ? kmDb.filter(k => new Date(k.dataInicial).getUTCMonth() === MESES.indexOf(mes))
    : kmDb
  const kmsValidos = kmFiltrados.filter(k => k.diferenca != null && k.diferenca > 0)
  const totalKm = kmsValidos.reduce((acc, k) => acc + (k.diferenca || 0), 0)
  const mediaKm = kmsValidos.length > 0 ? Math.round(totalKm / kmsValidos.length) : 0

  // Dados do Gráfico
  const barData = tecnicosStats

  // Rankings
  const rankDss = [...barData].sort((a, b) => b.dss - a.dss)
  const rankInsp = [...barData].sort((a, b) => b.insp - a.insp)

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <Loader2 className="animate-spin" size={48} color={RED} />
        <span style={{ color: '#64748b', fontWeight: 600 }}>Carregando dados do dashboard...</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

      {/* ── Modal de Detalhes ── */}
      {modalData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 500, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: RED, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Detalhes do Técnico</h3>
              <button onClick={() => setModalData(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#334155', border: '2px solid #cbd5e1', overflow: 'hidden' }}>
                  {modalData.fotoUrl ? (
                    <img src={modalData.fotoUrl} alt={modalData.nome} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    getInitials(modalData.nome)
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>{modalData.nome}</p>
                  <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500, margin: 0 }}>{mes ? `Dados de ${mes}/${ano}` : `Acumulado ${ano}`}</p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 12, border: '1px solid #bae6fd' }}>
                  <p style={{ fontSize: 11, color: '#0369a1', fontWeight: 700, margin: '0 0 4px 0', textTransform: 'uppercase' }}>DSS</p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#0284c7', margin: 0 }}>{modalData.dss}</p>
                  <p style={{ fontSize: 10, color: '#0ea5e9', fontWeight: 600, marginTop: 4 }}>Meta: {mes ? META_DSS_POR_TEC : META_DSS_POR_TEC * 4}</p>
                </div>
                <div style={{ background: '#fffbeb', padding: 16, borderRadius: 12, border: '1px solid #fde68a' }}>
                  <p style={{ fontSize: 11, color: '#b45309', fontWeight: 700, margin: '0 0 4px 0', textTransform: 'uppercase' }}>Insp.</p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#d97706', margin: 0 }}>{modalData.insp}</p>
                  <p style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>Meta: {mes ? META_INSP_POR_TEC : META_INSP_POR_TEC * 4}</p>
                </div>
                <div style={{ background: '#faf5ff', padding: 16, borderRadius: 12, border: '1px solid #e9d5ff' }}>
                  <p style={{ fontSize: 11, color: '#7e22ce', fontWeight: 700, margin: '0 0 4px 0', textTransform: 'uppercase' }}>Relatórios</p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#9333ea', margin: 0 }}>{modalData.rel}</p>
                  <p style={{ fontSize: 10, color: '#a855f7', fontWeight: 600, marginTop: 4 }}>Atividades</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra superior com Filtros ── */}
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
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Olá, {firstName}!
          </h1>
          <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
            Bem-vindo ao painel SG4
          </span>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <select
              value={ano}
              onChange={e => setAno(e.target.value)}
              style={{
                appearance: 'none', background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 8, padding: '8px 36px 8px 16px', fontSize: 13,
                fontWeight: 600, color: '#475569', cursor: 'pointer', outline: 'none'
              }}
            >
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: 11, pointerEvents: 'none', color: '#94a3b8' }} />
          </div>

          <div style={{ position: 'relative' }}>
            <select
              value={mes || ''}
              onChange={e => setMes(e.target.value || null)}
              style={{
                appearance: 'none', background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 8, padding: '8px 36px 8px 16px', fontSize: 13,
                fontWeight: 600, color: '#475569', cursor: 'pointer', outline: 'none'
              }}
            >
              <option value="">Geral (Acumulado)</option>
              {MESES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: 11, pointerEvents: 'none', color: '#94a3b8' }} />
          </div>
        </div>
      </div>

      {/* ── 4 Stat cards ── */}
      <div style={{ display: 'flex', gap: 20 }}>
        <DualStatCard onClick={() => router.push('/dashboard/dialogos')} icon={ClipboardCheck} label="DSS" value={totalDss} percent={pctDss} subtitle={metaDssTotal} bg="#660099" bgDark="#4a0072" />
        <DualStatCard onClick={() => router.push('/dashboard/inspecoes')} icon={Clock} label="Inspeções" value={totalInsp} percent={pctInsp} subtitle={metaInspTotal} bg="#8e44ad" bgDark="#732d91" />
        <StatCard onClick={() => router.push('/dashboard/relatorios')} icon={FileText} label="Relatórios" value={totalRelatorios} subtitle="Atividades Registradas" bg="#9c27b0" bgDark="#7b1fa2" />
        <StatCard onClick={() => router.push('/dashboard/quilometragem')} icon={TrendingUp} label="Média Km" value={`${mediaKm} km`} subtitle="Média por registro" bg="#673ab7" bgDark="#512da8" />
      </div>

      {/* ── Charts & Rankings (2/3 + 1/3) ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Coluna Esquerda: Gráfico BarChart */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ChartCard icon={FileText} title="Desempenho por Técnico" style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ left: -10, right: 10, bottom: 50 }} onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload.length > 0) {
                  setModalData(data.activePayload[0].payload)
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="nome"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  tickLine={false} axisLine={false} angle={-25} textAnchor="end" height={70}
                  style={{ cursor: 'pointer' }}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(102,0,153,0.04)', cursor: 'pointer' }} />
                <Legend wrapperStyle={{ fontSize: 13, fontWeight: 700, paddingTop: 10 }} />
                
                <Bar dataKey="dss" name="DSS" fill={COLORS.dss} radius={[4, 4, 0, 0]} maxBarSize={30} style={{ cursor: 'pointer' }} />
                <Bar dataKey="insp" name="Inspeções" fill={COLORS.insp} radius={[4, 4, 0, 0]} maxBarSize={30} style={{ cursor: 'pointer' }} />
                <Bar dataKey="rel" name="Relatórios" fill="#9c27b0" radius={[4, 4, 0, 0]} maxBarSize={30} style={{ cursor: 'pointer' }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Coluna Direita: Rankings */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Ranking DSS */}
          <ChartCard icon={Target} title="Ranking - DSS" style={{ height: 240 }}>
            <div style={{ overflowY: 'auto', height: '100%', paddingRight: 4 }} className="scrollbar-hide">
              {rankDss.map((t, i) => {
                const medal = getMedal(i)
                return (
                  <div key={i} onClick={() => setModalData(t)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background .15s', borderRadius: 8 }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: medal.bg, color: medal.color, border: medal.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i < 3 ? 12 : 11, fontWeight: 900, boxShadow: i < 3 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', boxSizing: 'border-box', lineHeight: 1, paddingBottom: 1 }}>
                      {medal.label}
                    </div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#334155' }}>{t.nome}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: COLORS.dss }}>{t.dss}</div>
                  </div>
                )
              })}
            </div>
          </ChartCard>

          {/* Ranking Inspeções */}
          <ChartCard icon={TrendingUp} title="Ranking - Inspeções" style={{ height: 240 }}>
            <div style={{ overflowY: 'auto', height: '100%', paddingRight: 4 }} className="scrollbar-hide">
              {rankInsp.map((t, i) => {
                const medal = getMedal(i)
                return (
                  <div key={i} onClick={() => setModalData(t)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background .15s', borderRadius: 8 }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: medal.bg, color: medal.color, border: medal.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i < 3 ? 12 : 11, fontWeight: 900, boxShadow: i < 3 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', boxSizing: 'border-box', lineHeight: 1, paddingBottom: 1 }}>
                      {medal.label}
                    </div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#334155' }}>{t.nome}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: COLORS.insp }}>{t.insp}</div>
                  </div>
                )
              })}
            </div>
          </ChartCard>

        </div>
      </div>
    </div>
  )
}
