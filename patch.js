const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/quilometragem/page.tsx', 'utf8');

// 1. Add format helpers
const formatHelpers = `
  const formatKmStr = (val) => {
    if (!val) return '';
    const digits = val.replace(/\\D/g, '')
    if (!digits) return ''
    return parseInt(digits, 10).toLocaleString('pt-BR')
  }

  const formatCurrencyStr = (val) => {
    if (!val) return '';
    const digits = val.replace(/\\D/g, '')
    if (!digits) return ''
    return (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }

  const parseFormattedNumber = (val) => {
    if (!val) return 0
    return parseFloat(val.toString().replace(/\\./g, '').replace(',', '.'))
  }
`;

content = content.replace('export default function QuilometragemPage() {', 'export default function QuilometragemPage() {\n' + formatHelpers);

// 2. Change state selectedYear to accept string 'ALL'
content = content.replace('const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())', "const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(new Date().getFullYear())");

// 3. Update the select dropdown to include Todos os Anos
content = content.replace(
  "<select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} style={{ border: 'none', background: 'transparent', fontWeight: 800, fontSize: 16, color: '#1e293b', outline: 'none', cursor: 'pointer' }}>",
  "<select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))} style={{ border: 'none', background: 'transparent', fontWeight: 800, fontSize: 16, color: '#1e293b', outline: 'none', cursor: 'pointer' }}>\n<option value=\"ALL\">Todos os Anos</option>"
);

// 4. Fix backend calls to pass undefined when 'ALL'
content = content.replace(/getQuilometragens\(selectedYear\)/g, "getQuilometragens(selectedYear === 'ALL' ? undefined : selectedYear)");
content = content.replace(/getAbastecimentos\(selectedYear\)/g, "getAbastecimentos(selectedYear === 'ALL' ? undefined : selectedYear)");
content = content.replace(/getManutencoes\(selectedYear\)/g, "getManutencoes(selectedYear === 'ALL' ? undefined : selectedYear)");

// 5. Replace parseFloat with parseFormattedNumber in all submit handlers
content = content.replace(/parseFloat\(formStart\.kmInicial\)/g, 'parseFormattedNumber(formStart.kmInicial)');
content = content.replace(/parseFloat\(formEnd\.kmFinal\)/g, 'parseFormattedNumber(formEnd.kmFinal)');
content = content.replace(/parseFloat\(formAbs\.valor\)/g, 'parseFormattedNumber(formAbs.valor)');
content = content.replace(/parseFloat\(formEditKm\.kmInicial\)/g, 'parseFormattedNumber(formEditKm.kmInicial)');
content = content.replace(/parseFloat\(formEditKm\.kmFinal\)/g, 'parseFormattedNumber(formEditKm.kmFinal)');
content = content.replace(/parseFloat\(formEditAbs\.valor\)/g, 'parseFormattedNumber(formEditAbs.valor)');
content = content.replace(/parseFloat\(formMaint\.kmManutencao\)/g, 'parseFormattedNumber(formMaint.kmManutencao)');

// 6. Fix the input fields formatting
content = content.replace(/type="number" step="0\.1" required value=\{formStart\.kmInicial\} onChange=\{\(e\) => setFormStart\(p => \(\{\.\.\.p, kmInicial: e\.target\.value\}\)\)\}/g, 'type="text" required value={formStart.kmInicial} onChange={(e) => setFormStart(p => ({...p, kmInicial: formatKmStr(e.target.value)}))}');
content = content.replace(/type="number" step="0\.1" required value=\{formEnd\.kmFinal\} onChange=\{\(e\) => setFormEnd\(p => \(\{\.\.\.p, kmFinal: e\.target\.value\}\)\)\}/g, 'type="text" required value={formEnd.kmFinal} onChange={(e) => setFormEnd(p => ({...p, kmFinal: formatKmStr(e.target.value)}))}');
content = content.replace(/type="number" step="0\.01" required value=\{formAbs\.valor\} onChange=\{\(e\) => setFormAbs\(p => \(\{\.\.\.p, valor: e\.target\.value\}\)\)\}/g, 'type="text" required value={formAbs.valor} onChange={(e) => setFormAbs(p => ({...p, valor: formatCurrencyStr(e.target.value)}))}');
content = content.replace(/type="number" step="0\.1" required value=\{formEditKm\.kmInicial\} onChange=\{\(e\) => setFormEditKm\(p => \(\{\.\.\.p, kmInicial: e\.target\.value\}\)\)\}/g, 'type="text" required value={formEditKm.kmInicial} onChange={(e) => setFormEditKm(p => ({...p, kmInicial: formatKmStr(e.target.value)}))}');
content = content.replace(/type="number" step="0\.1" value=\{formEditKm\.kmFinal\} onChange=\{\(e\) => setFormEditKm\(p => \(\{\.\.\.p, kmFinal: e\.target\.value\}\)\)\}/g, 'type="text" value={formEditKm.kmFinal} onChange={(e) => setFormEditKm(p => ({...p, kmFinal: formatKmStr(e.target.value)}))}');
content = content.replace(/type="number" step="0\.01" required value=\{formEditAbs\.valor\} onChange=\{\(e\) => setFormEditAbs\(p => \(\{\.\.\.p, valor: e\.target\.value\}\)\)\}/g, 'type="text" required value={formEditAbs.valor} onChange={(e) => setFormEditAbs(p => ({...p, valor: formatCurrencyStr(e.target.value)}))}');
content = content.replace(/type="number" step="0\.1" required value=\{formMaint\.kmManutencao\} onChange=\{\(e\) => setFormMaint\(p => \(\{\.\.\.p, kmManutencao: e\.target\.value\}\)\)\}/g, 'type="text" required value={formMaint.kmManutencao} onChange={(e) => setFormMaint(p => ({...p, kmManutencao: formatKmStr(e.target.value)}))}');

fs.writeFileSync('src/app/dashboard/quilometragem/page.tsx', content);
console.log('Feito');
