'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, TrendingUp, ArrowUpRight, Edit, Trash2, DollarSign } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
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
import { apiService } from '@/lib/api'
import { getLagosTimeHHMM, isSameLagosDay, toLagosDateKey } from '@/lib/lagos-time'
import type { Branch, GasTransaction } from '@/types'

type SaleTransaction = GasTransaction & { branch_name?: string; payment_method?: string; salesperson?: string }

const parseSaleNotes = (rawNotes: string) => {
  const notesValue = String(rawNotes ?? '')
  const parts = notesValue.split('|').map((p) => p.trim()).filter(Boolean)
  let paymentMethod = ''
  let salesperson = ''
  const cleanedNotes: string[] = []

  parts.forEach((part) => {
    if (part.startsWith('payment:')) {
      paymentMethod = part.replace('payment:', '').trim()
      return
    }
    if (part.startsWith('salesperson:')) {
      salesperson = part.replace('salesperson:', '').trim()
      return
    }
    cleanedNotes.push(part)
  })

  return {
    notes: cleanedNotes.join(' | '),
    payment_method: paymentMethod,
    salesperson,
  }
}

export default function GasSalesPage() {
  const { user, selectedBranchId } = useAuth()
  const isOwner = user?.role === 'org_owner'
  const isPersonalOwner = isOwner && user?.subscription_plan === 'personal'
  const isPersonalFuelOwner = isPersonalOwner && (user as any)?.business_type === 'fuel'
  const isManager = user?.role === 'gas_manager'
  const isSalesStaff = user?.role === 'sales_staff'
  const canEditDelete = isOwner || isManager

  // Redirect personal fuel plan users to fuel sales
  useEffect(() => {
    if (isPersonalFuelOwner) {
      window.location.href = '/fuel/sales'
      return
    }
  }, [isPersonalFuelOwner])

  // Don't render anything for personal fuel plan users while redirecting
  if (isPersonalFuelOwner) {
    return (
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Redirecting to Fuel Sales...</p>
        </div>
      </div>
    )
  }

  const [branches, setBranches] = useState<Branch[]>([])
  const [branchUsers, setBranchUsers] = useState<any[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [expenses, setExpenses] = useState<any[]>([])
  const [localSelectedBranchId, setLocalSelectedBranchId] = useState<string | null>(() =>
    user?.role === 'org_owner' ? null : selectedBranchId,
  )
  const [isLoading, setIsLoading] = useState(true)

  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false)
  const [isEditSaleOpen, setIsEditSaleOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [salesTransactions, setSalesTransactions] = useState<SaleTransaction[]>([])
  const [editingSale, setEditingSale] = useState<SaleTransaction | null>(null)
  const [formData, setFormData] = useState({
    shift_number: '1',
    pump_number: '',
    start_reading: '0',
    end_reading: '0',
    price_per_kg: '',
    paymentMethod: '',
    salesperson: '',
    date: toLagosDateKey(),
    time: getLagosTimeHHMM(),
  })
  const [editFormData, setEditFormData] = useState({
    quantity: '',
    amount: '',
    notes: '',
    paymentMethod: '',
    salesperson: '',
  })

  const userGasBranches = useMemo(
    () => branches.filter((branch) => user?.assigned_branches?.includes(branch.id)),
    [branches, user?.assigned_branches],
  )

  const currentBranchInfo = useMemo(() => {
    const branchId = isOwner ? localSelectedBranchId : selectedBranchId
    return branchId ? branches.find((branch) => branch.id === branchId) : null
  }, [branches, isOwner, localSelectedBranchId, selectedBranchId])

  const normalizeTransaction = (raw: any, fallbackBranchId?: string): SaleTransaction => {
    const parsed = parseSaleNotes(raw.notes ?? '')
    return {
      id: raw.id,
      branch_id: raw.branch_id ?? raw.branch?.id ?? fallbackBranchId ?? '',
      type: raw.type,
      cylinder_size: raw.cylinder_size ?? '',
      quantity: Number(raw.quantity ?? 0),
      amount: Number(raw.amount ?? 0),
      notes: parsed.notes,
      created_at: raw.created_at ?? new Date().toISOString(),
      branch_name: raw.branch_name ?? raw.branch?.name,
      payment_method: raw.payment_method ?? parsed.payment_method,
      salesperson: raw.salesperson ?? parsed.salesperson,
    }
  }

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await apiService.getGasBranches()
        setBranches(Array.isArray(data) ? data : [])
      } catch {
        toast({
          title: 'Load failed',
          description: 'Could not load gas branches.',
        })
      }
    }
    loadBranches()
  }, [])

  useEffect(() => {
    const loadBranchUsers = async () => {
      if (!isManager || !selectedBranchId) return
      setIsLoadingUsers(true)
      try {
        const users = await apiService.getBranchUsers(selectedBranchId)
        setBranchUsers(Array.isArray(users) ? users : [])
      } catch {
        setBranchUsers([])
      } finally {
        setIsLoadingUsers(false)
      }
    }
    loadBranchUsers()
  }, [isManager, selectedBranchId])

  useEffect(() => {
    const loadSales = async () => {
      setIsLoading(true)
      try {
        if (isOwner) {
          const targetBranchIds = localSelectedBranchId
            ? [localSelectedBranchId]
            : branches.map((branch) => branch.id)
          const [salesResponses, expenseResponses] = await Promise.all([
            Promise.all(
              targetBranchIds.map(async (branchId) => {
                const list = await apiService.getGasSales(branchId)
                return (Array.isArray(list) ? list : []).map((row) => normalizeTransaction(row, branchId))
              }),
            ),
            Promise.all(
              targetBranchIds.map(async (branchId) => {
                const list = await apiService.getGasExpenses(branchId)
                return Array.isArray(list) ? list : []
              }),
            ),
          ])
          const all = salesResponses.flat()
            .filter((transaction) => {
              // Exclude payment records from sales
              const notes = String(transaction.notes ?? '').toLowerCase()
              return !notes.includes('type:payment_record')
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          setSalesTransactions(all)
          setExpenses(expenseResponses.flat())
          return
        }

        const fallbackBranchId = selectedBranchId ?? user?.assigned_branches?.[0] ?? branches[0]?.id
        if (!fallbackBranchId) {
          setSalesTransactions([])
          setExpenses([])
          return
        }
        const [list, expenseList] = await Promise.all([
          isSalesStaff ? apiService.getMyGasSales(fallbackBranchId) : apiService.getGasSales(fallbackBranchId),
          apiService.getGasExpenses(fallbackBranchId),
        ])
        
        const normalized = (Array.isArray(list) ? list : [])
          .map((row) => normalizeTransaction(row, fallbackBranchId))
          .filter((transaction) => {
            // Exclude payment records from sales
            const notes = String(transaction.notes ?? '').toLowerCase()
            return !notes.includes('type:payment_record')
          })
        
        setSalesTransactions(normalized)
        setExpenses(Array.isArray(expenseList) ? expenseList : [])
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

    if (branches.length > 0 || selectedBranchId || isOwner) {
      loadSales()
    }
  }, [branches, isOwner, localSelectedBranchId, selectedBranchId, user?.assigned_branches, isSalesStaff, user?.id])

  const openingReadingValue = Number(formData.start_reading)
  const closingReadingValue = Number(formData.end_reading)
  const pricePerKgValue = Number(formData.price_per_kg)
  const kgSold = Number.isNaN(openingReadingValue) || Number.isNaN(closingReadingValue)
    ? 0
    : closingReadingValue - openingReadingValue
  const computedSalesAmount = Number.isNaN(pricePerKgValue)
    ? 0
    : kgSold * pricePerKgValue

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const salesStaffSales = salesTransactions.filter((t) => {
    const salesperson = String(t.salesperson ?? '').toLowerCase()
    const notes = String(t.notes ?? '').toLowerCase()
    // Exclude payment records and only include sales staff transactions
    return !notes.includes('type:payment_record') && 
           isSameLagosDay(t.created_at, now) &&
           (salesperson === 'sales_staff' || 
            (!salesperson.includes('manager') && 
             salesperson !== 'manager' && 
             salesperson !== '' &&
             !salesperson.startsWith('manager/')))
  })
  const managerSales = salesTransactions.filter((t) => {
    const salesperson = String(t.salesperson ?? '').toLowerCase()
    return isSameLagosDay(t.created_at, now) && (salesperson.includes('manager') || salesperson === 'manager')
  })
  const todayTransactions = salesTransactions.filter((t) => isSameLagosDay(t.created_at, now))
  const totalSales = salesStaffSales.reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = expenses.reduce((sum, e) => {
    if (!isSameLagosDay(e.created_at, now)) return sum
    return sum + Number(e.amount ?? 0)
  }, 0)
  const totalSalesMinusExpense = totalSales - totalExpenses
  const formatMoneyShort = (amount: number) => {
    if (amount >= 1000000) return `N${(amount / 1000000).toFixed(2)}M`
    if (amount >= 1000) return `N${(amount / 1000).toFixed(1)}K`
    return `N${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Lagos',
    })

  const groupByDay = (transactions: SaleTransaction[]) => {
    const groups: Record<string, SaleTransaction[]> = {}
    transactions.forEach((t) => {
      const date = new Date(t.created_at)
      const key = toLagosDateKey(date)
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const dayGroups = groupByDay(salesTransactions)
  const currentDay = toLagosDateKey()

  const resetForm = () => {
    setFormData({
      shift_number: String((salesTransactions[0]?.quantity ?? 0) + 1),
      pump_number: '',
      start_reading: '0',
      end_reading: '0',
      price_per_kg: '',
      paymentMethod: '',
      salesperson: '',
      date: toLagosDateKey(),
      time: getLagosTimeHHMM(),
    })
  }

  const handleSaveSale = async (e: FormEvent) => {
    e.preventDefault()
    const startReading = Number(formData.start_reading)
    const endReading = Number(formData.end_reading)
    const pricePerKg = Number(formData.price_per_kg)
    const quantity = kgSold
    const amount = computedSalesAmount

    const salespersonValue = isSalesStaff ? user?.name || 'Sales Staff' : formData.salesperson

    if (!formData.pump_number || !salespersonValue || !pricePerKg) {
      toast({
        title: 'Missing details',
        description: 'All fields are required.',
      })
      return
    }

    if (pricePerKg <= 0 || amount <= 0 || quantity <= 0) {
      toast({
        title: 'Invalid values',
        description: 'Price and readings must be valid.',
      })
      return
    }

    if (endReading < startReading) {
      toast({
        title: 'Invalid readings',
        description: 'Closing reading cannot be less than opening reading.',
      })
      return
    }

    const branchId = isOwner
      ? localSelectedBranchId
      : selectedBranchId ?? user?.assigned_branches?.[0] ?? currentBranchInfo?.id ?? branches[0]?.id
    
    if (!branchId) {
      toast({
        title: 'Missing branch',
        description: isOwner && !isPersonalOwner
          ? 'Select a branch (not "All Branches") before recording sales.'
          : 'Unable to determine branch for recording sales.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const dateValue = formData.date || toLagosDateKey()
      const timeValue = formData.time || getLagosTimeHHMM()
      const customTimestamp = new Date(`${dateValue}T${timeValue}:00`).toISOString()
      
      const created = await apiService.createGasSale({
        branch_id: branchId,
        type: 'sale',
        cylinder_size: `${quantity}kg`,
        quantity,
        amount,
        notes: `salesperson:${salespersonValue} | shift:${formData.shift_number} | pump:${formData.pump_number} | start:${startReading} | end:${endReading} | price:${pricePerKg}`,
        created_at: customTimestamp,
      })
      
      const nextSale = normalizeTransaction(created, branchId)
      nextSale.branch_name = branches.find((branch) => branch.id === branchId)?.name
      nextSale.payment_method = formData.paymentMethod
      nextSale.salesperson = salespersonValue
      
      setSalesTransactions((prev) => [nextSale, ...prev])
      toast({
        title: 'Sale recorded',
        description: 'Gas sale transaction added successfully.',
        className: 'bg-green-100 border-green-500 text-green-800',
      })
      setIsRecordSaleOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save gas sale.',
        className: 'bg-red-100 border-red-500 text-red-800',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (sale: SaleTransaction) => {
    setEditingSale(sale)
    setEditFormData({
      quantity: String(sale.quantity),
      amount: String(sale.amount),
      notes: sale.notes ?? '',
      paymentMethod: sale.payment_method ?? '',
      salesperson: sale.salesperson ?? '',
    })
    setIsEditSaleOpen(true)
  }

  const handleUpdateSale = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingSale) return

    const quantity = Number(editFormData.quantity)
    const amount = Number(editFormData.amount)
    const notes = editFormData.notes.trim()

    if (!quantity || !amount || !editFormData.paymentMethod || !editFormData.salesperson) {
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
      const updated = await apiService.updateGasSale(editingSale.id, {
        quantity,
        amount,
        notes: `${notes || 'Direct sales entry'} | payment:${editFormData.paymentMethod} | salesperson:${editFormData.salesperson}`,
      })
      const normalized = normalizeTransaction(updated, editingSale.branch_id)
      setSalesTransactions((prev) =>
        prev.map((item) => (item.id === editingSale.id ? { ...item, ...normalized } : item)),
      )
      toast({
        title: 'Sale updated',
        description: 'Sale transaction was updated successfully.',
        className: 'bg-blue-100 border-blue-500 text-blue-800',
      })
      setIsEditSaleOpen(false)
      setEditingSale(null)
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Request failed',
        className: 'bg-red-100 border-red-500 text-red-800',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSale = async (saleId: string) => {
    setIsSubmitting(true)
    try {
      await apiService.deleteGasSale(saleId)
      setSalesTransactions((prev) => prev.filter((sale) => sale.id !== saleId))
      toast({
        title: 'Sale deleted',
        description: 'Sale transaction was deleted successfully.',
        className: 'bg-red-100 border-red-500 text-red-800',
      })
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Request failed',
        className: 'bg-red-100 border-red-500 text-red-800',
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
            <ShoppingCart className="w-8 h-8 text-secondary" />
            Sales Management
          </h1>
          <p className="text-muted-foreground">Track and record all gas sales transactions</p>
          {!isOwner && currentBranchInfo && (
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">{currentBranchInfo.name}</span> • {currentBranchInfo.location}
            </p>
          )}
        </div>
        <Button onClick={() => setIsRecordSaleOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Record Sale
        </Button>
      </div>

      {!isPersonalOwner && (isOwner || (userGasBranches.length > 1)) && (
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
                  {branches.map((branch) => (
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
          <p className="text-sm text-muted-foreground mb-1">{isOwner ? 'Total Sales from all Pump' : isManager ? 'Total Sales from all Pump' : 'Total Sales'}</p>
          <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(totalSales)}</h3>
          <p className="text-xs text-muted-foreground mt-2">This period</p>
        </Card>

        <Card className="p-6 bg-orange-100 dark:bg-orange-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-orange-600/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Transactions</p>
          <h3 className="text-3xl font-bold text-foreground">{todayTransactions.length}</h3>
          <p className="text-xs text-muted-foreground mt-2">Recorded sales</p>
        </Card>

        <Card className="p-6 bg-green-100 dark:bg-green-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-600/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Sales from all Pump-Expense</p>
          <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(totalSalesMinusExpense)}</h3>
          <p className="text-xs text-muted-foreground mt-2">Net amount</p>
        </Card>
      </div>

      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Recent Sales</h3>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center text-muted-foreground">Loading sales...</div>
        ) : salesTransactions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-muted-foreground">No sales transactions recorded yet</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={[currentDay]} className="w-full">
            {dayGroups.map(([dayKey, transactions]) => {
              const date = new Date(dayKey)
              const dayName = date.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })
              
              const salesStaffTransactions = transactions.filter((t) => {
                const salesperson = String(t.salesperson ?? '').toLowerCase()
                const notes = String(t.notes ?? '').toLowerCase()
                // Exclude payment records and only include sales staff transactions
                return !notes.includes('type:payment_record') && 
                       (salesperson === 'sales_staff' || 
                        (!salesperson.includes('manager') && 
                         salesperson !== 'manager' && 
                         salesperson !== '' &&
                         !salesperson.startsWith('manager/')))
              })
              const dayTotal = salesStaffTransactions.reduce((sum, t) => sum + t.amount, 0)

              return (
                <AccordionItem key={dayKey} value={dayKey} className="border-b">
                  <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold">{dayName}</span>
                      <span className="text-sm text-muted-foreground">
                        {salesStaffTransactions.length} sales • ₦{dayTotal.toLocaleString()}
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
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Details</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Salesperson</th>
                            {canEditDelete && <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((transaction) => (
                            <tr key={transaction.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4 text-foreground">
                                {new Date(transaction.created_at).toLocaleTimeString('en-NG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  timeZone: 'Africa/Lagos',
                                })}
                              </td>
                              <td className="px-6 py-4 text-foreground">
                                {transaction.branch_name ?? branches.find((b) => b.id === transaction.branch_id)?.name ?? 'Unknown Branch'}
                              </td>
                              <td className="px-6 py-4 text-foreground text-sm">
                                {transaction.notes?.match(/shift:(\d+)/)?.[1] && `shift:${transaction.notes.match(/shift:(\d+)/)?.[1]}`}
                                {transaction.notes?.match(/pump:(\d+)/)?.[1] && ` | pump:${transaction.notes.match(/pump:(\d+)/)?.[1]}`}
                                {transaction.notes?.match(/start:(\d+)/)?.[1] && ` | start:${transaction.notes.match(/start:(\d+)/)?.[1]}`}
                                {transaction.notes?.match(/end:(\d+)/)?.[1] && ` | end:${transaction.notes.match(/end:(\d+)/)?.[1]}`}
                                {transaction.notes?.match(/price:(\d+)/)?.[1] && ` | price:${transaction.notes.match(/price:(\d+)/)?.[1]}`}
                              </td>
                              <td className="px-6 py-4 font-semibold text-foreground">₦{transaction.amount.toLocaleString()}</td>
                              <td className="px-6 py-4 text-foreground">{transaction.salesperson || 'N/A'}</td>
                              {canEditDelete && (
                                <td className="px-6 py-4">
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0"
                                      onClick={() => openEditModal(transaction)}
                                      disabled={isSubmitting}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                      onClick={() => handleDeleteSale(transaction.id)}
                                      disabled={isSubmitting}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              )}
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
        open={isRecordSaleOpen}
        onOpenChange={(open) => {
          setIsRecordSaleOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Gas Sale</DialogTitle>
            <DialogDescription>Enter gas sales transaction details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSale} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift_number">Shift Number</Label>
                <Input
                  id="shift_number"
                  type="number"
                  min="1"
                  value={formData.shift_number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shift_number: e.target.value }))}
                  className="border-2 border-border focus-visible:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pump_number">Pump Number</Label>
                <Input
                  id="pump_number"
                  type="number"
                  min="1"
                  value={formData.pump_number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pump_number: e.target.value }))}
                  className="border-2 border-border focus-visible:border-primary"
                />
              </div>
            </div>

            {!isSalesStaff && isManager && (
              <div className="space-y-2">
                <Label htmlFor="salesperson">Assigned Sales Staff</Label>
                <Select value={formData.salesperson} onValueChange={(value) => setFormData((prev) => ({ ...prev, salesperson: value }))}>
                  <SelectTrigger className="border-2 border-border focus:border-primary">
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={`Manager/${user?.name || 'Manager'}`}>Manager/{user?.name || 'Manager'}</SelectItem>
                    {branchUsers
                      .filter((u) => u.role === 'sales_staff')
                      .map((u) => (
                        <SelectItem key={u.id} value={u.name}>
                          {u.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!isSalesStaff && isOwner && (
              <div className="space-y-2">
                <Label htmlFor="salesperson">Assigned Sales Staff</Label>
                <Select value={formData.salesperson} onValueChange={(value) => setFormData((prev) => ({ ...prev, salesperson: value }))}>
                  <SelectTrigger className="border-2 border-border focus:border-primary">
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="sales_staff">Sales Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_reading">Opening Reading</Label>
                <Input
                  id="start_reading"
                  type="number"
                  min="0"
                  value={formData.start_reading}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_reading: e.target.value }))}
                  className="border-2 border-border focus-visible:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_reading">Closing Reading</Label>
                <Input
                  id="end_reading"
                  type="number"
                  min="0"
                  value={formData.end_reading}
                  onChange={(e) => setFormData((prev) => ({ ...prev, end_reading: e.target.value }))}
                  className="border-2 border-border focus-visible:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_per_kg">Price Per Kg</Label>
              <Input
                id="price_per_kg"
                type="number"
                min="1"
                value={formData.price_per_kg}
                onChange={(e) => setFormData((prev) => ({ ...prev, price_per_kg: e.target.value }))}
                placeholder="e.g. 1200"
                className="border-2 border-border focus-visible:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label>Total Sales (Calculated)</Label>
              <Input
                value={Number.isFinite(computedSalesAmount) ? `₦${computedSalesAmount.toLocaleString()}` : '₦0'}
                readOnly
                className="border-2 border-border bg-muted/40 text-lg font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sale-date">Date</Label>
                <Input
                  id="sale-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className="border-2 border-border focus-visible:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-time">Time</Label>
                <Input
                  id="sale-time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                  className="border-2 border-border focus-visible:border-primary"
                />
              </div>
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

      <Dialog
        open={isEditSaleOpen}
        onOpenChange={(open) => {
          setIsEditSaleOpen(open)
          if (!open) setEditingSale(null)
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Gas Sale</DialogTitle>
            <DialogDescription>Update the selected gas sale transaction.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateSale} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Kg Sold</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="1"
                value={editFormData.quantity}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, quantity: e.target.value }))}
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
                  <SelectItem value="cash">Cash on Hand</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Total Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                min="1"
                value={editFormData.amount}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-salesperson">Recorded By</Label>
              <Select value={editFormData.salesperson} onValueChange={(value) => setEditFormData((prev) => ({ ...prev, salesperson: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {isManager ? (
                    <>
                      <SelectItem value={`Manager/${user?.name || 'Manager'}`}>Manager/{user?.name || 'Manager'}</SelectItem>
                      {branchUsers
                        .filter((u) => u.role === 'sales_staff')
                        .map((u) => (
                          <SelectItem key={u.id} value={u.name}>
                            {u.name}
                          </SelectItem>
                        ))}
                    </>
                  ) : (
                    <>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="sales_staff">Sales Staff</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditSaleOpen(false)} disabled={isSubmitting}>
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
