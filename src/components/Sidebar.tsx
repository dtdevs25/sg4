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
          relative flex items-center gap-3 rounded-xl transition-all duration-200
          ${collapsed ? 'justify-center px-0 py-3 w-11 mx-auto' : 'px-3 py-2.5 mx-2'}
          ${active
            ? 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
          group
        `}
      >
        {/* Left accent bar */}
        {active && !collapsed && (
          <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-red-500 rounded-r-full" />
        )}

        {/* Icon */}
        <span className={`shrink-0 transition-all duration-200 group-hover:scale-110 ${active ? 'text-red-600' : color} opacity-${active ? 100 : 70}`}>
          <Icon size={20} />
        </span>

        {/* Label */}
        {!collapsed && (
          <span className={`text-sm font-semibold flex-1 truncate ${active ? 'text-red-700' : 'text-slate-600'}`}>
            {label}
          </span>
        )}

        {/* Active arrow */}
        {!collapsed && active && (
          <ChevronRight size={14} className="text-red-400 shrink-0" />
        )}

        {/* Tooltip when collapsed */}
        {collapsed && (
          <span className="
            absolute left-full ml-3 px-3 py-1.5 rounded-xl
            bg-slate-800 text-white text-xs font-semibold
            whitespace-nowrap pointer-events-none z-50
            opacity-0 group-hover:opacity-100
            translate-x-1 group-hover:translate-x-0
            transition-all duration-200 shadow-lg
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
      <div className="flex justify-center pb-4 pt-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-sm font-extrabold shadow-md shadow-red-200">
          {initials}
        </div>
      </div>
    ) : (
      <div className="mx-3 mb-3 mt-2 p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-red-50 border border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-sm font-extrabold shrink-0 shadow-md shadow-red-200">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800 truncate leading-tight">{userName}</p>
            <p className="text-[11px] text-slate-400 font-medium capitalize">{userRole}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            title="Sair"
          >
            <LogOut size={15} />
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
      ${collapsed ? 'w-[68px]' : 'w-64'}
    `}>
      {/* Toggle bar */}
      <div className={`flex items-center h-12 border-b border-slate-100 shrink-0 ${collapsed ? 'justify-center' : 'justify-between px-4'}`}>
        {!collapsed && (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navegação</span>
        )}
        <button
          onClick={() => setCollapsed(p => !p)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
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
      {/* Hamburger — sits over the header */}
      <button
        className="md:hidden fixed top-4 left-5 z-50 text-white hover:bg-white/10 p-1.5 rounded-lg active:scale-95 transition-all"
        onClick={() => setMobileOpen(p => !p)}
        aria-label="Menu"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Overlay + Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 h-full w-72 bg-white flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100 bg-gradient-to-r from-red-600 to-red-700">
              <img src="/logo.png" alt="SG4" className="h-8 brightness-0 invert object-contain" />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 space-y-0.5">
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
