'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
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
      <div className="flex items-center justify-center mb-6">
        <h1 className="text-white font-black text-xl">מרקט</h1>
      </div>

      {/* Coin Balance */}
      <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-2xl p-4 mb-8 text-center">
        <p className="text-gray-400 text-sm mb-1">היתרה שלך</p>
        <p className="text-4xl font-black text-yellow-400">🪙 {coins ?? '...'}</p>
      </div>

      {/* Two columns */}
      <div className="flex gap-6">

        {/* RIGHT — buy */}
        <div className="flex-1 flex flex-col items-center gap-4">
          <p className="text-white font-black text-xl">לרכישה</p>
          {SHOP_ITEMS.map(item => {
            const canBuy = (coins ?? 0) >= POWERUP_COST
            const isLoading = loading === item.id
            return (
              <div key={item.id} className="flex flex-col items-center gap-2 w-full">
                <div className="relative w-full h-20" style={{ mixBlendMode: 'lighten' }}>
                  <Image src={item.img} alt={item.name} fill className="object-contain" />
                </div>
                <p className="text-gray-400 text-xs text-center leading-relaxed">{item.description}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => buy(item.id)}
                    disabled={!canBuy || isLoading}
                    className="w-10 h-10 rounded-xl font-black text-xs transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-yellow-500 text-black flex items-center justify-center"
                  >
                    {isLoading ? '…' : 'קנה'}
                  </button>
                  <span className="text-yellow-400 font-bold text-sm">{POWERUP_COST} מטבעות 🪙</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* LEFT — inventory */}
        <div className="flex-1 flex flex-col items-center gap-4">
          <p className="text-white font-black text-xl">ברשותך</p>
          {SHOP_ITEMS.map(item => {
            const owned = stock[item.stockKey]
            return (
              <div key={item.id} className="flex flex-col items-center gap-1 w-full">
                <div className={`relative w-full h-20 transition-opacity ${owned === 0 ? 'opacity-20' : ''}`} style={{ mixBlendMode: 'lighten' }}>
                  <Image src={item.img} alt={item.name} fill className="object-contain" />
                </div>
                <span className={`font-black text-2xl leading-none ${owned > 0 ? 'text-white' : 'text-gray-600'}`}>
                  ×{owned}
                </span>
              </div>
            )
          })}
        </div>

      </div>

      {/* How to earn */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4 mt-10">
        <h2 className="text-white font-bold text-right mb-3">איך מרוויחים מטבעות?</h2>
        <div className="space-y-2 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-gray-400 text-sm">בתחילת כל מחזור</span>
            <span className="text-yellow-400 font-bold">🪙 10</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-gray-500 text-xs">עוד דרכים יתווספו בקרוב...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
