'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={clsx('w-6 h-6', active ? 'text-primary' : 'text-gray-500')} stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11L12 3l9 8v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9z"/>
      <path d="M9 21v-8h6v8"/>
    </svg>
  )
}

function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={clsx('w-6 h-6', active ? 'text-primary' : 'text-gray-500')} stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h10v8a5 5 0 01-10 0V3z"/>
      <path d="M7 6H4a1 1 0 00-1 1v1a3 3 0 003 3h1"/>
      <path d="M17 6h3a1 1 0 011 1v1a3 3 0 01-3 3h-1"/>
      <path d="M12 16v3"/>
      <path d="M8 19h8"/>
      <path d="M12 5l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z"/>
    </svg>
  )
}

function MoneyIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={clsx('w-6 h-6', active ? 'text-primary' : 'text-gray-500')} stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="18" height="12" rx="1.5"/>
      <rect x="4" y="5" width="18" height="12" rx="1.5"/>
      <circle cx="13" cy="11" r="2.5"/>
      <path d="M13 8.5v5M11.5 9.5h2.5M11.5 12.5h2.5"/>
    </svg>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const navItems = [
    { href: '/leagues', label: 'ליגות', Icon: TrophyIcon },
    { href: '/matches', label: 'ניחושים', Icon: MoneyIcon },
    { href: '/', label: 'בית', Icon: HomeIcon },
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
                <item.Icon active={active} />
                <span className={clsx('text-xs font-medium transition-colors', active ? 'text-primary' : 'text-gray-500')}>
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
