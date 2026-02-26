'use client'

import { useState, type FormEvent } from 'react'
import { mockGasCylinders } from '@/lib/mock-data'
import { InventoryTable } from '@/components/shared/inventory-table'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { Package } from 'lucide-react'

interface DailyGasRecord {
  id: string
  date: string
  time: string
  opening_stock: number
  delivered: number
  sold: number
  closing_stock: number
  notes: string
}

type GasInventoryItem = Omit<(typeof mockGasCylinders)[number], 'size'> & { size: string }

export default function GasInventoryPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'org_owner'

  const [cylinders, setCylinders] = useState<GasInventoryItem[]>(mockGasCylinders)
  const [dailyRecords, setDailyRecords] = useState<DailyGasRecord[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    tank: '',
    quantity: '',
    purchase_price: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  })
  const [dailyForm, setDailyForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    delivered: '',
    sold: '',
    notes: '',
  })

  const inventoryItems = cylinders.map((cyl) => ({
    id: cyl.id,
    name: `${cyl.size} Tank`,
    size: cyl.size,
    quantity: cyl.quantity,
    unit_price: cyl.purchase_price,
    total_value: cyl.quantity * cyl.purchase_price,
    status: cyl.quantity > 100 ? 'in_stock' : cyl.quantity > 20 ? 'low_stock' : 'out_of_stock',
    last_updated: cyl.last_updated,
  }))

  const currentLeft = dailyRecords[0]?.closing_stock ?? 0
  const totalGasEntered = dailyRecords.reduce((sum, item) => sum + item.delivered, 0)
  const totalSold = dailyRecords.reduce((sum, item) => sum + item.sold, 0)
  const today = new Date().toISOString().slice(0, 10)
  const todayRecord = dailyRecords.find((record) => record.date === today)

  const resetForm = () => {
    setFormData({
      tank: '',
      quantity: '',
      purchase_price: '',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
    })
  }

  const handleAddNew = () => {
    setIsAddModalOpen(true)
  }

  const handleDeleteItem = (id: string) => {
    setCylinders((prev) => prev.filter((item) => item.id !== id))
    toast({
      title: 'Inventory item deleted',
      description: 'Selected gas inventory item was removed.',
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

    setIsSubmitting(true)
    const nextCylinder = {
      id: `cyl-${Date.now()}`,
      branch_id: user?.assigned_branches?.[0] ?? cylinders[0]?.branch_id ?? 'branch-1',
      size: tank,
      status: 'in_stock' as const,
      quantity,
      purchase_price: purchasePrice,
      selling_price: purchasePrice,
      last_updated: new Date(`${formData.date}T${formData.time}:00`).toISOString(),
    }

    try {
      setCylinders((prev) => [nextCylinder, ...prev])
      toast({
        title: 'Tank added',
        description: 'New tank inventory item has been created.',
      })
      setIsAddModalOpen(false)
      resetForm()
    } finally {
      setIsSubmitting(false)
    }
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
        description: 'Date, time, total gas, and sold are required.',
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
    const totalGas = openingStock + delivered

    if (sold > totalGas) {
      toast({
        title: 'Invalid sold value',
        description: `Sold cannot be greater than total gas (${totalGas} kg).`,
      })
      return
    }

    const nextRecord: DailyGasRecord = {
      id: `daily-${Date.now()}`,
      date: dailyForm.date,
      time: dailyForm.time,
      opening_stock: openingStock,
      delivered,
      sold,
      closing_stock: totalGas - sold,
      notes: dailyForm.notes.trim(),
    }

    setDailyRecords((prev) =>
      [nextRecord, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    )

    toast({
      title: 'Daily record saved',
      description: 'Total gas, sold, and left were calculated successfully.',
    })

    setIsDailyModalOpen(false)
    resetDailyForm()
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Package className="w-8 h-8 text-secondary" />
          Gas Inventory
        </h1>
        <p className="text-muted-foreground">Manage cylinder inventory and daily gas operations.</p>
      </div>

      <InventoryTable
        title="Cylinder Inventory"
        items={inventoryItems}
        onAddNew={isOwner ? undefined : handleAddNew}
        onDeleteItem={isOwner ? undefined : handleDeleteItem}
        quantityLabel="Current Stock Level"
        unitPriceLabel="Price per Kg"
        totalValueLabel="Tank Value"
        showDateTime
      />

      <Card className="shadow-card mt-8">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Daily Gas Operations</h3>
            <p className="text-sm text-muted-foreground">
              System calculates left stock from opening, total gas, and sold.
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
            <p className="text-2xl font-bold text-foreground mt-1">{currentLeft} kg</p>
          </div>
          <div className="rounded-lg bg-green-100 dark:bg-green-900/20 p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Gas Entered</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalGasEntered} kg</p>
          </div>
          <div className="rounded-lg bg-orange-100 dark:bg-orange-900/20 p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Sold</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalSold} kg</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-border">
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Gas Today</p>
            <p className="text-2xl font-bold text-foreground mt-1">{todayRecord?.delivered ?? 0} kg</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground uppercase">Sold Today</p>
            <p className="text-2xl font-bold text-foreground mt-1">{todayRecord?.sold ?? 0} kg</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date & Time</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Total Gas</th>
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
                    <td className="px-6 py-4 text-foreground">{record.delivered} kg</td>
                    <td className="px-6 py-4 text-foreground">{record.sold} kg</td>
                    <td className="px-6 py-4 font-semibold text-foreground">{record.closing_stock} kg</td>
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
                placeholder="e.g. Main Tank A"
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

      <Dialog
        open={isDailyModalOpen}
        onOpenChange={(open) => {
          setIsDailyModalOpen(open)
          if (!open) resetDailyForm()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Daily Gas Activity</DialogTitle>
            <DialogDescription>Enter total gas and sold quantity. Left is calculated automatically.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDailyRecord} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={dailyForm.date}
                onChange={(e) => setDailyForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={dailyForm.time}
                onChange={(e) => setDailyForm((prev) => ({ ...prev, time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivered">Total Gas Today (kg)</Label>
              <Input
                id="delivered"
                type="number"
                min="0"
                value={dailyForm.delivered}
                onChange={(e) => setDailyForm((prev) => ({ ...prev, delivered: e.target.value }))}
                placeholder="e.g. 2000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sold">Sold Today (kg)</Label>
              <Input
                id="sold"
                type="number"
                min="0"
                value={dailyForm.sold}
                onChange={(e) => setDailyForm((prev) => ({ ...prev, sold: e.target.value }))}
                placeholder="e.g. 1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
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
