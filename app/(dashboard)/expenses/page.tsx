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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ExpenseSource = 'Gas' | 'Fuel'

type ExpenseItem = {
  id: string
  source: ExpenseSource
  branch_id?: string
  branch_name?: string
  category: string
  amount: number
  description: string
  created_at: string
}

export default function ExpensesPage() {
  const { user, selectedBranchId, selectedBranchType } = useAuth()
  const isOwner = user?.role === 'org_owner'
  const isPersonalOwner = user?.role === 'org_owner' && user?.subscription_plan === 'personal'
  const [gasExpenses, setGasExpenses] = useState<ExpenseItem[]>([])
  const [fuelExpenses, setFuelExpenses] = useState<ExpenseItem[]>([])
  const [gasBranches, setGasBranches] = useState<any[]>([])
  const [fuelBranches, setFuelBranches] = useState<any[]>([])
  const [localSelectedBranchId, setLocalSelectedBranchId] = useState<string | null>(null)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    source: 'Gas' as ExpenseSource,
    branchId: '',
    category: 'cylinder_repair',
    amount: '',
    description: '',
  })

  const expenses = [...gasExpenses, ...fuelExpenses].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const allBranches = useMemo(() => {
    const map = new Map<string, any>()
    ;[...gasBranches, ...fuelBranches].forEach((branch) => {
      if (branch?.id) map.set(String(branch.id), branch)
    })
    return Array.from(map.values())
  }, [gasBranches, fuelBranches])

  const visibleExpenses = useMemo(() => {
    if (!isOwner || !localSelectedBranchId) return expenses
    return expenses.filter((expense) => String(expense.branch_id ?? '') === localSelectedBranchId)
  }, [expenses, isOwner, localSelectedBranchId])

  const totalExpenses = visibleExpenses.reduce((sum, exp) => sum + exp.amount, 0)

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

  const loadExpenses = async () => {
    setIsLoading(true)
    try {
      const toList = (payload: any) => {
        if (Array.isArray(payload)) return payload
        if (Array.isArray(payload?.data)) return payload.data
        if (Array.isArray(payload?.items)) return payload.items
        return []
      }
      const branches = await apiService.getBranches().catch(() => [])
      let branchList = toList(branches)
      if (isPersonalOwner && branchList.length === 0) {
        const gasBranches = await apiService.getGasBranches().catch(() => [])
        branchList = toList(gasBranches)
      }

      const scopedBranches = (() => {
        if (user?.role === 'org_owner') return branchList
        const assigned = new Set(user?.assigned_branches ?? [])
        if (assigned.size > 0) {
          return branchList.filter((b: any) => assigned.has(b.id))
        }
        if (selectedBranchId) {
          const selected = branchList.find((b: any) => b.id === selectedBranchId)
          return selected ? [selected] : branchList
        }
        if (selectedBranchType) {
          const filtered = branchList.filter((b: any) => b.type === selectedBranchType)
          return filtered.length > 0 ? filtered : branchList
        }
        return branchList
      })()

      const gasList = scopedBranches.filter((b: any) => b.type === 'gas')
      const fuelList = scopedBranches.filter((b: any) => b.type === 'fuel')
      setGasBranches(gasList)
      setFuelBranches(fuelList)

      const [allGasExpenses, allFuelExpenses] = await Promise.all([
        apiService.getAllGasExpenses().catch(() => []),
        apiService.getAllFuelExpenses().catch(() => []),
      ])
      const allowedBranchIds = new Set(scopedBranches.map((b: any) => String(b.id)))
      const branchNameById = new Map(scopedBranches.map((b: any) => [String(b.id), String(b.name)]))
      const shouldFilterByBranch = !(isOwner && isPersonalOwner)
      const gasRows = toList(allGasExpenses).filter((e: any) =>
        shouldFilterByBranch && allowedBranchIds.size > 0
          ? allowedBranchIds.has(String(e.branch?.id ?? e.branch_id ?? ''))
          : true,
      )
      const fuelRows = toList(allFuelExpenses).filter((e: any) =>
        shouldFilterByBranch && allowedBranchIds.size > 0
          ? allowedBranchIds.has(String(e.branch?.id ?? e.branch_id ?? ''))
          : true,
      )

      setGasExpenses(
        gasRows.map((e: any) => ({
          id: String(e.id),
          source: 'Gas' as const,
          branch_id: String(e.branch?.id ?? e.branch_id ?? ''),
          branch_name: String(e.branch?.name ?? branchNameById.get(String(e.branch?.id ?? e.branch_id ?? '')) ?? ''),
          category: String(e.category ?? ''),
          amount: Number(e.amount ?? 0),
          description: String(e.description ?? ''),
          created_at: String(e.created_at ?? new Date().toISOString()),
        })),
      )
      setFuelExpenses(
        fuelRows.map((e: any) => ({
          id: String(e.id),
          source: 'Fuel' as const,
          branch_id: String(e.branch?.id ?? e.branch_id ?? ''),
          branch_name: String(e.branch?.name ?? branchNameById.get(String(e.branch?.id ?? e.branch_id ?? '')) ?? ''),
          category: String(e.category ?? ''),
          amount: Number(e.amount ?? 0),
          description: String(e.description ?? ''),
          created_at: String(e.created_at ?? new Date().toISOString()),
        })),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [user?.id, selectedBranchId, selectedBranchType, isPersonalOwner])

  const currentSourceBranches = useMemo(
    () => (formData.source === 'Gas' ? gasBranches : fuelBranches),
    [formData.source, gasBranches, fuelBranches],
  )

  useEffect(() => {
    if (!currentSourceBranches.length) {
      setFormData((prev) => ({ ...prev, branchId: '' }))
      return
    }
    setFormData((prev) => {
      if (prev.branchId && currentSourceBranches.some((b: any) => b.id === prev.branchId)) {
        return prev
      }
      return { ...prev, branchId: currentSourceBranches[0].id }
    })
  }, [currentSourceBranches])

  const getCategoryLabel = (category: string) => {
    return category
      .replace(/_/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cylinder_repair':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
      case 'safety_inspection':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'pump_maintenance':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'tank_cleaning':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'filter_replacement':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
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
    const defaultBranch = (formData.source === 'Gas' ? gasBranches[0]?.id : fuelBranches[0]?.id) ?? ''
    setFormData({
      source: 'Gas',
      branchId: defaultBranch,
      category: 'cylinder_repair',
      amount: '',
      description: '',
    })
  }

  const handleSourceChange = (source: ExpenseSource) => {
    const sourceBranches = source === 'Gas' ? gasBranches : fuelBranches
    setFormData((prev) => ({
      ...prev,
      source,
      branchId: sourceBranches[0]?.id ?? '',
      category: source === 'Gas' ? 'cylinder_repair' : 'pump_maintenance',
    }))
  }

  const handleRecordExpense = async (e: FormEvent) => {
    e.preventDefault()
    const amount = Number(formData.amount)
    const description = formData.description.trim()

    if (!formData.branchId || !formData.category || !description || !amount) {
      toast({
        title: 'Missing details',
        description: 'Source, branch, category, amount, and description are required.',
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
      if (formData.source === 'Gas') {
        await apiService.createGasExpense({
          branch_id: formData.branchId,
          category: formData.category,
          amount,
          description,
        })
      } else {
        await apiService.createFuelExpense({
          branch_id: formData.branchId,
          category: formData.category,
          amount,
          description,
        })
      }

      toast({
        title: 'Expense recorded',
        description: `${formData.source} expense added successfully.`,
      })
      await loadExpenses()
      setIsExpenseModalOpen(false)
      setFormData((prev) => ({ ...prev, amount: '', description: '' }))
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
            Expenses
          </h1>
          <p className="text-muted-foreground">Track and manage expenses across all branches</p>
        </div>
        <Button onClick={() => setIsExpenseModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Record Expense
        </Button>
      </div>

      {isOwner && (
        <Card className="p-4 mb-6 bg-muted/50 border-border">
          <div className="flex items-center gap-4">
            <Label className="font-semibold text-foreground min-w-fit">Select Branch:</Label>
            <Select
              value={localSelectedBranchId || 'all'}
              onValueChange={(value) => setLocalSelectedBranchId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-80">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {allBranches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} ({branch.location})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <MetricCard label="Total Expenses" value={`₦${(totalExpenses / 1000).toFixed(0)}K`} icon={TrendingDown} variant="primary" />
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
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Type</th>
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
                              <td className="px-6 py-4 text-foreground">{expense.source}</td>
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
            <DialogTitle>Record Expense</DialogTitle>
            <DialogDescription>Add an expense entry for gas or fuel operations.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordExpense} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <select
                id="source"
                value={formData.source}
                onChange={(e) => handleSourceChange(e.target.value as ExpenseSource)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="Gas">Gas</option>
                <option value="Fuel">Fuel</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <select
                id="branch"
                value={formData.branchId}
                onChange={(e) => setFormData((prev) => ({ ...prev, branchId: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {currentSourceBranches.map((branch: any) => (
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
                {formData.source === 'Gas' ? (
                  <>
                    <option value="cylinder_repair">Cylinder Repair</option>
                    <option value="safety_inspection">Safety Inspection</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="pump_maintenance">Pump Maintenance</option>
                    <option value="tank_cleaning">Tank Cleaning</option>
                    <option value="filter_replacement">Filter Replacement</option>
                    <option value="other">Other</option>
                  </>
                )}
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

