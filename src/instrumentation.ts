export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { iniciarAgendadorInternoSG4 } = await import('@/lib/cronScheduler')
    iniciarAgendadorInternoSG4()
  }
}

