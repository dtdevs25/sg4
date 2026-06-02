'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, Bell, X } from 'lucide-react'

export function Header() {
  const { data: session } = useSession()
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-white border-b border-gray-100 z-30 px-4 md:px-8 flex items-center justify-between shadow-sm">
      {/* Left: Logo */}
      <div className="flex items-center gap-4 pl-2">
        <img
          src="/logo.png"
          alt="SG4"
          className="h-10 md:h-12 w-auto object-contain transition-transform hover:scale-105 cursor-pointer"
        />
      </div>

      {/* Right: Notifications & Logout */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 text-gray-400 hover:text-[#27AE60] hover:bg-green-50 rounded-xl transition-all duration-300"
          >
            <Bell className="h-6 w-6" />
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="
                fixed z-50 animate-in fade-in duration-200
                top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-[calc(100vw-3rem)] max-w-[360px]
                md:absolute md:top-auto md:left-auto md:translate-x-0 md:translate-y-0
                md:right-0 md:mt-2 md:w-80 md:max-w-[320px]
                bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden
              ">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-700">Notificações</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
                <div className="p-6 text-center text-gray-400 text-sm">
                  Nenhuma notificação no momento.
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-8 w-[1px] bg-gray-100 mx-1" />

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Sair do Sistema"
          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-300 group"
        >
          <LogOut className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </header>
  )
}
