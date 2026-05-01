'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import Image from 'next/image'
import { useState, useEffect } from 'react'

export function BottomNav() {
  const pathname = usePathname()
  const [coins, setCoins] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.data?.coins !== undefined) setCoins(d.data.coins) })
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const navItems = [
    { href: '/shop', label: 'מרקט', icon: '/icons/market.png' },
    { href: '/leagues', label: 'ליגות', icon: '/icons/trophy.png' },
    { href: '/', label: 'בית', icon: '/icons/home.png' },
    { href: '/matches', label: 'ניחושים', icon: '/icons/money.png' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-100/95 backdrop-blur-md border-t border-dark-border safe-area-pb">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-2 px-4">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const isShop = item.href === '/shop'
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1"
              >
                {/* Icon — fixed 56×56 container for all items */}
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <div
                    style={{ mixBlendMode: 'lighten' }}
                    className={clsx('w-14 h-14 relative', !active && 'opacity-40')}
                  >
                    <Image src={item.icon} alt={item.label} fill className="object-contain" />
                  </div>
                  {isShop && coins !== null && (
                    <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-black rounded-full px-1 min-w-[18px] text-center leading-[18px] z-10">
                      {coins}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={clsx('text-[11px] font-medium transition-colors', active ? 'text-primary' : 'text-gray-500')}>
                  {item.label}
                </span>

                {/* Active dot */}
                {active && <span className="w-1 h-1 rounded-full bg-primary" />}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
