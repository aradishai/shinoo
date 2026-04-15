import { BottomNav } from '@/components/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark">
      <main className="max-w-md mx-auto pb-24 min-h-screen">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
