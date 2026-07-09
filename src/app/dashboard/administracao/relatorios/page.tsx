'use client'

import { useState, useTransition, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  BarChart3, FileText, ShieldAlert, AlertTriangle, Clock,
  Users, Car, Trophy, Search, ChevronDown, FileSpreadsheet,
  Download, Calendar, X, Loader2, CheckCircle, Mail, Send
} from 'lucide-react'
import {
  getRelatorioAgenda, getRelatorioDss, getRelatorioInspecoes,
  getRelatorioNaoConformes, getRelatorioDssPendentes, getRelatorioPlanejamentosAtrasados,
  getRelatorioAusencias, getRelatorioReunioes, getRelatorioKm,
  getRelatorioAtividadesCampo, getRelatorioRanking, getTecnicosParaFiltro,
  getRelatorioProdutividadeDssInspecoes,
  definirRecebedorRelatorioProdutividade,
  type FiltrosRelatorio
} from '@/app/actions/relatoriosGerais'

const RED = '#660099'
const RED_BG = 'rgba(102,0,153,0.08)'

// ── Catálogo de relatórios ────────────────────────────────────────────────────

const TIPOS = [
  { id: 'agenda',      label: 'Agenda / Planejamento',        icon: Calendar,       cor: '#660099', grupo: 'Operacionais',    desc: 'Atividades planejadas com criador, fechador, status e descrições' },
  { id: 'dss',         label: 'DSS',                          icon: FileText,       cor: '#0891b2', grupo: 'Operacionais',    desc: 'Diálogos de segurança realizados com meta e percentual' },
  { id: 'inspecoes',   label: 'Inspeções',                    icon: Search,         cor: '#16a34a', grupo: 'Operacionais',    desc: 'Inspeções realizadas com resultado e conformidade' },
  { id: 'nao-confor',  label: 'Itens Não Conformes',          icon: AlertTriangle,  cor: '#dc2626', grupo: 'Não Conformidades', desc: 'Inspeções com resultado negativo / não conforme' },
  { id: 'dss-pend',    label: 'DSS Pendentes',                icon: Clock,          cor: '#d97706', grupo: 'Não Conformidades', desc: 'Diálogos ainda abertos / não assinados' },
  { id: 'atrasados',   label: 'Planejamentos Não Executados', icon: AlertTriangle,  cor: '#dc2626', grupo: 'Não Conformidades', desc: 'Itens pendentes com data já vencida' },
  { id: 'ausencias',   label: 'Ausências em Reuniões',        icon: Users,          cor: '#d97706', grupo: 'Não Conformidades', desc: 'Técnicos ausentes com ou sem justificativa' },
  { id: 'reunioes',    label: 'Reuniões',                     icon: Users,          cor: '#7c3aed', grupo: 'Gerenciais',       desc: 'Presença e pontualidade por técnico e período' },
  { id: 'km',          label: 'Quilometragem',                icon: Car,            cor: '#0ea5e9', grupo: 'Gerenciais',       desc: 'KM rodados e abastecimentos por técnico' },
  { id: 'atividades',  label: 'Atividades de Campo',          icon: BarChart3,      cor: '#16a34a', grupo: 'Gerenciais',       desc: 'Atividades executadas com empresa, local e descrição' },
  { id: 'ranking',     label: 'Ranking de Desempenho',        icon: Trophy,         cor: '#d97706', grupo: 'Gerenciais',       desc: 'Score consolidado: DSS + Inspeções + Reuniões' },
  { id: 'produtividade',label: 'Produtividade', icon: CheckCircle,    cor: '#ec4899', grupo: 'Operacionais',    desc: 'Consolidado de DSS e Inspeções realizadas por técnico' },
]

