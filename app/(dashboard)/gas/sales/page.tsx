'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockGasTransactions, mockBranches } from '@/lib/mock-data'
import { ShoppingCart, TrendingUp, ArrowUpRight, Edit, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { GasTransaction } from '@/types'
import { addGasSale, getAllGasSales } from '@/lib/gas-sales-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type SaleTransaction = GasTransaction

export default function GasSalesPage() {
  const { user, selectedBranchId } = useAuth()
  const isOwner = user?.role === 'org_owner'
  const isManager = user?.role === 'gas_manager'
  const canEditDelete = isOwner || isManager
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [salesTransactions, setSalesTransactions] = useState<SaleTransaction[]>([])
  const [formData, setFormData] = useState({
    quantity: '',
    amount: '',
    notes: '',
    paymentMethod: '',
    salesperson: '',
  })

  useEffect(() => {
    const baseSales = getAllGasSales()
    const scopedSales =
      isOwner || !selectedBranchId
        ? baseSales
        : baseSales.filter((transaction) => transaction.branch_id === selectedBranchId)
    setSalesTransactions(scopedSales)
  }, [isOwner, selectedBranchId])

  const totalSales = salesTransactions.reduce((sum, t) => sum + t.amount, 0)
  const avgSaleValue = salesTransactions.length > 0 ? totalSales / salesTransactions.length : 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const groupByMonth = (transactions: SaleTransaction[]) => {
    const groups: Record<string, SaleTransaction[]> = {}
    transactions.forEach((t) => {
      const date = new Date(t.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const monthGroups = groupByMonth(salesTransactions)
  const currentMonth = new Date().toISOString().slice(0, 7)

  const resetForm = () => {
    setFormData({
      quantity: '',
      amount: '',
      notes: '',
      paymentMethod: '',
      salesperson: '',
    })
  }

  const handleSaveSale = (e: FormEvent) => {
    e.preventDefault()
    const quantity = Number(formData.quantity)
    const amount = Number(formData.amount)
    const notes = formData.notes.trim()

    if (!quantity || !amount || !formData.paymentMethod || !formData.salesperson) {
      toast({
        title: 'Missing details',
        description: 'All fields are required.',
      })
      return
    }

    if (quantity <= 0 || amount <= 0) {
      toast({
        title: 'Invalid values',
        description: 'Quantity and amount must be greater than zero.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const newTransaction: SaleTransaction = {
        id: `trans-${Date.now()}`,
        branch_id:
          selectedBranchId ??
          user?.assigned_branches?.[0] ??
          mockGasTransactions[0]?.branch_id ??
          'branch-1',
        type: 'sale',
        cylinder_size: '',
        quantity,
        amount,
        notes: notes || 'Direct sales entry',
        payment_method: formData.paymentMethod,
        salesperson: formData.salesperson,
        created_at: new Date().toISOString(),
      }

      addGasSale(newTransaction)
      setSalesTransactions((prev) => [newTransaction, ...prev])
      toast({
        title: 'Sale recorded',
        description: 'Gas sale transaction added successfully.',
      })
      setIsRecordSaleOpen(false)
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
            <ShoppingCart className="w-8 h-8 text-secondary" />
            Sales Management
          </h1>
          <p className="text-muted-foreground">Track and record all gas sales transactions</p>
        </div>
        {!isOwner && (
          <Button onClick={() => setIsRecordSaleOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Record Sale
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
              12%
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
          <p className="text-sm text-muted-foreground mb-1">Average Sale</p>
          <h3 className="text-3xl font-bold text-foreground">₦{(avgSaleValue / 1000).toFixed(0)}K</h3>
          <p className="text-xs text-muted-foreground mt-2">Per transaction</p>
        </Card>

        <Card className="p-6 bg-orange-100 dark:bg-orange-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-orange-600/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Transactions</p>
          <h3 className="text-3xl font-bold text-foreground">{salesTransactions.length}</h3>
          <p className="text-xs text-muted-foreground mt-2">Recorded sales</p>
        </Card>
      </div>

      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Recent Sales</h3>
        </div>

        {salesTransactions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-muted-foreground">No sales transactions recorded yet</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={[currentMonth]} className="w-full">
            {monthGroups.map(([monthKey, transactions]) => {
              const date = new Date(monthKey + '-01')
              const monthName = date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
              const monthTotal = transactions.reduce((sum, t) => sum + t.amount, 0)
              
              return (
                <AccordionItem key={monthKey} value={monthKey} className="border-b">
                  <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold">{monthName}</span>
                      <span className="text-sm text-muted-foreground">
                        {transactions.length} sales • ₦{monthTotal.toLocaleString()}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date & Time</th>
                            {isOwner && <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Branch</th>}
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Kg Sold</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Payment</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Salesperson</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Notes</th>
                            {canEditDelete && <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((transaction) => {
                            const branch = mockBranches.find(b => b.id === transaction.branch_id)
                            return (
                              <tr key={transaction.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                <td className="px-6 py-4 text-foreground">{formatDate(transaction.created_at)}</td>
                                {isOwner && <td className="px-6 py-4 text-foreground">{branch?.name || 'Unknown Branch'}</td>}
                                <td className="px-6 py-4 text-foreground">{transaction.quantity} kg</td>
                                <td className="px-6 py-4 font-semibold text-foreground">₦{transaction.amount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-foreground capitalize">{transaction.payment_method || 'N/A'}</td>
                                <td className="px-6 py-4 text-foreground">{transaction.salesperson || 'N/A'}</td>
                                <td className="px-6 py-4 text-muted-foreground text-xs">{transaction.notes}</td>
                                {canEditDelete && (
                                  <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
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
        open={isRecordSaleOpen}
        onOpenChange={(open) => {
          setIsRecordSaleOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Gas Sale</DialogTitle>
            <DialogDescription>Enter daily gas sales transaction details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSale} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Kg Sold</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder="e.g. 20 kg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMethod: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="cash">Cash on Hand</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Total Amount</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="e.g. 110000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salesperson">Salesperson</Label>
              <Select value={formData.salesperson} onValueChange={(value) => setFormData((prev) => ({ ...prev, salesperson: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select salesperson" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="sales_staff">Sales Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any extra details"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRecordSaleOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? 'Saving...' : 'Save Sale'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
