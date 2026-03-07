'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { apiService } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

type TenantAlert = {
  id: string
  name: string
  owner_email: string
  owner_name: string
  plan: string
  days_since_start: number
  billing_cycle_start: string
  payment_reminder_sent: boolean
  status: 'reminder' | 'overdue'
}

export function BillingNotifications() {
  const [alerts, setAlerts] = useState<TenantAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadAlerts = async () => {
    try {
      const data = await apiService.getTenantsNeedingAttention()
      setAlerts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load billing alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleRecordPayment = async (tenantId: string, tenantName: string) => {
    try {
      await apiService.recordPayment(tenantId)
      toast({
        title: 'Payment recorded',
        description: `Payment for ${tenantName} has been recorded successfully.`,
      })
      loadAlerts()
    } catch (error) {
      toast({
        title: 'Failed to record payment',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Loading billing alerts...</p>
      </Card>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card className="p-6 bg-green-50 dark:bg-green-900/20 border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-700 dark:text-green-400 font-medium">
            All tenants are up to date with payments
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <AlertCircle className="w-6 h-6 text-orange-500" />
        <h3 className="text-lg font-semibold text-foreground">
          Payment Reminders ({alerts.length})
        </h3>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border ${
              alert.status === 'overdue'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-semibold text-foreground">{alert.name}</p>
                  <Badge
                    className={
                      alert.status === 'overdue'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }
                  >
                    {alert.status === 'overdue' ? 'OVERDUE' : 'REMINDER'}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700">
                    {alert.plan.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  Owner: {alert.owner_name} ({alert.owner_email})
                </p>
                <p className="text-sm text-muted-foreground">
                  Days since billing start: <span className="font-semibold">{alert.days_since_start}</span>
                </p>
                {alert.payment_reminder_sent && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ✓ Reminder sent to tenant
                  </p>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => handleRecordPayment(alert.id, alert.name)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Record Payment
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
