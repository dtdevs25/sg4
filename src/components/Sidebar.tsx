'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard, Users, ClipboardCheck, MessageSquare,
  Activity, Calendar, LogOut, Menu, X, ChevronLeft,
  CalendarCheck, FileCheck, User
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
  const { data: session } = useSession()

  // Get initials from user name
  const getInitials = (name?: string | null) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const NavItems = () => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link key={href} href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
              active
                ? 'bg-red-50 text-red-600 font-semibold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon size={20} className={`shrink-0 transition-colors ${active ? 'text-red-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
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

  const UserProfile = () => {
    const initials = getInitials(session?.user?.name)
    const name = session?.user?.name || 'Usuário SG4'
    const role = (session?.user as any)?.role || 'Técnico'
    
    return (
      <div className={`p-3 border-t border-slate-100 flex items-center gap-3 bg-slate-50/50 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
          {initials}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{name}</p>
            <p className="text-xs text-slate-400 font-medium truncate capitalize">{role}</p>
          </div>
        )}
      </div>
    )
  }

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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}>
            <ChevronLeft size={18} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <NavItems />
        <UserProfile />
      </aside>

      {/* Mobile: transparent hamburger button placed over header */}
      <button
        className="md:hidden fixed top-3.5 left-4 z-50 p-1.5 rounded-lg text-white hover:bg-white/10 active:scale-95 transition-all"
        onClick={() => setMobileOpen((p) => !p)}
        aria-label="Abrir menu"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 bg-slate-50/50">
              <span className="text-sm font-bold text-slate-800">Menu de Navegação</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <NavItems />
            <UserProfile />
          </aside>
        </div>
      )}
    </>
  )
}
