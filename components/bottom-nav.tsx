'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import Image from 'next/image'

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const navItems = [
    { href: '/shop', label: 'חנות', icon: '/icons/money.png' },
    { href: '/leagues', label: 'ליגות', icon: '/icons/trophy.png' },
    { href: '/', label: 'בית', icon: '/icons/home.png' },
    { href: '/matches', label: 'ניחושים', icon: '/icons/money.png' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-100/95 backdrop-blur-md border-t border-dark-border safe-area-pb">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-1 px-4">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all"
              >
                <div style={{ mixBlendMode: 'lighten' }} className={clsx('w-14 h-14 relative', !active && 'opacity-40')}>
                  <Image src={item.icon} alt={item.label} fill className="object-contain" />
                </div>
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
