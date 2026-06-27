const fs = require('fs')
const file = 'src/app/dashboard/dialogos/page.tsx'
let content = fs.readFileSync(file, 'utf8')

// 1. Imports
content = content.replace(
  "import { getDssArkium, upsertDssArkiumBatch, updateEstadoDssArkium, limparDssArkiumInvalidos, deleteDssArkium } from '@/app/actions/dssArkium'",
  "import { getDssArkium, upsertDssArkiumBatch, updateEstadoDssArkium, limparDssArkiumInvalidos, deleteDssArkium } from '@/app/actions/dssArkium'\nimport { getDssAliados, deleteDssAliado } from '@/app/actions/dssAliado'"
)

// 2. Type ArkiumDSSItem
content = content.replace(
  "  estado: 'ABERTO' | 'FECHADO'\n  dbTecnico?: any\n}",
  "  estado: 'ABERTO' | 'FECHADO'\n  dbTecnico?: any\n  isAliado?: boolean\n  fotoUrl?: string\n}"
)

// 3. loadData Promise.all
content = content.replace(
  "    const [anos, tecRes, atvRes, arkRes] = await Promise.all([\n      getAnosComDados(),\n      getTecnicos(),\n      getAtividades('DSS'),\n      getDssArkium()\n    ])",
  "    const [anos, tecRes, atvRes, arkRes, aliadoRes] = await Promise.all([\n      getAnosComDados(),\n      getTecnicos(),\n      getAtividades('DSS'),\n      getDssArkium(),\n      getDssAliados()\n    ])"
)

// 4. arkiumList Mapping
content = content.replace(
  "      const atividades = atvRes.success && atvRes.data ? atvRes.data : []\n      const arkiumList = arkRes.success && arkRes.data ? arkRes.data : []",
  "      const atividades = atvRes.success && atvRes.data ? atvRes.data : []\n      let arkiumList = arkRes.success && arkRes.data ? arkRes.data : []\n      const aliados = aliadoRes || []\n\n      const aliadosMapped = aliados.map((a: any) => {\n        const jsDate = new Date(a.data)\n        const dateStr = \\/\/\\\n        return {\n          id: a.id,\n          nome: a.tecnico?.nome || 'Desconhecido',\n          dataFechamento: dateStr,\n          assinado: 'SIM',\n          numeroDialogo: 'ALIADO-' + a.id.substring(0,6).toUpperCase(),\n          assunto: a.tema || 'DSS com Aliado',\n          lider: 'DSS Aliado',\n          base: '-',\n          uf: '-',\n          localidade: '-',\n          matricula: 'N/A',\n          tipo: 'Aliado',\n          statusDSS: 'Realizado',\n          justificativa: '',\n          estado: 'FECHADO',\n          dbTecnico: a.tecnico,\n          isAliado: true,\n          fotoUrl: a.fotoUrl\n        }\n      })\n      arkiumList = [...arkiumList, ...aliadosMapped]"
)

// 5. tecArkium.filter bypass for Aliado
content = content.replace(
  "        const tecArkium = arkiumList.filter((a: any) => {\n          if (!a.nome || !t.nome) return false\n          const removeAccents = (str: string) => str.normalize(\"NFD\").replace(/[\\u0300-\\u036f]/g, \"\")",
  "        const tecArkium = arkiumList.filter((a: any) => {\n          if (a.isAliado) return a.dbTecnico?.id === t.id\n          if (!a.nome || !t.nome) return false\n          const removeAccents = (str: string) => str.normalize(\"NFD\").replace(/[\\u0300-\\u036f]/g, \"\")"
)

// 6. fromDb mapping loop
content = content.replace(
  "      if (arkiumList.length > 0) {\n        const fromDb: ArkiumDSSItem[] = arkiumList.map((r: any) => {\n          const dbTecnico = newData.find((t: any) => {",
  "      if (arkiumList.length > 0) {\n        const fromDb: ArkiumDSSItem[] = arkiumList.map((r: any) => {\n          if (r.isAliado) {\n            return {\n              id: r.id,\n              assunto: r.assunto,\n              numeroDialogo: r.numeroDialogo,\n              lider: r.lider,\n              base: r.base,\n              uf: r.uf,\n              localidade: r.localidade,\n              dataFechamento: r.dataFechamento,\n              matricula: r.matricula,\n              nome: r.nome,\n              tipo: r.tipo,\n              statusDSS: r.statusDSS,\n              assinado: r.assinado,\n              justificativa: r.justificativa,\n              estado: r.estado as 'ABERTO' | 'FECHADO',\n              dbTecnico: r.dbTecnico,\n              isAliado: true,\n              fotoUrl: r.fotoUrl\n            }\n          }\n          const dbTecnico = newData.find((t: any) => {"
)

// 7. handleDeleteArkium
content = content.replace(
  "  async function handleDeleteArkium(id: string) {\n    const res = await deleteDssArkium(id)\n    if (res.success) {\n      setArkiumData(prev => prev.filter(a => a.id !== id))\n    } else {\n      alert(\"Erro ao excluir registro.\")\n    }\n    setDeleteArkiumConfirmId(null)\n    loadData()\n  }",
  "  async function handleDeleteArkium(id: string) {\n    const item = arkiumData.find(a => a.id === id)\n    let res;\n    if (item?.isAliado) {\n      res = await deleteDssAliado(id)\n    } else {\n      res = await deleteDssArkium(id)\n    }\n    if (res.success) {\n      setArkiumData(prev => prev.filter(a => a.id !== id))\n    } else {\n      alert(\"Erro ao excluir registro.\")\n    }\n    setDeleteArkiumConfirmId(null)\n    loadData()\n  }"
)

// 8. fotoUrl in treat modal
content = content.replace(
  "                {treatingItem.estado === 'ABERTO' ? (",
  "                {treatingItem.fotoUrl && (\n                  <div style={{ marginTop: 12, marginBottom: 12 }}>\n                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Evidência (Lista de Presença)</label>\n                    <a href={treatingItem.fotoUrl} target=\"_blank\" rel=\"noopener noreferrer\" style={{ display: 'block', border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>\n                      <img src={treatingItem.fotoUrl} alt=\"Evidência DSS Aliado\" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 300, background: '#f8fafc' }} />\n                    </a>\n                  </div>\n                )}\n                {treatingItem.estado === 'ABERTO' ? ("
)

fs.writeFileSync(file, content)
console.log('OK!')
