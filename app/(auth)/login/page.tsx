'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast.error('יש למלא את כל השדות')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'שגיאה בהתחברות')
        return
      }

      toast.success('ברוך הבא!')
      router.push('/')
      router.refresh()
    } catch {
      toast.error('שגיאת חיבור')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark field-bg flex flex-col items-center justify-center px-5 py-10">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="relative inline-block">
          <h1 className="text-6xl font-black tracking-tight">
            <span className="text-white">SH</span>
            <span className="text-primary">I</span>
            <span className="text-white">N</span>
            <span className="text-primary">U</span>
            <span className="text-secondary">!</span>
          </h1>
          <div className="absolute -inset-4 bg-primary/5 blur-2xl rounded-full -z-10" />
        </div>
        <p className="text-gray-400 mt-2 text-sm">תחרות ניחושי מונדיאל עם חברים</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="bg-dark-card border border-dark-border rounded-3xl p-7 shadow-card">
          <h2 className="text-white font-bold text-xl mb-6 text-center">התחבר</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2 text-right">
                שם משתמש
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="הכנס שם משתמש"
                autoComplete="username"
                autoFocus
                className="w-full bg-dark-50 border border-dark-border rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:border-primary focus:outline-none transition-colors text-right"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2 text-right">
                סיסמה
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הכנס סיסמה"
                autoComplete="current-password"
                className="w-full bg-dark-50 border border-dark-border rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:border-primary focus:outline-none transition-colors text-right"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-black font-black text-lg py-4 rounded-xl hover:bg-primary-400 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2 shadow-green"
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            אין לך חשבון?{' '}
            <Link
              href="/register"
              className="text-primary font-bold hover:underline"
            >
              הירשם עכשיו
            </Link>
          </p>
        </div>

        {/* Decorative football */}
        <div className="text-center mt-8 text-4xl opacity-20 select-none">⚽</div>
      </div>
    </div>
  )
}
