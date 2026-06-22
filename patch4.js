const fs = require('fs');

const filesToPatch = [
  'src/app/dashboard/quilometragem/page.tsx',
  'src/app/dashboard/reunioes/page.tsx',
  'src/app/dashboard/relatorios/page.tsx',
  'src/app/dashboard/dialogos/page.tsx',
  'src/app/dashboard/inspecoes/page.tsx'
];

filesToPatch.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Add import if not exists
  if (!content.includes('getAnosComDados')) {
    content = content.replace(
      /import \{ getTecnicos \}/,
      "import { getAnosComDados } from '@/app/actions/anos'\nimport { getTecnicos }"
    );
    // fallback if getTecnicos is missing
    if (!content.includes('getAnosComDados')) {
      content = content.replace(
        /import \{ useState/,
        "import { getAnosComDados } from '@/app/actions/anos'\nimport { useState"
      );
    }
  }

  // Add state if not exists
  if (!content.includes('anosDisponiveis')) {
    content = content.replace(
      /const \[selectedYear, setSelectedYear\]/,
      "const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([new Date().getFullYear()])\n  const [selectedYear, setSelectedYear]"
    );
  }

  // Inject getAnosComDados() into useEffect / loadData
  // Most pages have `async function loadData() {`
  if (!content.includes('setAnosDisponiveis(')) {
    content = content.replace(
      /async function loadData\(\) \{/,
      "async function loadData() {\n    const anos = await getAnosComDados()\n    setAnosDisponiveis(anos)"
    );
    
    // In relatorios, they don't have loadData(), they have `useEffect(() => { async function fetchData() {`
    if (!content.includes('setAnosDisponiveis(')) {
      content = content.replace(
        /async function fetchData\(\) \{/,
        "async function fetchData() {\n      const anos = await getAnosComDados()\n      setAnosDisponiveis(anos)"
      );
    }
  }

  // Replace hardcoded options with dynamic map
  const optionRegex = /<option value=\{?2024\}?>2024<\/option>\s*<option value=\{?2025\}?>2025<\/option>\s*<option value=\{?2026\}?>2026<\/option>/g;
  content = content.replace(optionRegex, "{anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}");

  fs.writeFileSync(file, content);
  console.log('Patched', file);
});
