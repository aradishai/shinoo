'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'


export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const navItems = [
    {
      href: '/leagues',
      label: 'ליגות',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className={clsx('w-6 h-6', isActive('/leagues') ? 'text-primary' : 'text-gray-500')} stroke="currentColor" strokeWidth={isActive('/leagues') ? 2.5 : 2}>
          <path d="M8 21h8M12 17v4M7 4h10v8a5 5 0 01-10 0V4z"/>
          <path d="M7 7H4a2 2 0 000 4h3"/>
          <path d="M17 7h3a2 2 0 010 4h-3"/>
        </svg>
      ),
    },
    {
      href: '/matches',
      label: 'ניחושים',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className={clsx('w-6 h-6', isActive('/matches') ? 'text-primary' : 'text-gray-500')} stroke="currentColor" strokeWidth={isActive('/matches') ? 2.5 : 2}>
          <rect x="2" y="7" width="20" height="10" rx="2"/>
          <path d="M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0"/>
          <path d="M6 12h.01M18 12h.01"/>
        </svg>
      ),
    },
    {
      href: '/',
      label: 'בית',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className={clsx('w-6 h-6', isActive('/') ? 'text-primary' : 'text-gray-500')} stroke="currentColor" strokeWidth={isActive('/') ? 2.5 : 2}>
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
          <path d="M9 21V12h6v9"/>
        </svg>
      ),
    },
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
                className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all"
              >
                {item.icon}
                <span
                  className={clsx(
                    'text-xs font-medium transition-colors',
                    active ? 'text-primary' : 'text-gray-500'
                  )}
                >
                  {item.label}
                </span>
                {active && (
                  <span className="w-1 h-1 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
