import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
// import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/context/auth-context'
import { Toaster } from '@/components/ui/toaster'
import { PwaInstallButton } from '@/components/pwa-install-button'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'EnergyFlow - Gas & Fuel Management SaaS',
  description: 'Multi-branch SaaS platform for managing LPG Gas Plants and Fuel Stations',
  generator: 'v0.app',
  manifest: '/manifest.json',
  themeColor: '#0ea5e9',
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  keywords: ['energy', 'fuel', 'gas', 'management', 'SaaS', 'PWA'],
  openGraph: {
    title: 'EnergyFlow - Gas & Fuel Management SaaS',
    description: 'Multi-branch SaaS platform for managing LPG Gas Plants and Fuel Stations',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}>
        <AuthProvider>
          {children}
          <Toaster />
          <PwaInstallButton />
        </AuthProvider>
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
