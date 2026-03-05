'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/metric-card'
import { AlertCircle, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth-context'
import { apiService } from '@/lib/api'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
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
  _type?: 'fuel' | 'gas'
}

type FuelShiftSale = {
  branch_id: string
  sales_amount: number
  created_at: string
}

export default function FuelExpensesPage() {
  const { user, selectedBranchId, selectedBranchType } = useAuth()
  const isOwner = user?.role === 'org_owner'
  const [allBranches, setAllBranches] = useState<any[]>([])
  const [fuelBranches, setFuelBranches] = useState<any[]>([])
  const [gasBranches, setGasBranches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const userFuelBranches = useMemo(
    () =>
      user?.assigned_branches.filter((id) =>
        fuelBranches.some((branch) => branch.id === id)
      ) || [],
    [user?.assigned_branches, fuelBranches]
  )

  const activeFuelBranchId = useMemo(() => {
    if (selectedBranchId && fuelBranches.some((branch) => branch.id === selectedBranchId)) {
      return selectedBranchId
    }
    const assignedFuelBranchId = (user?.assigned_branches ?? []).find((id) =>
      fuelBranches.some((branch) => branch.id === id),
    )
    return assignedFuelBranchId ?? fuelBranches[0]?.id ?? null
  }, [fuelBranches, selectedBranchId, user?.assigned_branches])

  const currentBranchInfo = activeFuelBranchId
    ? allBranches.find((b) => b.id === activeFuelBranchId)
    : null

  const [localSelectedBranchId, setLocalSelectedBranchId] = useState<string | null>(
    isOwner ? null : selectedBranchId
  )

  const [fuelExpenses, setFuelExpenses] = useState<ExpenseItem[]>([])
  const [gasExpenses, setGasExpenses] = useState<ExpenseItem[]>([])
  const [fuelShiftSales, setFuelShiftSales] = useState<FuelShiftSale[]>([])

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    category: 'pump_maintenance',
    amount: '',
    description: '',
  })

  const mapExpense = (expense: any, type: 'fuel' | 'gas', branches: any[]): ExpenseItem => {
    const branchId = String(expense.branch?.id ?? expense.branch_id ?? '')
    const branchName =
      expense.branch?.name ||
      branches.find((b) => b.id === branchId)?.name
    return {
      id: String(expense.id),
      category: String(expense.category ?? ''),
      amount: Number(expense.amount ?? 0),
      description: String(expense.description ?? ''),
      created_at: String(expense.created_at ?? new Date().toISOString()),
      branch_id: branchId || undefined,
      branch_name: branchName,
      _type: type,
    }
  }

  const loadExpenses = async () => {
    setIsLoading(true)
    try {
      const branchData = await apiService.getBranches().catch(() => [])
      const branches = Array.isArray(branchData) ? branchData : []
      const gasList = branches.filter((b: any) => b.type === 'gas')
      const fuelList = branches.filter((b: any) => b.type === 'fuel')

      const scopedFuelBranches = (() => {
        if (isOwner) return fuelList
        const assigned = new Set(user?.assigned_branches ?? [])
        if (assigned.size > 0) {
          return fuelList.filter((b: any) => assigned.has(b.id))
        }
        if (selectedBranchId) {
          const selected = fuelList.find((b: any) => b.id === selectedBranchId)
          return selected ? [selected] : fuelList
        }
        if (selectedBranchType === 'fuel') return fuelList
        return fuelList
      })()

      const scopedGasBranches = (() => {
        if (isOwner) return gasList
        return []
      })()

      setAllBranches(branches)
      setGasBranches(scopedGasBranches)
      setFuelBranches(scopedFuelBranches)

      const [allFuelExpenses, allGasExpenses, fuelShiftsByBranch] = await Promise.all([
        apiService.getAllFuelExpenses().catch(() => []),
        apiService.getAllGasExpenses().catch(() => []),
        Promise.all(
          scopedFuelBranches.map(async (branch: any) => ({
            branchId: String(branch.id),
            payload: await (
              isOwner
                ? apiService.getShiftReconciliations(branch.id)
                : apiService.getMyShiftReconciliations(branch.id)
            ).catch(() => []),
          })),
        ),
      ])

      const allowedFuelIds = new Set(scopedFuelBranches.map((b: any) => String(b.id)))
      const allowedGasIds = new Set(scopedGasBranches.map((b: any) => String(b.id)))

      setFuelExpenses(
        (Array.isArray(allFuelExpenses) ? allFuelExpenses : [])
          .filter((expense: any) =>
            allowedFuelIds.size > 0
              ? allowedFuelIds.has(String(expense.branch?.id ?? expense.branch_id ?? ''))
              : true,
          )
          .map((expense: any) => mapExpense(expense, 'fuel', branches))
      )
      setGasExpenses(
        (Array.isArray(allGasExpenses) ? allGasExpenses : [])
          .filter((expense: any) =>
            allowedGasIds.size > 0
              ? allowedGasIds.has(String(expense.branch?.id ?? expense.branch_id ?? ''))
              : false,
          )
          .map((expense: any) => mapExpense(expense, 'gas', branches))
      )
      setFuelShiftSales(
        fuelShiftsByBranch.flatMap(({ branchId, payload }) =>
          (Array.isArray(payload) ? payload : []).map((shift: any) => ({
            branch_id: String(shift.branch_id ?? shift.branch?.id ?? branchId),
            sales_amount: Number(shift.sales_amount ?? 0),
            created_at: String(shift.created_at ?? shift.createdAt ?? new Date().toISOString()),
          })),
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [user?.id, selectedBranchId, selectedBranchType, isOwner])

  const expenses = fuelExpenses

  const visibleExpenses = (() => {
    const source = expenses
    if (isOwner) {
      if (!localSelectedBranchId) {
        return source
      }
      return source.filter((e) => e.branch_id === localSelectedBranchId)
    } else {
      const targetBranchId = activeFuelBranchId
      if (!targetBranchId) return source
      const filtered = source.filter((e) => e.branch_id === targetBranchId)
      return filtered
    }
  })()

  const isSameLocalDay = (value: string | Date, today: Date) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return false
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }

  const now = new Date()
  const totalExpenses = visibleExpenses
    .filter((exp) => isSameLocalDay(exp.created_at, now))
    .reduce((sum, exp) => sum + exp.amount, 0)
  const visibleFuelSalesTotal = (() => {
    if (isOwner) {
      if (!localSelectedBranchId) {
        return fuelShiftSales
          .filter((row) => isSameLocalDay(row.created_at, now))
          .reduce((sum, row) => sum + row.sales_amount, 0)
      }
      return fuelShiftSales
        .filter((row) => row.branch_id === localSelectedBranchId && isSameLocalDay(row.created_at, now))
        .reduce((sum, row) => sum + row.sales_amount, 0)
    }
    const targetBranchId = activeFuelBranchId
    if (!targetBranchId) {
      return fuelShiftSales
        .filter((row) => isSameLocalDay(row.created_at, now))
        .reduce((sum, row) => sum + row.sales_amount, 0)
    }
    return fuelShiftSales
      .filter((row) => row.branch_id === targetBranchId && isSameLocalDay(row.created_at, now))
      .reduce((sum, row) => sum + row.sales_amount, 0)
  })()
  const visibleFuelSalesCount = (() => {
    if (isOwner) {
      if (!localSelectedBranchId) {
        return fuelShiftSales.filter((row) => isSameLocalDay(row.created_at, now)).length
      }
      return fuelShiftSales.filter((row) => row.branch_id === localSelectedBranchId && isSameLocalDay(row.created_at, now)).length
    }
    const targetBranchId = activeFuelBranchId
    if (!targetBranchId) {
      return fuelShiftSales.filter((row) => isSameLocalDay(row.created_at, now)).length
    }
    return fuelShiftSales.filter((row) => row.branch_id === targetBranchId && isSameLocalDay(row.created_at, now)).length
  })()
  const averageSale = visibleFuelSalesCount > 0 ? visibleFuelSalesTotal / visibleFuelSalesCount : 0
  const netFuelSalesAfterExpenses = averageSale - totalExpenses

  const getCategoryLabel = (category: string) => {
    return category.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
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

  const groupByMonth = <T extends { created_at: string }>(expenses: T[]) => {
    const groups: Record<string, T[]> = {}
    expenses.forEach((e) => {
      const date = new Date(e.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(e)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const monthGroups = groupByMonth(visibleExpenses)
  const currentMonth = new Date().toISOString().slice(0, 7)

  const resetForm = () => {
    setFormData({
      category: 'pump_maintenance',
      amount: '',
      description: '',
    })
  }

  const handleRecordExpense = async (e: FormEvent) => {
    e.preventDefault()
    const amount = Number(formData.amount)
    const description = formData.description.trim()

    if (!formData.category || !amount || !description) {
      toast({
        title: 'Missing details',
        description: 'Category, amount, and description are required.',
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
    const chosenBranch = isOwner
      ? localSelectedBranchId ??
        user?.assigned_branches?.[0] ??
        fuelBranches[0]?.id ??
        ''
      : activeFuelBranchId ??
        fuelBranches[0]?.id ??
        ''

    if (!chosenBranch) {
      toast({
        title: 'No branch selected',
        description: 'Please choose a fuel branch before submitting.',
      })
      setIsSubmitting(false)
      return
    }

    try {
      await apiService.createFuelExpense({
        branch_id: chosenBranch,
        category: formData.category,
        amount,
        description,
      })
      await loadExpenses()
      toast({
        title: 'Expense recorded',
        description: 'Fuel expense has been added successfully.',
      })
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
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-orange-500" />
            Fuel Station Expenses
          </h1>
          <p className="text-muted-foreground">
            Track and manage fuel station operating costs
          </p>
          {!isOwner && currentBranchInfo && (
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">{currentBranchInfo.name}</span> • {currentBranchInfo.location}
            </p>
          )}
        </div>
        <Button
          onClick={() => setIsExpenseModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Record Expense
        </Button>
      </div>

      {/* Branch selector for owners or multi-branch managers */}
      {(isOwner || userFuelBranches.length > 1) && (
        <Card className="p-4 mb-6 bg-muted/50 border-border">
          <div className="flex items-center gap-4">
            <Label className="font-semibold text-foreground min-w-fit">Select Branch:</Label>
            {isOwner ? (
              <Select value={localSelectedBranchId || 'all'} onValueChange={(v) => setLocalSelectedBranchId(v === 'all' ? null : v)}>
                <SelectTrigger className="w-80">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {fuelBranches
                    .map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.location})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                {currentBranchInfo?.name} • {currentBranchInfo?.location}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Total Expenses"
          value={`₦${(totalExpenses / 1000).toFixed(0)}K`}
          icon={TrendingDown}
          variant="primary"
        />
        <MetricCard
          label="Average Sale"
          value={`N${Math.round(averageSale - totalExpenses).toLocaleString()}`}
          variant="secondary"
        />
        <MetricCard
          label="Expense Count"
          value={visibleExpenses.length}
          variant="accent"
        />
      </div>

      {/* Expenses Table */}
      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Expense Records</h3>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center">
            <p className="text-muted-foreground">Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-muted-foreground">No expenses recorded yet</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={[currentMonth]} className="w-full">
            {monthGroups.map(([monthKey, monthExpenses]) => {
              const date = new Date(monthKey + '-01')
              const monthName = date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
              const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0)
              
              return (
                <AccordionItem key={monthKey} value={monthKey} className="border-b">
                  <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold">{monthName}</span>
                      <span className="text-sm text-muted-foreground">
                        {monthExpenses.length} expenses • ₦{monthTotal.toLocaleString()}
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
                            {isOwner && (
                              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Type</th>
                            )}
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Category</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Description</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthExpenses.map((expense) => (
                            <tr key={expense.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4 text-foreground">{formatDate(expense.created_at)}</td>
                              <td className="px-6 py-4 text-foreground">{expense.branch_name}</td>
                              {isOwner && (
                                <td className="px-6 py-4 text-foreground capitalize">{expense._type}</td>
                              )}
                              <td className="px-6 py-4">
                                <Badge className={getCategoryColor(expense.category)}>
                                  {getCategoryLabel(expense.category)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-foreground">{expense.description}</td>
                              <td className="px-6 py-4 font-semibold text-foreground">₦{expense.amount.toLocaleString()}</td>
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
            <DialogTitle>Record Fuel Expense</DialogTitle>
            <DialogDescription>
              Add a fuel station expense entry.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordExpense} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="pump_maintenance">Pump Maintenance</option>
                <option value="tank_cleaning">Tank Cleaning</option>
                <option value="filter_replacement">Filter Replacement</option>
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
                placeholder="e.g. 30000"
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExpenseModalOpen(false)}
                disabled={isSubmitting}
              >
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


