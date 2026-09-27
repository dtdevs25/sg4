import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Importar somente no client — o useChat do AI SDK não funciona no SSR
const ChatRevisor = dynamic(() => import('./ChatRevisor'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 80px)', flexDirection: 'column', gap: 12, color: '#64748b' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#660099' }} />
      <span style={{ fontSize: 14 }}>Carregando Revisor IA...</span>
    </div>
  )
})

export default function RevisorIAPage() {
  return <ChatRevisor />
}
