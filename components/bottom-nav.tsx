'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

function WhistleIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={clsx('w-6 h-6', active ? 'text-primary' : 'text-gray-500')}
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
    >
      <circle cx="9" cy="14" r="5" />
      <path d="M9 9V4h8l2 3-8 2" />
      <path d="M7 14h4" />
    </svg>
  )
}

function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={clsx('w-6 h-6', active ? 'text-primary' : 'text-gray-500')}
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
    >
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" />
      <path d="M10 22v-4" />
      <path d="M14 22v-4" />
      <path d="M6 4v10a6 6 0 0012 0V4" />
    </svg>
  )
}

function PeopleIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={clsx('w-6 h-6', active ? 'text-primary' : 'text-gray-500')}
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
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
    {
      href: '/users',
      label: 'שחקנים',
      icon: <PeopleIcon active={isActive('/users')} />,
    },
    {
      href: '/leagues',
      label: 'הליגות שלי',
      icon: <TrophyIcon active={isActive('/leagues')} />,
    },
    {
      href: '/',
      label: 'בית',
      icon: <WhistleIcon active={isActive('/')} />,
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
