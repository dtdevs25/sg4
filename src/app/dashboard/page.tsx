'use client'

import { useState, useEffect, useRef } from 'react'
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

function isDssAssinado(assinadoStr?: string | null) {
  if (!assinadoStr) return false
  const s = assinadoStr.toLowerCase().trim()
  if (s.includes('não') || s.includes('nao') || s.includes('pendente')) return false
  return true
}

/* ── Tick personalizado do gráfico com foto ── */
function CustomXAxisTick({ x, y, payload, width }: any) {
  const tickData = (window as any).__barDataMap?.[payload.value]
  const fotoUrl = tickData?.fotoUrl
  const size = 36
  const clipId = `clip-${payload.value.replace(/\s/g, '-').replace(/\./g, '')}`
  const mostrarFotos = (window as any).__mostrarFotosGrafico !== false

  return (
    <g transform={`translate(${x},${y + 4})`}>
      {mostrarFotos ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <circle cx={0} cy={size / 2 + 2} r={size / 2} />
            </clipPath>
          </defs>
          {/* borda/anel ao redor da foto */}
          <circle cx={0} cy={size / 2 + 2} r={size / 2 + 2} fill="#ede9f6" />
          {fotoUrl ? (
            <image
              href={fotoUrl}
              x={-size / 2}
              y={2}
              width={size}
              height={size}
              clipPath={`url(#${clipId})`}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <>
              <circle cx={0} cy={size / 2 + 2} r={size / 2} fill="#8e44ad" />
              <text x={0} y={size / 2 + 7} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>
                {payload.value.slice(0, 2).toUpperCase()}
              </text>
            </>
          )}
          <text
            x={0}
            y={size + 16}
            textAnchor="middle"
            fill="#475569"
            fontSize={10}
            fontWeight={700}
          >
            {payload.value}
          </text>
        </>
      ) : (
        <text
          x={0}
          y={14}
          textAnchor="middle"
          fill="#475569"
          fontSize={11}
          fontWeight={700}
        >
          {payload.value}
        </text>
      )}

      {/* Linha vertical separadora das colunas — centered at right edge of tick group */}
      <line
        x1={width / 2}
        y1={-450}
        x2={width / 2}
        y2={-4}
        stroke="#94a3b8"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
    </g>
  )
}

