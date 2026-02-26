'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X, CreditCard } from 'lucide-react'
import { useAuth } from '@/context/auth-context'

export function SubscriptionReminder() {
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if current date is between 27-29
    const today = new Date()
    const dayOfMonth = today.getDate()
    
    // Show reminder on days 27, 28, 29 of any month
    // Temporarily show for testing - remove this line later
    if ((dayOfMonth >= 27 && dayOfMonth <= 29) || true) {
      if (user?.role !== 'super_admin') {
        setIsVisible(true)
      }
    }
  }, [user])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border-red-200 border-2">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h2 className="text-xl font-bold text-red-800 dark:text-red-400">
                Payment Reminder
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="mb-6">
            <p className="text-red-700 dark:text-red-300 mb-4">
              Your monthly subscription payment is due soon. Please ensure your payment is processed to avoid service interruption.
            </p>
            
            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-red-800 dark:text-red-400">Payment Due</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                Monthly subscription renewal is required by the end of this month.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setIsVisible(false)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Pay Now
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsVisible(false)}
              className="border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Remind Later
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}