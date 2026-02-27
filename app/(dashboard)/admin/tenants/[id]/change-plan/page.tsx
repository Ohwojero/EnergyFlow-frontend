'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { mockTenantsExtended } from '@/lib/mock-data'
import { ArrowLeft, Building2, Check } from 'lucide-react'

const PLANS = [
  {
    id: 'personal',
    name: 'Personal',
    description: 'For individual gas station operators',
    price: '₦5,000/month',
    features: [
      'Up to 1 branch',
      'Basic inventory tracking',
      'Sales reports',
      'Email support'
    ]
  },
  {
    id: 'organisation',
    name: 'Organisation',
    description: 'For multi-branch operations',
    price: '₦25,000/month',
    features: [
      'Unlimited branches',
      'Advanced analytics',
      'Team management',
      'Priority support',
      'API access'
    ]
  }
]

export default function ChangePlanPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string

  const tenant = mockTenantsExtended.find(t => t.id === tenantId)
  const [selectedPlan, setSelectedPlan] = useState<'personal' | 'organisation'>(tenant?.subscription_plan || 'personal')
  const [isProcessing, setIsProcessing] = useState(false)

  if (!tenant) {
    return (
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="p-12 text-center shadow-card">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Tenant Not Found</h3>
          <Button onClick={() => router.push('/admin/tenants')} className="mt-4">
            Back to Tenants
          </Button>
        </Card>
      </div>
    )
  }

  const handleChangePlan = async () => {
    if (selectedPlan === tenant.subscription_plan) {
      alert('Please select a different plan')
      return
    }

    setIsProcessing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    alert(`Plan changed to ${selectedPlan} successfully!`)
    setIsProcessing(false)
    router.push(`/admin/tenants/${tenantId}`)
  }

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Button 
          variant="outline" 
          onClick={() => router.push(`/admin/tenants/${tenantId}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Change Subscription Plan</h1>
        <p className="text-muted-foreground">
          Current plan: <span className="capitalize font-semibold text-foreground">{tenant.subscription_plan}</span>
        </p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`p-6 md:p-8 shadow-card cursor-pointer transition-all ${
              selectedPlan === plan.id
                ? 'border-2 border-primary ring-2 ring-primary/20'
                : 'border border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedPlan(plan.id as 'personal' | 'organisation')}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              {selectedPlan === plan.id && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <div className="mb-4 pb-4 border-b border-border">
              <p className="text-2xl font-bold text-foreground">{plan.price}</p>
            </div>

            <ul className="space-y-3">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>

            {tenant.subscription_plan === plan.id && (
              <div className="mt-4 pt-4 border-t border-border">
                <Badge variant="outline" className="bg-primary/10">
                  Current Plan
                </Badge>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Actions */}
      <Card className="p-6 md:p-8 shadow-card bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              Will change to: <span className="capitalize font-bold">{selectedPlan}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Changes will take effect immediately
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              onClick={handleChangePlan}
              disabled={isProcessing || selectedPlan === tenant.subscription_plan}
              className="flex-1 sm:flex-none"
            >
              {isProcessing ? 'Processing...' : 'Change Plan'}
            </Button>
            <Button
              onClick={() => router.push(`/admin/tenants/${tenantId}`)}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
