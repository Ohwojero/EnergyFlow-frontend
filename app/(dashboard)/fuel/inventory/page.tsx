'use client'

import { useState, type FormEvent } from 'react'
import { mockFuelProducts } from '@/lib/mock-data'
import { InventoryTable } from '@/components/shared/inventory-table'
import { MetricCard } from '@/components/dashboard/metric-card'
import { Package, Fuel, TrendingUp } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
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

interface DailyFuelRecord {
  id: string
  date: string
  time: string
  opening_stock: number
  delivered: number
  sold: number
  closing_stock: number
  notes: string
}

export default function FuelInventoryPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'org_owner'
  const [products, setProducts] = useState(mockFuelProducts)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addForm, setAddForm] = useState({
    type: 'PMS',
    quantity: '',
    unit_price: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  })
  const [dailyRecords, setDailyRecords] = useState<DailyFuelRecord[]>([])
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false)
  const [dailyForm, setDailyForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    delivered: '',
    sold: '',
    notes: '',
  })

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
  const currentLeft = dailyRecords[0]?.closing_stock ?? 0
  const totalFuelEntered = dailyRecords.reduce((sum, item) => sum + item.delivered, 0)
  const totalSold = dailyRecords.reduce((sum, item) => sum + item.sold, 0)
  const today = new Date().toISOString().slice(0, 10)
  const todayRecord = dailyRecords.find((record) => record.date === today)

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

    setIsSubmitting(true)
    try {
      const nextProduct = {
        id: `fuel-${Date.now()}`,
        branch_id: products[0]?.branch_id ?? 'branch-3',
        type: addForm.type as 'PMS' | 'AGO' | 'DPK',
        quantity,
        unit_price: unitPrice,
        total_value: quantity * unitPrice,
        last_updated: new Date(`${addForm.date}T${addForm.time}:00`).toISOString(),
      }

      setProducts((prev) => [nextProduct, ...prev])
      toast({
        title: 'Inventory item added',
        description: 'New fuel inventory item has been created.',
      })
      setIsAddModalOpen(false)
      resetAddForm()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = (id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id))
    toast({
      title: 'Inventory item deleted',
      description: 'Selected fuel inventory item was removed.',
    })
  }

  const resetDailyForm = () => {
    setDailyForm({
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      delivered: '',
      sold: '',
      notes: '',
    })
  }

  const formatDay = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const handleSaveDailyRecord = (e: FormEvent) => {
    e.preventDefault()
    const delivered = Number(dailyForm.delivered)
    const sold = Number(dailyForm.sold)

    if (!dailyForm.date || !dailyForm.time || Number.isNaN(delivered) || Number.isNaN(sold)) {
      toast({
        title: 'Missing details',
        description: 'Date, time, total fuel, and sold are required.',
      })
      return
    }

    if (delivered < 0 || sold < 0) {
      toast({
        title: 'Invalid values',
        description: 'Values cannot be negative.',
      })
      return
    }

    const openingStock = dailyRecords[0]?.closing_stock ?? 0
    const totalFuel = openingStock + delivered
    if (sold > totalFuel) {
      toast({
        title: 'Invalid sold value',
        description: `Sold cannot be greater than total fuel (${totalFuel} L).`,
      })
      return
    }

    const nextRecord: DailyFuelRecord = {
      id: `daily-fuel-${Date.now()}`,
      date: dailyForm.date,
      time: dailyForm.time,
      opening_stock: openingStock,
      delivered,
      sold,
      closing_stock: totalFuel - sold,
      notes: dailyForm.notes.trim(),
    }

    setDailyRecords((prev) =>
      [nextRecord, ...prev].sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime())
    )
    toast({
      title: 'Daily fuel record saved',
      description: 'Total fuel, sold, and left were calculated successfully.',
    })
    setIsDailyModalOpen(false)
    resetDailyForm()
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
          value={mockFuelProducts.length}
          variant="accent"
        />
      </div>

      {/* Inventory Table */}
      <InventoryTable
        title="Fuel Tank Inventory"
        items={inventoryItems}
        onAddNew={isOwner ? undefined : handleAddNew}
        onDeleteItem={isOwner ? undefined : handleDeleteItem}
        showDateTime
      />

      <Card className="shadow-card mt-8">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Daily Fuel Operations</h3>
            <p className="text-sm text-muted-foreground">
              System calculates left stock from opening, total fuel, and sold.
            </p>
          </div>
          {!isOwner && (
            <Button onClick={() => setIsDailyModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Record Day
            </Button>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-border">
          <div className="rounded-lg bg-blue-100 dark:bg-blue-900/20 p-4">
            <p className="text-xs text-muted-foreground uppercase">Left (Current)</p>
            <p className="text-2xl font-bold text-foreground mt-1">{currentLeft} L</p>
          </div>
          <div className="rounded-lg bg-green-100 dark:bg-green-900/20 p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Fuel Entered</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalFuelEntered} L</p>
          </div>
          <div className="rounded-lg bg-orange-100 dark:bg-orange-900/20 p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Sold</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalSold} L</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-border">
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Fuel Today</p>
            <p className="text-2xl font-bold text-foreground mt-1">{todayRecord?.delivered ?? 0} L</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground uppercase">Sold Today</p>
            <p className="text-2xl font-bold text-foreground mt-1">{todayRecord?.sold ?? 0} L</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date & Time</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Total Fuel</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Sold</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Left</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {dailyRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <p className="text-muted-foreground">No daily records yet.</p>
                  </td>
                </tr>
              ) : (
                dailyRecords.map((record) => (
                  <tr key={record.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-foreground">{formatDay(record.date)} {record.time}</td>
                    <td className="px-6 py-4 text-foreground">{record.delivered} L</td>
                    <td className="px-6 py-4 text-foreground">{record.sold} L</td>
                    <td className="px-6 py-4 font-semibold text-foreground">{record.closing_stock} L</td>
                    <td className="px-6 py-4 text-muted-foreground">{record.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

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

      <Dialog
        open={isDailyModalOpen}
        onOpenChange={(open) => {
          setIsDailyModalOpen(open)
          if (!open) resetDailyForm()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Daily Fuel Activity</DialogTitle>
            <DialogDescription>
              Enter total fuel and sold quantity. Left is calculated automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDailyRecord} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fuel-date">Date</Label>
              <Input
                id="fuel-date"
                type="date"
                value={dailyForm.date}
                onChange={(e) => setDailyForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-time">Time</Label>
              <Input
                id="fuel-time"
                type="time"
                value={dailyForm.time}
                onChange={(e) => setDailyForm((prev) => ({ ...prev, time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-delivered">Total Fuel Today (L)</Label>
              <Input
                id="fuel-delivered"
                type="number"
                min="0"
                value={dailyForm.delivered}
                onChange={(e) => setDailyForm((prev) => ({ ...prev, delivered: e.target.value }))}
                placeholder="e.g. 5000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-sold">Sold Today (L)</Label>
              <Input
                id="fuel-sold"
                type="number"
                min="0"
                value={dailyForm.sold}
                onChange={(e) => setDailyForm((prev) => ({ ...prev, sold: e.target.value }))}
                placeholder="e.g. 2000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-notes">Notes (Optional)</Label>
              <Input
                id="fuel-notes"
                value={dailyForm.notes}
                onChange={(e) => setDailyForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any note for this day"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDailyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save Day Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
