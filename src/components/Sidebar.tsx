'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Users, ClipboardCheck, MessageSquare,
  Activity, Calendar, LogOut, Menu, X, ChevronLeft,
  CalendarCheck, FileCheck
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',            label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/dashboard/tecnicos',   label: 'Técnicos',   icon: Users },
  { href: '/dashboard/inspecoes',  label: 'Inspeções',  icon: ClipboardCheck },
  { href: '/dashboard/dialogos',   label: 'Diálogos',   icon: MessageSquare },
  { href: '/dashboard/atividades', label: 'Atividades', icon: Activity },
  { href: '/dashboard/programacao',label: 'Programação',icon: Calendar },
  { href: '/dashboard/reunioes',   label: 'Reuniões',   icon: CalendarCheck },
  { href: '/dashboard/entregas',   label: 'Entregas',   icon: FileCheck },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const NavItems = () => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link key={href} href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
              active
                ? 'bg-red-50 text-red-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon size={20} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
            {collapsed && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-sm border border-slate-700">
                {label}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-300 shrink-0 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Toggle button area */}
        <div className={`flex items-center h-12 px-3 border-b border-slate-100 ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button onClick={() => setCollapsed((p) => !p)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}>
            <ChevronLeft size={18} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <NavItems />

        {/* Logout */}
        <div className="p-3 border-t border-slate-100">
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all ${collapsed ? 'justify-center' : ''}`}>
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Mobile: hamburger button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-red-700 text-white shadow-lg"
        onClick={() => setMobileOpen((p) => !p)}
        aria-label="Abrir menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-end h-16 px-4 border-b border-slate-100">
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <NavItems />
            <div className="p-3 border-t border-slate-100">
              <button onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all">
                <LogOut size={18} />
                <span>Sair</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