const GRUPOS = ['Operacionais', 'Não Conformidades', 'Gerenciais']

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoje() { return new Date().toISOString().split('T')[0] }
function primeiroDiaMes() {
  const d = new Date(); d.setDate(1)
  return d.toISOString().split('T')[0]
}
function primeiroDiaMesAnterior() {
  const d = new Date()
  const dPrev = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  const y = dPrev.getFullYear()
  const m = String(dPrev.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}
function ultimoDiaMesAnterior() {
  const d = new Date()
  const dPrev = new Date(d.getFullYear(), d.getMonth(), 0)
  const y = dPrev.getFullYear()
  const m = String(dPrev.getMonth() + 1).padStart(2, '0')
  const day = String(dPrev.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminRelatoriosPage() {
  const { data: session } = useSession()
  const nomeUsuario = session?.user?.name ?? 'Usuário'

  const [tipoSel, setTipoSel]     = useState<string | null>(null)
  const [tecnicos, setTecnicos]   = useState<any[]>([])
  const [tecnicoId, setTecnicoId] = useState('')
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes())
  const [dataFim,    setDataFim]    = useState(hoje())
  const [erro, setErro]           = useState('')
  const [loading, startT]         = useTransition()
  const [tecLoading, setTecLoading] = useState(false)
  const [exportando, setExportando] = useState<'pdf' | 'excel' | 'email' | null>(null)
  const [sucesso, setSucesso]     = useState(false)
  const [destinatarioId, setDestinatarioId] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('tstDestinoEmailId')
    if (saved) setDestinatarioId(saved)
  }, [])

  async function abrirFiltros(id: string) {
    setTipoSel(id); setErro('')
    if (id === 'produtividade') {
      setDataInicio(primeiroDiaMesAnterior())
      setDataFim(ultimoDiaMesAnterior())
    } else {
      setDataInicio(primeiroDiaMes())
      setDataFim(hoje())
    }
    if (tecnicos.length === 0) {
      setTecLoading(true)
      const t = await getTecnicosParaFiltro()
      setTecnicos(t)
      setTecLoading(false)
    }
  }

  async function setarRecebedorAutomatico() {
    if (!destinatarioId) return setErro('Selecione um técnico primeiro.')
    startT(async () => {
      setErro('')
      const res = await definirRecebedorRelatorioProdutividade(destinatarioId)
      if (res.success) {
        setSucesso(true)
        setTimeout(() => setSucesso(false), 3000)
      } else {
        setErro(res.error || 'Erro ao definir recebedor')
      }
    })
  }

  async function gerar(formato: 'pdf' | 'excel' | 'email') {
    const filtros: FiltrosRelatorio = {
      tecnicoId: tecnicoId || undefined,
      dataInicio, dataFim,
    }
    const tName = tecnicoId ? tecnicos.find(t => t.id === tecnicoId)?.nome : ''
    const sub = `Período: ${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}${tName ? ` · Técnico: ${tName}` : ' · Todos os Técnicos'}`
    const baseOpts = { subtitulo: sub, geradoPor: nomeUsuario }

    setExportando(formato)
    startT(async () => {
      try {
        setErro('')
        
        const { gerarPdfCentral } = await import('@/app/utils/gerarPdfCentral')
        const { gerarExcelCentral } = await import('@/app/utils/gerarExcelCentral')

        let genOpts: any = null
        const safeTitle = tipo?.label.replace(/[^a-zA-Z0-9 \-]/g, '').slice(0, 30) || 'Relatorio'
        const dataStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '.')
        const baseFileName = `${safeTitle}${tName ? ` - ${tName}` : ''} - ${dataStr}`
        const fn = formato === 'excel' ? `${baseFileName}.xlsx` : `${baseFileName}.pdf`

        if (tipoSel === 'agenda') {
          const d = await getRelatorioAgenda(filtros)
          genOpts = { titulo: 'Agenda / Planejamento', ...baseOpts, fileName: fn, totalTexto: `Total: ${d.data.length} atividades planejadas`, headers: ['Técnico','Data','Categoria','Descrição','Status','Criado por','Criado em','Fechado por','Fechado em','Desc. Executada'], rows: d.data.map((r:any) => [r.tecnico, r.dataAtividade?.slice(0,10), r.categoria, r.descricaoOriginal?.slice(0,60), r.status, r.criadoPor, r.criadoEm?.slice(0,16)?.replace('T',' '), r.fechadoPor, r.fechadoEm?.slice(0,16)?.replace('T',' '), (r.descricaoExecutada||'—').slice(0,60)]) }
        } else if (tipoSel === 'dss') {
          const d = await getRelatorioDss(filtros)
          genOpts = { titulo: 'DSS', ...baseOpts, fileName: fn, totalTexto: `Total: ${d.data.length} diálogos registrados`, headers: ['Nº Diálogo','Assunto','Líder','Base','Matrícula','Nome','Estado','Data Fechamento'], rows: (d.data||[]).map((r:any) => [r.numeroDialogo, r.assunto??'—', r.lider??'—', r.base??'—', r.matricula, r.nome??'—', r.estado, r.dataFechamento??'—']) }
        } else if (tipoSel === 'inspecoes') {
          const d = await getRelatorioInspecoes(filtros)
          genOpts = { titulo: 'Inspeções', ...baseOpts, fileName: fn, totalTexto: `Total: ${d.data.length} inspeções realizadas`, resumo: (d.resumo??[]).slice(0,8).map((r:any) => ({ label: r.tecnico, valor: `${r.total}`, pct: r.pct })), headers: ['Nº','Técnico','Resultado','Data Abertura','Data Fechamento','Local','Questionário'], rows: (d.data||[]).map((r:any) => [r.numero, r.tecnico?.nome??r.nomeAuditor??'—', r.resultado??'—', r.dataAbertura??'—', r.dataFechamento??'—', r.localidadeObjeto??'—', r.nomeQuestionario??'—']) }
        } else if (tipoSel === 'nao-confor') {
          const d = await getRelatorioNaoConformes(filtros)
          genOpts = { titulo: 'Itens Não Conformes', ...baseOpts, fileName: fn, totalTexto: `Total: ${d.data.length} apontamentos não conformes`, headers: ['Nº','Técnico','Resultado','Data Abertura','Data Fechamento','Local','Questionário','Observação'], rows: d.data.map((r:any) => [r.numero, r.tecnico, r.resultado, r.dataAbertura, r.dataFechamento, r.local, r.questionario, r.observacao]) }
        } else if (tipoSel === 'dss-pend') {
          const d = await getRelatorioDssPendentes(filtros)
          genOpts = { titulo: 'DSS Pendentes', ...baseOpts, fileName: fn, totalTexto: `Total: ${d.data.length} diálogos abertos`, headers: ['Nº Diálogo','Assunto','Líder','Base','Matrícula','Nome','Data Fechamento'], rows: d.data.map((r:any) => [r.numeroDialogo, r.assunto, r.lider, r.base, r.matricula, r.nome, r.dataFechamento]) }
        } else if (tipoSel === 'atrasados') {
          const d = await getRelatorioPlanejamentosAtrasados(filtros)
          genOpts = { titulo: 'Planejamentos Não Executados', ...baseOpts, fileName: fn, totalTexto: `Total: ${d.data.length} atividades atrasadas`, headers: ['Técnico','Data Prevista','Dias Atraso','Categoria','Prioridade','Local','Descrição'], rows: d.data.map((r:any) => [r.tecnico, r.data?.slice(0,10), `${r.diasAtraso} dias`, r.categoria, r.prioridade, r.local, r.descricao?.slice(0,80)]) }
        } else if (tipoSel === 'ausencias') {
          const d = await getRelatorioAusencias(filtros)
          genOpts = { titulo: 'Ausências em Reuniões', ...baseOpts, fileName: fn, totalTexto: `Total: ${d.data.length} ausências registradas`, headers: ['Técnico','Data','Assunto','Justificada','Motivo','Observação'], rows: d.data.map((r:any) => [r.tecnico, r.data?.slice(0,10), r.assunto, r.justificada, r.motivo, r.observacao]) }
        } else if (tipoSel === 'reunioes') {
          const d = await getRelatorioReunioes(filtros)
          genOpts = { titulo: 'Reuniões', ...baseOpts, fileName: fn, totalTexto: `Total: ${d.data.length} presenças/ausências computadas`, resumo: (d.resumo??[]).slice(0,8).map((r:any)=>({label:r.tecnico,valor:`${r.pctPresenca}%`,pct:r.pctPresenca})), headers: ['Técnico','Data','Assunto','Presença','Pontualidade','Justificada','Motivo'], rows: (d.data||[]).map((r:any)=>[r.tecnico?.nome??r.tecnico, r.data?.toISOString?.()?.slice(0,10)??r.data, r.assunto??'—', r.presenca, r.pontualidade, r.justificada, r.motivo??'—']) }
        } else if (tipoSel === 'km') {
          const d = await getRelatorioKm(filtros)
          genOpts = { titulo: 'Quilometragem', ...baseOpts, fileName: fn, totalTexto: `Total: ${d.data.length} viagens registradas`, resumo: (d.resumo??[]).slice(0,8).map((r:any)=>({label:r.tecnico,valor:`${Number(r.totalKm).toFixed(0)} km`})), headers: ['Técnico','Dia','Data Inicial','KM Inicial','Data Final','KM Final','Diferença'], rows: (d.data||[]).map((r:any)=>[r.tecnico?.nome??'—', r.diaSemana, r.dataInicial?.toISOString?.()?.slice(0,10)??r.dataInicial, r.kmInicial, r.dataFinal?r.dataFinal?.toISOString?.()?.slice(0,10)??r.dataFinal:'—', r.kmFinal??'—', r.diferenca??'—']) }
        } else if (tipoSel === 'atividades') {
          const d = await getRelatorioAtividadesCampo(filtros)
          genOpts = { titulo: 'Atividades de Campo', ...baseOpts, fileName: fn, totalTexto: `Total: ${d.data.length} atividades de campo executadas`, headers: ['Técnico','Data','Empresa','Projeto','Local','Cidade/UF','Descrição'], rows: d.data.map((r:any)=>[r.tecnico, r.data?.slice(0,10), r.empresa, r.projeto, r.local, r.cidadeUf, r.descricao?.slice(0,100)]) }
        } else if (tipoSel === 'ranking') {
          const d = await getRelatorioRanking(filtros)
          genOpts = { titulo: 'Ranking de Desempenho', ...baseOpts, fileName: fn, totalTexto: `Total: ${d.data.length} técnicos avaliados`, resumo: d.data.slice(0,8).map((r:any)=>({label:r.tecnico,valor:`${r.score}%`,pct:r.score})), headers: ['Pos.','Técnico','DSS','% DSS','Inspeções','% Insp.','Reuniões','% Pres.','Score'], rows: d.data.map((r:any,i:number)=>[`${i+1}º`,r.tecnico,r.dss,`${r.pctDss}%`,r.inspecoes,`${r.pctInsp}%`,r.reunioes,`${r.pctReunioes}%`,`${r.score}%`]) }
        } else if (tipoSel === 'produtividade') {
          const d = await getRelatorioProdutividadeDssInspecoes(filtros)
          const totalDss = d.data.reduce((acc: number, r: any) => acc + r.dss, 0)
          const totalInsp = d.data.reduce((acc: number, r: any) => acc + r.inspecoes, 0)
          const rows = d.data.map((r:any) => [r.tecnico, r.dss, r.inspecoes])
          genOpts = { titulo: 'Produtividade (DSS e Inspeções)', ...baseOpts, fileName: fn, totalTexto: `Total: ${d.data.length} técnicos consolidados`, headers: ['Técnico', 'DSS Realizados', 'Inspeções Realizadas'], rows, totaisGerais: [totalDss, totalInsp] }
        }

        if (genOpts) {
          if (formato === 'pdf' || formato === 'email') {
            const result = await gerarPdfCentral(genOpts)
            if (result?.base64) {
              if (formato === 'email') {
                const dest = tecnicos.find(t => t.id === destinatarioId)
                if (!dest || !dest.email) {
                  setErro('Técnico destinatário não possui e-mail cadastrado ou não foi selecionado.')
                  setExportando(null)
                  return
                }
                // Usa FormData (multipart) para evitar limite do JSON parser
                const base64Only = result.base64.includes('base64,') ? result.base64.split('base64,')[1] : result.base64
                const binaryStr = atob(base64Only)
                const bytes = new Uint8Array(binaryStr.length)
                for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
                const pdfBlob = new Blob([bytes], { type: 'application/pdf' })
                const fd = new FormData()
                fd.append('tecnicoEmail', dest.email)
                fd.append('fileName', result.fileName)
                fd.append('pdf', pdfBlob, result.fileName)
                const resp = await fetch('/api/email/enviar-pdf', { method: 'POST', body: fd })
                const res = await resp.json()
                if (!res.success) {
                  setErro(res.error || 'Erro ao enviar e-mail.')
                  setExportando(null)
                  return
                }
              } else {
                const a = document.createElement('a')
                a.href = result.base64; a.download = result.fileName
                document.body.appendChild(a); a.click(); document.body.removeChild(a)
              }
            }
          } else {
            await gerarExcelCentral(genOpts)
          }

          // Fechar modal automaticamente e mostrar sucesso
          setTipoSel(null)
          setTecnicoId('')
          setDataInicio(primeiroDiaMes())
          setDataFim(hoje())
          
          setSucesso(true)
          setTimeout(() => setSucesso(false), 3000)
        }
      } catch (e: any) {
        setErro(e?.message ?? 'Erro ao gerar relatório')
      } finally {
        setExportando(null)
      }
    })
  }

  const tipo = TIPOS.find(t => t.id === tipoSel)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,rgba(102,0,153,0.14),rgba(102,0,153,0.05))', border: '1px solid rgba(102,0,153,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarChart3 size={21} color={RED} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>Central de Relatórios</h1>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Selecione o tipo de relatório e configure os filtros</p>
        </div>
      </div>

      {/* Catálogo */}
      {GRUPOS.map(grupo => (
        <div key={grupo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{grupo}</span>
            <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {TIPOS.filter(t => t.grupo === grupo).map(t => {
              const Icon = t.icon
              const ativo = tipoSel === t.id
              return (
                <div key={t.id} onClick={() => abrirFiltros(t.id)}
                  style={{ background: ativo ? `${t.cor}10` : '#fff', border: `1.5px solid ${ativo ? t.cor : '#f1f5f9'}`, borderRadius: 12, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.18s', display: 'flex', alignItems: 'flex-start', gap: 12, boxShadow: ativo ? `0 4px 16px ${t.cor}20` : '0 1px 4px rgba(0,0,0,0.05)' }}
                  onMouseEnter={e => { if (!ativo) e.currentTarget.style.borderColor = t.cor + '80' }}
                  onMouseLeave={e => { if (!ativo) e.currentTarget.style.borderColor = '#f1f5f9' }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: `${t.cor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={t.cor} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ativo ? t.cor : '#1e293b', margin: '0 0 4px' }}>{t.label}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>{t.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Modal de Filtros */}
      {tipoSel && tipo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#660099', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <tipo.icon size={22} color="#fff" />
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#fff' }}>{tipo.label}</h2>
                  <p style={{ fontSize: 12, opacity: 0.8, margin: 0, color: '#fff' }}>Configurar filtros e exportar</p>
                </div>
              </div>
              <button onClick={() => setTipoSel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Técnico */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Técnico</label>
                  {tecLoading ? (
                    <div style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13 }}>
                      <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Carregando...
                    </div>
                  ) : (
                    <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b', background: '#fff', outline: 'none', cursor: 'pointer' }}>
                      <option value=''>Todos os técnicos</option>
                      {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Data Início */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data Início</label>
                    <input type='date' value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                  </div>

                  {/* Data Fim */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data Fim</label>
                    <input type='date' value={dataFim} onChange={e => setDataFim(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {erro && (
                <div style={{ marginTop: 18, padding: '12px 16px', borderRadius: 8, background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13, fontWeight: 500 }}>
                  {erro}
                </div>
              )}

              {/* Botões Normais */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24 }}>
                <button onClick={() => gerar('pdf')} disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 10, background: tipo.cor, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s' }}>
                  {loading && exportando === 'pdf' ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Download size={18} />}
                  Gerar PDF
                </button>
                <button onClick={() => gerar('excel')} disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 10, background: '#16a34a', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading && exportando === 'excel' ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileSpreadsheet size={18} />}
                  Gerar Excel
                </button>
              </div>

              {/* Área de E-mail (Só para Produtividade, ou disponível em todos) */}
              {tipoSel === 'produtividade' && (
                <div style={{ marginTop: 20, padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Mail size={14} /> Enviar PDF por E-mail
                  </label>
                  
                  <div style={{ display: 'flex', gap: 10 }}>
                    <select value={destinatarioId} onChange={e => {
                        const v = e.target.value
                        setDestinatarioId(v)
                        if (v) localStorage.setItem('tstDestinoEmailId', v)
                        else localStorage.removeItem('tstDestinoEmailId')
                      }}
                      style={{ flex: 1, padding: '12px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, color: '#1e293b', background: '#fff', outline: 'none', cursor: 'pointer' }}>
                      <option value=''>Selecione o TST Destino...</option>
                      {tecnicos.filter(t => !!t.email).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>

                    <button onClick={() => gerar('email')} disabled={loading || !destinatarioId} title="Enviar Teste Agora"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 20px', borderRadius: 8, background: '#1e293b', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: (loading || !destinatarioId) ? 'not-allowed' : 'pointer', opacity: (loading || !destinatarioId) ? 0.6 : 1 }}>
                      {loading && exportando === 'email' ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={16} />}
                      Enviar
                    </button>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={setarRecebedorAutomatico} disabled={loading || !destinatarioId}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 6, color: '#475569', fontSize: 12, fontWeight: 600, cursor: (loading || !destinatarioId) ? 'not-allowed' : 'pointer', opacity: (loading || !destinatarioId) ? 0.6 : 1 }}>
                      <Clock size={14} /> Salvar Recebedor (Todo 5º Dia Útil)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso */}
      {sucesso && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 360, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: '#16a34a15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <CheckCircle size={32} color="#16a34a" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0' }}>Sucesso!</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>A operação foi concluída com êxito.</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}
