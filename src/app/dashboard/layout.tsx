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
      <div className="min-h-screen bg-[#F8FAFC] font-sans">
        {/* Fixed full-width header */}
        <Header />

        {/* Body: sidebar + main, offset by header height */}
        <div className="flex pt-20 h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-[#F8FAFC] scrollbar-hide">
            <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
