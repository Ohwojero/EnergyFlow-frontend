'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'
import { apiService } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import {
  Archive,
  Eye,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Wind,
} from 'lucide-react'

export default function GasBranchesPage() {
  const { user } = useAuth()
  const isPersonalOwner = user?.role === 'org_owner' && user?.subscription_plan === 'personal'
  const [branches, setBranches] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [gasSalesTransactions, setGasSalesTransactions] = useState<any[]>([])
  const [gasCylinders, setGasCylinders] = useState<any[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    managerName: '',
  })

  const [editData, setEditData] = useState({
    name: '',
    location: '',
    managerName: '',
    status: 'active' as 'active' | 'inactive',
  })

  const gasBranches = useMemo(
    () => branches.filter((branch) => branch.type === 'gas'),
    [branches]
  )

  const getErrorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Request failed')

  const loadData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [branchData, userData] = await Promise.all([
        apiService.getBranchesByType('gas'),
        apiService.getUsers().catch(() => []),
      ])
      const branchList = Array.isArray(branchData) ? branchData : []
      setBranches(branchList)
      setUsers(Array.isArray(userData) ? userData : [])

      const [salesLists, cylLists] = await Promise.all([
        Promise.all(branchList.map((b: any) => apiService.getGasSales(b.id).catch(() => []))),
        Promise.all(branchList.map((b: any) => apiService.getGasCylinders(b.id).catch(() => []))),
      ])
      setGasSalesTransactions(salesLists.flat())
      setGasCylinders(cylLists.flat())
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getManagerName = (branch: any) => {
    const typedManagerName = String(branch?.manager_name ?? '').trim()
    if (typedManagerName) return typedManagerName
    const managerId =
      branch?.manager?.id ??
      branch?.manager?.user_id ??
      branch?.manager_id ??
      branch?.managerId
    if (!managerId || managerId === 'unassigned') return 'Unassigned'
    const match = users.find((user) => user.id === managerId)
    if (match?.name) return match.name
    if (branch?.manager?.name) return branch.manager.name
    if (branch?.manager?.email) return branch.manager.email
    return 'Unassigned'
  }

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId) || null,
    [branches, selectedBranchId]
  )

  const belongsToSelectedBranch = (record: any) => {
    if (!selectedBranch) return false
    const recordBranchId =
      record?.branch?.id ?? record?.branch_id ?? record?.branchId ?? null
    return String(recordBranchId ?? '') === String(selectedBranch.id)
  }

  const branchInventoryValue = selectedBranch
    ? gasCylinders
        .filter((cyl) => belongsToSelectedBranch(cyl))
        .reduce((sum, cyl) => sum + Number(cyl.quantity ?? 0) * Number(cyl.selling_price ?? 0), 0)
    : 0
  const branchSalesValue = selectedBranch
    ? gasSalesTransactions
        .filter((t) => belongsToSelectedBranch(t))
        .reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
    : 0
  const branchTransactions = useMemo(() => {
    if (!selectedBranch) return []
    return gasSalesTransactions
      .filter((transaction) => belongsToSelectedBranch(transaction))
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }, [selectedBranch, gasSalesTransactions])
  const branchTransactionCount = branchTransactions.length
  const branchTransactionsByMonth = useMemo(() => {
    const groups: Record<string, any[]> = {}
    branchTransactions.forEach((t) => {
      const createdAt = t?.created_at ? new Date(t.created_at) : new Date()
      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [branchTransactions])

  const openDetails = (branchId: string) => {
    setSelectedBranchId(branchId)
    setIsDetailsOpen(true)
  }

  const openEdit = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId)
    if (!branch) return
    setSelectedBranchId(branchId)
    setEditData({
      name: branch.name,
      location: branch.location,
      managerName: getManagerName(branch),
      status: branch.status,
    })
    setIsEditOpen(true)
  }

  const handleArchive = async (branchId: string) => {
    try {
      await apiService.archiveBranch(branchId)
      await loadData()
      toast({
        title: 'Branch archived',
        description: 'Branch status has been set to inactive.',
      })
    } catch (e) {
      toast({
        title: 'Archive failed',
        description: getErrorMessage(e),
      })
    }
  }

  const handleDelete = async (branchId: string) => {
    if (!window.confirm('Delete this branch? This action cannot be undone.')) {
      return
    }
    try {
      await apiService.deleteBranch(branchId)
      await loadData()
      toast({
        title: 'Branch deleted',
        description: 'Branch has been removed successfully.',
      })
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: getErrorMessage(e),
      })
    }
  }

  const handleCreateBranch = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData.name.trim() || !formData.location.trim() || !formData.managerName.trim()) {
      toast({
        title: 'Missing details',
        description: 'Branch name, location, and manager name are required.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const currentUserId = (user as any)?.id ?? (user as any)?.user_id ?? null
      await apiService.createBranch({
        name: formData.name.trim(),
        type: 'gas',
        location: formData.location.trim(),
        manager_name: formData.managerName.trim(),
        ...(currentUserId ? { manager_id: currentUserId } : {}),
      })
      await loadData()
      setIsCreateOpen(false)
      setFormData({ name: '', location: '', managerName: '' })
      toast({
        title: 'Branch created',
        description: 'Your gas branch has been added.',
      })
    } catch (e) {
      toast({
        title: 'Failed to create branch',
        description: getErrorMessage(e),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      {isPersonalOwner && (
        <Card className="p-4 mb-6 shadow-card">
          <p className="text-muted-foreground">
            Personal plan does not support branch management.
          </p>
        </Card>
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Wind className="w-8 h-8 text-secondary" />
            Gas Branches
          </h1>
          <p className="text-muted-foreground">Manage and monitor all gas distribution branches</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsCreateOpen(true)} disabled={isPersonalOwner}>
          Create Branch
        </Button>
      </div>

      {error && (
        <Card className="p-4 mb-6 shadow-card">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-4 mb-6 shadow-card">
          <p className="text-muted-foreground">Loading gas branches...</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gasBranches.map((branch) => (
          <Card key={branch.id} className="overflow-hidden border-border/60 shadow-sm hover:shadow-card transition-all group bg-background">
            <div className="h-1.5 w-full bg-emerald-500/60" />
            <div className="p-5 border-b border-border/60 bg-emerald-500/5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/15 text-emerald-600">
                    <Wind className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{branch.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{branch.status}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openDetails(branch.id)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(branch.id)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleArchive(branch.id)}>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(branch.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Location</p>
                  <p className="text-sm text-foreground">{branch.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Manager</p>
                  <p className="text-sm text-foreground">{getManagerName(branch)}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border/60 bg-emerald-500/5 flex gap-2">
              <button
                className="flex-1 px-3 py-2 text-sm font-medium text-emerald-700 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
                onClick={() => openDetails(branch.id)}
              >
                View Details
              </button>
              <button
                className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                onClick={() => openEdit(branch.id)}
              >
                Edit
              </button>
            </div>
          </Card>
        ))}
      </div>

      {gasBranches.length === 0 && !isLoading && (
        <Card className="p-12 text-center shadow-card">
          <Wind className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Gas Branches</h3>
          <p className="text-muted-foreground mb-6">Get started by creating your first gas distribution branch.</p>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsCreateOpen(true)}>
            Create Your First Branch
          </Button>
        </Card>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Gas Branch</DialogTitle>
            <DialogDescription>Add a new gas distribution branch. You can update details later.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateBranch}>
            <div className="space-y-2">
              <Label htmlFor="gas-branch-name">Branch Name</Label>
              <Input
                id="gas-branch-name"
                placeholder="Lagos Gas Plant"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gas-branch-location">Location</Label>
              <Input
                id="gas-branch-location"
                placeholder="Lagos, Nigeria"
                value={formData.location}
                onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gas-branch-manager">Manager Name</Label>
              <Input
                id="gas-branch-manager"
                placeholder="Gas Branch Manager"
                value={formData.managerName}
                onChange={(event) => setFormData((prev) => ({ ...prev, managerName: event.target.value }))}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Branch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Branch Details</DialogTitle>
            <DialogDescription>Overview and recent activity for this branch.</DialogDescription>
          </DialogHeader>
          {selectedBranch && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Branch</p>
                  <p className="text-base font-semibold text-foreground">{selectedBranch.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedBranch.location}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Manager</p>
                  <p className="text-base font-semibold text-foreground">{getManagerName(selectedBranch)}</p>
                  <p className="text-sm text-muted-foreground capitalize">{selectedBranch.status}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Sales</p>
                  <p className="text-lg font-semibold text-foreground">₦{branchSalesValue.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Inventory</p>
                  <p className="text-lg font-semibold text-foreground">₦{branchInventoryValue.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Transactions</p>
                  <p className="text-lg font-semibold text-foreground">{branchTransactionCount.toLocaleString()}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 px-4">
                <Accordion type="single" collapsible defaultValue="recent-transactions">
                  <AccordionItem value="recent-transactions" className="border-b-0">
                    <AccordionTrigger className="py-3 text-sm font-semibold text-foreground hover:no-underline">
                      Recent Transactions
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      {branchTransactions.length === 0 ? (
                        <div className="px-1 py-4 text-sm text-muted-foreground">No transactions yet.</div>
                      ) : (
                        <div className="space-y-4">
                          {branchTransactionsByMonth.map(([monthKey, monthItems]) => {
                            const monthDate = new Date(`${monthKey}-01`)
                            const monthLabel = monthDate.toLocaleDateString('en-NG', {
                              month: 'long',
                              year: 'numeric',
                            })
                            return (
                              <div key={monthKey} className="rounded-md border border-border/60">
                                <div className="px-3 py-2 border-b border-border/60 bg-muted/30 text-xs font-semibold text-muted-foreground">
                                  {monthLabel}
                                </div>
                                <div className="divide-y divide-border/60">
                                  {monthItems.slice(0, 5).map((t) => {
                                    const qty = Number(t?.quantity ?? 0)
                                    const recordedSize = String(t?.cylinder_size ?? t?.size ?? '').trim()
                                    const itemSize = qty > 0 ? `${qty}kg` : recordedSize || 'Gas Sale'
                                    return (
                                      <div key={t.id} className="px-3 py-3 text-sm">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-foreground">{itemSize}</span>
                                          <span className="text-foreground">₦{Number(t.amount ?? 0).toLocaleString()}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground capitalize">{t.type}</p>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>Update branch details and save changes.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (!selectedBranchId) return
              const managerName = editData.managerName.trim()
              if (!managerName) {
                toast({
                  title: 'Missing manager name',
                  description: 'Manager name is required.',
                })
                return
              }
              try {
                await apiService.updateBranch(selectedBranchId, {
                  name: editData.name.trim(),
                  location: editData.location.trim(),
                  status: editData.status,
                  manager_name: managerName,
                })
                await loadData()
                setIsEditOpen(false)
                toast({
                  title: 'Branch updated',
                  description: 'Branch details were updated successfully.',
                })
              } catch (e) {
                toast({
                  title: 'Update failed',
                  description: getErrorMessage(e),
                })
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="edit-branch-name">Branch Name</Label>
              <Input
                id="edit-branch-name"
                value={editData.name}
                onChange={(event) => setEditData((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-branch-location">Location</Label>
              <Input
                id="edit-branch-location"
                value={editData.location}
                onChange={(event) => setEditData((prev) => ({ ...prev, location: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-branch-manager">Manager Name</Label>
              <Input
                id="edit-branch-manager"
                value={editData.managerName}
                onChange={(event) => setEditData((prev) => ({ ...prev, managerName: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-branch-status">Status</Label>
              <select
                id="edit-branch-status"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editData.status}
                onChange={(event) =>
                  setEditData((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
