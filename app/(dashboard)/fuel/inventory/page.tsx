'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { InventoryTable } from '@/components/shared/inventory-table'
import { MetricCard } from '@/components/dashboard/metric-card'
import { Package, Fuel, TrendingUp } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import { apiService } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Branch, FuelProduct } from '@/types'

export default function FuelInventoryPage() {
  const { user, selectedBranchId } = useAuth()
  const isOwner = user?.role === 'org_owner'
  const [products, setProducts] = useState<FuelProduct[]>([])
  const [fuelBranches, setFuelBranches] = useState<Branch[]>([])
  const [activeBranchId, setActiveBranchId] = useState<string | null>(selectedBranchId)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addForm, setAddForm] = useState({
    type: 'PMS',
    quantity: '',
    unit_price: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  })

  const resolveDefaultFuelBranchId = (branches: Branch[]) => {
    if (activeBranchId && branches.some((b) => b.id === activeBranchId)) return activeBranchId
    if (selectedBranchId && branches.some((b) => b.id === selectedBranchId)) return selectedBranchId
    if (isOwner) return branches[0]?.id ?? null
    const assigned = branches.find((b) => user?.assigned_branches?.includes(b.id))
    return assigned?.id ?? branches[0]?.id ?? null
  }

  const loadInventory = async () => {
    setIsLoading(true)
    try {
      const allBranches = await apiService.getFuelBranches()
      const branchList = (Array.isArray(allBranches) ? allBranches : []) as Branch[]
      setFuelBranches(branchList)
      const branchId = resolveDefaultFuelBranchId(branchList)
      setActiveBranchId(branchId)
      if (!branchId) {
        setProducts([])
        return
      }
      const list = await apiService.getFuelProducts(branchId)
      const normalized = (Array.isArray(list) ? list : []).map((item: any) => ({
        id: String(item.id),
        branch_id: String(item.branch_id ?? item.branchId ?? item.branch?.id ?? branchId),
        type: item.type,
        quantity: Number(item.quantity ?? 0),
        unit_price: Number(item.unit_price ?? item.unitPrice ?? 0),
        total_value: Number(item.total_value ?? item.totalValue ?? 0),
        last_updated:
          item.last_updated ??
          item.lastUpdated ??
          item.updated_at ??
          item.updatedAt ??
          item.created_at ??
          item.createdAt ??
          new Date().toISOString(),
      }))
      setProducts(normalized)
    } catch {
      toast({
        title: 'Load failed',
        description: 'Could not load fuel inventory data.',
      })
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [])

  useEffect(() => {
    const reloadBranchProducts = async () => {
      if (!activeBranchId) return
      setIsLoading(true)
      try {
        const list = await apiService.getFuelProducts(activeBranchId)
        const normalized = (Array.isArray(list) ? list : []).map((item: any) => ({
          id: String(item.id),
          branch_id: String(item.branch_id ?? item.branchId ?? item.branch?.id ?? activeBranchId),
          type: item.type,
          quantity: Number(item.quantity ?? 0),
          unit_price: Number(item.unit_price ?? item.unitPrice ?? 0),
          total_value: Number(item.total_value ?? item.totalValue ?? 0),
          last_updated:
            item.last_updated ??
            item.lastUpdated ??
            item.updated_at ??
            item.updatedAt ??
            item.created_at ??
            item.createdAt ??
            new Date().toISOString(),
        }))
        setProducts(normalized)
      } catch {
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }
    reloadBranchProducts()
  }, [activeBranchId])

  // Transform data for table
  const inventoryItems = products.map(fuel => ({
    id: fuel.id,
    name: `${fuel.type} Tank`,
    size: fuel.type,
    quantity: fuel.quantity,
    unit_price: fuel.unit_price,
    total_value: fuel.total_value,
    status: fuel.quantity > 2000 ? 'in_stock' : fuel.quantity > 500 ? 'low_stock' : 'out_of_stock',
    last_updated: (fuel as any).last_updated,
  }))

  // Calculate totals
  const totalQuantity = products.reduce((sum, fuel) => sum + fuel.quantity, 0)
  const totalValue = products.reduce((sum, fuel) => sum + fuel.total_value, 0)
  const lowStockItems = products.filter(fuel => fuel.quantity <= 500).length

  const handleAddNew = () => {
    setIsAddModalOpen(true)
  }

  const resetAddForm = () => {
    setAddForm({
      type: 'PMS',
      quantity: '',
      unit_price: '',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
    })
  }

  const handleSaveFuelInventory = (e: FormEvent) => {
    e.preventDefault()
    const quantity = Number(addForm.quantity)
    const unitPrice = Number(addForm.unit_price)

    if (!addForm.type || !quantity || !unitPrice || !addForm.date || !addForm.time) {
      toast({
        title: 'Missing details',
        description: 'Type, quantity, unit price, date, and time are required.',
      })
      return
    }

    if (quantity <= 0 || unitPrice <= 0) {
      toast({
        title: 'Invalid values',
        description: 'Quantity and unit price must be greater than zero.',
      })
      return
    }
    if (!activeBranchId) {
      toast({
        title: 'Missing branch',
        description: 'Select a fuel branch before adding inventory.',
      })
      return
    }

    setIsSubmitting(true)
    apiService.createFuelProduct({
      branch_id: activeBranchId,
      type: addForm.type as 'PMS' | 'AGO' | 'DPK',
      quantity,
      unit_price: unitPrice,
      total_value: quantity * unitPrice,
    })
    .then(async () => {
      const list = await apiService.getFuelProducts(activeBranchId)
      const normalized = (Array.isArray(list) ? list : []).map((item: any) => ({
        id: String(item.id),
        branch_id: String(item.branch_id ?? item.branchId ?? item.branch?.id ?? activeBranchId),
        type: item.type,
        quantity: Number(item.quantity ?? 0),
        unit_price: Number(item.unit_price ?? item.unitPrice ?? 0),
        total_value: Number(item.total_value ?? item.totalValue ?? 0),
        last_updated:
          item.last_updated ??
          item.lastUpdated ??
          item.updated_at ??
          item.updatedAt ??
          item.created_at ??
          item.createdAt ??
          new Date().toISOString(),
      }))
      setProducts(normalized)
      toast({
        title: 'Inventory item added',
        description: 'New fuel inventory item has been created.',
      })
      setIsAddModalOpen(false)
      resetAddForm()
    })
    .catch((error) => {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save fuel inventory item.',
      })
    })
    .finally(() => {
      setIsSubmitting(false)
    })
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Package className="w-8 h-8 text-orange-500" />
          Fuel Inventory
        </h1>
        <p className="text-muted-foreground">
          Monitor your fuel tank levels and inventory value
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Total Liters"
          value={`${(totalQuantity / 1000).toFixed(0)}K L`}
          icon={Fuel}
          variant="primary"
        />
        <MetricCard
          label="Inventory Value"
          value={`₦${(totalValue / 1000000).toFixed(2)}M`}
          icon={TrendingUp}
          variant="secondary"
        />
        <MetricCard
          label="Tank Types"
          value={products.length}
          variant="accent"
        />
      </div>

      {fuelBranches.length > 1 && (
        <Card className="p-4 mb-6 bg-muted/40 border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Label htmlFor="fuel-branch-select" className="font-semibold text-foreground">
              Fuel Branch
            </Label>
            <select
              id="fuel-branch-select"
              value={activeBranchId ?? ''}
              onChange={(e) => setActiveBranchId(e.target.value || null)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-80"
            >
              {fuelBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.location})
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Inventory Table */}
      <InventoryTable
        title="Fuel Tank Inventory"
        items={inventoryItems}
        onAddNew={handleAddNew}
        onDeleteItem={undefined}
        showDateTime
      />

      {isLoading && (
        <Card className="p-4 mt-4">
          <p className="text-sm text-muted-foreground">Loading fuel inventory...</p>
        </Card>
      )}


      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open)
          if (!open) resetAddForm()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Fuel Inventory</DialogTitle>
            <DialogDescription>Add fuel tank details to inventory.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFuelInventory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fuel-type">Fuel Type</Label>
              <select
                id="fuel-type"
                value={addForm.type}
                onChange={(e) => setAddForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="PMS">PMS</option>
                <option value="AGO">AGO</option>
                <option value="DPK">DPK</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-qty">Quantity (L)</Label>
              <Input
                id="fuel-qty"
                type="number"
                min="1"
                value={addForm.quantity}
                onChange={(e) => setAddForm((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder="e.g. 2000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-unit-price">Unit Price</Label>
              <Input
                id="fuel-unit-price"
                type="number"
                min="1"
                value={addForm.unit_price}
                onChange={(e) => setAddForm((prev) => ({ ...prev, unit_price: e.target.value }))}
                placeholder="e.g. 700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-date">Date</Label>
              <Input
                id="fuel-date"
                type="date"
                value={addForm.date}
                onChange={(e) => setAddForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-time">Time</Label>
              <Input
                id="fuel-time"
                type="time"
                value={addForm.time}
                onChange={(e) => setAddForm((prev) => ({ ...prev, time: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? 'Saving...' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
