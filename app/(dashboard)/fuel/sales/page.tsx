'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShoppingCart, TrendingUp, ArrowUpRight } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { ShiftReconciliation } from '@/types'
import { addFuelShift, getAllFuelShifts } from '@/lib/fuel-shift-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ShiftEntry = ShiftReconciliation & {
  sales_staff_name: string
}

export default function FuelSalesPage() {
  const { user, selectedBranchId } = useAuth()
  const isOwner = user?.role === 'org_owner'

  const [shifts, setShifts] = useState<ShiftEntry[]>([])

  useEffect(() => {
    const baseShifts = getAllFuelShifts()
    const scopedShifts =
      isOwner || !selectedBranchId
        ? baseShifts
        : baseShifts.filter((shift) => shift.branch_id === selectedBranchId)

    setShifts(
      scopedShifts.map((shift) => ({
        ...shift,
        sales_staff_name: (shift as ShiftEntry).sales_staff_name || 'Unassigned',
      }))
    )
  }, [isOwner, selectedBranchId])

  const [isRecordShiftOpen, setIsRecordShiftOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    shift_number: '1',
    pump_id: 'pump-1',
    sales_staff_name: '',
    start_reading: '12500',
    end_reading: '12900',
    sales_amount: '260000',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  })

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      shift_number: String((shifts[0]?.shift_number ?? 0) + 1),
      pump_id: shifts[0]?.pump_id ?? prev.pump_id,
      start_reading: String(shifts[0]?.end_reading ?? Number(prev.start_reading)),
      end_reading: String((shifts[0]?.end_reading ?? Number(prev.start_reading)) + 400),
    }))
  }, [shifts])

  const totalSales = shifts.reduce((sum, shift) => sum + shift.sales_amount, 0)
  const avgShiftSales = shifts.length > 0 ? totalSales / shifts.length : 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const groupByMonth = (shifts: ShiftEntry[]) => {
    const groups: Record<string, ShiftEntry[]> = {}
    shifts.forEach((s) => {
      const date = new Date(s.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const monthGroups = groupByMonth(shifts)
  const currentMonth = new Date().toISOString().slice(0, 7)

  const resetForm = () => {
    setFormData({
      shift_number: String((shifts[0]?.shift_number ?? 0) + 1),
      pump_id: shifts[0]?.pump_id ?? 'pump-1',
      sales_staff_name: '',
      start_reading: String(shifts[0]?.end_reading ?? 12500),
      end_reading: String((shifts[0]?.end_reading ?? 12500) + 400),
      sales_amount: '260000',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
    })
  }

  const handleSaveShift = (e: FormEvent) => {
    e.preventDefault()
    const shiftNumber = Number(formData.shift_number)
    const startReading = Number(formData.start_reading)
    const endReading = Number(formData.end_reading)
    const salesAmount = Number(formData.sales_amount)

    if (
      !shiftNumber ||
      !formData.pump_id.trim() ||
      !formData.sales_staff_name.trim() ||
      !salesAmount ||
      !formData.date ||
      !formData.time
    ) {
      toast({
        title: 'Missing details',
        description: 'Shift, pump, assigned staff, sales amount, date, and time are required.',
      })
      return
    }

    if (
      Number.isNaN(startReading) ||
      Number.isNaN(endReading) ||
      Number.isNaN(salesAmount) ||
      shiftNumber <= 0 ||
      salesAmount <= 0
    ) {
      toast({
        title: 'Invalid values',
        description: 'Enter valid numeric values.',
      })
      return
    }

    if (endReading < startReading) {
      toast({
        title: 'Invalid readings',
        description: 'End reading cannot be less than start reading.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const nextShift: ShiftEntry = {
        id: `shift-${Date.now()}`,
        branch_id: selectedBranchId ?? shifts[0]?.branch_id ?? 'branch-3',
        shift_number: shiftNumber,
        pump_id: formData.pump_id.trim(),
        sales_staff_name: formData.sales_staff_name.trim(),
        start_reading: startReading,
        end_reading: endReading,
        sales_amount: salesAmount,
        variance: 0,
        created_at: new Date(`${formData.date}T${formData.time}:00`).toISOString(),
      }

      addFuelShift(nextShift)
      setShifts((prev) => [nextShift, ...prev])
      toast({
        title: 'Shift recorded',
        description: 'Fuel shift sale has been added successfully.',
      })
      setIsRecordShiftOpen(false)
      resetForm()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-orange-500" />
            Fuel Sales
          </h1>
          <p className="text-muted-foreground">Track pump sales and shift reconciliation</p>
        </div>
        {!isOwner && (
          <Button onClick={() => setIsRecordShiftOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Record Shift
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6 bg-blue-100 dark:bg-blue-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-semibold">
              <ArrowUpRight className="w-4 h-4" />
              8%
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
          <h3 className="text-3xl font-bold text-foreground">₦{(totalSales / 1000000).toFixed(2)}M</h3>
          <p className="text-xs text-muted-foreground mt-2">This period</p>
        </Card>

        <Card className="p-6 bg-green-100 dark:bg-green-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-600/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Avg Shift Sales</p>
          <h3 className="text-3xl font-bold text-foreground">₦{(avgShiftSales / 1000).toFixed(0)}K</h3>
          <p className="text-xs text-muted-foreground mt-2">Per shift</p>
        </Card>

        <Card className="p-6 bg-orange-100 dark:bg-orange-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-orange-600/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Shifts Recorded</p>
          <h3 className="text-3xl font-bold text-foreground">{shifts.length}</h3>
          <p className="text-xs text-muted-foreground mt-2">Completed entries</p>
        </Card>
      </div>

      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Shift Reconciliation</h3>
        </div>

        {shifts.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-muted-foreground">No shift records yet</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={[currentMonth]} className="w-full">
            {monthGroups.map(([monthKey, monthShifts]) => {
              const date = new Date(monthKey + '-01')
              const monthName = date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
              const monthTotal = monthShifts.reduce((sum, s) => sum + s.sales_amount, 0)
              
              return (
                <AccordionItem key={monthKey} value={monthKey} className="border-b">
                  <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold">{monthName}</span>
                      <span className="text-sm text-muted-foreground">
                        {monthShifts.length} shifts • ₦{monthTotal.toLocaleString()}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Shift</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Pump</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Assigned Staff</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Start Reading</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">End Reading</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Sales Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthShifts.map((shift) => (
                            <tr key={shift.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4 text-foreground">{formatDate(shift.created_at)}</td>
                              <td className="px-6 py-4 font-medium text-foreground">Shift {shift.shift_number}</td>
                              <td className="px-6 py-4 text-foreground">{shift.pump_id}</td>
                              <td className="px-6 py-4 text-foreground">{shift.sales_staff_name}</td>
                              <td className="px-6 py-4 text-foreground">{shift.start_reading}</td>
                              <td className="px-6 py-4 text-foreground">{shift.end_reading}</td>
                              <td className="px-6 py-4 font-semibold text-foreground">₦{shift.sales_amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </Card>

      <Dialog
        open={isRecordShiftOpen}
        onOpenChange={(open) => {
          setIsRecordShiftOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Record Fuel Shift</DialogTitle>
            <DialogDescription>Enter shift reconciliation details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveShift} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shift_number">Shift Number</Label>
              <Input
                id="shift_number"
                type="number"
                min="1"
                value={formData.shift_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, shift_number: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pump_id">Pump</Label>
              <Input
                id="pump_id"
                value={formData.pump_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, pump_id: e.target.value }))}
                placeholder="e.g. pump-1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales_staff_name">Assigned Sales Staff</Label>
              <Input
                id="sales_staff_name"
                value={formData.sales_staff_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, sales_staff_name: e.target.value }))}
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_reading">Start Reading</Label>
                <Input
                  id="start_reading"
                  type="number"
                  min="0"
                  value={formData.start_reading}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_reading: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_reading">End Reading</Label>
                <Input
                  id="end_reading"
                  type="number"
                  min="0"
                  value={formData.end_reading}
                  onChange={(e) => setFormData((prev) => ({ ...prev, end_reading: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales_amount">Sales Amount</Label>
              <Input
                id="sales_amount"
                type="number"
                min="1"
                value={formData.sales_amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, sales_amount: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift-date">Date</Label>
                <Input
                  id="shift-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-time">Time</Label>
                <Input
                  id="shift-time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRecordShiftOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? 'Saving...' : 'Save Shift'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
