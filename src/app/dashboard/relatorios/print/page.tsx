'use client'

import { useEffect, useState } from 'react'
import { getAtividadesForPrint } from '@/app/actions/relatorios'

export default function PrintRelatorioPage({ searchParams }: { searchParams: { mes: string, ano: string, empresa: string, tecnicoId?: string } }) {
  const [atividades, setAtividades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const mes = parseInt(searchParams.mes)
    const ano = parseInt(searchParams.ano)
    const data = await getAtividadesForPrint(mes, ano, searchParams.empresa, searchParams.tecnicoId)
    setAtividades(data)
    setLoading(false)
  }

  useEffect(() => {
    if (!loading && atividades) {
      setTimeout(() => {
        window.print()
      }, 1000)
    }
  }, [loading, atividades])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>Carregando relatório para impressão...</div>
  }

  const mesAno = new Date(parseInt(searchParams.ano), parseInt(searchParams.mes) - 1).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
  const projeto = atividades.length > 0 ? atividades[0].projeto : '-'
  const elaborador = atividades.length > 0 ? atividades[0].tecnico?.nome : '-'

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background: #fff;
            color: #000;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
        body {
          font-family: Arial, sans-serif;
          background: #f1f5f9;
          margin: 0;
          padding: 0;
        }
        .a4-container {
          background: #fff;
          width: 210mm;
          min-height: 297mm;
          margin: 20px auto;
          padding: 15mm;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          box-sizing: border-box;
        }
        @media print {
          .a4-container {
            margin: 0;
            padding: 0;
            box-shadow: none;
            width: 100%;
          }
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        th, td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
          vertical-align: middle;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
          text-align: center;
        }
        .header-table td {
          padding: 4px;
        }
        .info-row {
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .footer-legenda {
          margin-top: 20px;
          border: 1px solid #000;
          padding: 10px;
          font-size: 11px;
        }
      `}} />

      <div className="no-print" style={{ textAlign: 'center', padding: 16, background: '#1e293b', color: '#fff' }}>
        <button onClick={() => window.print()} style={{ padding: '8px 16px', fontSize: 16, cursor: 'pointer', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6 }}>Imprimir Manualmente</button>
      </div>

      <div className="a4-container">
        {/* HEADER */}
        <table className="header-table" style={{ marginBottom: 12 }}>
          <tbody>
            <tr>
              <td style={{ width: '20%', textAlign: 'center', verticalAlign: 'middle' }}>
                <img src="/logo.png" alt="SG4" style={{ maxHeight: 50, maxWidth: '100%' }} />
              </td>
              <td style={{ width: '60%', textAlign: 'center', fontSize: 16, fontWeight: 'bold' }}>
                PROCEDIMENTO TÉCNICO E GERENCIAL<br/><br/>
                RELATÓRIO DE ATIVIDADES
              </td>
              <td style={{ width: '20%', padding: 0 }}>
                <table style={{ border: 'none', width: '100%', height: '100%' }}>
                  <tbody>
                    <tr><td style={{ border: 'none', borderBottom: '1px solid #000', padding: 4 }}>Revisão: 00</td></tr>
                    <tr><td style={{ border: 'none', borderBottom: '1px solid #000', padding: 4 }}>Data: {mesAno}</td></tr>
                    <tr><td style={{ border: 'none', padding: 4 }}>Página: 1</td></tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* INFO */}
        <div style={{ border: '1px solid #000', padding: 6, marginBottom: 16 }}>
          <div className="info-row">Empresa: {searchParams.empresa}</div>
          <div className="info-row" style={{ display: 'flex', gap: 40 }}>
            <span>Projeto: {projeto}</span>
            <span>Data: {mesAno}</span>
            <span>Elaborador: {elaborador}</span>
          </div>
        </div>

        {/* TABLE OF ACTIVITIES */}
        <table>
          <thead>
            <tr>
              <th style={{ width: '10%' }}>DATA</th>
              <th style={{ width: '15%' }}>LOCAL</th>
              <th style={{ width: '15%' }}>CIDADE/ UF</th>
              <th style={{ width: '20%' }}>REGISTRO (FOTO)</th>
              <th style={{ width: '40%' }}>ATIVIDADE</th>
            </tr>
          </thead>
          <tbody>
            {atividades?.map((ativ: any, idx: number) => (
              <tr key={ativ.id}>
                <td style={{ textAlign: 'center' }}>{new Date(ativ.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                <td>{ativ.local}</td>
                <td>{ativ.cidadeUf}</td>
                <td style={{ textAlign: 'center' }}>
                  {ativ.fotoUrl ? (
                    <img src={ativ.fotoUrl} alt="Registro" style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }} />
                  ) : 'NA'}
                </td>
                <td style={{ textAlign: 'justify' }}>{ativ.descricao}</td>
              </tr>
            ))}
            {atividades.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Nenhuma atividade registrada para esta empresa no mês selecionado.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* FOOTER */}
        <div className="footer-legenda">
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>LEGENDA: C - Conforme / NC - Não Conforme / NA - Não se Aplica</div>
          
          <table style={{ border: 'none', width: '100%', marginBottom: 16 }}>
            <tbody>
              <tr>
                <td style={{ border: 'none', width: '80%' }}>1. As informações contidas neste relatório são verdadeiras?</td>
                <td style={{ border: 'none', width: '20%' }}>( X ) C &nbsp;&nbsp;&nbsp; (  ) NC</td>
              </tr>
              <tr>
                <td style={{ border: 'none' }}>2. As atividades foram realizadas conforme procedimentos?</td>
                <td style={{ border: 'none' }}>( X ) C &nbsp;&nbsp;&nbsp; (  ) NC</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center', width: '40%' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: 4, minHeight: 20 }}></div>
              <div>Assinatura Elaborador</div>
            </div>
            <div style={{ textAlign: 'center', width: '20%' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: 4, minHeight: 20 }}></div>
              <div>Data</div>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
