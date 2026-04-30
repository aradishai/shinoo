import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { SwRegister } from '@/components/sw-register'
import './globals.css'

export const metadata: Metadata = {
  title: 'SHINOO! | ניחושי כדורגל',
  description: 'תחרות ניחושי כדורגל עם חברים — מונדיאל 2026',
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: '#FF2D78',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SHINOO!',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-heebo antialiased bg-dark text-white min-h-screen">
        <SwRegister />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1E1E1E',
              color: '#ffffff',
              border: '1px solid #2A2A2A',
              fontFamily: 'Heebo, sans-serif',
              direction: 'rtl',
            },
            success: {
              iconTheme: {
                primary: '#00C853',
                secondary: '#000',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
