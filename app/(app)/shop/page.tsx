'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const POWERUP_COST = 2

const SHOP_ITEMS = [
  { id: 'x2', name: 'כפול 2', description: 'לשימוש במחצית - הכפלת ניקוד המשחק', img: '/btn-x2.png', stockKey: 'x2Stock' as const },
  { id: 'shinoo', name: 'שינוי', description: 'לשימוש במחצית, שינוי של גול אחד מתוצאת המשחק', img: '/btn-shinoo.png', stockKey: 'shinooStock' as const },
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
      toast.success('נקנה!')
    } catch {
      toast.error('שגיאת חיבור')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-white font-black text-xl text-center mb-6">מרקט</h1>

      {/* Balance */}
      <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-2xl p-4 mb-8 text-center">
        <p className="text-gray-400 text-sm mb-1">היתרה שלך</p>
        <p className="text-4xl font-black text-yellow-400">🪙 {coins ?? '...'}</p>
      </div>

      {/* Header row */}
      <div className="flex mb-2">
        <div className="flex-1 text-center text-white font-black text-xl">לרכישה</div>
        <div className="w-px bg-dark-border" />
        <div className="flex-1 text-center text-white font-black text-xl">ברשותך</div>
      </div>

      <div className="w-full h-px bg-dark-border mb-6" />

      {/* One row per item */}
      {SHOP_ITEMS.map((item, i) => {
        const owned = stock[item.stockKey]
        const canBuy = (coins ?? 0) >= POWERUP_COST
        const isLoading = loading === item.id
        return (
          <div key={item.id}>
            <div className="flex items-center gap-4">

              {/* LEFT col — buy */}
              <div className="flex-1 flex flex-col items-center gap-3">
                <img src={item.img} alt={item.name} style={{ mixBlendMode: 'lighten', maxWidth: '140px' }} />
                <p className="text-gray-400 text-xs text-center leading-relaxed">{item.description}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => buy(item.id)}
                    disabled={!canBuy || isLoading}
                    className="w-10 h-10 rounded-xl font-black text-xs bg-yellow-500 text-black active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isLoading ? '…' : 'קנה'}
                  </button>
                  <span className="text-yellow-400 font-bold text-sm">{POWERUP_COST} מטבעות 🪙</span>
                </div>
              </div>

              <div className="w-px self-stretch bg-dark-border" />

              {/* RIGHT col — owned */}
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className={`relative w-36 h-16 ${owned === 0 ? 'opacity-20' : ''}`} style={{ mixBlendMode: 'lighten' }}>
                  <Image src={item.img} alt={item.name} fill className="object-contain" />
                </div>
                <span className={`font-black text-2xl ${owned > 0 ? 'text-white' : 'text-gray-600'}`}>×{owned}</span>
              </div>

            </div>

            {i < SHOP_ITEMS.length - 1 && <div className="w-full h-px bg-dark-border my-6" />}
          </div>
        )
      })}

      {/* How to earn */}
      <div className="border-t border-dark-border mt-8 pt-6">
        <h2 className="text-white font-bold text-right mb-3">איך מרוויחים מטבעות?</h2>
        <div className="space-y-2 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-gray-400 text-sm">בתחילת כל מחזור</span>
            <span className="text-yellow-400 font-bold">🪙 10</span>
          </div>
          <p className="text-gray-500 text-xs">עוד דרכים יתווספו בקרוב...</p>
        </div>
      </div>
    </div>
  )
}
