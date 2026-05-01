'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import toast from 'react-hot-toast'

const POWERUP_COST = 2

const SHOP_ITEMS = [
  {
    id: 'x2',
    name: 'כפול 2',
    description: 'מכפיל את הנקודות שלך אם הניחוש נכון. מופעל בהפסקה.',
    img: '/btn-x2.png',
    bg: 'from-blue-500/10 to-blue-600/5 border-blue-500/30',
    stockKey: 'x2Stock' as const,
  },
  {
    id: 'shinoo',
    name: 'שינוי',
    description: 'משנה את הניחוש ב-1 גול לכל כיוון. מופעל בהפסקה.',
    img: '/btn-shinoo.png',
    bg: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/30',
    stockKey: 'shinooStock' as const,
  },
]

export default function ShopPage() {
  const [coins, setCoins] = useState<number | null>(null)
  const [stock, setStock] = useState({ x2Stock: 0, shinooStock: 0 })
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        setCoins(d.data?.coins ?? 0)
        setStock({ x2Stock: d.data?.x2Stock ?? 0, shinooStock: d.data?.shinooStock ?? 0 })
      })
  }, [])

  const buy = async (itemId: string) => {
    setLoading(itemId)
    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: itemId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'שגיאה'); return }
      setCoins(data.coins)
      setStock({ x2Stock: data.x2Stock, shinooStock: data.shinooStock })
      toast.success('נקנה בהצלחה! 🎉')
    } catch {
      toast.error('שגיאת חיבור')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-center mb-6">
        <h1 className="text-white font-black text-xl">חנות</h1>
      </div>

      {/* Coin Balance */}
      <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-2xl p-5 mb-8 text-center">
        <p className="text-gray-400 text-sm mb-1">היתרה שלך</p>
        <p className="text-5xl font-black text-yellow-400">🪙 {coins ?? '...'}</p>
      </div>

      {/* Items */}
      <h2 className="text-white font-bold text-right mb-4">כפתורים מיוחדים</h2>
      <div className="flex flex-col gap-4">
        {SHOP_ITEMS.map(item => {
          const owned = stock[item.stockKey]
          const canBuy = (coins ?? 0) >= POWERUP_COST
          const isLoading = loading === item.id
          return (
            <div key={item.id} className={`bg-gradient-to-br ${item.bg} border rounded-2xl p-5`}>
              {/* Top row: image + stock badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {owned > 0 && (
                    <span className="bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-black px-2 py-0.5 rounded-full">
                      ×{owned} ברשותך
                    </span>
                  )}
                </div>
                <div className="relative w-28 h-14" style={{ mixBlendMode: 'lighten' }}>
                  <Image src={item.img} alt={item.name} fill className="object-contain" />
                </div>
              </div>

              <p className="text-gray-400 text-sm text-right leading-relaxed mb-4">{item.description}</p>

              {/* Buy button */}
              <button
                onClick={() => buy(item.id)}
                disabled={!canBuy || isLoading}
                className="w-full py-3 rounded-xl font-black text-base transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-yellow-500 text-black"
              >
                {isLoading ? '...' : `קנה 🪙${POWERUP_COST}`}
              </button>
              {!canBuy && coins !== null && (
                <p className="text-center text-gray-500 text-xs mt-2">חסרים מטבעות</p>
              )}
            </div>
          )
        })}
      </div>

      {/* How to earn */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4 mt-8">
        <h2 className="text-white font-bold text-right mb-3">איך מרוויחים מטבעות?</h2>
        <div className="space-y-2 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-gray-400 text-sm">בתחילת כל מחזור</span>
            <span className="text-yellow-400 font-bold">🪙 5</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-gray-500 text-xs">עוד דרכים יתווספו בקרוב...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
