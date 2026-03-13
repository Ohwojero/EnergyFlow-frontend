'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/metric-card'
import { AlertCircle, TrendingDown, Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiService } from '@/lib/api'
import { isSameLagosDay, toLagosDateKey } from '@/lib/lagos-time'
import { useAuth } from '@/context/auth-context'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ExpenseItem = {
  id: string
  category: string
  amount: number
  description: string
  created_at: string
  branch_id?: string
  branch_name?: string
}

export default function GasExpensesPage() {
  const { user, selectedBranchId, selectedBranchType } = useAuth()
  const isOwner = user?.role === 'org_owner'
  const isPersonalOwner = isOwner && user?.subscription_plan === 'personal'
  const [gasBranches, setGasBranches] = useState<any[]>([])
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [salesTransactions, setSalesTransactions] = useState<any[]>([])
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeBranchId, setActiveBranchId] = useState('')
  const [formData, setFormData] = useState({
    branchId: '',
    category: 'cylinder_repair',
    amount: '',
    description: '',
  })

  const [editFormData, setEditFormData] = useState({
    category: 'cylinder_repair',
    amount: '',
    description: '',
  })

  const loadData = async () => {
    setIsLoading(true)
    try {
      const toList = (payload: any) => {
        if (Array.isArray(payload)) return payload
        if (Array.isArray(payload?.data)) return payload.data
        if (Array.isArray(payload?.items)) return payload.items
        return []
      }
      const branchData = await apiService.getBranches().catch(() => [])
      let allBranches = toList(branchData)
      if (isPersonalOwner && allBranches.length === 0) {
        const gasOnly = await apiService.getGasBranches().catch(() => [])
        allBranches = toList(gasOnly)
      }
      const allGasBranches = allBranches.filter((b: any) => b.type === 'gas')
      const scopedGasBranches = (() => {
        if (user?.role === 'org_owner') return allGasBranches
        const assigned = new Set(user?.assigned_branches ?? [])
        if (assigned.size > 0) {
          return allGasBranches.filter((branch: any) => assigned.has(branch.id))
        }
        if (selectedBranchId) {
          const selected = allGasBranches.find((b: any) => b.id === selectedBranchId)
          return selected ? [selected] : allGasBranches
        }
        if (selectedBranchType === 'gas') {
          return allGasBranches
        }
        return allGasBranches
      })()
      setGasBranches(scopedGasBranches)

      const defaultBranchId =
        (selectedBranchId && scopedGasBranches.some((b: any) => b.id === selectedBranchId) && selectedBranchId) ||
        user?.assigned_branches?.find((id) => scopedGasBranches.some((b: any) => b.id === id)) ||
        scopedGasBranches[0]?.id ||
        ''

      if (!activeBranchId) {
        setActiveBranchId(defaultBranchId)
      }
      setFormData((prev) => ({ ...prev, branchId: prev.branchId || defaultBranchId }))

      const allExpenses = await apiService.getAllGasExpenses().catch(() => [])
      const branchMap = new Map(scopedGasBranches.map((b: any) => [b.id, b.name]))
      const allowedBranchIds = new Set(scopedGasBranches.map((b: any) => String(b.id)))
      const shouldFilterByBranch = !(isOwner && isPersonalOwner)
      const mapped: ExpenseItem[] = toList(allExpenses)
        .filter((expense: any) =>
          shouldFilterByBranch && allowedBranchIds.size > 0
            ? allowedBranchIds.has(String(expense.branch?.id ?? expense.branch_id ?? ''))
            : true,
        )
        .map((expense: any) => {
          const branchId = String(expense.branch?.id ?? expense.branch_id ?? '')
          return {
            id: String(expense.id),
            category: String(expense.category ?? ''),
            amount: Number(expense.amount ?? 0),
            description: String(expense.description ?? ''),
            created_at: String(expense.created_at ?? new Date().toISOString()),
            branch_id: branchId || undefined,
            branch_name: expense.branch?.name || branchMap.get(branchId),
          }
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setExpenses(mapped)

      // Load gas sales
      const salesPromises = scopedGasBranches.map((branch: any) =>
        apiService.getGasSales(branch.id).catch(() => [])
      )
      const salesResults = await Promise.all(salesPromises)
      const allSales = salesResults.flat()
      setSalesTransactions(toList(allSales))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id, selectedBranchId, selectedBranchType, isPersonalOwner])

  const visibleExpenses = useMemo(() => {
    if (isOwner && !activeBranchId) return expenses
    const targetBranchId =
      (isOwner ? activeBranchId : selectedBranchId) ||
      user?.assigned_branches?.[0] ||
      activeBranchId ||
      ''
    if (!targetBranchId) return expenses
    return expenses.filter((expense) => expense.branch_id === targetBranchId)
  }, [expenses, isOwner, activeBranchId, selectedBranchId, user?.assigned_branches])

  const visibleSales = useMemo(() => {
    if (isOwner && !activeBranchId) return salesTransactions
    const targetBranchId =
      (isOwner ? activeBranchId : selectedBranchId) ||
      user?.assigned_branches?.[0] ||
      activeBranchId ||
      ''
    if (!targetBranchId) return salesTransactions
    return salesTransactions.filter((sale: any) => {
      const branchId = String(sale.branch?.id ?? sale.branch_id ?? '')
      return branchId === targetBranchId
    })
  }, [salesTransactions, isOwner, activeBranchId, selectedBranchId, user?.assigned_branches])

  const parseSalesperson = (notes: string) => {
    const match = String(notes ?? '').match(/salesperson:([^|]+)/)
    return match ? match[1].trim().toLowerCase() : ''
  }

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const totalExpenses = visibleExpenses
    .filter((exp) => isSameLagosDay(exp.created_at, now))
    .reduce((sum, exp) => sum + exp.amount, 0)
  
  // Sales staff sales only (today's data) - matching dashboard logic exactly
  const totalSales = visibleSales
    .filter((sale: any) => {
      const salesperson = parseSalesperson(sale.notes)
      const notes = String(sale.notes ?? '').toLowerCase()
      // Exclude payment records and filter for today only
      return !notes.includes('type:payment_record') && 
             isSameLagosDay(sale.created_at, now) &&
             (salesperson === 'sales_staff' || (!salesperson.includes('manager') && salesperson !== 'manager'))
    })
    .reduce((sum: number, sale: any) => sum + Number(sale.amount ?? 0), 0)
  const totalSalesMinusExpense = totalSales - totalExpenses

  const groupByDay = (items: ExpenseItem[]) => {
    const groups: Record<string, ExpenseItem[]> = {}
    items.forEach((item) => {
      const date = new Date(item.created_at)
      const key = toLagosDateKey(date)
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const dayGroups = groupByDay(visibleExpenses)
  const currentDay = toLagosDateKey()

  const getCategoryLabel = (category: string) => {
    return category.replace(/_/g, ' ').split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cylinder_repair':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
      case 'safety_inspection':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'maintenance':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Africa/Lagos',
    })
  }

  const resetForm = () => {
    setFormData((prev) => ({
      branchId: prev.branchId || gasBranches[0]?.id || '',
      category: 'cylinder_repair',
      amount: '',
      description: '',
    }))
  }

  const handleRecordExpense = async (e: FormEvent) => {
    e.preventDefault()
    const amount = Number(formData.amount)
    const description = formData.description.trim()

    if (!formData.branchId || !formData.category || !description || !amount) {
      toast({
        title: 'Missing details',
        description: 'Branch, category, amount, and description are required.',
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

    setIsSubmitting(true)
    try {
      await apiService.createGasExpense({
        branch_id: formData.branchId,
        category: formData.category,
        amount,
        description,
      })

      toast({
        title: 'Expense recorded',
        description: 'Gas expense added successfully.',
        className: 'bg-green-50 border-green-200 text-green-800',
      })
      await loadData()
      setIsExpenseModalOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Failed to save expense',
        description: error instanceof Error ? error.message : 'Request failed',
        className: 'bg-red-50 border-red-200 text-red-800',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditExpense = (expense: ExpenseItem) => {
    setEditingExpense(expense)
    setEditFormData({
      category: expense.category,
      amount: String(expense.amount),
      description: expense.description,
    })
    setIsEditExpenseOpen(true)
  }

  const handleUpdateExpense = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return

    const amount = Number(editFormData.amount)
    const description = editFormData.description.trim()

    if (!editFormData.category || !description || !amount || amount <= 0) {
      toast({
        title: 'Invalid input',
        description: 'Check category, amount, and description.',
        className: 'bg-red-50 border-red-200 text-red-800',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await apiService.updateGasExpense(editingExpense.id, {
        category: editFormData.category,
        amount,
        description,
      })
      await loadData()
      toast({
        title: 'Expense updated',
        description: 'Expense updated successfully.',
        className: 'bg-blue-50 border-blue-200 text-blue-800',
      })
      setIsEditExpenseOpen(false)
      setEditingExpense(null)
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Request failed',
        className: 'bg-red-50 border-red-200 text-red-800',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Delete this expense? This action cannot be undone.')) {
      return
    }

    setIsSubmitting(true)
    try {
      await apiService.deleteGasExpense(expenseId)
      await loadData()
      toast({
        title: 'Expense deleted',
        description: 'Expense deleted successfully.',
        className: 'bg-red-50 border-red-200 text-red-800',
      })
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Request failed',
        className: 'bg-red-50 border-red-200 text-red-800',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-secondary" />
            Gas Expenses
          </h1>
          <p className="text-muted-foreground">Track and manage gas operation expenses</p>
        </div>
        <Button onClick={() => setIsExpenseModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Record Expense
        </Button>
      </div>

      {isOwner && gasBranches.length > 0 && (
        <Card className="p-4 mb-6 bg-muted/50 border-border">
          <div className="flex items-center gap-4">
            <Label className="font-semibold text-foreground min-w-fit">Select Branch:</Label>
            <select
              value={activeBranchId || ''}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="w-80 h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Branches</option>
              {gasBranches.map((branch: any) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.location})
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6 bg-blue-100 dark:bg-blue-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="p-3 bg-blue-600/20 rounded-lg w-fit mb-4">
            <TrendingDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Sales from all Pump</p>
          <h3 className="text-3xl font-bold text-foreground">₦{(totalSales / 1000).toFixed(0).replace('.', ',')}K</h3>
        </Card>
        <Card className="p-6 bg-orange-100 dark:bg-orange-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="p-3 bg-orange-600/20 rounded-lg w-fit mb-4">
            <TrendingDown className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Sales from all Pump-Expense</p>
          <h3 className="text-3xl font-bold text-foreground">₦{(totalSalesMinusExpense / 1000).toFixed(0).replace('.', ',')}K</h3>
        </Card>
        <Card className="p-6 bg-purple-100 dark:bg-purple-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="p-3 bg-purple-600/20 rounded-lg w-fit mb-4">
            <AlertCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Expense Count</p>
          <h3 className="text-3xl font-bold text-foreground">{visibleExpenses.length}</h3>
        </Card>
      </div>

      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Expense Records</h3>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center">
            <p className="text-muted-foreground">Loading expenses...</p>
          </div>
        ) : visibleExpenses.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-muted-foreground">No expenses recorded yet</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={[currentDay]} className="w-full">
            {dayGroups.map(([dayKey, dayExpenses]) => {
              const date = new Date(dayKey)
              const dayName = date.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })
              const dayTotal = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0)

              return (
                <AccordionItem key={dayKey} value={dayKey} className="border-b">
                  <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold">{dayName}</span>
                      <span className="text-sm text-muted-foreground">
                        {dayExpenses.length} expenses • ₦{dayTotal.toLocaleString()}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Time</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Branch</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Category</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Description</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayExpenses.map((expense) => (
                            <tr key={expense.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4 text-foreground">
                                {new Date(expense.created_at).toLocaleTimeString('en-NG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  timeZone: 'Africa/Lagos',
                                })}
                              </td>
                              <td className="px-6 py-4 text-foreground">{expense.branch_name || '-'}</td>
                              <td className="px-6 py-4">
                                <Badge className={getCategoryColor(expense.category)}>{getCategoryLabel(expense.category)}</Badge>
                              </td>
                              <td className="px-6 py-4 text-foreground">{expense.description}</td>
                              <td className="px-6 py-4 font-semibold text-foreground">₦{expense.amount.toLocaleString()}</td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0" 
                                    onClick={() => openEditExpense(expense)}
                                    disabled={isSubmitting}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50" 
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    disabled={isSubmitting}
                                  >
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
        open={isExpenseModalOpen}
        onOpenChange={(open) => {
          setIsExpenseModalOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Gas Expense</DialogTitle>
            <DialogDescription>Add a gas operation expense entry.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordExpense} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <select
                id="branch"
                value={formData.branchId}
                onChange={(e) => setFormData((prev) => ({ ...prev, branchId: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {gasBranches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="cylinder_repair">Cylinder Repair</option>
                <option value="safety_inspection">Safety Inspection</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="e.g. 25000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? 'Saving...' : 'Save Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isEditExpenseOpen}
        onOpenChange={(open) => {
          setIsEditExpenseOpen(open)
          if (!open) setEditingExpense(null)
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Gas Expense</DialogTitle>
            <DialogDescription>Update expense details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateExpense} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                value={editFormData.category}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="cylinder_repair">Cylinder Repair</option>
                <option value="safety_inspection">Safety Inspection</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                min="1"
                value={editFormData.amount}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="e.g. 25000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditExpenseOpen(false)} disabled={isSubmitting}>
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
