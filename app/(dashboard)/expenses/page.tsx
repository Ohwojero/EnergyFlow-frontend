'use client'

import { useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/metric-card'
import { AlertCircle, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
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

type ExpenseSource = 'Gas' | 'Fuel'

type ExpenseItem = {
  id: string
  source: ExpenseSource
  category: string
  amount: number
  description: string
  created_at: string
}

const mockGasExpenses = [
  {
    id: 'exp-1',
    source: 'Gas',
    category: 'cylinder_repair',
    amount: 25000,
    description: 'Repair of 3 damaged cylinders',
    created_at: new Date().toISOString(),
  },
  {
    id: 'exp-2',
    source: 'Gas',
    category: 'safety_inspection',
    amount: 15000,
    description: 'Monthly safety inspection',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

const mockFuelExpenses = [
  {
    id: 'fexp-1',
    source: 'Fuel',
    category: 'pump_maintenance',
    amount: 45000,
    description: 'Pump 1 and 2 maintenance service',
    created_at: new Date().toISOString(),
  },
  {
    id: 'fexp-2',
    source: 'Fuel',
    category: 'tank_cleaning',
    amount: 30000,
    description: 'Main storage tank cleaning and inspection',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'fexp-3',
    source: 'Fuel',
    category: 'filter_replacement',
    amount: 15000,
    description: 'Fuel filter replacement',
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
]

export default function ExpensesPage() {
  const [gasExpenses, setGasExpenses] = useState<ExpenseItem[]>(mockGasExpenses)
  const [fuelExpenses, setFuelExpenses] = useState<ExpenseItem[]>(mockFuelExpenses)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    source: 'Gas' as ExpenseSource,
    category: 'cylinder_repair',
    amount: '',
    description: '',
  })
  const expenses = [...gasExpenses, ...fuelExpenses]
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0

  const getCategoryLabel = (category: string) => {
    return category.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
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

  const groupByMonth = (expenses: ExpenseItem[]) => {
    const groups: Record<string, ExpenseItem[]> = {}
    expenses.forEach((e) => {
      const date = new Date(e.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(e)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const monthGroups = groupByMonth(expenses)
  const currentMonth = new Date().toISOString().slice(0, 7)

  const resetForm = () => {
    setFormData({
      source: 'Gas',
      category: 'cylinder_repair',
      amount: '',
      description: '',
    })
  }

  const handleSourceChange = (source: ExpenseSource) => {
    setFormData((prev) => ({
      ...prev,
      source,
      category: source === 'Gas' ? 'cylinder_repair' : 'pump_maintenance',
    }))
  }

  const handleRecordExpense = async (e: FormEvent) => {
    e.preventDefault()
    const amount = Number(formData.amount)
    const description = formData.description.trim()

    if (!formData.category || !description || !amount) {
      toast({
        title: 'Missing details',
        description: 'Source, category, amount, and description are required.',
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
      const nextExpense: ExpenseItem = {
        id: `${formData.source === 'Gas' ? 'exp' : 'fexp'}-${Date.now()}`,
        source: formData.source,
        category: formData.category,
        amount,
        description,
        created_at: new Date().toISOString(),
      }

      if (formData.source === 'Gas') {
        setGasExpenses((prev) => [nextExpense, ...prev])
      } else {
        setFuelExpenses((prev) => [nextExpense, ...prev])
      }

      toast({
        title: 'Expense recorded',
        description: `${nextExpense.source} expense added successfully.`,
      })
      setIsExpenseModalOpen(false)
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
            <AlertCircle className="w-8 h-8 text-secondary" />
            Expenses
          </h1>
          <p className="text-muted-foreground">
            Track and manage expenses across all branches
          </p>
        </div>
        <Button
          onClick={() => setIsExpenseModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Record Expense
        </Button>
      </div>

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
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Type</th>
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
            <DialogTitle>Record Expense</DialogTitle>
            <DialogDescription>
              Add an expense entry for gas or fuel operations.
            </DialogDescription>
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
                  </>
                ) : (
                  <>
                    <option value="pump_maintenance">Pump Maintenance</option>
                    <option value="tank_cleaning">Tank Cleaning</option>
                    <option value="filter_replacement">Filter Replacement</option>
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
