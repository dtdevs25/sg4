'use client'

import { useState } from 'react'
import { Brain, Upload, Loader2, Sparkles } from 'lucide-react'

export default function RevisorIAPage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ background: 'rgba(59,130,246,0.1)', padding: 12, borderRadius: 12, color: '#3b82f6' }}>
          <Brain size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0 }}>Revisor IA</h1>
          <p style={{ color: '#64748b', margin: 0, marginTop: 4 }}>
            Faça upload do seu documento (APR, Investigação, etc.) e a IA irá revisá-lo com base nos procedimentos da empresa.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ border: '2px dashed #cbd5e1', borderRadius: 16, padding: 40, textAlign: 'center', background: '#f8fafc' }}>
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#64748b' }}>
            <div style={{ background: '#e2e8f0', padding: 16, borderRadius: '50%', color: '#64748b' }}>
              <Upload size={32} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#334155' }}>
              Interface do Revisor IA em construção...
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
