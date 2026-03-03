'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiService } from '@/lib/api'
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Download,
} from 'lucide-react'

export default function BillingPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const [tenantData, billingData] = await Promise.all([
        apiService.getTenants(),
        apiService.getAdminBilling(),
      ])
      setTenants(Array.isArray(tenantData) ? tenantData : [])
      setPayments(Array.isArray(billingData) ? billingData : [])
    }
    load()
  }, [])

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
  const activeSubscriptions = tenants.filter((t) => t.status === 'active').length
  const failedPayments = payments.filter((p) => p.status === 'failed').length

  const orgTenants = tenants.filter((t) => t.subscription_plan === 'organisation')
  const personalTenants = tenants.filter((t) => t.subscription_plan === 'personal')
  const orgRevenue = payments
    .filter((p) => p.plan_type === 'organisation')
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
  const personalRevenue = payments
    .filter((p) => p.plan_type === 'personal')
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0)

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            Billing & Revenue
          </h1>
          <p className="text-muted-foreground">Track subscriptions, payments, and revenue</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 bg-green-100 dark:bg-green-900/20 border-0 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Monthly Revenue</p>
          <p className="text-3xl font-bold text-foreground">₦{(totalRevenue / 1000).toFixed(0)}K</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +15.2% from last month
          </p>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Active Subscriptions</p>
          <p className="text-3xl font-bold text-foreground">{activeSubscriptions}</p>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Failed Payments</p>
          <p className="text-3xl font-bold text-red-600">{failedPayments}</p>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Annual Revenue</p>
          <p className="text-3xl font-bold text-foreground">₦{((totalRevenue * 12) / 1000000).toFixed(1)}M</p>
        </Card>
      </div>

      {/* Plan Breakdown */}
      <Card className="p-6 mb-8 shadow-card">
        <h3 className="text-lg font-semibold text-foreground mb-6">Subscription Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border border-border rounded-lg bg-blue-100 dark:bg-blue-900/20">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-foreground">Organisation Plan</h4>
              <Badge className="bg-blue-600 text-white">Premium</Badge>
            </div>
            <p className="text-3xl font-bold text-foreground mb-2">{orgTenants.length}</p>
            <p className="text-sm text-muted-foreground mb-4">Active subscriptions</p>
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              <p className="text-xl font-bold text-foreground">₦{(orgRevenue / 1000).toFixed(0)}K</p>
            </div>
          </div>

          <div className="p-6 border border-border rounded-lg bg-orange-100 dark:bg-orange-900/20">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-foreground">Personal Plan</h4>
              <Badge className="bg-orange-600 text-white">Basic</Badge>
            </div>
            <p className="text-3xl font-bold text-foreground mb-2">{personalTenants.length}</p>
            <p className="text-sm text-muted-foreground mb-4">Active subscriptions</p>
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              <p className="text-xl font-bold text-foreground">₦{(personalRevenue / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Payments */}
      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Recent Payments
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Invoice</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Tenant</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Plan</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-right font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-mono text-foreground">{payment.invoice_number}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{payment.tenant?.name ?? '-'}</p>
                  </td>
                  <td className="px-6 py-4 text-foreground">{payment.plan_type}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-foreground">₦{Number(payment.amount ?? 0).toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      className={
                        payment.status === 'paid'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }
                    >
                      {payment.status === 'paid' ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <AlertCircle className="w-3 h-3 mr-1" />
                      )}
                      {payment.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Invoice
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
