'use client'

import { Card } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/metric-card'
import { mockTenantsExtended, mockActivityLogs } from '@/lib/mock-data'
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'

export default function SuperAdminDashboard() {
  const totalTenants = mockTenantsExtended.length - 1 // Exclude admin tenant
  const activeTenants = mockTenantsExtended.filter(t => t.status === 'active' && t.id !== 'tenant-1').length
  const suspendedTenants = mockTenantsExtended.filter(t => t.status === 'suspended').length
  const totalRevenue = mockTenantsExtended.reduce((sum, t) => sum + t.monthly_revenue, 0)
  const totalBranches = mockTenantsExtended.reduce((sum, t) => sum + t.total_branches, 0)
  const totalUsers = mockTenantsExtended.reduce((sum, t) => sum + t.total_users, 0)

  // Growth calculation (mock)
  const growthRate = 23.5

  // Recent signups (last 7 days)
  const recentSignups = mockTenantsExtended.filter(t => {
    const created = new Date(t.created_at)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return created > weekAgo && t.id !== 'tenant-1'
  }).length

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform overview and system monitoring
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Tenants"
          value={totalTenants}
          icon={Building2}
          trend={{ value: growthRate, isPositive: true }}
          variant="primary"
        />
        <MetricCard
          label="Monthly Revenue"
          value={`₦${(totalRevenue / 1000).toFixed(0)}K`}
          icon={DollarSign}
          trend={{ value: 15.2, isPositive: true }}
          variant="secondary"
        />
        <MetricCard
          label="Active Tenants"
          value={activeTenants}
          icon={CheckCircle}
          variant="default"
        />
        <MetricCard
          label="Total Users"
          value={totalUsers}
          icon={Users}
          variant="accent"
        />
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6 bg-green-100 dark:bg-green-900/20 border-0 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            <span className="text-2xl font-bold text-foreground">{activeTenants}</span>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Active Accounts</p>
        </Card>

        <Card className="p-6 bg-red-100 dark:bg-red-900/20 border-0 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            <span className="text-2xl font-bold text-foreground">{suspendedTenants}</span>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Suspended Accounts</p>
        </Card>

        <Card className="p-6 bg-blue-100 dark:bg-blue-900/20 border-0 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span className="text-2xl font-bold text-foreground">{recentSignups}</span>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">New This Week</p>
        </Card>
      </div>

      {/* Platform Stats */}
      <Card className="p-6 mb-8 shadow-card">
        <h3 className="text-lg font-semibold text-foreground mb-6">Platform Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-3xl font-bold text-foreground mb-2">{totalBranches}</p>
            <p className="text-sm text-muted-foreground">Total Branches</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-3xl font-bold text-foreground mb-2">{totalUsers}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-3xl font-bold text-foreground mb-2">
              {mockTenantsExtended.filter(t => t.subscription_plan === 'organisation' && t.id !== 'tenant-1').length}
            </p>
            <p className="text-sm text-muted-foreground">Organization Plans</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-3xl font-bold text-foreground mb-2">
              {mockTenantsExtended.filter(t => t.subscription_plan === 'personal').length}
            </p>
            <p className="text-sm text-muted-foreground">Personal Plans</p>
          </div>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-border">
          {mockActivityLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{log.tenant_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
                  {log.user_name && (
                    <p className="text-xs text-muted-foreground mt-1">by {log.user_name}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
