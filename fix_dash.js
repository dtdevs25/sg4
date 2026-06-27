const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

c = c.replace(
  "import { getInspecoesArkium } from '@/app/actions/inspecoesArkium'",
  "import { getInspecoesArkium } from '@/app/actions/inspecoesArkium'\nimport { getDssAliados } from '@/app/actions/dssAliado'"
);

c = c.replace(
  /if \(s\.includes\('não'\) \|\| s\.includes\('nao'\) \|\| s\.includes\('pendente'\)\) return false\s*return true/,
  "if (s !== 'sim' && s !== 'yes' && !s.includes('sim')) return false\n  return true"
);

c = c.replace(
  /getAtividadesRelatorio\(\)\s*\]\)/,
  "getAtividadesRelatorio(),\n          getDssAliados()\n        ])"
);

c = c.replace(
  /const \[ativRes, tecRes, kmRes, dssRes, inspRes, relRes\] = await Promise\.all/,
  "const [ativRes, tecRes, kmRes, dssRes, inspRes, relRes, aliadoRes] = await Promise.all"
);

c = c.replace(
  /if \(dssRes\.success\) setDssArkiumDb\(dssRes\.data \|\| \[\]\)/,
  \if (dssRes.success) {
          const arkList = dssRes.data || [];
          const aliList = aliadoRes || [];
          const aliMapped = aliList.map(a => {
            const jsDate = new Date(a.data);
            const dateStr = \\\\/\/\\\\;
            return { id: a.id, assinado: 'SIM', dataFechamento: dateStr, tecnico: a.tecnico, isAliado: true };
          });
          setDssArkiumDb([...arkList, ...aliMapped]);
        }\
);

const helperStr = \
  function getActiveMonthsForMetaDashboard(t: any, selMesesObj: string[], selYear: string): number {
    if (t.contaMeta === false) return 0
    const numYears = selYear ? 1 : (ANOS.length || 1)
    const selMonthsCount = selMesesObj.length > 0 ? selMesesObj.length : 12

    if (!selYear) return selMonthsCount * numYears

    if (!t.admissao) return selMonthsCount

    const admDate = new Date(t.admissao)
    const admYear = admDate.getUTCFullYear()
    const admMonth = admDate.getUTCMonth()

    const mesIdx: Record<string, number> = { Jan: 0, Fev: 1, Mar: 2, Abr: 3, Mai: 4, Jun: 5, Jul: 6, Ago: 7, Set: 8, Out: 9, Nov: 10, Dez: 11 }

    let count = 0
    const monthsToIterate = selMesesObj.length > 0 ? selMesesObj : Object.keys(mesIdx)
    const targetYear = parseInt(selYear, 10)

    monthsToIterate.forEach(m => {
      const mIdx = mesIdx[m]
      if (targetYear > admYear) {
        count++
      } else if (targetYear === admYear && mIdx >= admMonth) {
        count++
      }
    })
    return count
  }
\;

c = c.replace(
  /const metaDssTotal = nTecnicos \* META_DSS_POR_TEC \* numMeses \* numYears\s*const metaInspTotal = nTecnicos \* META_INSP_POR_TEC \* numMeses \* numYears/,
  helperStr + \
  const activeTecnicos = isConectadoTst 
    ? [tecnicosDb.find(t => t.nome === tecnicoConectado?.nome)].filter(Boolean) 
    : tecnicosDb.filter(t => t.ativo && t.contaMeta !== false);
  
  const totalMesesMeta = activeTecnicos.reduce((sum, t) => sum + getActiveMonthsForMetaDashboard(t, meses, ano), 0);
  const metaDssTotal = totalMesesMeta * META_DSS_POR_TEC;
  const metaInspTotal = totalMesesMeta * META_INSP_POR_TEC;
\
);

fs.writeFileSync('src/app/dashboard/page.tsx', c);
