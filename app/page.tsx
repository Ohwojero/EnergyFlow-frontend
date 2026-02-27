'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlanSelector } from '@/components/auth/plan-selector'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Flame, Fuel, TrendingUp, Zap } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [showPlanSelector, setShowPlanSelector] = useState(false)

  if (showPlanSelector) {
    return <PlanSelector onSelectPlan={(plan) => router.push(`/signup?plan=${plan}`)} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">EnergyFlow</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Gas & Fuel Operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/login')} size="sm" className="text-xs sm:text-sm">
              Sign In
            </Button>
            <Button onClick={() => setShowPlanSelector(true)} size="sm" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Start Free Trial</span>
              <span className="sm:hidden">Start Trial</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-100/40 dark:bg-slate-900/20" />
        <div className="absolute -top-24 -left-10 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-10 right-0 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground mb-6">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Real-time visibility across branches
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">
                Run your gas and fuel business in one clean dashboard.
              </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl">
                Track inventory, sales, and performance across all branches without messy spreadsheets or manual reconciliation.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => setShowPlanSelector(true)}
                  className="font-semibold px-7"
                >
                  Get Started
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/login')}
                  className="px-7"
                >
                  Sign In
                </Button>
              </div>
            </div>

            <Card className="p-6 bg-blue-100 dark:bg-blue-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Today</p>
                    <p className="text-xl font-semibold text-foreground">Operations Snapshot</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Flame className="w-4 h-4 text-primary" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Fuel className="w-4 h-4 text-secondary" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-blue-50/70 dark:bg-blue-900/20 p-4">
                    <p className="text-xs text-muted-foreground">Gas Branches</p>
                    <p className="text-2xl font-semibold text-foreground">2</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="rounded-xl bg-green-50/70 dark:bg-green-900/20 p-4">
                    <p className="text-xs text-muted-foreground">Fuel Stations</p>
                    <p className="text-2xl font-semibold text-foreground">2</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="rounded-xl bg-orange-50/70 dark:bg-orange-900/20 p-4 col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Daily Sales</p>
                    <p className="text-2xl font-semibold text-foreground">₦0.80M</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div className="h-2 w-2/3 rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Minimal Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-5">
          <Card className="p-6 bg-blue-100 dark:bg-blue-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
            <div className="bg-primary/10 w-11 h-11 rounded-lg flex items-center justify-center mb-4">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">Gas Operations</h3>
            <p className="text-sm text-muted-foreground">
              Cylinder inventory, refills, and sales all in one place.
            </p>
          </Card>
          <Card className="p-6 bg-green-100 dark:bg-green-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
            <div className="bg-secondary/10 w-11 h-11 rounded-lg flex items-center justify-center mb-4">
              <Fuel className="w-5 h-5 text-secondary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">Fuel Operations</h3>
            <p className="text-sm text-muted-foreground">
              Track pump sales, tank levels, and reconciliation.
            </p>
          </Card>
          <Card className="p-6 bg-orange-100 dark:bg-orange-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
            <div className="bg-accent/10 w-11 h-11 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">Branch Insights</h3>
            <p className="text-sm text-muted-foreground">
              Compare performance across all locations instantly.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/30 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-foreground">EnergyFlow</h3>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-xs sm:text-sm">
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </button>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </button>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                Support
              </button>
            </div>
            <span className="text-xs text-muted-foreground text-center">
              © 2026 EnergyFlow. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
