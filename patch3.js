const fs = require('fs');

// 1. Dashboard Rename
let dashboardPath = 'src/app/dashboard/page.tsx';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
dashboardContent = dashboardContent.replace(
  '<option value="">Geral (Todos os Anos)</option>',
  '<option value="">Todos os Anos</option>'
);
fs.writeFileSync(dashboardPath, dashboardContent);

// 2. Reunioes
let reunioesPath = 'src/app/dashboard/reunioes/page.tsx';
let reunioesContent = fs.readFileSync(reunioesPath, 'utf8');
reunioesContent = reunioesContent.replace(
  'const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())',
  "const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(new Date().getFullYear())"
);
reunioesContent = reunioesContent.replace(
  'getReunioes(selectedYear),',
  "getReunioes(selectedYear === 'ALL' ? undefined : selectedYear),"
);
reunioesContent = reunioesContent.replace(
  'getAtas(selectedYear)',
  "getAtas(selectedYear === 'ALL' ? undefined : selectedYear)"
);
reunioesContent = reunioesContent.replace(
  "<select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none' }}>",
  "<select value={selectedYear} onChange={e => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none' }}>\n                <option value=\"ALL\">Todos os Anos</option>"
);
fs.writeFileSync(reunioesPath, reunioesContent);

// 3. Relatorios
let relatoriosPath = 'src/app/dashboard/relatorios/page.tsx';
let relatoriosContent = fs.readFileSync(relatoriosPath, 'utf8');
relatoriosContent = relatoriosContent.replace(
  'const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())',
  "const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(new Date().getFullYear())"
);
relatoriosContent = relatoriosContent.replace(
  'const promises = Array.from({ length: 12 }).map((_, i) => getAtividadesRelatorio(i + 1, selectedYear))',
  "const promises = Array.from({ length: 12 }).map((_, i) => getAtividadesRelatorio(i + 1, selectedYear === 'ALL' ? undefined : selectedYear))"
);
relatoriosContent = relatoriosContent.replace(
  "<select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none', cursor: 'pointer' }}>",
  "<select value={selectedYear} onChange={e => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none', cursor: 'pointer' }}>\n              <option value=\"ALL\">Todos os Anos</option>"
);
fs.writeFileSync(relatoriosPath, relatoriosContent);

console.log('Feito patch3');
