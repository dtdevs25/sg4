import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <SessionProvider session={session}>
      {/* Wrapper que ocupa toda a tela */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F8FAFC' }}>

        {/* Header fixo — fica por cima de tudo */}
        <Header />

        {/* Área abaixo do header: sidebar + conteúdo */}
        <div style={{ display: 'flex', flex: 1, marginTop: 80, overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ flex: 1, overflowY: 'auto', background: '#F8FAFC' }}>
            <div style={{ padding: '2rem', maxWidth: 1600, margin: '0 auto' }}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
