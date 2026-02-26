'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { mockActivityLogs } from '@/lib/mock-data'
import { 
  Activity, 
  Search, 
  Download,
  Filter,
  LogIn,
  Plus,
  ShoppingCart,
  AlertTriangle,
  Package
} from 'lucide-react'

export default function ActivityLogsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')

  const filteredLogs = mockActivityLogs.filter(log => {
    const matchesSearch = log.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.user_name && log.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    return matchesSearch && matchesAction
  })

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return LogIn
      case 'create_branch': return Plus
      case 'sale_transaction': return ShoppingCart
      case 'account_suspended': return AlertTriangle
      case 'inventory_update': return Package
      default: return Activity
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'create_branch': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'sale_transaction': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
      case 'account_suspended': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      case 'inventory_update': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
    }
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Activity Logs
          </h1>
          <p className="text-muted-foreground">
            Monitor system-wide activities and events
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Logs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 shadow-card">
          <p className="text-sm text-muted-foreground mb-1">Total Events</p>
          <p className="text-2xl font-bold text-foreground">{mockActivityLogs.length}</p>
        </Card>
        <Card className="p-4 shadow-card">
          <p className="text-sm text-muted-foreground mb-1">Today</p>
          <p className="text-2xl font-bold text-foreground">
            {mockActivityLogs.filter(log => {
              const logDate = new Date(log.timestamp)
              const today = new Date()
              return logDate.toDateString() === today.toDateString()
            }).length}
          </p>
        </Card>
        <Card className="p-4 shadow-card">
          <p className="text-sm text-muted-foreground mb-1">This Week</p>
          <p className="text-2xl font-bold text-foreground">
            {mockActivityLogs.filter(log => {
              const logDate = new Date(log.timestamp)
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              return logDate > weekAgo
            }).length}
          </p>
        </Card>
        <Card className="p-4 shadow-card">
          <p className="text-sm text-muted-foreground mb-1">Critical Events</p>
          <p className="text-2xl font-bold text-red-600">
            {mockActivityLogs.filter(log => log.action === 'account_suspended').length}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6 shadow-card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Actions</option>
            <option value="login">Login</option>
            <option value="create_branch">Create Branch</option>
            <option value="sale_transaction">Sale Transaction</option>
            <option value="inventory_update">Inventory Update</option>
            <option value="account_suspended">Account Suspended</option>
          </select>

          {/* Date Range */}
          <input
            type="date"
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Timestamp</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Tenant</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">User</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Action</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Description</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const ActionIcon = getActionIcon(log.action)
                return (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{log.tenant_name}</p>
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      {log.user_name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getActionColor(log.action)}>
                        <ActionIcon className="w-3 h-3 mr-1" />
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                      {log.ip_address}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Logs Found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
