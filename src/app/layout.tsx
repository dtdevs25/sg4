import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SG4 - Gestão de Segurança do Trabalho',
  description: 'Sistema de gestão de equipes de técnicos de segurança do trabalho',
  icons: {
    icon: [
      { url: '/favicon.png?v=2', type: 'image/png' },
      { url: '/favicon.ico?v=2', type: 'image/x-icon' }
    ],
    shortcut: '/favicon.png?v=2',
    apple: '/favicon.png?v=2',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
