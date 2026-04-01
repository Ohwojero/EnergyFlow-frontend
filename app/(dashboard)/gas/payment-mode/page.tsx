'use client'

import { useEffect, useState, useMemo, type FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, CreditCard, Banknote, TrendingUp, Edit, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { apiService } from '@/lib/api'
import { isSameLagosDay, toLagosDateKey } from '@/lib/lagos-time'
import { toast } from '@/hooks/use-toast'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function GasPaymentModePage() {
  const { user, selectedBranchId } = useAuth()
  const isOwner = user?.role === 'org_owner'
  const isPersonalOwner = isOwner && user?.subscription_plan === 'personal'
  const [branches, setBranches] = useState<any[]>([])
  const [salesTransactions, setSalesTransactions] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [businessFilter, setBusinessFilter] = useState('all')
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: '',
  })
  const [editFormData, setEditFormData] = useState({
    amount: '',
    paymentMethod: '',
  })

  const loadSales = async () => {
    setIsLoading(true)
    try {
      if (isOwner) {
        const allBranches = await apiService.getBranches()
        const gasBranches = Array.isArray(allBranches) ? allBranches.filter(branch => branch.type === 'gas') : []
        const personalBranchId = selectedBranchId ?? gasBranches[0]?.id

        if (!isPersonalOwner && businessFilter === 'all') {
          // When "All Gas Branches" is selected, load from all branches but keep them separate
          const [salesResponses, expenseResponses] = await Promise.all([
            Promise.all(
              gasBranches.map(async (branch) => {
                const list = await apiService.getGasSales(branch.id)
                return Array.isArray(list) ? list : []
              }),
            ),
            Promise.all(
              gasBranches.map(async (branch) => {
                const list = await apiService.getGasExpenses(branch.id)
                return Array.isArray(list) ? list : []
              }),
            ),
          ])
          setSalesTransactions(salesResponses.flat())
          setExpenses(expenseResponses.flat())
        } else {
          // When specific branch is selected, load only from that branch
          const targetBranch = isPersonalOwner ? personalBranchId : businessFilter
          if (!targetBranch) {
            setSalesTransactions([])
            setExpenses([])
            return
          }
          const [salesList, expenseList] = await Promise.all([
            apiService.getGasSales(targetBranch),
            apiService.getGasExpenses(targetBranch),
          ])
          setSalesTransactions(Array.isArray(salesList) ? salesList : [])
          setExpenses(Array.isArray(expenseList) ? expenseList : [])
        }
      } else {
        const fallbackBranchId = selectedBranchId ?? user?.assigned_branches?.[0] ?? branches[0]?.id
        if (!fallbackBranchId) {
          setSalesTransactions([])
          setExpenses([])
          return
        }
        const [list, expenseList] = await Promise.all([
          apiService.getGasSales(fallbackBranchId),
          apiService.getGasExpenses(fallbackBranchId),
        ])
        setSalesTransactions(Array.isArray(list) ? list : [])
        setExpenses(Array.isArray(expenseList) ? expenseList : [])
      }
    } catch {
      toast({
        title: 'Load failed',
        description: 'Could not load gas sales.',
      })
      setSalesTransactions([])
      setExpenses([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadBranches = async () => {
      try {
        if (isOwner) {
          const data = await apiService.getBranches()
          setBranches(Array.isArray(data) ? data : [])
        } else {
          const data = await apiService.getGasBranches()
          setBranches(Array.isArray(data) ? data : [])
        }
      } catch {
        toast({
          title: 'Load failed',
          description: 'Could not load branches.',
        })
      }
    }
    loadBranches()
  }, [isOwner])

  useEffect(() => {
    if (branches.length > 0 || selectedBranchId || isOwner) {
      loadSales()
    }
  }, [branches, isOwner, selectedBranchId, user?.assigned_branches, businessFilter])

  const parseSalesperson = (notes: string) => {
    const match = String(notes ?? '').match(/salesperson:([^|]+)/)
    return match ? match[1].trim().toLowerCase() : ''
  }

  const parsePaymentMethod = (notes: string) => {
    const match = String(notes ?? '').match(/payment:([^|]+)/)
    return match ? match[1].trim().toLowerCase() : ''
  }

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const salesStaffSales = useMemo(() => {
    return salesTransactions.filter((sale: any) => {
      const salesperson = parseSalesperson(sale.notes)
      return salesperson === 'sales_staff' || (!salesperson.includes('manager') && salesperson !== 'manager')
    })
  }, [salesTransactions])
  const salesStaffSalesToday = useMemo(
    () => salesStaffSales.filter((sale: any) => isSameLagosDay(sale.created_at, now)),
    [salesStaffSales, now],
  )

  const transferTotal = useMemo(() => {
    return salesStaffSalesToday
      .filter((sale: any) => parsePaymentMethod(sale.notes) === 'transfer')
      .reduce((sum: number, sale: any) => sum + Number(sale.amount ?? 0), 0)
  }, [salesStaffSalesToday])

  const posTotal = useMemo(() => {
    return salesStaffSalesToday
      .filter((sale: any) => parsePaymentMethod(sale.notes) === 'pos')
      .reduce((sum: number, sale: any) => sum + Number(sale.amount ?? 0), 0)
  }, [salesStaffSalesToday])

  const cashTotal = useMemo(() => {
    return salesStaffSalesToday
      .filter((sale: any) => parsePaymentMethod(sale.notes) === 'cash')
      .reduce((sum: number, sale: any) => sum + Number(sale.amount ?? 0), 0)
  }, [salesStaffSalesToday])

  const totalSales = transferTotal + posTotal + cashTotal
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0)
  const totalSalesMinusExpense = totalSales - totalExpenses

  const formatMoneyShort = (amount: number) => {
    if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(2).replace('.', ',')}M`
    if (amount >= 1000) return `₦${(amount / 1000).toFixed(1).replace('.', ',')}K`
    return `₦${amount.toLocaleString()}`
  }

  const groupByDay = (sales: any[]) => {
    const groups: Record<string, any[]> = {}
    sales.forEach((sale) => {
      const date = new Date(sale.created_at)
      const key = toLagosDateKey(date)
      if (!groups[key]) groups[key] = []
      groups[key].push(sale)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const paymentsWithMethod = salesStaffSales.filter((sale: any) => parsePaymentMethod(sale.notes))
  const dayGroups = groupByDay(paymentsWithMethod)
  const currentDay = toLagosDateKey()

  const resetForm = () => {
    setFormData({
      amount: '',
      paymentMethod: '',
    })
  }

  const handleSavePayment = async (e: FormEvent) => {
    e.preventDefault()
    const amount = Number(formData.amount)

    if (!formData.paymentMethod || !amount) {
      toast({
        title: 'Missing details',
        description: 'Payment method and amount are required.',
      })
      return
    }

    if (amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Amount must be greater than zero.',
      })
      return
    }

    // Determine which branch to record payment to
    let targetBranchId
    if (isOwner) {
      if (businessFilter === 'all') {
        toast({
          title: 'Select specific branch',
          description: 'Please select a specific branch to record payment.',
        })
        return
      }
      targetBranchId = businessFilter
    } else {
      targetBranchId = selectedBranchId ?? user?.assigned_branches?.[0] ?? branches[0]?.id
    }

    if (!targetBranchId) {
      toast({
        title: 'Missing branch',
        description: 'Select a branch before recording payment.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await apiService.createGasSale({
        branch_id: targetBranchId,
        type: 'sale',
        cylinder_size: '0kg',
        quantity: 0,
        amount,
        notes: `payment:${formData.paymentMethod} | salesperson:sales_staff | type:payment_record`,
      })
      await loadSales()
      toast({
        title: 'Payment recorded',
        description: 'Payment has been added successfully.',
      })
      setIsPaymentModalOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save payment.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditPayment = (payment: any) => {
    setEditingPayment(payment)
    setEditFormData({
      amount: String(payment.amount),
      paymentMethod: parsePaymentMethod(payment.notes),
    })
    setIsEditPaymentOpen(true)
  }

  const handleUpdatePayment = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingPayment) return

    const amount = Number(editFormData.amount)
    if (!editFormData.paymentMethod || !amount || amount <= 0) {
      toast({ title: 'Invalid input', description: 'Check payment method and amount.' })
      return
    }

    setIsSubmitting(true)
    try {
      await apiService.updateGasSale(editingPayment.id, {
        quantity: 0,
        amount,
        notes: `payment:${editFormData.paymentMethod} | salesperson:sales_staff | type:payment_record`,
      })
      await loadSales()
      toast({ title: 'Payment updated', description: 'Payment updated successfully.' })
      setIsEditPaymentOpen(false)
      setEditingPayment(null)
    } catch (error) {
      toast({ title: 'Update failed', description: error instanceof Error ? error.message : 'Request failed' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    setIsSubmitting(true)
    try {
      await apiService.deleteGasSale(paymentId)
      await loadSales()
      toast({ title: 'Payment deleted', description: 'Payment deleted successfully.' })
    } catch (error) {
      toast({ title: 'Delete failed', description: error instanceof Error ? error.message : 'Request failed' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-secondary" />
            Payment Mode
          </h1>
          <p className="text-muted-foreground">Track gas sales by payment method</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          {isOwner && !isPersonalOwner && (
            <Select value={businessFilter} onValueChange={setBusinessFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gas Branches</SelectItem>
                {branches.filter(b => b.type === 'gas').map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!isOwner && (
            <Button onClick={() => setIsPaymentModalOpen(true)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card className="p-4 mb-6 shadow-card">
          <p className="text-muted-foreground">Loading payment data...</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 bg-blue-100 dark:bg-blue-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Transfer</p>
          <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(transferTotal)}</h3>
          <p className="text-xs text-muted-foreground mt-2">Bank transfers</p>
        </Card>

        <Card className="p-6 bg-purple-100 dark:bg-purple-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">POS</p>
          <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(posTotal)}</h3>
          <p className="text-xs text-muted-foreground mt-2">Card payments</p>
        </Card>

        <Card className="p-6 bg-green-100 dark:bg-green-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-600/20 rounded-lg">
              <Banknote className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Cash on Hand</p>
          <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(cashTotal)}</h3>
          <p className="text-xs text-muted-foreground mt-2">Cash payments</p>
        </Card>

        <Card className="p-6 bg-orange-100 dark:bg-orange-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-orange-600/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Payment</p>
          <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(totalSales)}</h3>
          <p className="text-xs text-muted-foreground mt-2">All payment methods</p>
        </Card>
      </div>

      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Payment Records</h3>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center text-muted-foreground">Loading payments...</div>
        ) : paymentsWithMethod.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-muted-foreground">No payment records yet</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={[currentDay]} className="w-full">
            {dayGroups.map(([dayKey, dayPayments]) => {
              const date = new Date(dayKey)
              const dayName = date.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })
              const dayTotal = dayPayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)

              return (
                <AccordionItem key={dayKey} value={dayKey} className="border-b">
                  <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold">{dayName}</span>
                      <span className="text-sm text-muted-foreground">
                        {dayPayments.length} payments • ₦{dayTotal.toLocaleString()}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Time</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Payment Method</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayPayments.map((sale: any) => (
                            <tr key={sale.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4 text-foreground">
                                {new Date(sale.created_at).toLocaleTimeString('en-NG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  timeZone: 'Africa/Lagos',
                                })}
                              </td>
                              <td className="px-6 py-4 text-foreground capitalize">{parsePaymentMethod(sale.notes)}</td>
                              <td className="px-6 py-4 font-semibold text-foreground">₦{sale.amount.toLocaleString()}</td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openEditPayment(sale)} disabled={isSubmitting}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50" onClick={() => handleDeletePayment(sale.id)} disabled={isSubmitting}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
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
        open={isPaymentModalOpen}
        onOpenChange={(open) => {
          setIsPaymentModalOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Enter payment details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="e.g. 50000"
                className="border-2 border-border focus-visible:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMethod: value }))}>
                <SelectTrigger className="border-2 border-border focus:border-primary">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                  <SelectItem value="cash">Cash on Hand</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? 'Saving...' : 'Save Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isEditPaymentOpen}
        onOpenChange={(open) => {
          setIsEditPaymentOpen(open)
          if (!open) setEditingPayment(null)
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>Update payment details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                min="1"
                value={editFormData.amount}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-paymentMethod">Payment Method</Label>
              <Select value={editFormData.paymentMethod} onValueChange={(value) => setEditFormData((prev) => ({ ...prev, paymentMethod: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                  <SelectItem value="cash">Cash on Hand</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditPaymentOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
