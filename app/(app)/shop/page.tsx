'use client'

import { useState, useEffect } from 'react'

const POWERUP_COST = 2

const SHOP_ITEMS = [
  {
    id: 'x2',
    name: 'כפול 2',
    description: 'מכפיל את הנקודות שתקבל אם הניחוש שלך נכון. מופעל בהפסקה.',
    icon: '✕2',
    iconBg: 'from-blue-500/20 to-blue-600/10 border-blue-500/40',
    iconColor: 'text-blue-400',
  },
  {
    id: 'shinoo',
    name: 'שינוי',
    description: 'משנה את ניחוש הניקוד שלך ב-1 גול לכיוון אחד. מופעל בהפסקה.',
    icon: '✏️',
    iconBg: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/40',
    iconColor: 'text-yellow-400',
  },
]

export default function ShopPage() {
  const [coins, setCoins] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setCoins(d.data?.coins ?? 0))
  }, [])

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-center mb-6">
        <h1 className="text-white font-black text-xl">חנות</h1>
      </div>

      {/* Coin Balance */}
      <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-2xl p-5 mb-8 text-center">
        <p className="text-gray-400 text-sm mb-1">היתרה שלך</p>
        <p className="text-5xl font-black text-yellow-400">
          🪙 {coins ?? '...'}
        </p>
      </div>

      {/* Items */}
      <h2 className="text-white font-bold text-right mb-4">כפתורים מיוחדים</h2>
      <div className="flex flex-col gap-4">
        {SHOP_ITEMS.map(item => (
          <div
            key={item.id}
            className={`bg-gradient-to-br ${item.iconBg} border rounded-2xl p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full">
                <span className="text-yellow-400 font-black text-sm">🪙 {POWERUP_COST}</span>
                <span className="text-gray-400 text-xs">לשימוש</span>
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-white font-black text-lg`}>{item.name}</p>
                <span className={`text-2xl font-black ${item.iconColor}`}>{item.icon}</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm text-right leading-relaxed">{item.description}</p>
          </div>
        ))}
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
