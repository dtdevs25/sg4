import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { frotaWebBloqueadaParaRole } from '@/lib/frotaWeb'

// Bloqueio a nível de servidor: se o admin desabilitou o módulo de Quilometragem
// no web para técnicos, qualquer acesso direto pela URL é redirecionado.
export default async function QuilometragemLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const role = (session.user as any)?.role
  if (await frotaWebBloqueadaParaRole(role)) {
    redirect('/dashboard?aviso=frota-mobile')
  }

  return <>{children}</>
}
