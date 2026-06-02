'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard, Users, ClipboardCheck, MessageSquare,
  Activity, Calendar, CalendarCheck, FileCheck,
  ChevronLeft, ChevronRight, Menu, X, User as UserIcon,
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

const RED      = '#e53935'
const RED_BG   = 'rgba(229,57,53,0.08)'
const GRAY_TXT = '#64748b'

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

/* ── Nav item ─────────────────────────────────────────────────────────────── */
function NavItem({ href, label, icon: Icon, collapsed, onClose }: {
  href: string; label: string; icon: React.ElementType
  collapsed: boolean; onClose?: () => void
}) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      onClick={onClose}
      title={collapsed ? label : undefined}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 14,
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '10px 0' : '10px 14px',
        borderRadius: 12,
        background: active ? RED_BG : 'transparent',
        cursor: 'pointer',
        transition: 'background .15s',
        marginBottom: 2,
      }}>
        {/* Accent bar */}
        {active && !collapsed && (
          <span style={{
            position: 'absolute', left: 0, top: '15%', bottom: '15%',
            width: 3, background: RED, borderRadius: '0 4px 4px 0',
          }} />
        )}

        {/* Icon */}
        <Icon
          size={22}
          strokeWidth={active ? 2.5 : 1.8}
          style={{ color: active ? RED : GRAY_TXT, flexShrink: 0 }}
        />

        {/* Label */}
        {!collapsed && (
          <span style={{
            fontSize: 14,
            fontWeight: active ? 700 : 500,
            color: active ? RED : GRAY_TXT,
            letterSpacing: 0.1,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {label}
          </span>
        )}

        {/* Tooltip when collapsed */}
        {collapsed && (
          <span style={{
            position: 'absolute', left: '110%', top: '50%', transform: 'translateY(-50%)',
            background: '#1e293b', color: '#fff', fontSize: 12, fontWeight: 600,
            padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap',
            pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            opacity: 0,
            /* CSS hover trick doesn't work inline; handled via group CSS class below */
          }} className="nav-tooltip">
            {label}
          </span>
        )}
      </div>
    </Link>
  )
}

/* ── User profile (sem botão de sair) ─────────────────────────────────────── */
function UserProfile({ collapsed, name, role, initials }: {
  collapsed: boolean; name: string; role: string; initials: string
}) {
  if (collapsed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: `linear-gradient(135deg, ${RED}, #c62828)`,
          color: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 13, fontWeight: 800,
          boxShadow: `0 4px 12px rgba(229,57,53,0.3)`,
        }}>
          {initials}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      margin: '0 12px 12px',
      padding: 14,
      borderRadius: 12,
      background: 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${RED}, #c62828)`,
          color: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 13, fontWeight: 800,
          boxShadow: `0 4px 12px rgba(229,57,53,0.25)`,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
            {name}
          </p>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
            {role}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Sidebar content ──────────────────────────────────────────────────────── */
function SidebarContent({ collapsed, isMobile = false, onClose }: {
  collapsed: boolean; isMobile?: boolean; onClose?: () => void
}) {
  const { data: session } = useSession()
  const name     = session?.user?.name || 'Usuário SG4'
  const role     = (session?.user as any)?.role || 'Técnico'
  const initials = getInitials(session?.user?.name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ height: 16 }} />

      {/* Nav items */}
      <nav className="scrollbar-hide" style={{ flex: 1, padding: collapsed ? '0 8px' : '0 10px', overflowY: collapsed ? 'hidden' : 'auto', overflowX: 'hidden' }}>
        {NAV.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed && !isMobile}
            onClose={onClose}
          />
        ))}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: '#f1f5f9', margin: '0 16px 8px' }} />

      {/* User profile */}
      <UserProfile
        collapsed={collapsed && !isMobile}
        name={name}
        role={role}
        initials={initials}
      />
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Tooltip CSS */}
      <style>{`
        .nav-item-wrap:hover .nav-tooltip { opacity: 1 !important; }
      `}</style>

      {/* Mobile toggle */}
      <button
        className="md:hidden"
        style={{
          position: 'fixed', top: 24, left: 16, zIndex: 200,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#94a3b8', padding: 6, borderRadius: 8,
        }}
        onClick={() => setMobileOpen(p => !p)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150, backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        >
          <aside
            style={{
              position: 'absolute', left: 0, top: 0, height: '100%', width: 288,
              background: '#fff', display: 'flex', flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
              borderRight: '1px solid #f1f5f9',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: 16, display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid #f1f5f9' }}>
              <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            <SidebarContent collapsed={false} isMobile onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col"
        style={{
          background: '#ffffff',
          width: collapsed ? 76 : 272,
          transition: 'width 0.35s ease',
          flexShrink: 0,
          position: 'relative',
          borderRight: '1px solid #f1f5f9',
          boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Collapse toggle */}
        <div style={{ position: 'absolute', right: -12, top: 44, zIndex: 10 }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: '#fff', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: RED,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        <SidebarContent collapsed={collapsed} />
      </aside>
    </>
  )
}
