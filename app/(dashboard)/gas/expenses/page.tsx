'use client'

import { useState, type FormEvent, useEffect } from 'react'
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
import { mockBranches } from '@/lib/mock-data'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { getAllExpenses, addExpense } from '@/lib/expense-store'

// Mock expense data
const mockExpenses: Array<{id:string;category:string;amount:number;description:string;created_at:string;branch_id?:string}> = [
  {
    id: 'exp-1',
    category: 'cylinder_repair',
    amount: 25000,
    description: 'Repair of 3 damaged cylinders',
    created_at: new Date().toISOString(),
    branch_id: 'branch-1',
  },
  {
    id: 'exp-2',
    category: 'safety_inspection',
    amount: 15000,
    description: 'Monthly safety inspection',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    branch_id: 'branch-1',
  },
]

export default function GasExpensesPage() {
  const { user, selectedBranchId } = useAuth()
  const isOwner = user?.role === 'org_owner'

  const userGasBranches = user?.assigned_branches.filter(
    (id) => mockBranches.find((b) => b.id === id && b.type === 'gas')
  ) || []

  const currentBranchInfo = selectedBranchId
    ? mockBranches.find((b) => b.id === selectedBranchId)
    : null

  const [localSelectedBranchId, setLocalSelectedBranchId] = useState<string | null>(
    isOwner ? null : selectedBranchId
  )

  const [gasExpenses, setGasExpenses] = useState(getAllExpenses('gas', mockExpenses))
  const [fuelExpenses, setFuelExpenses] = useState(getAllExpenses('fuel', []))

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    category: 'cylinder_repair',
    amount: '',
    description: '',
  })


  const getCategoryLabel = (category: string) => {
    return category.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cylinder_repair':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
      case 'safety_inspection':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
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

  const currentMonth = new Date().toISOString().slice(0, 7)

  // combine when owner; otherwise just gas
  const expenses = isOwner
    ? [
        ...gasExpenses.map((e) => ({ ...e, _type: 'gas' })),
        ...fuelExpenses.map((e) => ({ ...e, _type: 'fuel' })),
      ]
    : gasExpenses

  // derive visible expenses without mutating the base array
  const visibleExpenses = (() => {
    const source = expenses
    if (isOwner) {
      if (!localSelectedBranchId) {
        return source.map((e) => ({
          ...e,
          branch_name: e.branch_name ?? mockBranches.find((b) => b.id === e.branch_id)?.name,
        }))
      }
      return source
        .filter((e) => e.branch_id === localSelectedBranchId)
        .map((e) => ({
          ...e,
          branch_name: e.branch_name ?? mockBranches.find((b) => b.id === e.branch_id)?.name,
        }))
    } else {
      const filtered = source.filter((e) => e.branch_id === selectedBranchId)
      return filtered.map((e) => ({
        ...e,
        branch_name: e.branch_name ?? mockBranches.find((b) => b.id === e.branch_id)?.name,
      }))
    }
  })()

  const totalExpenses = visibleExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const avgExpense = visibleExpenses.length > 0 ? totalExpenses / visibleExpenses.length : 0

  const monthGroups = groupByMonth(visibleExpenses)
  
  // Listen for changes to localStorage (when managers record expenses)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('energyflow_expenses_gas')) {
        setGasExpenses(getAllExpenses('gas', mockExpenses))
      }
      if (e.key?.includes('energyflow_expenses_fuel')) {
        setFuelExpenses(getAllExpenses('fuel', []))
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const resetForm = () => {
    setFormData({
      category: 'cylinder_repair',
      amount: '',
      description: '',
    })
  }

  const handleRecordExpense = (e: FormEvent) => {
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
        mockExpenses[0]?.branch_id ??
        'branch-1'
      : selectedBranchId ??
        user?.assigned_branches?.[0] ??
        mockExpenses[0]?.branch_id ??
        'branch-1'
    const nextExpense = {
      id: `exp-${Date.now()}`,
      category: formData.category,
      amount,
      description,
      branch_id: chosenBranch,
      branch_name: mockBranches.find((b) => b.id === chosenBranch)?.name,
      created_at: new Date().toISOString(),
    }

    try {
      addExpense('gas', nextExpense)
      setGasExpenses((prev) => [nextExpense, ...prev])
      toast({
        title: 'Expense recorded',
        description: 'Gas expense has been added successfully.',
      })
      setIsExpenseModalOpen(false)
      resetForm()
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
            <AlertCircle className="w-8 h-8 text-secondary" />
            Expenses
          </h1>
          <p className="text-muted-foreground">
            Track and manage branch operating expenses
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
      {(isOwner || userGasBranches.length > 1) && (
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
                  {mockBranches
                    .filter((b) => b.type === 'gas')
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
          label="Average Expense"
          value={`₦${(avgExpense / 1000).toFixed(0)}K`}
          variant="secondary"
        />
        <MetricCard
          label="Expense Count"
          value={expenses.length}
          variant="accent"
        />
      </div>

      {/* Expenses Table */}
      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Expense Records</h3>
        </div>

        {expenses.length === 0 ? (
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
            <DialogTitle>Record Gas Expense</DialogTitle>
            <DialogDescription>
              Add a branch expense entry.
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
