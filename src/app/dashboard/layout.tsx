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
      <div className="flex flex-col h-screen bg-[#F8FAFC] pt-[80px]">

        {/* Header fixo — fica por cima de tudo */}
        <Header />

        {/* Área abaixo do header: sidebar + conteúdo */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
            <div className="p-[16px] md:p-[2rem] max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
