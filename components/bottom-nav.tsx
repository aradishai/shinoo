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

    const handler = (e: Event) => {
      const coins = (e as CustomEvent<{ coins: number }>).detail?.coins
      if (coins !== undefined) setCoins(coins)
    }
    window.addEventListener('coins-updated', handler)
    return () => window.removeEventListener('coins-updated', handler)
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const navItems = [
    { href: '/shop', label: 'מרקט', icon: '/icons/market.png' as string | null },
    { href: '/leagues', label: 'ליגות', icon: '/icons/trophy.png' as string | null },
    { href: '/chat', label: 'צ\'אט', icon: '/icons/chat.png' as string | null },
    { href: '/matches', label: 'ניחושים', icon: '/icons/money.png' as string | null },
    { href: '/', label: 'בית', icon: '/icons/home.png' as string | null },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-100/95 backdrop-blur-md border-t border-dark-border safe-area-pb">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-2 px-4">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const isShop = item.href === '/shop'
            const isChat = item.href === '/chat'
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1"
              >
                {isChat ? (
                  <div className={clsx(
                    'w-16 h-16 rounded-full flex items-center justify-center -mt-6 border-4 border-dark-100',
                    active ? 'bg-primary' : 'bg-dark-card'
                  )}>
                    <div className="relative w-9 h-9">
                      <Image src={item.icon!} alt={item.label} fill className="object-contain" style={{ mixBlendMode: 'lighten' }} />
                    </div>
                  </div>
                ) : (
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    <div
                      style={{ mixBlendMode: 'lighten' }}
                      className={clsx('relative', isShop ? 'w-9 h-9' : 'w-14 h-14', !active && 'opacity-40')}
                    >
                      <Image src={item.icon!} alt={item.label} fill className="object-contain" />
                    </div>
                    {isShop && coins !== null && (
                      <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-black rounded-full px-1 min-w-[18px] text-center leading-[18px] z-10">
                        {coins}
                      </span>
                    )}
                  </div>
                )}

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
