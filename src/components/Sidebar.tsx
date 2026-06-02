'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard, Users, ClipboardCheck, MessageSquare,
  Activity, Calendar, CalendarCheck, FileCheck,
  ChevronLeft, ChevronRight, Menu, X, LogOut, User as UserIcon,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',             label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/dashboard/tecnicos',    label: 'Técnicos',    icon: Users            },
  { href: '/dashboard/inspecoes',   label: 'Inspeções',   icon: ClipboardCheck   },
  { href: '/dashboard/dialogos',    label: 'Diálogos',    icon: MessageSquare    },
  { href: '/dashboard/atividades',  label: 'Atividades',  icon: Activity         },
  { href: '/dashboard/programacao', label: 'Programação', icon: Calendar         },
  { href: '/dashboard/reunioes',    label: 'Reuniões',    icon: CalendarCheck    },
  { href: '/dashboard/entregas',    label: 'Entregas',    icon: FileCheck        },
]

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

interface NavItemProps {
  href: string
  label: string
  icon: React.ElementType
  collapsed: boolean
  onClose?: () => void
}

function NavItem({ href, label, icon: Icon, collapsed, onClose }: NavItemProps) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      onClick={onClose}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center w-full p-3 rounded-xl transition-all duration-200 group relative',
        collapsed ? 'justify-center' : 'gap-3',
        active
          ? 'bg-black/20 text-white font-bold shadow-inner'
          : 'text-white/80 hover:bg-black/10 hover:text-white',
      )}
    >
      {/* Left accent bar */}
      <div className={cn(
        'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300',
        active ? 'h-3/4 bg-white' : 'h-0 bg-transparent'
      )} />

      <Icon className={cn(
        'h-5 w-5 shrink-0 transition-colors',
        active ? 'text-white' : 'text-white/60 group-hover:text-white'
      )} />

      {!collapsed && (
        <span className="text-sm tracking-wide flex-1 text-left truncate">{label}</span>
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

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const { data: session } = useSession()

  const userName = session?.user?.name || 'Usuário SG4'
  const userRole = (session?.user as any)?.role || 'Técnico'
  const initials = getInitials(session?.user?.name)

  /* ── Sidebar content (shared between desktop & mobile) ── */
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Nav */}
      <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto scrollbar-hide">
        {NAV.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed && !isMobile}
            onClose={isMobile ? () => setMobileOpen(false) : undefined}
          />
        ))}
      </nav>

      {/* User Profile at bottom */}
      <div className="mt-auto p-3">
        <div className={cn(
          'flex items-center gap-3 p-2 transition-all duration-300',
          collapsed && !isMobile && 'flex-col text-center'
        )}>
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-white/60" />
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#27AE60] rounded-full" />
          </div>

          {(!collapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-xs truncate">{userName}</p>
              <p className="text-white/60 text-[9px] uppercase tracking-wider mt-0.5">{userRole}</p>
            </div>
          )}

          {(!collapsed || isMobile) && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sair"
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Mobile trigger ──────────────────────────────── */}
      <button
        className="md:hidden fixed top-5 left-4 z-50 text-gray-500 hover:bg-gray-100 p-1.5 rounded-lg active:scale-95 transition-all"
        onClick={() => setMobileOpen(p => !p)}
        aria-label="Menu"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* ── Mobile overlay + drawer ─────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="bg-[#27AE60] absolute left-0 top-0 h-full w-72 shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 flex justify-end">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className={cn(
        'bg-[#27AE60] transition-all duration-500 ease-in-out hidden md:flex flex-col relative z-40 shadow-xl shrink-0',
        collapsed ? 'w-20' : 'w-72'
      )}>
        {/* Collapse toggle button */}
        <div className="absolute -right-3 top-10 z-50">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[#27AE60] shadow-md hover:scale-110 transition-transform"
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4" />
              : <ChevronLeft  className="h-4 w-4" />
            }
          </button>
        </div>

        <SidebarContent />
      </aside>
    </>
  )
}
