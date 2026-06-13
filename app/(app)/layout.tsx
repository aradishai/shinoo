import { BottomNav } from '@/components/bottom-nav'
import { PushRegister } from '@/components/push-register'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark">
      <main className="max-w-md mx-auto pb-24 min-h-screen overflow-x-hidden">
        {children}
      </main>
      <BottomNav />
      <PushRegister />
    </div>
  )
}
