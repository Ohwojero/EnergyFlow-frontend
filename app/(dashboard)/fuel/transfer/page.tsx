'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DollarSign, Plus, TrendingUp, Pencil, Trash2 } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import { apiService } from '@/lib/api'
import type { Branch } from '@/types'
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

type Transfer = {
  id: string
  amount: number
  staff_name: string
  created_at: string
  branch_id?: string
}

export default function FuelTransferPage() {
  const { user, selectedBranchId } = useAuth()
  const isOwner = user?.role === 'org_owner'
  const [branches, setBranches] = useState<Branch[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [shifts, setShifts] = useState<any[]>([])
  const [expenses, setExpenses] = useState(0)
  const [localSelectedBranchId, setLocalSelectedBranchId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    amount: '',
    staff_name: '',
  })
  const [editFormData, setEditFormData] = useState({
    amount: '',
    staff_name: '',
  })

  const activeBranchId = useMemo(() => {
    if (isOwner) return localSelectedBranchId
    return selectedBranchId
  }, [isOwner, localSelectedBranchId, selectedBranchId])

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await apiService.getFuelBranches().catch(() => [])
        let fuelList = Array.isArray(data) ? data : []
        if (fuelList.length === 0) {
          const allBranches = await apiService.getBranches().catch(() => [])
          fuelList = (Array.isArray(allBranches) ? allBranches : []).filter(
            (branch: any) => String(branch?.type ?? '').toLowerCase() === 'fuel',
          )
        }
        setBranches(fuelList)
      } catch {
        toast({
          title: 'Load failed',
          description: 'Could not load fuel branches.',
        })
      }
    }
    loadBranches()
  }, [])

  const loadTransfers = async () => {
    try {
      if (isOwner) {
        const targetBranchIds = (localSelectedBranchId
          ? [localSelectedBranchId]
          : branches.map((branch) => branch.id)
        ).filter((id): id is string => Boolean(id))
        const responses = await Promise.all(
          targetBranchIds.map((branchId) => apiService.getFuelTransfers(branchId).catch(() => []))
        )
        const all = responses.flat()
        setTransfers(Array.isArray(all) ? all : [])
      } else {
        const data = selectedBranchId 
          ? await apiService.getFuelTransfers(selectedBranchId)
          : await apiService.getAllFuelTransfers()
        setTransfers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load transfers:', error)
    }
  }

  const loadShiftsAndExpenses = async () => {
    try {
      if (isOwner) {
        const targetBranchIds = (localSelectedBranchId
          ? [localSelectedBranchId]
          : branches.map((branch) => branch.id)
        ).filter((id): id is string => Boolean(id))
        const [shiftResponses, expenseResponses] = await Promise.all([
          Promise.all(targetBranchIds.map((branchId) => apiService.getShiftReconciliations(branchId).catch(() => []))),
          Promise.all(targetBranchIds.map((branchId) => apiService.getFuelExpenses(branchId).catch(() => [])))
        ])
        setShifts(shiftResponses.flat())
        const today = new Date()
        const todayExpenses = expenseResponses.flat().reduce((sum, exp: any) => {
          const expDate = new Date(exp.created_at)
          if (expDate.toDateString() === today.toDateString()) {
            return sum + Number(exp.amount || 0)
          }
          return sum
        }, 0)
        setExpenses(todayExpenses)
      } else if (selectedBranchId) {
        const [shiftData, expenseData] = await Promise.all([
          apiService.getShiftReconciliations(selectedBranchId).catch(() => []),
          apiService.getFuelExpenses(selectedBranchId).catch(() => [])
        ])
        setShifts(Array.isArray(shiftData) ? shiftData : [])
        const today = new Date()
        const todayExpenses = (Array.isArray(expenseData) ? expenseData : []).reduce((sum, exp: any) => {
          const expDate = new Date(exp.created_at)
          if (expDate.toDateString() === today.toDateString()) {
            return sum + Number(exp.amount || 0)
          }
          return sum
        }, 0)
        setExpenses(todayExpenses)
      }
    } catch (error) {
      console.error('Failed to load shifts/expenses:', error)
    }
  }

  useEffect(() => {
    if (branches.length > 0 || selectedBranchId || isOwner) {
      loadTransfers()
      loadShiftsAndExpenses()
      const interval = setInterval(() => {
        loadTransfers()
        loadShiftsAndExpenses()
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [selectedBranchId, branches, isOwner, localSelectedBranchId])

  const totalTransfers = transfers.reduce((sum, t) => sum + Number(t.amount), 0)
  const today = new Date()
  const todayShifts = shifts.filter((s: any) => {
    const shiftDate = new Date(s.created_at)
    const role = String(s.created_by_role ?? '').trim().toLowerCase()
    return shiftDate.toDateString() === today.toDateString() && role === 'sales_staff'
  })
  const totalSalesFromPump = todayShifts.reduce((sum, s: any) => sum + Number(s.sales_amount || 0), 0)
  const totalSalesMinusExpense = totalSalesFromPump - expenses
  const averageSales = todayShifts.length > 0 ? (totalSalesFromPump / todayShifts.length) - expenses - totalTransfers : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(formData.amount)
    
    if (!amount || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
      })
      return
    }

    if (!formData.staff_name.trim()) {
      toast({
        title: 'Missing staff name',
        description: 'Please enter staff name',
      })
      return
    }

    if (!activeBranchId) {
      toast({
        title: 'No branch selected',
        description: 'Please select a branch',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await apiService.createFuelTransfer({
        branch_id: activeBranchId,
        amount,
        staff_name: formData.staff_name.trim(),
      })
      
      await loadTransfers()
      setIsModalOpen(false)
      setFormData({ amount: '', staff_name: '' })
      
      toast({
        title: 'Transfer recorded',
        description: 'POS transfer has been added successfully',
      })
    } catch (error) {
      toast({
        title: 'Failed to record transfer',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditTransfer = (transfer: Transfer) => {
    setEditingTransfer(transfer)
    setEditFormData({
      amount: String(transfer.amount),
      staff_name: transfer.staff_name,
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTransfer) return

    const amount = Number(editFormData.amount)
    
    if (!amount || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
      })
      return
    }

    if (!editFormData.staff_name.trim()) {
      toast({
        title: 'Missing staff name',
        description: 'Please enter staff name',
      })
      return
    }

    setIsUpdating(true)
    try {
      await apiService.updateFuelTransfer(editingTransfer.id, {
        amount,
        staff_name: editFormData.staff_name.trim(),
      })
      
      await loadTransfers()
      setIsEditModalOpen(false)
      setEditingTransfer(null)
      
      toast({
        title: 'Transfer updated',
        description: 'Transfer has been updated successfully',
      })
    } catch (error) {
      toast({
        title: 'Failed to update transfer',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteTransfer = async (transfer: Transfer) => {
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Delete this transfer? This action cannot be undone.')
      : false
    if (!confirmed) return

    setDeletingId(transfer.id)
    try {
      await apiService.deleteFuelTransfer(transfer.id)
      await loadTransfers()
      
      toast({
        title: 'Transfer deleted',
        description: 'Transfer has been deleted successfully',
      })
    } catch (error) {
      toast({
        title: 'Failed to delete transfer',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-500" />
            Fuel Transfer (POS)
          </h1>
          <p className="text-muted-foreground">Track POS transfers from sales staff</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Record Transfer
        </Button>
      </div>

      {isOwner && (
        <Card className="p-4 mb-6 bg-muted/50 border-border">
          <div className="flex items-center gap-4">
            <Label className="font-semibold text-foreground min-w-fit">Select Branch:</Label>
            <Select value={localSelectedBranchId || 'all'} onValueChange={(value) => setLocalSelectedBranchId(value === 'all' ? null : value)}>
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
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 bg-green-100 dark:bg-green-900/20 border-0 shadow-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-600/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Transfers</p>
          <h3 className="text-3xl font-bold text-foreground">₦{totalTransfers.toLocaleString()}</h3>
          <p className="text-xs text-muted-foreground mt-2">Today</p>
        </Card>

        <Card className="p-6 bg-purple-100 dark:bg-purple-900/20 border-0 shadow-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Transfers - Total Sales from all Pump-Expense</p>
          <h3 className="text-3xl font-bold text-foreground">₦{Math.abs(totalTransfers - totalSalesMinusExpense).toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
          <p className="text-xs text-muted-foreground mt-2">What's left</p>
        </Card>

        <Card className="p-6 bg-blue-100 dark:bg-blue-900/20 border-0 shadow-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Sales from all Pump-Expense</p>
          <h3 className="text-3xl font-bold text-foreground">₦{totalSalesMinusExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
          <p className="text-xs text-muted-foreground mt-2">Sales - Expenses</p>
        </Card>

        <Card className="p-6 bg-orange-100 dark:bg-orange-900/20 border-0 shadow-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-orange-600/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Transfer Count</p>
          <h3 className="text-3xl font-bold text-foreground">{transfers.length}</h3>
          <p className="text-xs text-muted-foreground mt-2">Today</p>
        </Card>
      </div>

      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Transfer Records</h3>
        </div>

        {transfers.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-muted-foreground">No transfers recorded yet</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={[new Date().toISOString().slice(0, 10)]} className="w-full">
            {(() => {
              const groups: Record<string, Transfer[]> = {}
              transfers.forEach((t) => {
                const date = new Date(t.created_at)
                const key = date.toISOString().slice(0, 10)
                if (!groups[key]) groups[key] = []
                groups[key].push(t)
              })
              return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).map(([dayKey, dayTransfers]) => {
                const date = new Date(dayKey)
                const dayName = date.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                const dayTotal = dayTransfers.reduce((sum, t) => sum + Number(t.amount), 0)
                
                return (
                  <AccordionItem key={dayKey} value={dayKey} className="border-b">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-semibold">{dayName}</span>
                        <span className="text-sm text-muted-foreground">
                          {dayTransfers.length} transfers • ₦{dayTotal.toLocaleString()}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Time</th>
                              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Staff Name</th>
                              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayTransfers.map((transfer) => (
                              <tr key={transfer.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                <td className="px-6 py-4 text-foreground">
                                  {new Date(transfer.created_at).toLocaleTimeString('en-NG', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </td>
                                <td className="px-6 py-4 text-foreground">{transfer.staff_name}</td>
                                <td className="px-6 py-4 font-semibold text-foreground">₦{Number(transfer.amount).toLocaleString()}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openEditTransfer(transfer)}
                                    >
                                      <Pencil className="w-4 h-4 mr-1" />
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      disabled={deletingId === transfer.id}
                                      onClick={() => handleDeleteTransfer(transfer)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      {deletingId === transfer.id ? 'Deleting...' : 'Delete'}
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
              })
            })()}
          </Accordion>
        )}
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record POS Transfer</DialogTitle>
            <DialogDescription>Enter transfer details from sales staff</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff_name">Staff Name</Label>
              <Input
                id="staff_name"
                value={formData.staff_name}
                onChange={(e) => setFormData(prev => ({ ...prev, staff_name: e.target.value }))}
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="e.g. 50000"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? 'Saving...' : 'Save Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Transfer</DialogTitle>
            <DialogDescription>Update transfer details</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateTransfer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_staff_name">Staff Name</Label>
              <Input
                id="edit_staff_name"
                value={editFormData.staff_name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, staff_name: e.target.value }))}
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_amount">Amount (₦)</Label>
              <Input
                id="edit_amount"
                type="number"
                min="1"
                value={editFormData.amount}
                onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="e.g. 50000"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isUpdating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isUpdating ? 'Updating...' : 'Update Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
