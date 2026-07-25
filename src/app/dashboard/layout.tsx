import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const role = (session?.user as any)?.role

  return (
    <SessionProvider session={session}>
      {/* Wrapper que ocupa toda a tela */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F8FAFC' }}>

        {/* Header fixo — fica por cima de tudo */}
        <Header role={role} />

        {/* Área abaixo do header: sidebar + conteúdo */}
        <div style={{ display: 'flex', flex: 1, marginTop: 80, overflow: 'hidden' }}>
          {role !== 'CLIENTE_APR' && <Sidebar />}
          <main style={{ flex: 1, overflowY: 'auto', background: '#F8FAFC' }}>
            <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: role === 'CLIENTE_APR' ? '100%' : 1600, margin: '0 auto' }}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
