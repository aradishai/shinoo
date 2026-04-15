'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function CreateLeaguePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<{ id: string; username: string }[]>([])
  const [searchResults, setSearchResults] = useState<{ id: string; username: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createdLeague, setCreatedLeague] = useState<{ id: string; name: string; inviteCode: string } | null>(null)

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      const results = (data.data || []).filter(
        (u: { id: string; username: string }) =>
          !selectedMembers.find((m) => m.id === u.id)
      )
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setMemberSearch(q)
    searchUsers(q)
  }

  const addMember = (user: { id: string; username: string }) => {
    setSelectedMembers((prev) => [...prev, user])
    setSearchResults([])
    setMemberSearch('')
  }

  const removeMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('יש להזין שם לליגה')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          memberUsernames: selectedMembers.map((m) => m.username),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'שגיאה ביצירת ליגה')
        return
      }

      toast.success('הליגה נוצרה!')
      setCreatedLeague({
        id: data.data.id,
        name: data.data.name,
        inviteCode: data.data.inviteCode,
      })
    } catch {
      toast.error('שגיאת חיבור')
    } finally {
      setLoading(false)
    }
  }

  const copyInviteCode = () => {
    if (!createdLeague) return
    navigator.clipboard.writeText(createdLeague.inviteCode)
    toast.success('הקוד הועתק!')
  }

  const shareOnWhatsApp = () => {
    if (!createdLeague) return
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const message = `הצטרף לליגת "${createdLeague.name}" ב-SHINU!\n\nקוד הזמנה: ${createdLeague.inviteCode}\n\nכנס ל: ${appUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (createdLeague) {
    return (
      <div className="px-4 py-6">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-white font-black text-2xl mb-2">הליגה נוצרה!</h1>
          <p className="text-gray-400">הזמן חברים עם הקוד הבא</p>
        </div>

        {/* Invite Code */}
        <div className="bg-dark-card border border-primary/30 rounded-2xl p-6 mb-6 text-center">
          <p className="text-gray-400 text-sm mb-3">קוד ההזמנה שלך</p>
          <div className="text-4xl font-black text-primary tracking-widest mb-4 font-mono">
            {createdLeague.inviteCode}
          </div>
          <button
            onClick={copyInviteCode}
            className="bg-dark-50 border border-dark-border text-white px-6 py-2.5 rounded-xl hover:border-primary/30 transition-all text-sm font-medium"
          >
            העתק קוד
          </button>
        </div>

        {/* WhatsApp Share */}
        <button
          onClick={shareOnWhatsApp}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 mb-6 active:scale-95 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          שתף בווטסאפ
        </button>

        <Link
          href={`/leagues/${createdLeague.id}`}
          className="block text-center bg-primary text-black font-black py-4 rounded-xl hover:bg-primary-400 active:scale-95 transition-all"
        >
          כנס לליגה
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/leagues" className="text-gray-400 hover:text-white transition-colors">
          ← חזרה
        </Link>
        <h1 className="text-white font-black text-xl">צור ליגה</h1>
        <div className="w-12" />
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        {/* League Name */}
        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2 text-right">
            שם הליגה
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: חבורת הכדורגל"
            maxLength={50}
            autoFocus
            className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:border-primary focus:outline-none transition-colors text-right"
            disabled={loading}
          />
        </div>

        {/* Add Members */}
        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2 text-right">
            הוסף חברים (אופציונלי)
          </label>

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 justify-end">
              {selectedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-1.5 bg-primary/20 border border-primary/30 text-primary px-3 py-1.5 rounded-full text-sm"
                >
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    className="hover:text-red-400 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                  <span>{member.username}</span>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={memberSearch}
              onChange={handleSearchChange}
              placeholder="חפש לפי שם משתמש..."
              className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:border-primary focus:outline-none transition-colors text-right"
              disabled={loading}
            />
            {searching && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                מחפש...
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-dark-card border border-dark-border rounded-xl overflow-hidden">
              {searchResults.slice(0, 5).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => addMember(user)}
                  className="w-full text-right px-4 py-3 hover:bg-dark-50 transition-colors text-white border-b border-dark-border last:border-b-0"
                >
                  {user.username}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-dark-50 rounded-xl p-4 text-right">
          <p className="text-gray-400 text-sm">
            אחרי יצירת הליגה תקבל קוד הזמנה לשיתוף עם חברים.
          </p>
          <p className="text-gray-500 text-xs mt-1">
            ניתן להוסיף חברים גם אחרי היצירה.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-primary text-black font-black text-lg py-4 rounded-xl hover:bg-primary-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-green"
        >
          {loading ? 'יוצר...' : 'צור ליגה'}
        </button>
      </form>
    </div>
  )
}
