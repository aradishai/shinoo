'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { Home, Trophy, Banknote } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const navItems = [
    { href: '/leagues', label: 'ליגות', Icon: Trophy },
    { href: '/matches', label: 'ניחושים', Icon: Banknote },
    { href: '/', label: 'בית', Icon: Home },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-100/95 backdrop-blur-md border-t border-dark-border safe-area-pb">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-2 px-4">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all"
              >
                <item.Icon
                  size={28}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={active ? 'text-primary' : 'text-gray-500'}
                />
                <span className={clsx('text-[11px] font-medium transition-colors', active ? 'text-primary' : 'text-gray-500')}>
                  {item.label}
                </span>
                {active && <span className="w-1 h-1 rounded-full bg-primary" />}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
