'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { mockTenantsExtended } from '@/lib/mock-data'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { SubscriptionReminder } from '@/components/subscription-reminder'
import { Card } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  // Check if user's tenant is suspended
  const userTenant = mockTenantsExtended.find(t => t.id === user?.tenant_id)
  const isSuspended = userTenant?.status === 'suspended'

  if (isSuspended && user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center border-red-200 bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="w-16 h-16 mx-auto text-red-600 mb-4" />
          <h1 className="text-2xl font-bold text-red-800 dark:text-red-400 mb-2">
            Account Suspended
          </h1>
          <p className="text-red-700 dark:text-red-300 mb-6">
            Your account has been suspended. Please contact support for assistance.
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Organization: {userTenant?.name}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Subscription Reminder Modal */}
      <SubscriptionReminder />
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64">
        <Sidebar />
      </div>

      {/* Mobile Navigation */}
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header
          onMenuToggle={() => setMobileNavOpen(!mobileNavOpen)}
          showMenuButton={true}
        />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
