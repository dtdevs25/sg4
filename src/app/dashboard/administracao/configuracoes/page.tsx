'use client'

import { useState, useEffect, useTransition } from 'react'
import { Settings, ShieldAlert, Save, Loader2, Info } from 'lucide-react'
import { getConfiguracaoGlobal, updateConfiguracaoGlobal } from '@/app/actions/config'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function ConfiguracoesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  
  const [permitirUpload, setPermitirUpload] = useState(true)

  useEffect(() => {
    if (session?.user && (session.user as any).role !== 'MASTER' && (session.user as any).role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }

    async function load() {
      const res = await getConfiguracaoGlobal()
      if (res.success && res.data) {
        setPermitirUpload(res.data.permitirUploadFotoKm)
      }
      setLoading(false)
    }
    load()
  }, [session, router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await updateConfiguracaoGlobal({ permitirUploadFotoKm: permitirUpload })
      if (res.success) {
        alert('Configurações salvas com sucesso!')
      } else {
        alert('Erro ao salvar: ' + res.error)
      }
    })
  }

  if (loading) {
    return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" size={32} color="#660099" /></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      <div style={{
        background: '#fff', borderRadius: 10, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings color="#660099" size={22} /> Configurações Globais
        </h1>
      </div>

      <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: 24 }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={18} color="#f59e0b" /> Restrições de Quilometragem
            </h2>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={permitirUpload} 
                  onChange={(e) => setPermitirUpload(e.target.checked)}
                  style={{ marginTop: 4, cursor: 'pointer', width: 16, height: 16, accentColor: '#660099' }}
                />
                <div>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#334155' }}>
                    Permitir upload de fotos da galeria
                  </span>
                  <span style={{ display: 'block', fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                    Se desmarcado, os técnicos não poderão enviar fotos da galeria para o odômetro e comprovantes de abastecimento/manutenção. Eles serão obrigados a tirar a foto na hora usando a câmera do dispositivo, que também carimbará os dados de geolocalização e horário na imagem.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={pending} style={{ background: '#660099', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
