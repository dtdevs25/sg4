const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/quilometragem/page.tsx', 'utf8');

// 1. Fix state selectedYear
content = content.replace(
  "const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())",
  "const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(new Date().getFullYear())"
);

// 2. Fix the select element for year
content = content.replace(
  "<select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none' }}>",
  "<select value={selectedYear} onChange={e => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#334155', outline: 'none' }}>\n              <option value=\"ALL\">Todos os Anos</option>"
);

// 3. Add camera refs for maint
content = content.replace(
  "const fileInputRefAbsGal = useRef<HTMLInputElement>(null)",
  "const fileInputRefAbsGal = useRef<HTMLInputElement>(null)\n  const fileInputRefMaintCam = useRef<HTMLInputElement>(null)\n  const fileInputRefMaintGal = useRef<HTMLInputElement>(null)"
);

// 4. Update the photo inputs in the maintenance modal
const oldMaintInputs = `                <input type="file" accept="image/*" id="maintPhotoInput" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setFormMaint(p => ({ ...p, fotoBase64: ev.target?.result as string, fileName: file.name, contentType: file.type }));
                    };
                    reader.readAsDataURL(file);
                  }
                }} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => document.getElementById('maintPhotoInput')?.click()} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px dashed #64748b', background: '#f8fafc', color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <UploadCloud size={16} /> Anexar da Galeria
                  </button>
                </div>
                {formMaint.fileName && <div style={{ marginTop: 8, fontSize: 12, color: '#10b981', fontWeight: 600 }}>{formMaint.fileName} selecionado</div>}`;

const newMaintInputs = `                <input type="file" accept="image/*" capture="environment" ref={fileInputRefMaintCam} onChange={(e) => handleFileChange(e, setFormMaint)} style={{ display: 'none' }} />
                <input type="file" accept="image/*" ref={fileInputRefMaintGal} onChange={(e) => handleFileChange(e, setFormMaint)} style={{ display: 'none' }} />
                
                {formMaint.fotoBase64 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)' }}>
                      <ImageIcon color="#10b981" size={20} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46', display: 'block' }}>Imagem Anexada</span>
                        <span style={{ fontSize: 11, color: '#10b981', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{formMaint.fileName}</span>
                      </div>
                      <button type="button" onClick={() => setFormMaint(p => ({...p, fotoBase64: '', fileName: '', contentType: ''}))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => fileInputRefMaintCam.current?.click()} style={{ flex: 1, padding: '12px 8px', borderRadius: 8, border: '2px dashed #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Camera size={20} /> Tirar Foto
                    </button>
                    <button type="button" onClick={() => fileInputRefMaintGal.current?.click()} style={{ flex: 1, padding: '12px 8px', borderRadius: 8, border: '2px dashed #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <UploadCloud size={20} /> Galeria
                    </button>
                  </div>
                )}`;

content = content.replace(oldMaintInputs, newMaintInputs);

fs.writeFileSync('src/app/dashboard/quilometragem/page.tsx', content);
console.log('Feito patch2');
