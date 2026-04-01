'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { InventoryTable } from '@/components/shared/inventory-table'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiService } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Package } from 'lucide-react'

interface DailyGasRecord {
  id: string
  branch_id: string
  date: string
  time: string
  opening_stock: number
  delivered: number
  sold: number
  closing_stock: number
  notes: string
}

interface DailyGasRecord {
  id: string
  branch_id: string
  date: string
  time: string
  opening_stock: number
  delivered: number
  sold: number
  closing_stock: number
  notes: string
}

type GasInventoryItem = {
  id: string
  branch_id: string
  size: string
  status: string
  quantity: number
  purchase_price: number
  selling_price: number
  last_updated: string
}

export default function GasInventoryPage() {
  const { user, selectedBranchId } = useAuth()
  const isOwner = user?.role === 'org_owner'
  const isPersonalOwner = isOwner && user?.subscription_plan === 'personal'
  const canManageInventory = !isOwner || isPersonalOwner

  const [branches, setBranches] = useState<any[]>([])
  const [activeBranchId, setActiveBranchId] = useState<string>('')
  const [cylinders, setCylinders] = useState<GasInventoryItem[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    tank: '',
    quantity: '',
    purchase_price: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  })

  const loadBranches = async () => {
    const gasBranchData = await apiService.getBranchesByType('gas').catch(() => [])
    const gasList = Array.isArray(gasBranchData) ? gasBranchData : []

    const scoped =
      user?.role === 'gas_manager' && (user.assigned_branches?.length ?? 0) > 0
        ? gasList.filter((branch: any) => user.assigned_branches.includes(branch.id))
        : gasList

    setBranches(scoped)

    const nextBranchId =
      (selectedBranchId && scoped.some((b: any) => b.id === selectedBranchId) && selectedBranchId) ||
      user?.assigned_branches?.find((id) => scoped.some((b: any) => b.id === id)) ||
      scoped[0]?.id ||
      ''

    setActiveBranchId(nextBranchId)
    return nextBranchId
  }

  const loadCylinders = async (branchId: string) => {
    if (!branchId) {
      setCylinders([])
      return
    }
    const data = await apiService.getGasCylinders(branchId).catch(() => [])
    const list = Array.isArray(data) ? data : []
    setCylinders(
      list.map((item: any) => ({
        id: String(item.id),
        branch_id: String(item.branch?.id ?? item.branch_id ?? branchId),
        size: String(item.size ?? ''),
        status: String(item.status ?? 'in_stock'),
        quantity: Number(item.quantity ?? 0),
        purchase_price: Number(item.purchase_price ?? 0),
        selling_price: Number(item.selling_price ?? 0),
        last_updated: String(item.last_updated ?? item.created_at ?? new Date().toISOString()),
      }))
    )
  }

  const mapDailyActivities = (items: any[], branchId: string): DailyGasRecord[] => {
    return []
  }

  const loadDailyRecords = async (branchId: string) => {
    // Removed
  }

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const branchId = await loadBranches()
        await loadCylinders(branchId)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user?.id, selectedBranchId])

  useEffect(() => {
    if (!activeBranchId) return
    loadCylinders(activeBranchId)
  }, [activeBranchId])

  const inventoryItems = useMemo(
    () =>
      cylinders.map((cyl) => ({
        id: cyl.id,
        name: `${cyl.size} Tank`,
        size: cyl.size,
        quantity: cyl.quantity,
        unit_price: cyl.purchase_price,
        total_value: cyl.quantity * cyl.purchase_price,
        status:
          cyl.quantity > 100 ? 'in_stock' : cyl.quantity > 20 ? 'low_stock' : 'out_of_stock',
        last_updated: cyl.last_updated,
      })),
    [cylinders]
  )

  const currentLeft = 0
  const totalGasEntered = 0
  const totalSold = 0
  const today = new Date().toISOString().slice(0, 10)
  const todayRecord = null

  const resetForm = () => {
    setFormData({
      tank: '',
      quantity: '',
      purchase_price: '',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
    })
  }

  const handleAddNew = async () => {
    let branchId = activeBranchId
    if (!branchId) {
      branchId = await loadBranches()
    }
    if (!branchId) {
      toast({
        title: 'No branch available',
        description: isPersonalOwner
          ? 'Please refresh and try again. Your personal outlet is being initialized.'
          : 'Create or select a gas branch first.',
      })
      return
    }
    setIsAddModalOpen(true)
  }

  const handleDeleteItem = (id: string) => {
    setCylinders((prev) => prev.filter((item) => item.id !== id))
    toast({
      title: 'Inventory item removed',
      description: 'Delete endpoint is not available yet; item removed locally.',
    })
  }

  const handleSaveCylinder = async (e: FormEvent) => {
    e.preventDefault()
    const tank = formData.tank.trim()
    const quantity = Number(formData.quantity)
    const purchasePrice = Number(formData.purchase_price)

    if (!tank || !quantity || !purchasePrice || !formData.date || !formData.time) {
      toast({
        title: 'Missing details',
        description: 'Please fill tank, quantity, purchase price, date, and time.',
      })
      return
    }

    if (quantity <= 0 || purchasePrice <= 0) {
      toast({
        title: 'Invalid values',
        description: 'All numeric values must be greater than zero.',
      })
      return
    }

    if (!activeBranchId) {
      toast({
        title: 'No branch selected',
        description: 'Select a branch first.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await apiService.createGasCylinder({
        branch_id: activeBranchId,
        size: tank,
        status: 'in_stock',
        quantity,
        purchase_price: purchasePrice,
        selling_price: purchasePrice,
      })
      await loadCylinders(activeBranchId)
      toast({
        title: 'Tank added',
        description: 'New tank inventory item has been created.',
      })
      setIsAddModalOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Failed to add tank',
        description: error instanceof Error ? error.message : 'Request failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetDailyForm = () => {}

  const formatDay = (dateString: string) => ''

  const handleSaveDailyRecord = async (e: FormEvent) => {}

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Package className="w-8 h-8 text-secondary" />
          Gas Inventory
        </h1>
        <p className="text-muted-foreground">Manage cylinder inventory.</p>
      </div>

      {isOwner && !isPersonalOwner && branches.length > 0 && (
        <Card className="p-4 mb-6 bg-muted/50 border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Label className="font-semibold text-foreground">Select Branch:</Label>
            <select
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-80"
            >
              {branches.map((branch: any) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.location})
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      <InventoryTable
        title="Cylinder Inventory"
        items={inventoryItems}
        onAddNew={canManageInventory ? handleAddNew : undefined}
        onDeleteItem={canManageInventory ? handleDeleteItem : undefined}
        quantityLabel="Current Stock Level"
        unitPriceLabel="Price per Kg"
        totalValueLabel="Tank Value"
        showDateTime
      />

      {isLoading ? (
        <Card className="p-4 mt-6 shadow-card">
          <p className="text-muted-foreground">Loading gas inventory...</p>
        </Card>
      ) : null}

      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Tank Inventory</DialogTitle>
            <DialogDescription>Enter the tank details to add a new inventory item.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCylinder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tank">Tank</Label>
              <Input
                id="tank"
                value={formData.tank}
                onChange={(e) => setFormData((prev) => ({ ...prev, tank: e.target.value }))}
                placeholder="e.g. 12.5kg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Current Stock Level</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder="e.g. 40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_price">Price per Kg</Label>
              <Input
                id="purchase_price"
                type="number"
                min="1"
                value={formData.purchase_price}
                onChange={(e) => setFormData((prev) => ({ ...prev, purchase_price: e.target.value }))}
                placeholder="e.g. 1200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventory-date">Date</Label>
              <Input
                id="inventory-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventory-time">Time</Label>
              <Input
                id="inventory-time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
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
