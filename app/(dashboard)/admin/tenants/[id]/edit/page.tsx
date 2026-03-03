'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiService } from '@/lib/api'
import { ArrowLeft, Building2, Save } from 'lucide-react'

export default function EditTenantPage() {
  type FormData = {
    name: string
    owner_name: string
    owner_email: string
    branch_types: ('gas' | 'fuel')[]
  }

  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string

  const [tenant, setTenant] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const getErrorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Request failed')
  const [formData, setFormData] = useState<FormData>({
    name: '',
    owner_name: '',
    owner_email: '',
    branch_types: [],
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadTenant = async () => {
      setIsLoading(true)
      setLoadError('')
      try {
        const data = await apiService.getTenantById(tenantId)
        setTenant(data)
        setFormData({
          name: data?.name ?? '',
          owner_name: data?.owner_name ?? '',
          owner_email: data?.owner_email ?? '',
          branch_types: data?.branch_types ?? [],
        })
      } catch (e) {
        setLoadError(getErrorMessage(e))
      } finally {
        setIsLoading(false)
      }
    }
    loadTenant()
  }, [tenantId])

  if (isLoading) {
    return (
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="p-6 shadow-card">
          <p className="text-muted-foreground">Loading tenant...</p>
        </Card>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="p-6 shadow-card">
          <p className="text-red-600">{loadError}</p>
        </Card>
      </div>
    )
  }

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

  const handleSave = async () => {
    setIsSaving(true)
    setActionError('')
    try {
      await apiService.updateTenant(tenantId, formData)
      router.push(`/admin/tenants/${tenantId}`)
    } catch (e) {
      setActionError(getErrorMessage(e))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        {actionError && (
          <Card className="p-4 mb-4 shadow-card">
            <p className="text-red-600">{actionError}</p>
          </Card>
        )}
        <Button variant="outline" onClick={() => router.push(`/admin/tenants/${tenantId}`)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Edit Tenant Details</h1>
        <p className="text-muted-foreground">Update tenant information</p>
      </div>

      {/* Form */}
      <Card className="p-6 md:p-8 shadow-card">
        <div className="space-y-6">
          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Organization Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter organization name"
            />
          </div>

          {/* Owner Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Owner Name</label>
            <input
              type="text"
              value={formData.owner_name}
              onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter owner name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
            <input
              type="email"
              value={formData.owner_email}
              onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter email address"
            />
          </div>

          {/* Branch info (organisation only) */}
          {tenant.subscription_plan === 'organisation' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Branch Types</label>
              <div className="flex gap-4">
                {(['gas', 'fuel'] as const).map((type) => (
                  <label key={type} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.branch_types.includes(type)}
                      onChange={(e) => {
                        const newTypes = e.target.checked
                          ? [...formData.branch_types, type]
                          : formData.branch_types.filter((t) => t !== type)
                        setFormData({ ...formData, branch_types: newTypes })
                      }}
                      className="form-checkbox"
                    />
                    <span className="capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Status (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Current Status</label>
            <div className="flex items-center gap-2">
              <Badge
                className={
                  tenant.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }
              >
                {tenant.status}
              </Badge>
              <p className="text-sm text-muted-foreground">(Use Suspend/Activate buttons to change)</p>
            </div>
          </div>

          {/* Plan (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Subscription Plan</label>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 capitalize">
                {tenant.subscription_plan}
              </Badge>
              <p className="text-sm text-muted-foreground">(Use Change Plan button to modify)</p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border flex gap-3">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={() => router.push(`/admin/tenants/${tenantId}`)} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