/* ── Separador vertical entre grupos de barras ── */
function GroupDivider(props: any) {
  const { x, y, width, height } = props
  return (
    <line
      x1={x + width + 3}
      y1={y}
      x2={x + width + 3}
      y2={y + height}
      stroke="#e2e8f0"
      strokeWidth={1.5}
      strokeDasharray="4 3"
    />
  )
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
        justifyContent: 'space-between', flex: 1, minWidth: 260
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, paddingRight: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1.5vw, 8px)', marginBottom: 8 }}>
            <p style={{ color: '#fff', fontSize: 'clamp(13px, 1.8vw, 15px)', fontWeight: 700, margin: 0, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{label}</p>
            {subtitle && (
              <>
                <div style={{ width: 2, height: 14, background: 'rgba(255,255,255,0.4)' }} />
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 'clamp(10px, 1.5vw, 13px)', fontWeight: 600, whiteSpace: 'nowrap' }}>Meta: {subtitle}</span>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.5vw, 12px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: '#fff', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, lineHeight: 1, letterSpacing: -1, margin: 0 }}>{value}</h3>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(9px, 1.2vw, 11px)', fontWeight: 700, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Realizados</span>
            </div>
            <div style={{ width: 2, height: 'clamp(22px, 3.5vw, 30px)', background: 'rgba(255,255,255,0.3)' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#fff', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>{percent}%</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(9px, 1.2vw, 11px)', fontWeight: 700, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Concluído</span>
            </div>
          </div>
        </div>
        <Icon size={72} strokeWidth={1.2} style={{ color: 'rgba(255,255,255,0.25)', position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 0, pointerEvents: 'none' }} />
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
        flex: 1, minWidth: 200
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <div style={{ position: 'relative', zIndex: 1, paddingRight: 32 }}>
          <p style={{ color: '#fff', fontSize: 'clamp(13px, 1.8vw, 15px)', fontWeight: 700, marginBottom: 4, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{label}</p>
          <h3 style={{ color: '#fff', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, lineHeight: 1, letterSpacing: -1, margin: 0 }}>{value}</h3>
          {subtitle && <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(9px, 1.2vw, 11px)', fontWeight: 600, marginTop: 6, background: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: 6, display: 'inline-block', whiteSpace: 'nowrap' }}>{subtitle}</div>}
        </div>
        <Icon size={72} strokeWidth={1.2} style={{ color: 'rgba(255,255,255,0.25)', position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 0, pointerEvents: 'none' }} />
      </div>
      <div style={{ height: 10, background: bgDark }} />
    </div>
  )
}

function ChartCard({ icon: Icon, title, children, style, headerAction }: any) {
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
        justifyContent: 'space-between',
        color: '#fff',
        fontWeight: 700,
        fontSize: 15,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon size={18} />
          <span>{title}</span>
        </div>
        {headerAction}
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

/* ── Helper: abreviar nome ── */
function abbreviateName(fullName: string): string {
  const parts = fullName.trim().split(' ').filter(Boolean)
  if (parts.length <= 1) return fullName
  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1][0].toUpperCase()
  return `${firstName} ${lastInitial}.`
}

/* ── Helper de Medalha ── */
function getMedal(index: number) {
  if (index === 0) return { bg: 'linear-gradient(135deg, #FDE047 0%, #EAB308 100%)', color: '#713F12', border: '2px solid #CA8A04', label: '1' }
  if (index === 1) return { bg: 'linear-gradient(135deg, #F1F5F9 0%, #CBD5E1 100%)', color: '#334155', border: '2px solid #94A3B8', label: '2' }
  if (index === 2) return { bg: 'linear-gradient(135deg, #FED7AA 0%, #F97316 100%)', color: '#7C2D12', border: '2px solid #EA580C', label: '3' }
  return { bg: '#f8fafc', color: '#94a3b8', border: '2px solid transparent', label: (index + 1).toString() }
}

/* ── Página ── */
export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(' ')[0] || 'Gestor'
  const role = (session?.user as any)?.role

  const currentYear = new Date().getFullYear().toString()
  const [ano, setAno] = useState<string>(currentYear)
  const [meses, setMeses] = useState<string[]>(['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']) // multi-select de meses
  const [mostrarFotosGrafico, setMostrarFotosGrafico] = useState<boolean>(true)
  const [dropdownAberto, setDropdownAberto] = useState<boolean>(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [legendaAtiva, setLegendaAtiva] = useState<string[]>(['dss', 'insp', 'rel']) // filtro de legenda
  const [modalData, setModalData] = useState<any>(null)

  const [atividadesDb, setAtividadesDb] = useState<any[]>([])
  const [tecnicosDb, setTecnicosDb] = useState<any[]>([])
  const [kmDb, setKmDb] = useState<any[]>([])
  const [relatoriosDb, setRelatoriosDb] = useState<any[]>([])
  const [dssArkiumDb, setDssArkiumDb] = useState<any[]>([])
  const [inspecoesArkiumDb, setInspecoesArkiumDb] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch real data (once)
  useEffect(() => {
    async function loadData() {
      if (!role) return
      setLoading(true)
      try {
        const [ativRes, tecRes, kmRes, dssRes, inspRes, relRes] = await Promise.all([
          getAtividades(),
          getTecnicos(),
          getQuilometragens(),
          getDssArkium(),
          getInspecoesArkium(),
          getAtividadesRelatorio()
        ])
        if (ativRes.success) setAtividadesDb(ativRes.data || [])
        if (tecRes.success) setTecnicosDb(tecRes.data || [])
        if (kmRes.success) setKmDb(kmRes.data || [])
        if (dssRes.success) setDssArkiumDb(dssRes.data || [])
        if (inspRes.success) setInspecoesArkiumDb(inspRes.data || [])
        setRelatoriosDb(Array.isArray(relRes) ? relRes : [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [role])

  const anosSet = new Set<string>()
  dssArkiumDb.forEach(a => { const { year } = getArkiumMonthYear(a.dataFechamento); if (year > 2000) anosSet.add(year.toString()) })
  inspecoesArkiumDb.forEach(a => { const { year } = getArkiumMonthYear(a.dataAbertura || a.dataFechamento); if (year > 2000) anosSet.add(year.toString()) })
  relatoriosDb.forEach(a => { const year = new Date(a.data).getFullYear(); if (year > 2000) anosSet.add(year.toString()) })
  
  const ANOS = Array.from(anosSet).sort().reverse()
  if (!ANOS.includes(currentYear)) ANOS.push(currentYear)

  const dssArkiumValidos = dssArkiumDb.filter(a => isDssAssinado(a.assinado))

  const dssAno = ano ? dssArkiumValidos.filter(a => {
    const { year } = getArkiumMonthYear(a.dataFechamento)
    return year.toString() === ano
  }) : dssArkiumValidos

  const inspAno = ano ? inspecoesArkiumDb.filter(a => {
    const { year } = getArkiumMonthYear(a.dataAbertura || a.dataFechamento)
    return year.toString() === ano
  }) : inspecoesArkiumDb

  const relatoriosAno = ano ? relatoriosDb.filter(r => new Date(r.data).getFullYear().toString() === ano) : relatoriosDb
  const kmAno = ano ? kmDb.filter(k => new Date(k.dataInicial).getFullYear().toString() === ano) : kmDb
  
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

  const dssFiltrados = meses.length > 0
    ? dssAno.filter(a => { const { month } = getArkiumMonthYear(a.dataFechamento); return month >= 1 && month <= 12 && meses.includes(MESES[month - 1]) })
    : dssAno

  const inspFiltradas = meses.length > 0
    ? inspAno.filter(a => { const { month } = getArkiumMonthYear(a.dataAbertura || a.dataFechamento); return month >= 1 && month <= 12 && meses.includes(MESES[month - 1]) })
    : inspAno

  // Dados de Relatório de Atividades
  const relatoriosFiltrados = meses.length > 0
    ? relatoriosAno.filter(r => meses.includes(MESES[new Date(r.data).getUTCMonth()]))
    : relatoriosAno
  const totalRelatorios = relatoriosFiltrados.length

  const tecnicosStats = tecnicosDb.filter(t => t.ativo).map(t => {
    const dss = dssFiltrados.filter(a => matchTecnico(a.nome, t.nome)).length
    const insp = inspFiltradas.filter(a => matchTecnico(a.nomeAuditor, t.nome) || a.tecnicoId === t.id).length
    const relTec = relatoriosFiltrados.filter(r => r.tecnicoId === t.id)
    const rel = relTec.length
    
    // Abreviação do nome: "PrimeiroNome InicialSegundoNome."
    const parts = t.nome.trim().split(' ')
    const nomeAbrev = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0]

    return {
      nome: t.nome,
      nomeAbrev,
      fotoUrl: t.fotoUrl,
      dss,
      insp,
      rel
    }
  })

  // Lógica de Metas
  const nTecnicos = tecnicosDb.filter(t => t.ativo && t.contaMeta !== false).length || 1
  const numYears = ano ? 1 : (ANOS.length || 1)
  const numMeses = meses.length > 0 ? meses.length : 12
  const metaDssTotal = nTecnicos * META_DSS_POR_TEC * numMeses * numYears
  const metaInspTotal = nTecnicos * META_INSP_POR_TEC * numMeses * numYears

  // Valores reais baseados no filtro
  const totalDss = meses.length > 0
    ? meses.reduce((acc, m) => acc + (dadosMensais[m]?.dss || 0), 0)
    : Object.values(dadosMensais).reduce((a, v) => a + v.dss, 0)
  const totalInsp = meses.length > 0
    ? meses.reduce((acc, m) => acc + (dadosMensais[m]?.insp || 0), 0)
    : Object.values(dadosMensais).reduce((a, v) => a + v.insp, 0)

  // Percentuais
  const pctDss = metaDssTotal > 0 ? Math.round((totalDss / metaDssTotal) * 100) : 0
  const pctInsp = metaInspTotal > 0 ? Math.round((totalInsp / metaInspTotal) * 100) : 0



  // Dados de Quilometragem (média)
  const kmFiltrados = meses.length > 0
    ? kmAno.filter(k => meses.includes(MESES[new Date(k.dataInicial).getUTCMonth()]))
    : kmAno
  const kmsValidos = kmFiltrados.filter(k => k.diferenca != null && k.diferenca > 0)
  const totalKm = kmsValidos.reduce((acc, k) => acc + (k.diferenca || 0), 0)
  const mediaKm = kmsValidos.length > 0 ? Math.round(totalKm / kmsValidos.length) : 0

  // Dados do Gráfico (Ordenado alfabeticamente e nomes abreviados)
  const barData = [...tecnicosStats]
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map(t => ({ ...t, nomeAbrev: abbreviateName(t.nome) }))

  // Mapa global para o CustomXAxisTick acessar fotoUrl via nomeAbrev
  if (typeof window !== 'undefined') {
    ;(window as any).__barDataMap = Object.fromEntries(barData.map(t => [t.nomeAbrev, t]))
    ;(window as any).__mostrarFotosGrafico = mostrarFotosGrafico
  }

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
                  <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500, margin: 0 }}>
                    {meses.length > 0 ? `Dados de ${meses.join(', ')}/${ano || 'Todos'}` : `Acumulado ${ano || 'Geral'}`}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 12, border: '1px solid #bae6fd' }}>
                  <p style={{ fontSize: 11, color: '#0369a1', fontWeight: 700, margin: '0 0 4px 0', textTransform: 'uppercase' }}>DSS</p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#0284c7', margin: 0 }}>{modalData.dss}</p>
                  <p style={{ fontSize: 10, color: '#0ea5e9', fontWeight: 600, marginTop: 4 }}>Meta: {META_DSS_POR_TEC * numMeses * numYears}</p>
                </div>
                <div style={{ background: '#fffbeb', padding: 16, borderRadius: 12, border: '1px solid #fde68a' }}>
                  <p style={{ fontSize: 11, color: '#b45309', fontWeight: 700, margin: '0 0 4px 0', textTransform: 'uppercase' }}>Insp.</p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#d97706', margin: 0 }}>{modalData.insp}</p>
                  <p style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>Meta: {META_INSP_POR_TEC * numMeses * numYears}</p>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Seletor de Ano */}
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
              <option value="">Geral (Todos os Anos)</option>
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: 11, pointerEvents: 'none', color: '#94a3b8' }} />
          </div>

          {/* Custom Dropdown Multi-select de Meses */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownAberto(!dropdownAberto)}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 180,
                justifyContent: 'space-between'
              }}
            >
              <span>
                {meses.length === 12
                  ? 'Todos os Meses'
                  : meses.length === 0
                  ? 'Nenhum Mês'
                  : meses.length <= 3
                  ? meses.join(', ')
                  : `${meses.length} Meses`}
              </span>
              <ChevronDown size={14} style={{ color: '#94a3b8' }} />
            </button>

            {dropdownAberto && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                zIndex: 1000,
                width: 200,
                maxHeight: 280,
                overflowY: 'auto',
                padding: 6
              }}>
                {/* Opção Selecionar Todos / Desmarcar Todos */}
                <div 
                  onClick={() => {
                    if (meses.length === 12) {
                      setMeses([])
                    } else {
                      setMeses([...MESES])
                    }
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: meses.length === 12 ? '#f1f5f9' : 'transparent',
                    color: '#475569',
                    borderBottom: '1px solid #f1f5f9',
                    marginBottom: 4,
                    userSelect: 'none'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={meses.length === 12}
                    readOnly
                    style={{ cursor: 'pointer', accentColor: '#660099' }}
                  />
                  <span>{meses.length === 12 ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
                </div>

                {/* Lista de Meses */}
                {MESES.map(m => {
                  const ativo = meses.includes(m)
                  return (
                    <div
                      key={m}
                      onClick={() => {
                        setMeses(prev => 
                          ativo 
                            ? prev.filter(x => x !== m) 
                            : [...prev, m]
                        )
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: ativo ? 'rgba(102,0,153,0.06)' : 'transparent',
                        color: ativo ? '#660099' : '#475569',
                        transition: 'background 0.15s',
                        userSelect: 'none'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = ativo ? 'rgba(102,0,153,0.08)' : '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = ativo ? 'rgba(102,0,153,0.06)' : 'transparent'}
                    >
                      <input 
                        type="checkbox" 
                        checked={ativo}
                        readOnly
                        style={{ cursor: 'pointer', accentColor: '#660099' }}
                      />
                      <span>{m}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 Stat cards — cores Vivo (Roxo/Violeta) ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <DualStatCard onClick={() => router.push('/dashboard/dialogos')} icon={ClipboardCheck} label="DSS" value={totalDss} percent={pctDss} subtitle={metaDssTotal} bg="#660099" bgDark="#4a0072" />
        <DualStatCard onClick={() => router.push('/dashboard/inspecoes')} icon={Clock} label="Inspeções" value={totalInsp} percent={pctInsp} subtitle={metaInspTotal} bg="#8e44ad" bgDark="#732d91" />
        <StatCard onClick={() => router.push('/dashboard/relatorios')} icon={FileText} label="Relatórios" value={totalRelatorios} subtitle="Atividades Registradas" bg="#9c27b0" bgDark="#7b1fa2" />
        <StatCard onClick={() => router.push('/dashboard/quilometragem')} icon={TrendingUp} label="Média Km" value={`${mediaKm} km`} subtitle="Média por registro" bg="#673ab7" bgDark="#512da8" />
      </div>

      {/* ── Charts & Rankings (2/3 + 1/3) ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Coluna Esquerda: Gráfico BarChart */}
        <div style={{ flex: 2, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ChartCard
            icon={FileText}
            title="Desempenho por Técnico"
            style={{ height: 500 }}
            headerAction={
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6, 
                  fontSize: 12, 
                  cursor: 'pointer', 
                  fontWeight: 600, 
                  userSelect: 'none', 
                  background: 'rgba(255,255,255,0.15)', 
                  padding: '4px 10px', 
                  borderRadius: 20, 
                  border: '1px solid rgba(255,255,255,0.3)' 
                }} 
                onClick={() => setMostrarFotosGrafico(!mostrarFotosGrafico)}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: mostrarFotosGrafico ? '#10b981' : '#ef4444' }} />
                <span>{mostrarFotosGrafico ? 'Fotos Ativas' : 'Apenas Nomes'}</span>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ left: -10, right: 10, bottom: 50, top: 30 }} onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload.length > 0) {
                  setModalData(data.activePayload[0].payload)
                }
              }}>
                <CartesianGrid vertical={false} horizontal={true} stroke="#e2e8f0" />
                <XAxis
                  dataKey="nomeAbrev"
                  tick={<CustomXAxisTick />}
                  tickLine={false} axisLine={false} height={80}
                  interval={0}
                  style={{ cursor: 'pointer' }}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(102,0,153,0.04)', cursor: 'pointer' }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: 13, fontWeight: 700, paddingBottom: 16, cursor: 'pointer' }}
                  onClick={(e: any) => {
                    const key = e.dataKey as string
                    setLegendaAtiva(prev =>
                      prev.includes(key)
                        ? prev.length === 1 ? ['dss', 'insp', 'rel'] : prev.filter(k => k !== key)
                        : [...prev, key]
                    )
                  }}
                  formatter={(value: string, entry: any) => (
                    <span style={{
                      color: legendaAtiva.includes(entry.dataKey) ? '#1e293b' : '#cbd5e1',
                      textDecoration: legendaAtiva.includes(entry.dataKey) ? 'none' : 'line-through',
                      transition: 'all .2s'
                    }}>{value}</span>
                  )}
                />

                <Bar dataKey="dss" name="DSS" fill="#660099" radius={[4, 4, 0, 0]} maxBarSize={28} style={{ cursor: 'pointer' }} hide={!legendaAtiva.includes('dss')} />
                <Bar dataKey="insp" name="Inspeções" fill="#8e44ad" radius={[4, 4, 0, 0]} maxBarSize={28} style={{ cursor: 'pointer' }} hide={!legendaAtiva.includes('insp')} />
                <Bar dataKey="rel" name="Relatórios" fill="#9c27b0" radius={[4, 4, 0, 0]} maxBarSize={28} style={{ cursor: 'pointer' }} hide={!legendaAtiva.includes('rel')} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Coluna Direita: Rankings */}
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
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
