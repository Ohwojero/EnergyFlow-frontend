'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/metric-card'
import { AlertCircle, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiService } from '@/lib/api'
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
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeBranchId, setActiveBranchId] = useState('')
  const [formData, setFormData] = useState({
    branchId: '',
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

  const totalExpenses = visibleExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const avgExpense = visibleExpenses.length > 0 ? totalExpenses / visibleExpenses.length : 0

  const groupByMonth = (items: ExpenseItem[]) => {
    const groups: Record<string, ExpenseItem[]> = {}
    items.forEach((item) => {
      const date = new Date(item.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const monthGroups = groupByMonth(visibleExpenses)
  const currentMonth = new Date().toISOString().slice(0, 7)

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
      })
      await loadData()
      setIsExpenseModalOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Failed to save expense',
        description: error instanceof Error ? error.message : 'Request failed',
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
        <MetricCard label="Total Expenses" value={`N${(totalExpenses / 1000).toFixed(0)}K`} icon={TrendingDown} variant="primary" />
        <MetricCard label="Average Expense" value={`N${(avgExpense / 1000).toFixed(0)}K`} variant="secondary" />
        <MetricCard label="Expense Count" value={visibleExpenses.length} variant="accent" />
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
          <Accordion type="multiple" defaultValue={[currentMonth]} className="w-full">
            {monthGroups.map(([monthKey, monthExpenses]) => {
              const date = new Date(monthKey + '-01')
              const monthName = date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
              const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)

              return (
                <AccordionItem key={monthKey} value={monthKey} className="border-b">
                  <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold">{monthName}</span>
                      <span className="text-sm text-muted-foreground">
                        {monthExpenses.length} expenses • N{monthTotal.toLocaleString()}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Branch</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Category</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Description</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthExpenses.map((expense) => (
                            <tr key={expense.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4 text-foreground">{formatDate(expense.created_at)}</td>
                              <td className="px-6 py-4 text-foreground">{expense.branch_name || '-'}</td>
                              <td className="px-6 py-4">
                                <Badge className={getCategoryColor(expense.category)}>{getCategoryLabel(expense.category)}</Badge>
                              </td>
                              <td className="px-6 py-4 text-foreground">{expense.description}</td>
                              <td className="px-6 py-4 font-semibold text-foreground">N{expense.amount.toLocaleString()}</td>
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
    </div>
  )
}
