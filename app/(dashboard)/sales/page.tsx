'use client'

import { redirect } from 'next/navigation'
import { useAuth } from '@/context/auth-context'

export default function SalesPage() {
  const { user, selectedBranchType } = useAuth()

  if (user?.role === 'org_owner') {
    redirect('/transactions')
  }

  // Redirect to appropriate sales page based on branch type
  if (selectedBranchType === 'gas') {
    redirect('/gas/sales')
  } else if (selectedBranchType === 'fuel') {
    redirect('/fuel/sales')
  }

  return null
}
