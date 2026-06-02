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
      style={{ textDecoration: 'none' }}
      className={[
        'flex items-center w-full p-3 rounded-xl transition-all duration-200 group relative',
        collapsed ? 'justify-center' : 'gap-3',
        active
          ? 'bg-black/20 text-white font-bold'
          : 'text-white/80 hover:bg-black/10 hover:text-white',
      ].join(' ')}
    >
      {/* Accent bar */}
      <div className={[
        'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300',
        active ? 'h-3/4 bg-white' : 'h-0',
      ].join(' ')} />

      <Icon
        size={20}
        className={active ? 'text-white shrink-0' : 'text-white/60 group-hover:text-white shrink-0'}
      />

      {!collapsed && (
        <span className="text-sm tracking-wide flex-1 text-left truncate">{label}</span>
      )}

      {/* Tooltip collapsed */}
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session } = useSession()

  const userName = session?.user?.name || 'Usuário SG4'
  const userRole = (session?.user as any)?.role || 'Técnico'

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <nav style={{ flex: 1, padding: '2rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
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

      {/* User profile na base */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0.5rem',
          flexDirection: collapsed && !isMobile ? 'column' : 'row',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserIcon size={16} color="rgba(255,255,255,0.6)" />
            </div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 10, height: 10, background: '#34d399',
              borderRadius: '50%', border: '2px solid #27AE60',
            }} />
          </div>

          {(!collapsed || isMobile) && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                  {userRole}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                title="Sair"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden"
        style={{
          position: 'fixed', top: 24, left: 16, zIndex: 200,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#64748b', padding: 6, borderRadius: 8,
        }}
        onClick={() => setMobileOpen(p => !p)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 150, backdropFilter: 'blur(4px)' }}
          className="md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: 288, background: '#27AE60', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setMobileOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, padding: 8, cursor: 'pointer', color: '#fff' }}>
                <X size={20} />
              </button>
            </div>
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col"
        style={{
          background: '#27AE60',
          width: collapsed ? 80 : 288,
          transition: 'width 0.4s ease',
          flexShrink: 0,
          position: 'relative',
          boxShadow: '2px 0 12px rgba(0,0,0,0.1)',
        }}
      >
        {/* Collapse button */}
        <div style={{ position: 'absolute', right: -12, top: 40, zIndex: 10 }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: '#fff', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#27AE60',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <SidebarContent />
      </aside>
    </>
  )
}
