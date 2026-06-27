const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/dialogos/page.tsx', 'utf8');

// 1. Inject admissaoData
content = content.replace(
  "const result: any = { id: t.id, nome: t.nome, fotoUrl: t.fotoUrl, admissao: t.admissao ? new Date(t.admissao).toLocaleDateString('pt-BR') : '--', ativo: t.ativo, contaMeta: t.contaMeta }",
  "const result: any = { id: t.id, nome: t.nome, fotoUrl: t.fotoUrl, admissao: t.admissao ? new Date(t.admissao).toLocaleDateString('pt-BR') : '--', admissaoData: t.admissao, ativo: t.ativo, contaMeta: t.contaMeta }"
);

// 2. Inject helper function & update totalMeta
const totalMetaRegex = /const totalMeta = filtered\.filter\(t => t\.contaMeta !== false\)\.length \* targetMeta \* \(selectedMonths\.length \|\| 1\)/;
const replacementFunc = \unction getActiveMonthsForMeta(t: any, selMonths: MesKey[], selYear: number | 'ALL'): number {
    if (t.contaMeta === false) return 0;
    if (selYear === 'ALL') return selMonths.length || 1;
    if (!t.admissaoData) return selMonths.length || 1;
    
    const admDate = new Date(t.admissaoData);
    const admYear = admDate.getUTCFullYear();
    const admMonth = admDate.getUTCMonth();
    
    const mesIdx: Record<MesKey, number> = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
    
    let count = 0;
    selMonths.forEach(m => {
      const mIdx = mesIdx[m];
      if (selYear > admYear) {
        count++;
      } else if (selYear === admYear && mIdx >= admMonth) {
        count++;
      }
    });
    return count;
  }
  
  const totalMeta = filtered.reduce((sum, t) => sum + (targetMeta * getActiveMonthsForMeta(t, selectedMonths, selectedYear)), 0)\;

content = content.replace(totalMetaRegex, replacementFunc);

// 3. Update table row meta
const rowMetaRegex = /const meta = t\.contaMeta === false \? 0 : targetMeta \* \(selectedMonths\.length \|\| 1\)/g;
content = content.replace(rowMetaRegex, "const meta = targetMeta * getActiveMonthsForMeta(t, selectedMonths, selectedYear)");

fs.writeFileSync('src/app/dashboard/dialogos/page.tsx', content);
