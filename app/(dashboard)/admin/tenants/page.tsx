'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { mockTenantsExtended } from '@/lib/mock-data'
import { 
  Building2, 
  Search, 
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react'

export default function TenantsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [planFilter, setPlanFilter] = useState<'all' | 'personal' | 'organisation'>('all')

  const [tenants, setTenants] = useState(mockTenantsExtended.filter(t => t.id !== 'tenant-1'))

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter
    const matchesPlan = planFilter === 'all' || tenant.subscription_plan === planFilter
    return matchesSearch && matchesStatus && matchesPlan
  })

  const handleActivate = (tenantId: string) => {
    setTenants(prev => prev.map(tenant => 
      tenant.id === tenantId ? { ...tenant, status: 'active' as const } : tenant
    ))
  }

  const handleSuspend = (tenantId: string) => {
    setTenants(prev => prev.map(tenant => 
      tenant.id === tenantId ? { ...tenant, status: 'suspended' as const } : tenant
    ))
  }

  const handleDelete = (tenantId: string) => {
    if (confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      setTenants(prev => prev.filter(tenant => tenant.id !== tenantId))
    }
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            Tenant Management
          </h1>
          <p className="text-muted-foreground">
            Manage all registered organizations and accounts
          </p>
        </div>
      </div>

      {/* Current Organization Info */}
      <Card className="p-4 mb-6 shadow-card bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Currently Testing As:</p>
            <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
              {mockTenantsExtended.find(t => t.id === 'tenant-2')?.name || 'Gas & Fuel Solutions Ltd'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-600 dark:text-blue-400">Status:</p>
            <Badge className="bg-green-100 text-green-700">
              {mockTenantsExtended.find(t => t.id === 'tenant-2')?.status || 'active'}
            </Badge>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Tenants</p>
              <p className="text-2xl font-bold text-foreground">{tenants.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">{tenants.filter(t => t.status === 'active').length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Suspended</p>
              <p className="text-2xl font-bold text-red-600">{tenants.filter(t => t.status === 'suspended').length}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">MRR</p>
              <p className="text-2xl font-bold text-foreground">
                ₦{(tenants.reduce((sum, t) => sum + t.monthly_revenue, 0) / 1000).toFixed(0)}K
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-secondary opacity-50" />
          </div>
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
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as any)}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Plans</option>
            <option value="personal">Personal</option>
            <option value="organisation">Organisation</option>
          </select>
        </div>
      </Card>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="overflow-hidden shadow-card hover:shadow-card-hover transition-all">
            {/* Header */}
            <div className="p-6 border-b border-border bg-primary/5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">{tenant.name}</h3>
                  <p className="text-sm text-muted-foreground">{tenant.owner_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={
                    tenant.status === 'active' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }>
                    {tenant.status}
                  </Badge>
                  <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {tenant.subscription_plan}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Users</p>
                    <p className="text-sm font-semibold text-foreground">{tenant.total_users}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Branches</p>
                    <p className="text-sm font-semibold text-foreground">{tenant.total_branches}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-sm font-semibold text-foreground">₦{(tenant.monthly_revenue / 1000).toFixed(0)}K</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Last Active</p>
                <p className="text-sm text-foreground">
                  {new Date(tenant.last_active).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-muted/50 border-t border-border flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
              {tenant.status === 'suspended' ? (
                <Button 
                  size="sm"
                  onClick={() => handleActivate(tenant.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => handleSuspend(tenant.id)}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Suspend
                </Button>
              )}
              <Button 
                size="sm"
                variant="outline"
                onClick={() => handleDelete(tenant.id)}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <Card className="p-12 text-center shadow-card">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Tenants Found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </Card>
      )}
    </div>
  )
}
