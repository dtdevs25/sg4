const fs = require('fs');
const lines = fs.readFileSync('src/app/dashboard/dialogos/page.tsx', 'utf8').split('\n');
lines[157] = "            if (s !== 'sim' && s !== 'yes' && !s.includes('sim')) return false\r";
fs.writeFileSync('src/app/dashboard/dialogos/page.tsx', lines.join('\n'));
