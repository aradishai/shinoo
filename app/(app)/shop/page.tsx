'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import toast from 'react-hot-toast'

const SHOP_ITEMS = [
  { id: 'x2', name: 'כפול 2', description: 'לשימוש במחצית - הכפלת ניקוד המשחק', img: '/btn-x2.png', stockKey: 'x2Stock' as const, comingSoon: false, imgClass: 'h-12 w-auto', cost: 3 },
  { id: 'shinoo', name: 'שינוי', description: 'לשימוש במחצית, שינוי של גול אחד מתוצאת המשחק', img: '/btn-shinoo.png', stockKey: 'shinooStock' as const, comingSoon: false, imgClass: 'h-12 w-auto', cost: 2 },
  { id: 'x3', name: 'כפול 3', description: 'לשימוש לפני המשחק – שילוש ניקוד המשחק', img: '/btn-x3.jpg', stockKey: 'x3Stock' as const, comingSoon: false, imgClass: 'h-20 w-auto', cost: 4 },
  { id: 'goals', name: 'גולס+', description: 'לשימוש לפני המשחק – כל גול שווה נקודה', img: '/btn-goals.jpg', stockKey: 'goalsStock' as const, comingSoon: false, imgClass: 'h-20 w-auto', cost: 3 },
  { id: 'minute90', name: 'דקה 90', description: "לשימוש עד דקה 90' – הגרלת ניחוש", img: '/btn-90.jpg', stockKey: 'minute90Stock' as const, comingSoon: false, imgClass: 'h-20 w-auto', cost: 2 },
  { id: 'split', name: 'ספליט', description: 'לשימוש לפני המשחק – ניחוש 2 תוצאות', img: '/btn-split.jpg', stockKey: 'splitStock' as const, comingSoon: false, imgClass: 'h-20 w-auto', cost: 2 },
]

export default function ShopPage() {
  const [coins, setCoins] = useState<number | null>(null)
  const [stock, setStock] = useState({ x2Stock: 0, shinooStock: 0, x3Stock: 0, goalsStock: 0, minute90Stock: 0, splitStock: 0 })
  const [loading, setLoading] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<string | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        setCoins(d.data?.coins ?? 0)
        setStock({
          x2Stock: d.data?.x2Stock ?? 0,
          shinooStock: d.data?.shinooStock ?? 0,
          x3Stock: d.data?.x3Stock ?? 0,
          goalsStock: d.data?.goalsStock ?? 0,
          minute90Stock: d.data?.minute90Stock ?? 0,
          splitStock: d.data?.splitStock ?? 0,
        })
      })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltip(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
      setStock({
        x2Stock: data.x2Stock ?? 0,
        shinooStock: data.shinooStock ?? 0,
        x3Stock: data.x3Stock ?? 0,
        goalsStock: data.goalsStock ?? 0,
        minute90Stock: data.minute90Stock ?? 0,
        splitStock: data.splitStock ?? 0,
      })
      toast.success('נקנה!')
    } catch {
      toast.error('שגיאת חיבור')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-white font-black text-xl text-center mb-6">ברוכים הבאים למרקט!</h1>

      {/* Balance */}
      <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-2xl p-4 mb-8 text-center">
        <p className="text-gray-400 text-sm mb-1">היתרה שלך</p>
        <p className="text-4xl font-black text-yellow-400">🪙 {coins ?? '...'}</p>
      </div>

      {/* Header row */}
      <div className="flex items-center mb-2">
        <div className="flex-1 text-right text-white font-black text-xl pr-1">כפתורים לרכישה</div>
        <div className="w-20" />
        <div className="w-12" />
      </div>
      <div className="w-full h-px bg-dark-border mb-5" />

      {/* Items */}
      <div ref={tooltipRef} className="space-y-5">
        {SHOP_ITEMS.map((item, i) => {
          const owned = item.stockKey ? stock[item.stockKey] : 0
          const canBuy = !item.comingSoon && (coins ?? 0) >= item.cost
          const isLoading = loading === item.id
          const showTooltip = tooltip === item.id
          return (
            <div key={item.id}>
              <div className={`flex items-center ${item.comingSoon ? 'opacity-40' : ''}`}>

                {/* Logo + ? */}
                <div className="flex-1 flex items-center justify-start gap-2 pl-2">
                  <div className="relative w-36 flex justify-start">
                    <img src={item.img} alt={item.name} className={`${item.imgClass} rounded-xl shrink-0 max-w-full`} style={{ mixBlendMode: 'lighten' }} />
                    {item.comingSoon && (
                      <span className="absolute -top-1.5 -right-1.5 bg-gray-700 text-gray-300 text-[9px] font-black rounded-full px-1.5 leading-5">בקרוב</span>
                    )}
                  </div>
                  {!item.comingSoon && (
                    <div className="relative">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTooltip(showTooltip ? null : item.id) }}
                        style={{ touchAction: 'manipulation' }}
                        className="w-6 h-6 rounded-full border border-gray-600 text-gray-400 text-xs font-bold flex items-center justify-center hover:border-gray-400 hover:text-white transition-colors"
                      >
                        ?
                      </button>
                      {showTooltip && (
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10 bg-dark-100 border border-dark-border rounded-xl px-3 py-2 text-xs text-gray-300 w-44 leading-relaxed shadow-xl">
                          {item.description}
                          <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-dark-100 border-r border-t border-dark-border rotate-45" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Buy button */}
                <div className="w-20 flex flex-col items-center gap-1">
                  {!item.comingSoon && (
                    <>
                      <button
                        onClick={() => buy(item.id)}
                        disabled={!canBuy || isLoading}
                        className="w-14 h-10 rounded-xl font-black text-xs bg-yellow-500 text-black active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isLoading ? '…' : 'קנה'}
                      </button>
                      <span className="text-yellow-400 font-bold text-sm">{item.cost} 🪙</span>
                    </>
                  )}
                </div>

                {/* Owned count */}
                <div className="w-12 flex items-center justify-center">
                  {!item.comingSoon && (
                    <span className={`font-black text-2xl ${owned > 0 ? 'text-white' : 'text-gray-600'}`}>×{owned}</span>
                  )}
                </div>

              </div>
              {i < SHOP_ITEMS.length - 1 && <div className="w-full h-px bg-dark-border mt-5" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
