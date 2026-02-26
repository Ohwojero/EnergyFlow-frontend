'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface PlanSelectorProps {
  onSelectPlan: (plan: 'personal' | 'organisation') => void
}

export function PlanSelector({ onSelectPlan }: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<'personal' | 'organisation' | null>(null)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Choose Your Plan
          </h1>
          <p className="text-base text-muted-foreground">
            Select the perfect plan for your business needs
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Personal Plan */}
          <Card
            className={`p-6 cursor-pointer border-2 transition-all bg-green-50 dark:bg-green-900/20 ${
              selectedPlan === 'personal'
                ? 'border-green-500 bg-green-100 dark:bg-green-900/30'
                : 'border-green-200 dark:border-green-800 hover:border-green-400'
            }`}
            onClick={() => setSelectedPlan('personal')}
          >
            <div className="mb-4">
              <h2 className="text-xl font-bold text-foreground mb-1">Personal Plan</h2>
              <p className="text-sm text-muted-foreground">Perfect for single location businesses</p>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">₦50,000</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">No additional fees</p>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Single Branch</p>
                  <p className="text-xs text-muted-foreground">Choose Gas or Fuel (one location)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Complete Inventory Management</p>
                  <p className="text-xs text-muted-foreground">Full tracking and reporting</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Sales & Purchase Tracking</p>
                  <p className="text-xs text-muted-foreground">Monitor all transactions</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Basic Reports</p>
                  <p className="text-xs text-muted-foreground">Essential analytics and insights</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => onSelectPlan('personal')}
              className={`w-full font-semibold text-sm ${
                selectedPlan === 'personal'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 hover:bg-green-300 dark:hover:bg-green-700'
              }`}
            >
              Get Started
            </Button>
          </Card>

          {/* Organisation Plan */}
          <Card
            className={`p-6 cursor-pointer border-2 transition-all relative bg-orange-50 dark:bg-orange-900/20 ${
              selectedPlan === 'organisation'
                ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/30'
                : 'border-orange-200 dark:border-orange-800 hover:border-orange-400'
            }`}
            onClick={() => setSelectedPlan('organisation')}
          >
            {/* Recommended Badge */}
            <div className="absolute -top-3 right-4 bg-secondary text-white px-3 py-1 rounded-full text-xs font-semibold">
              Recommended
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-bold text-foreground mb-1">Organisation Plan</h2>
              <p className="text-sm text-muted-foreground">For growing multi-branch businesses</p>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">₦100,000</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Base price, scalable with usage</p>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Multiple Branches</p>
                  <p className="text-xs text-muted-foreground">Unlimited Gas & Fuel locations</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Advanced Inventory</p>
                  <p className="text-xs text-muted-foreground">Multi-location synchronization</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Staff Management</p>
                  <p className="text-xs text-muted-foreground">Role-based access control</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Advanced Reports</p>
                  <p className="text-xs text-muted-foreground">Comprehensive analytics and insights</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => onSelectPlan('organisation')}
              className={`w-full font-semibold text-sm ${
                selectedPlan === 'organisation'
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 hover:bg-orange-300 dark:hover:bg-orange-700'
              }`}
            >
              Get Started
            </Button>
          </Card>
        </div>

        {/* Info Text */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Need to upgrade or downgrade? You can change your plan anytime from your account.
          </p>
          <p className="text-xs text-muted-foreground">
            All plans include 30-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  )
}
