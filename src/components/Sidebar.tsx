'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard, Users, ClipboardCheck, MessageSquare,
  Activity, Calendar, CalendarCheck, FileCheck,
  PanelLeftClose, PanelLeftOpen, Menu, X, LogOut, ChevronRight,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',             label: 'Dashboard',   icon: LayoutDashboard, color: 'text-red-500' },
  { href: '/dashboard/tecnicos',    label: 'Técnicos',    icon: Users,            color: 'text-blue-500' },
  { href: '/dashboard/inspecoes',   label: 'Inspeções',   icon: ClipboardCheck,   color: 'text-orange-500' },
  { href: '/dashboard/dialogos',    label: 'Diálogos',    icon: MessageSquare,    color: 'text-purple-500' },
  { href: '/dashboard/atividades',  label: 'Atividades',  icon: Activity,         color: 'text-emerald-500' },
  { href: '/dashboard/programacao', label: 'Programação', icon: Calendar,         color: 'text-cyan-500' },
  { href: '/dashboard/reunioes',    label: 'Reuniões',    icon: CalendarCheck,    color: 'text-indigo-500' },
  { href: '/dashboard/entregas',    label: 'Entregas',    icon: FileCheck,        color: 'text-amber-500' },
]

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

export function Sidebar() {
  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname  = usePathname()
  const { data: session } = useSession()

  const userName = session?.user?.name || 'Usuário SG4'
  const userRole = (session?.user as any)?.role || 'Técnico'
  const initials = getInitials(session?.user?.name)

  /* ── Nav item ─────────────────────────────────────────── */
  const NavItem = ({ href, label, icon: Icon, color }: typeof NAV[0]) => {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? label : undefined}
        className={`
          relative flex items-center gap-4 rounded-2xl transition-all duration-200 group
          ${collapsed ? 'justify-center p-3.5 w-13 mx-auto' : 'px-4 py-3.5 mx-3'}
          ${active
            ? 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700 shadow-sm'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
        `}
      >
        {/* Left accent bar */}
        {active && !collapsed && (
          <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-red-500 rounded-r-full" />
        )}

        {/* Icon — bigger */}
        <span className={`shrink-0 transition-all duration-200 group-hover:scale-110 ${active ? 'text-red-600' : color}`}>
          <Icon size={24} strokeWidth={active ? 2.5 : 1.8} />
        </span>

        {/* Label */}
        {!collapsed && (
          <span className={`text-[13.5px] font-semibold flex-1 truncate ${active ? 'text-red-700' : 'text-slate-600 group-hover:text-slate-800'}`}>
            {label}
          </span>
        )}

        {/* Active arrow */}
        {!collapsed && active && (
          <ChevronRight size={15} className="text-red-400 shrink-0" />
        )}

        {/* Tooltip when collapsed */}
        {collapsed && (
          <span className="
            absolute left-full ml-4 px-3 py-2 rounded-xl
            bg-slate-800 text-white text-xs font-semibold
            whitespace-nowrap pointer-events-none z-50
            opacity-0 group-hover:opacity-100
            translate-x-2 group-hover:translate-x-0
            transition-all duration-200 shadow-xl
          ">
            {label}
          </span>
        )}
      </Link>
    )
  }

  /* ── User profile ─────────────────────────────────────── */
  const UserProfile = () => (
    collapsed ? (
      <div className="flex justify-center py-4">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-sm font-extrabold shadow-lg shadow-red-200">
          {initials}
        </div>
      </div>
    ) : (
      <div className="mx-4 mb-4 mt-2 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-red-50 border border-red-100/50">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-sm font-extrabold shrink-0 shadow-lg shadow-red-200">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800 truncate leading-tight">{userName}</p>
            <p className="text-xs text-slate-400 font-medium capitalize mt-0.5">{userRole}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            title="Sair do sistema"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    )
  )

  /* ── Desktop sidebar ──────────────────────────────────── */
  const DesktopSidebar = () => (
    <aside className={`
      hidden md:flex flex-col h-full bg-white
      border-r border-slate-100 shadow-sm
      transition-all duration-300 ease-in-out shrink-0
      ${collapsed ? 'w-[76px]' : 'w-72'}
    `}>
      {/* Toggle bar */}
      <div className={`flex items-center h-14 border-b border-slate-100 shrink-0 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navegação</span>
        )}
        <button
          onClick={() => setCollapsed(p => !p)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* Nav items — generous spacing */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1.5">
        {NAV.map(item => <NavItem key={item.href} {...item} />)}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-slate-100" />

      {/* User */}
      <UserProfile />
    </aside>
  )

  /* ── Mobile ───────────────────────────────────────────── */
  const MobileSidebar = () => (
    <>
      <button
        className="md:hidden fixed top-4 left-5 z-50 text-white hover:bg-white/10 p-1.5 rounded-lg active:scale-95 transition-all"
        onClick={() => setMobileOpen(p => !p)}
        aria-label="Menu"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 h-full w-80 bg-white flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100 bg-gradient-to-r from-red-600 to-red-700">
              <img src="/logo.png" alt="SG4" className="h-9 brightness-0 invert object-contain" />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 space-y-1.5">
              {NAV.map(item => <NavItem key={item.href} {...item} />)}
            </nav>
            <div className="mx-4 border-t border-slate-100" />
            <UserProfile />
          </aside>
        </div>
      )}
    </>
  )

  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  )
}
