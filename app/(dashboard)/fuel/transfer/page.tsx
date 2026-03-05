'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DollarSign, Plus, TrendingUp } from 'lucide-react'
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shifts, setShifts] = useState<any[]>([])
  const [expenses, setExpenses] = useState(0)
  const [localSelectedBranchId, setLocalSelectedBranchId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
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
    return shiftDate.toDateString() === today.toDateString()
  })
  const totalSales = todayShifts.reduce((sum, s: any) => sum + Number(s.sales_amount || 0), 0)
  const averageSales = todayShifts.length > 0 ? (totalSales / todayShifts.length) - expenses - totalTransfers : 0

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

        <Card className="p-6 bg-blue-100 dark:bg-blue-900/20 border-0 shadow-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Average Sales</p>
          <h3 className="text-3xl font-bold text-foreground">₦{averageSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
          <p className="text-xs text-muted-foreground mt-2">(Total Sales ÷ Shifts) - Expenses</p>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Staff Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-foreground">
                      {new Date(transfer.created_at).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-foreground">{transfer.staff_name}</td>
                    <td className="px-6 py-4 font-semibold text-foreground">₦{Number(transfer.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  )
}
