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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'
import {
  mockBranches,
  mockFuelProducts,
  mockShiftReconciliation,
  mockUsers,
} from '@/lib/mock-data'
import {
  addBranch,
  getAllBranches,
  removeBranch,
  updateBranch,
} from '@/lib/branch-store'
import {
  Archive,
  Eye,
  Fuel,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react'

export default function FuelBranchesPage() {
  const [branches, setBranches] = useState(mockBranches)
  const fuelBranches = useMemo(
    () => branches.filter((branch) => branch.type === 'fuel'),
    [branches]
  )

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

  useEffect(() => {
    setBranches(getAllBranches())
  }, [])

  const getManagerName = (managerId: string) => {
    if (!managerId || managerId === 'unassigned') return 'Unassigned'
    const match = Object.values(mockUsers).find((user) => user.id === managerId)
    if (match?.name) return match.name
    return managerId
  }

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId) || null,
    [branches, selectedBranchId]
  )

  const branchInventoryValue = selectedBranch
    ? mockFuelProducts
        .filter((product) => product.branch_id === selectedBranch.id)
        .reduce((sum, product) => sum + product.total_value, 0)
    : 0
  const branchSalesValue = selectedBranch
    ? mockShiftReconciliation
        .filter((shift) => shift.branch_id === selectedBranch.id)
        .reduce((sum, shift) => sum + shift.sales_amount, 0)
    : 0
  const branchShifts = selectedBranch
    ? mockShiftReconciliation.filter((shift) => shift.branch_id === selectedBranch.id)
    : []

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
      managerName: getManagerName(branch.manager_id),
      status: branch.status,
    })
    setIsEditOpen(true)
  }

  const handleArchive = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId)
    if (!branch) return
    const updated = { ...branch, status: 'inactive' as const }
    updateBranch(updated)
    setBranches((prev) => prev.map((b) => (b.id === branchId ? updated : b)))
    toast({ title: 'Station archived', description: `${branch.name} marked inactive.` })
  }

  const handleDelete = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId)
    if (!branch) return
    removeBranch(branchId)
    setBranches((prev) => prev.filter((b) => b.id !== branchId))
    toast({ title: 'Station deleted', description: `${branch.name} removed.` })
  }

  const handleCreateBranch = (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData.name.trim() || !formData.location.trim()) {
      toast({
        title: 'Missing details',
        description: 'Station name and location are required.',
      })
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      const newBranch = {
        id: `branch-${Date.now()}`,
        tenant_id: 'tenant-2',
        name: formData.name.trim(),
        type: 'fuel' as const,
        location: formData.location.trim(),
        status: 'active' as const,
        manager_id: formData.managerName.trim() || 'unassigned',
        created_at: new Date().toISOString(),
      }
      addBranch(newBranch)
      setBranches((prev) => [newBranch, ...prev])
      setIsSubmitting(false)
      setIsCreateOpen(false)
      setFormData({ name: '', location: '', managerName: '' })
      toast({
        title: 'Station created',
        description: 'Your fuel station has been added (mock).',
      })
    }, 400)
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Fuel className="w-8 h-8 text-orange-500" />
            Fuel Stations
          </h1>
          <p className="text-muted-foreground">Manage and monitor all fuel distribution stations</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsCreateOpen(true)}>
          Create Station
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fuelBranches.map((branch) => (
          <Card key={branch.id} className="overflow-hidden border-border/60 shadow-sm hover:shadow-card transition-all group bg-background">
            <div className="h-1.5 w-full bg-orange-500/60" />
            <div className="p-5 border-b border-border/60 bg-orange-500/5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-orange-500/15 text-orange-600">
                    <Fuel className="w-5 h-5" />
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
                <div className="mt-1 h-7 w-7 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Location</p>
                  <p className="text-sm text-foreground">{branch.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 h-7 w-7 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Manager</p>
                  <p className="text-sm text-foreground">{getManagerName(branch.manager_id)}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border/60 bg-orange-500/5 flex gap-2">
              <button
                className="flex-1 px-3 py-2 text-sm font-medium text-orange-700 border border-orange-500/30 hover:bg-orange-600 hover:text-white rounded-lg transition-colors"
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

      {fuelBranches.length === 0 && (
        <Card className="p-12 text-center shadow-card">
          <Fuel className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Fuel Stations</h3>
          <p className="text-muted-foreground mb-6">Get started by creating your first fuel distribution station.</p>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsCreateOpen(true)}>
            Create Your First Station
          </Button>
        </Card>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Fuel Station</DialogTitle>
            <DialogDescription>Add a new fuel station. You can update details later.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateBranch}>
            <div className="space-y-2">
              <Label htmlFor="fuel-branch-name">Station Name</Label>
              <Input
                id="fuel-branch-name"
                placeholder="Victoria Island Fuel Station"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel-branch-location">Location</Label>
              <Input
                id="fuel-branch-location"
                placeholder="Lagos, Nigeria"
                value={formData.location}
                onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel-branch-manager">Manager Name (optional)</Label>
              <Input
                id="fuel-branch-manager"
                placeholder="Fuel Station Manager"
                value={formData.managerName}
                onChange={(event) => setFormData((prev) => ({ ...prev, managerName: event.target.value }))}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Station'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Station Details</DialogTitle>
            <DialogDescription>Overview and recent activity for this station.</DialogDescription>
          </DialogHeader>
          {selectedBranch && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Station</p>
                  <p className="text-base font-semibold text-foreground">{selectedBranch.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedBranch.location}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Manager</p>
                  <p className="text-base font-semibold text-foreground">{getManagerName(selectedBranch.manager_id)}</p>
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
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Shifts</p>
                  <p className="text-lg font-semibold text-foreground">{branchShifts.length}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border/60">
                <div className="px-4 py-3 border-b border-border/60">
                  <h4 className="text-sm font-semibold text-foreground">Recent Shifts</h4>
                </div>
                <div className="divide-y divide-border/60">
                  {branchShifts.slice(0, 5).map((shift) => (
                    <div key={shift.id} className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">Shift {shift.shift_number}</span>
                        <span className="text-foreground">₦{shift.sales_amount.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Pump {shift.pump_id}</p>
                    </div>
                  ))}
                  {branchShifts.length === 0 && (
                    <div className="px-4 py-4 text-sm text-muted-foreground">No shifts yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Station</DialogTitle>
            <DialogDescription>Update station details and save changes.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!selectedBranch) return
              const updated = {
                ...selectedBranch,
                name: editData.name.trim(),
                location: editData.location.trim(),
                manager_id: editData.managerName.trim() || 'unassigned',
                status: editData.status,
              }
              updateBranch(updated)
              setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
              setIsEditOpen(false)
              toast({ title: 'Station updated', description: `${updated.name} saved.` })
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="edit-fuel-name">Station Name</Label>
              <Input
                id="edit-fuel-name"
                value={editData.name}
                onChange={(event) => setEditData((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fuel-location">Location</Label>
              <Input
                id="edit-fuel-location"
                value={editData.location}
                onChange={(event) => setEditData((prev) => ({ ...prev, location: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fuel-manager">Manager Name</Label>
              <Input
                id="edit-fuel-manager"
                value={editData.managerName}
                onChange={(event) => setEditData((prev) => ({ ...prev, managerName: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fuel-status">Status</Label>
              <select
                id="edit-fuel-status"
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
