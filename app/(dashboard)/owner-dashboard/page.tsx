'use client'

import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import PersonalOwnerDashboard from '@/components/dashboard/PersonalOwnerDashboard'

export default function OwnerDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect non-personal owners to regular dashboard
    if (user && (user.subscription_plan !== 'personal' || user.role !== 'org_owner')) {
      router.push('/dashboard')
      return
    }
  }, [user, router])

  // Show loading while checking user
  if (!user) {
    return (
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Only render for personal plan owners
  if (user.subscription_plan === 'personal' && user.role === 'org_owner') {
    return <PersonalOwnerDashboard />
  }

  return null
}