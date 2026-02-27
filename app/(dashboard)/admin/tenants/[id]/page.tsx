'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { mockTenantsExtended, mockActivityLogs } from '@/lib/mock-data'
import { 
  ArrowLeft,
  Building2, 
  Users, 
  Calendar,
  Mail,
  TrendingUp,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Activity
} from 'lucide-react'

export default function TenantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string
  
  const [tenants, setTenants] = useState(mockTenantsExtended)
  
  const tenant = tenants.find(t => t.id === tenantId)
  
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

  const handleSuspend = () => {
    if (confirm('Are you sure you want to suspend this account?')) {
      setTenants(prev => prev.map(t => 
        t.id === tenantId ? { ...t, status: 'suspended' as const } : t
      ))
    }
  }

  const handleActivate = () => {
    if (confirm('Are you sure you want to activate this account?')) {
      setTenants(prev => prev.map(t => 
        t.id === tenantId ? { ...t, status: 'active' as const } : t
      ))
    }
  }

  const handleEditDetails = () => {
    router.push(`/admin/tenants/${tenantId}/edit`)
  }

  const handleChangePlan = () => {
    router.push(`/admin/tenants/${tenantId}/change-plan`)
  }

  const handleViewInvoices = () => {
    router.push(`/admin/billing?tenant=${tenantId}`)
  }

  const handleDeleteAccount = () => {
    if (confirm('This action is irreversible. Are you sure you want to permanently delete this account and all its data?')) {
      setTenants(prev => prev.filter(t => t.id !== tenantId))
      router.push('/admin/tenants')
    }
  }

  const tenantLogs = mockActivityLogs.filter(log => log.tenant_id === tenantId)

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto max-h-screen">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Button 
          variant="outline" 
          onClick={() => router.push('/admin/tenants')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tenants
        </Button>
        
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 break-words">{tenant.name}</h1>
            <p className="text-muted-foreground text-sm md:text-base break-all">{tenant.owner_email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
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

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <Card className="p-4 md:p-6 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 md:w-8 h-6 md:h-8 text-primary opacity-50" />
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Users</p>
          <p className="text-xl md:text-3xl font-bold text-foreground">{tenant.total_users}</p>
        </Card>

        <Card className="p-4 md:p-6 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <Building2 className="w-6 md:w-8 h-6 md:h-8 text-secondary opacity-50" />
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Branches</p>
          <p className="text-xl md:text-3xl font-bold text-foreground">{tenant.total_branches}</p>
        </Card>

        <Card className="p-4 md:p-6 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 md:w-8 h-6 md:h-8 text-green-600 opacity-50" />
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mb-1">Monthly Revenue</p>
          <p className="text-xl md:text-3xl font-bold text-foreground">₦{(tenant.monthly_revenue / 1000).toFixed(0)}K</p>
        </Card>

        <Card className="p-4 md:p-6 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-6 md:w-8 h-6 md:h-8 text-orange-600 opacity-50" />
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mb-1">Member Since</p>
          <p className="text-base md:text-lg font-bold text-foreground">
            {new Date(tenant.created_at).toLocaleDateString()}
          </p>
        </Card>
      </div>

      {/* Details & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Tenant Information */}
        <Card className="lg:col-span-2 p-4 md:p-6 shadow-card">
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6">Tenant Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Organization Name</p>
                <p className="font-medium text-foreground text-sm md:text-base break-words">{tenant.name}</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Owner Name</p>
                <p className="font-medium text-foreground text-sm md:text-base break-words">{tenant.owner_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Email Address</p>
                <p className="font-medium text-foreground flex items-center gap-2 text-sm md:text-base break-all">
                  <Mail className="w-3 md:w-4 h-3 md:h-4 flex-shrink-0" />
                  {tenant.owner_email}
                </p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Subscription Plan</p>
                <p className="font-medium text-foreground capitalize text-sm md:text-base">{tenant.subscription_plan}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Branch Types</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tenant.branch_types.length > 0 ? (
                    tenant.branch_types.map(type => (
                      <Badge key={type} variant="outline" className="capitalize text-xs">
                        {type}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs md:text-sm text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Last Active</p>
                <p className="font-medium text-foreground text-sm md:text-base break-words">
                  {new Date(tenant.last_active).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Registration Date</p>
                <p className="font-medium text-foreground text-sm md:text-base">
                  {new Date(tenant.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Account Status</p>
                <Badge className={
                  tenant.status === 'active' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }>
                  {tenant.status}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <Card className="p-4 md:p-6 shadow-card">
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6">Actions</h3>
          <div className="space-y-3">
            {tenant.status === 'suspended' ? (
              <Button 
                onClick={handleActivate} 
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Activate Account
              </Button>
            ) : (
              <Button 
                onClick={handleSuspend} 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Suspend Account
              </Button>
            )}
            
            <Button 
              onClick={handleEditDetails}
              variant="outline" 
              className="w-full text-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Details
            </Button>
            
            <Button 
              onClick={handleChangePlan}
              variant="outline" 
              className="w-full text-sm"
            >
              Change Plan
            </Button>
            
            <Button 
              onClick={handleViewInvoices}
              variant="outline" 
              className="w-full text-sm"
            >
              View Invoices
            </Button>
            
            <Button 
              onClick={handleDeleteAccount}
              variant="outline" 
              className="w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </Card>
      </div>

      {/* Activity Log */}
      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-border">
          {tenantLogs.length > 0 ? (
            tenantLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{log.description}</p>
                    {log.user_name && (
                      <p className="text-sm text-muted-foreground mt-1">by {log.user_name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No activity recorded yet</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
