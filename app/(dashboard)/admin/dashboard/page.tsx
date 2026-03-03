'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/metric-card'
import { apiService } from '@/lib/api'
import {
  Building2,
  Users,
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any | null>(null)
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const [dashboard, activity] = await Promise.all([
        apiService.getAdminDashboard(),
        apiService.getAdminActivityLogs(),
      ])
      setStats(dashboard)
      setLogs(Array.isArray(activity) ? activity.slice(0, 5) : [])
    }
    load()
  }, [])

  const totalTenants = stats?.total_tenants ?? 0
  const activeTenants = stats?.active_tenants ?? 0
  const suspendedTenants = stats?.suspended_tenants ?? 0
  const totalRevenue = stats?.total_revenue ?? 0

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and system monitoring</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Tenants" value={totalTenants} icon={Building2} variant="primary" />
        <MetricCard
          label="Monthly Revenue"
          value={`₦${(totalRevenue / 1000).toFixed(0)}K`}
          icon={DollarSign}
          variant="secondary"
        />
        <MetricCard label="Active Tenants" value={activeTenants} icon={CheckCircle} variant="default" />
        <MetricCard label="Suspended Tenants" value={suspendedTenants} icon={AlertCircle} variant="accent" />
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
            <span className="text-2xl font-bold text-foreground">{logs.length}</span>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Recent Events</p>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-border">
          {logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{log.tenant?.name ?? 'System'}</p>
                  <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
                  {log.user?.name && (
                    <p className="text-xs text-muted-foreground mt-1">by {log.user.name}</p>
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
          {logs.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">No activity yet.</div>
          )}
        </div>
      </Card>
    </div>
  )
}
