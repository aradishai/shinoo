'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim() || !password) {
      toast.error('יש למלא את כל השדות')
      return
    }

    if (password !== confirmPassword) {
      toast.error('הסיסמאות אינן תואמות')
      return
    }


    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'שגיאה בהרשמה')
        return
      }

      toast.success('ברוך הבא לשינוּ!')
      localStorage.setItem('show_onboarding', '1')
      window.location.href = '/'
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
        <img src="/shinoo-title.png" alt="SHINOO" className="h-36 w-auto mx-auto" style={{ mixBlendMode: 'lighten' }} />
        <p className="text-gray-500 mt-1 text-xs tracking-wide">כדורגל | הימורים | חברים</p>
        <p className="text-gray-400 mt-1 text-sm">- ליגת ניחושי משחקים עם חברים -</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="bg-dark-card border border-dark-border rounded-3xl p-7 shadow-card">
          <h2 className="text-white font-bold text-xl mb-6 text-center">צור חשבון</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2 text-right">
                שם משתמש
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="כל שם שתרצה"
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
                placeholder="בחר סיסמה"
                autoComplete="new-password"
                className="w-full bg-dark-50 border border-dark-border rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:border-primary focus:outline-none transition-colors text-right"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2 text-right">
                אימות סיסמה
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="הכנס שוב את הסיסמה"
                autoComplete="new-password"
                className="w-full bg-dark-50 border border-dark-border rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:border-primary focus:outline-none transition-colors text-right"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-black font-black text-lg py-4 rounded-xl hover:bg-primary-400 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2 shadow-green"
            >
              {loading ? 'נרשם...' : 'הירשם'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            יש לך חשבון?{' '}
            <Link
              href="/login"
              className="text-primary font-bold hover:underline"
            >
              התחבר
            </Link>
          </p>
        </div>

        
      </div>
    </div>
  )
}
