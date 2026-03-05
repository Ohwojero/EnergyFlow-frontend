'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShoppingCart, TrendingUp, ArrowUpRight, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { Branch, ShiftReconciliation } from '@/types'
import { apiService } from '@/lib/api'
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

type ShiftEntry = ShiftReconciliation & {
  sales_staff_name: string
  created_by_user_id?: string
  created_by_role?: string
  branch_name?: string
  pump_number?: string
}

export default function FuelSalesPage() {
  const { user, selectedBranchId } = useAuth()
  const currentUserId = String((user as any)?.id ?? (user as any)?.user_id ?? '').trim()
  const currentUserRole = String(user?.role ?? '').trim().toLowerCase()
  const isOwner = user?.role === 'org_owner'
  const canCreatePumpInline = user?.role === 'org_owner' || user?.role === 'fuel_manager'
  const canEditReconciliation =
    user?.role === 'org_owner' || user?.role === 'fuel_manager' || user?.role === 'sales_staff'
  const canDeleteReconciliation = user?.role === 'org_owner' || user?.role === 'fuel_manager'

  const [branches, setBranches] = useState<Branch[]>([])
  const [shifts, setShifts] = useState<ShiftEntry[]>([])
  const [myShifts, setMyShifts] = useState<ShiftEntry[]>([])
  const [expenseTotal, setExpenseTotal] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const [fuelPumps, setFuelPumps] = useState<Array<{ id: string; pump_number?: string }>>([])
  const [localSelectedBranchId, setLocalSelectedBranchId] = useState<string | null>(selectedBranchId)
  const [isLoading, setIsLoading] = useState(true)

  const [isRecordShiftOpen, setIsRecordShiftOpen] = useState(false)
  const [isEditShiftOpen, setIsEditShiftOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<ShiftEntry | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newPumpNumber, setNewPumpNumber] = useState('')
  const [formData, setFormData] = useState({
    shift_number: '1',
    pump_id: '',
    sales_staff_name: '',
    start_reading: '0',
    end_reading: '0',
    price_per_litre: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  })
  const [editFormData, setEditFormData] = useState({
    shift_number: '',
    start_reading: '',
    end_reading: '',
    sales_amount: '',
  })

  const userFuelBranches = useMemo(
    () => branches.filter((branch) => user?.assigned_branches?.includes(branch.id)),
    [branches, user?.assigned_branches],
  )
  const activeFuelBranchId = useMemo(() => {
    if (selectedBranchId && branches.some((branch) => branch.id === selectedBranchId)) {
      return selectedBranchId
    }
    const assignedFuelBranchId = (user?.assigned_branches ?? []).find((id) =>
      branches.some((branch) => branch.id === id),
    )
    return assignedFuelBranchId ?? branches[0]?.id ?? null
  }, [branches, selectedBranchId, user?.assigned_branches])

  const currentBranchInfo = useMemo(() => {
    const branchId = isOwner ? localSelectedBranchId : activeFuelBranchId
    return branchId ? branches.find((branch) => branch.id === branchId) : null
  }, [activeFuelBranchId, branches, isOwner, localSelectedBranchId])

  const recordBranchId = useMemo(
    () =>
      isOwner
        ? localSelectedBranchId
        : activeFuelBranchId,
    [activeFuelBranchId, isOwner, localSelectedBranchId],
  )

  const normalizeShift = (raw: any, fallbackBranchId?: string): ShiftEntry => ({
    id: raw.id,
    branch_id: raw.branch_id ?? raw.branch?.id ?? fallbackBranchId ?? '',
    shift_number: Number(raw.shift_number ?? 0),
    pump_id: raw.pump_id ?? raw.pump?.id ?? '',
    start_reading: Number(raw.start_reading ?? 0),
    end_reading: Number(raw.end_reading ?? 0),
    sales_amount: Number(raw.sales_amount ?? 0),
    variance: Number(raw.variance ?? 0),
    created_by_user_id: raw.created_by_user_id ?? raw.created_by?.id ?? undefined,
    created_by_role: raw.created_by_role ?? undefined,
    created_at: raw.created_at ?? new Date().toISOString(),
    sales_staff_name:
      raw.sales_staff_name ??
      raw.staff_name ??
      raw.sales_staff?.name ??
      raw.created_by?.name ??
      'Unassigned',
    branch_name: raw.branch_name ?? raw.branch?.name,
    pump_number: raw.pump_number ?? raw.pump?.pump_number ?? raw.pump?.number,
  })

  const formatPumpLabel = (pumpNumber?: string, pumpId?: string) => {
    const value = String(pumpNumber ?? '').trim()
    if (value) {
      return /^pump\b/i.test(value) ? value : `Pump ${value}`
    }
    return pumpId || 'N/A'
  }

  const isSameLocalDay = (dateA: Date, dateB: Date) =>
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

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

  useEffect(() => {
    const loadShifts = async () => {
      setIsLoading(true)
      try {
        if (isOwner) {
          const targetBranchIds = (localSelectedBranchId
            ? [localSelectedBranchId]
            : branches.map((branch) => branch.id)
          ).filter((id): id is string => Boolean(id))
          const responses = await Promise.all(
            targetBranchIds.map(async (branchId) => {
              const list = await apiService.getShiftReconciliations(branchId).catch(() => [])
              return (Array.isArray(list) ? list : []).map((item) => normalizeShift(item, branchId))
            }),
          )
          const all = responses.flat().sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )
          setShifts(all)
          return
        }

        const fallbackBranchId = activeFuelBranchId
        if (!fallbackBranchId) {
          setShifts([])
          setMyShifts([])
          return
        }
        const [list, ownList] = await Promise.all([
          apiService.getShiftReconciliations(fallbackBranchId),
          apiService.getMyShiftReconciliations(fallbackBranchId).catch(() => []),
        ])
        const normalized = (Array.isArray(list) ? list : []).map((item) =>
          normalizeShift(item, fallbackBranchId),
        )
        const normalizedOwn = (Array.isArray(ownList) ? ownList : []).map((item) =>
          normalizeShift(item, fallbackBranchId),
        )
        setShifts(normalized)
        setMyShifts(normalizedOwn)
      } catch {
        toast({
          title: 'Load failed',
          description: 'Could not load fuel shifts.',
        })
        setShifts([])
        setMyShifts([])
      } finally {
        setIsLoading(false)
      }
    }

    if (branches.length > 0 || selectedBranchId || isOwner) {
      loadShifts()
    }
  }, [activeFuelBranchId, branches, isOwner, localSelectedBranchId, selectedBranchId, user?.assigned_branches])

  useEffect(() => {
    const loadExpenses = async () => {
      try {
        if (isOwner) {
          const targetBranchIds = (localSelectedBranchId
            ? [localSelectedBranchId]
            : branches.map((branch) => branch.id)
          ).filter((id): id is string => Boolean(id))
          if (targetBranchIds.length === 0) {
            setExpenseTotal(0)
            return
          }
          const results = await Promise.all(
            targetBranchIds.map((branchId) => apiService.getFuelExpenses(branchId).catch(() => [])),
          )
          const total = results
            .flat()
            .reduce((sum, row: any) => {
              const createdAt = new Date(String(row?.created_at ?? ''))
              if (!Number.isNaN(createdAt.getTime()) && isSameLocalDay(createdAt, now)) {
                return sum + Number(row?.amount ?? 0)
              }
              return sum
            }, 0)
          setExpenseTotal(total)
          return
        }

        if (!activeFuelBranchId) {
          setExpenseTotal(0)
          return
        }
        const list = await apiService.getFuelExpenses(activeFuelBranchId).catch(() => [])
        const total = (Array.isArray(list) ? list : []).reduce((sum, row: any) => {
          const createdAt = new Date(String(row?.created_at ?? ''))
          if (!Number.isNaN(createdAt.getTime()) && isSameLocalDay(createdAt, now)) {
            return sum + Number(row?.amount ?? 0)
          }
          return sum
        }, 0)
        setExpenseTotal(total)
      } catch {
        setExpenseTotal(0)
      }
    }

    loadExpenses()
  }, [activeFuelBranchId, branches, isOwner, localSelectedBranchId, now])

  useEffect(() => {
    const loadPumps = async () => {
      if (!recordBranchId) {
        setFuelPumps([])
        return
      }
      try {
        const list = await apiService.getFuelPumps(recordBranchId)
        const normalized = (Array.isArray(list) ? list : []).map((item: any) => ({
          id: String(item.id),
          pump_number: item.pump_number ?? item.pumpNumber ?? undefined,
        }))
        setFuelPumps(normalized)
      } catch {
        setFuelPumps([])
      }
    }
    loadPumps()
  }, [recordBranchId])

  useEffect(() => {
    if (fuelPumps.length === 0) {
      setFormData((prev) => ({ ...prev, pump_id: '' }))
      return
    }
    setFormData((prev) => ({
      ...prev,
      pump_id: prev.pump_id && fuelPumps.some((pump) => pump.id === prev.pump_id)
        ? prev.pump_id
        : fuelPumps[0].id,
    }))
  }, [fuelPumps])

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      shift_number: String((shifts[0]?.shift_number ?? 0) + 1),
      pump_id: shifts[0]?.pump_id ?? prev.pump_id,
      start_reading: String(shifts[0]?.end_reading ?? Number(prev.start_reading)),
      end_reading: String(shifts[0]?.end_reading ?? Number(prev.end_reading)),
    }))
  }, [shifts])

  const ownShifts = useMemo(() => {
    if (isOwner) return shifts
    return myShifts
  }, [isOwner, myShifts, shifts])

  const openingReadingValue = Number(formData.start_reading)
  const closingReadingValue = Number(formData.end_reading)
  const pricePerLitreValue = Number(formData.price_per_litre)
  const litresSold = Number.isNaN(openingReadingValue) || Number.isNaN(closingReadingValue)
    ? 0
    : closingReadingValue - openingReadingValue
  const computedSalesAmount = Number.isNaN(pricePerLitreValue)
    ? 0
    : litresSold * pricePerLitreValue

  const salesMetricShifts = useMemo(() => {
    return isOwner ? shifts : ownShifts
  }, [isOwner, ownShifts, shifts])
  const todaySalesMetricShifts = useMemo(
    () =>
      salesMetricShifts.filter((shift) => {
        const createdAt = new Date(shift.created_at)
        return !Number.isNaN(createdAt.getTime()) && isSameLocalDay(createdAt, now)
      }),
    [now, salesMetricShifts],
  )
  const totalSales = todaySalesMetricShifts.reduce((sum, shift) => sum + shift.sales_amount, 0)
  const averageSales = todaySalesMetricShifts.length > 0 ? totalSales / todaySalesMetricShifts.length : 0
  const expTotalSales = averageSales - expenseTotal
  const pumpNumberById = useMemo(() => {
    const map = new Map<string, string>()
    fuelPumps.forEach((pump) => {
      if (pump.id) {
        map.set(pump.id, String(pump.pump_number ?? '').trim())
      }
    })
    return map
  }, [fuelPumps])
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
    })

  const groupByMonth = (entries: ShiftEntry[]) => {
    const groups: Record<string, ShiftEntry[]> = {}
    entries.forEach((entry) => {
      const date = new Date(entry.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(entry)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const monthGroups = groupByMonth(shifts)
  const currentMonth = new Date().toISOString().slice(0, 7)

  const resetForm = () => {
    setNewPumpNumber('')
    setFormData({
      shift_number: String((shifts[0]?.shift_number ?? 0) + 1),
      pump_id: shifts[0]?.pump_id ?? '',
      sales_staff_name: '',
      start_reading: String(shifts[0]?.end_reading ?? 0),
      end_reading: String(shifts[0]?.end_reading ?? 0),
      price_per_litre: '',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
    })
  }

  const handleSaveShift = async (e: FormEvent) => {
    e.preventDefault()
    const shiftNumber = Number(formData.shift_number)
    const startReading = Number(formData.start_reading)
    const endReading = Number(formData.end_reading)
    const pricePerLitre = Number(formData.price_per_litre)
    const totalLitresSold = endReading - startReading
    const salesAmount = totalLitresSold * pricePerLitre
    const assignedStaffName =
      user?.role === 'sales_staff'
        ? user?.name || 'Sales Staff'
        : formData.sales_staff_name.trim() || user?.name || 'Sales Staff'
    const dateValue = formData.date || new Date().toISOString().slice(0, 10)
    const timeValue = formData.time || new Date().toTimeString().slice(0, 5)
    const rawPumpId = formData.pump_id.trim()
    const typedPumpNumber = newPumpNumber.trim()
    const isUuid = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

    if (!shiftNumber || !pricePerLitre) {
      toast({
        title: 'Missing details',
        description: 'Shift number and price per litre are required.',
      })
      return
    }

    if (
      Number.isNaN(startReading) ||
      Number.isNaN(endReading) ||
      Number.isNaN(pricePerLitre) ||
      Number.isNaN(salesAmount) ||
      shiftNumber <= 0 ||
      pricePerLitre <= 0
    ) {
      toast({
        title: 'Invalid values',
        description: 'Enter valid numeric values.',
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
    const branchId = recordBranchId
    if (!branchId) {
      toast({
        title: 'Missing branch',
        description: 'Select a branch before recording shift.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      let pumpId = rawPumpId
      if (canCreatePumpInline && typedPumpNumber) {
        const existingPump = fuelPumps.find(
          (pump) =>
            String(pump.pump_number ?? '').trim().toLowerCase() === typedPumpNumber.toLowerCase(),
        )
        if (existingPump?.id) {
          pumpId = existingPump.id
        } else {
          const createdPump = await apiService.createFuelPump({
            branch_id: branchId,
            pump_number: typedPumpNumber,
            product_type: 'PMS',
            current_reading: startReading,
            status: 'active',
          })
          pumpId = String(createdPump?.id ?? '')
          if (pumpId) {
            setFuelPumps((prev) => [
              { id: pumpId, pump_number: createdPump?.pump_number ?? typedPumpNumber },
              ...prev,
            ])
            setFormData((prev) => ({ ...prev, pump_id: pumpId }))
          }
        }
      }

      if (!pumpId) {
        toast({
          title: 'Missing pump',
          description:
            canCreatePumpInline
              ? 'Select a pump or type a pump number to create one.'
              : 'No pump found for this branch. Contact your manager.',
        })
        return
      }

      if (!isUuid(pumpId)) {
        toast({
          title: 'Invalid pump ID',
          description: 'Pump ID must be a valid UUID.',
        })
        return
      }

      const created = await apiService.createShiftReconciliation({
        branch_id: branchId,
        pump_id: pumpId,
        shift_number: shiftNumber,
        start_reading: startReading,
        end_reading: endReading,
        sales_amount: Number(salesAmount.toFixed(2)),
        variance: 0,
        sales_staff_name: assignedStaffName,
      })

      const nextShift = normalizeShift(created, branchId)
      nextShift.branch_name = branches.find((branch) => branch.id === branchId)?.name
      nextShift.sales_staff_name = assignedStaffName
      nextShift.created_by_user_id = currentUserId || nextShift.created_by_user_id
      nextShift.created_by_role = currentUserRole || nextShift.created_by_role
      nextShift.pump_number = fuelPumps.find((pump) => pump.id === pumpId)?.pump_number
      nextShift.created_at = new Date(`${dateValue}T${timeValue}:00`).toISOString()

      setShifts((prev) => [nextShift, ...prev])
      if (!isOwner && nextShift.created_by_user_id && nextShift.created_by_user_id === currentUserId) {
        setMyShifts((prev) => [nextShift, ...prev])
      }
      toast({
        title: 'Shift recorded',
        description: 'Fuel shift sale has been added successfully.',
      })
      setIsRecordShiftOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not record fuel shift.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditShift = (shift: ShiftEntry) => {
    setEditingShift(shift)
    setEditFormData({
      shift_number: String(shift.shift_number),
      start_reading: String(shift.start_reading),
      end_reading: String(shift.end_reading),
      sales_amount: String(shift.sales_amount),
    })
    setIsEditShiftOpen(true)
  }

  const handleUpdateShift = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingShift) return

    const shiftNumber = Number(editFormData.shift_number)
    const startReading = Number(editFormData.start_reading)
    const endReading = Number(editFormData.end_reading)
    const salesAmount = Number(editFormData.sales_amount)

    if (!shiftNumber || !salesAmount) {
      toast({
        title: 'Missing details',
        description: 'Shift number and sales amount are required.',
      })
      return
    }

    if (
      Number.isNaN(startReading) ||
      Number.isNaN(endReading) ||
      Number.isNaN(salesAmount) ||
      shiftNumber <= 0 ||
      salesAmount <= 0
    ) {
      toast({
        title: 'Invalid values',
        description: 'Enter valid numeric values.',
      })
      return
    }

    if (endReading < startReading) {
      toast({
        title: 'Invalid readings',
        description: 'End reading cannot be less than start reading.',
      })
      return
    }

    setIsUpdating(true)
    try {
      const updated = await apiService.updateShiftReconciliation(editingShift.id, {
        shift_number: shiftNumber,
        start_reading: startReading,
        end_reading: endReading,
        sales_amount: salesAmount,
      })
      const normalized = normalizeShift(updated, editingShift.branch_id)
      normalized.branch_name = editingShift.branch_name
      normalized.sales_staff_name = editingShift.sales_staff_name

      setShifts((prev) =>
        prev.map((item) => (item.id === editingShift.id ? { ...item, ...normalized } : item)),
      )
      setMyShifts((prev) =>
        prev.map((item) => (item.id === editingShift.id ? { ...item, ...normalized } : item)),
      )
      toast({
        title: 'Shift updated',
        description: 'Shift reconciliation has been updated successfully.',
      })
      setIsEditShiftOpen(false)
      setEditingShift(null)
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Could not update shift reconciliation.',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteShift = async (shift: ShiftEntry) => {
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Delete this shift reconciliation? This action cannot be undone.')
      : false
    if (!confirmed) return

    setDeletingId(shift.id)
    try {
      await apiService.deleteShiftReconciliation(shift.id)
      setShifts((prev) => prev.filter((item) => item.id !== shift.id))
      setMyShifts((prev) => prev.filter((item) => item.id !== shift.id))
      toast({
        title: 'Shift deleted',
        description: 'Shift reconciliation has been deleted successfully.',
      })
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Could not delete shift reconciliation.',
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
            <ShoppingCart className="w-8 h-8 text-orange-500" />
            Fuel Sales
          </h1>
          <p className="text-muted-foreground">Track pump sales and shift reconciliation</p>
          {!isOwner && currentBranchInfo && (
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">{currentBranchInfo.name}</span> • {currentBranchInfo.location}
            </p>
          )}
        </div>
        {!isOwner && (
          <Button onClick={() => setIsRecordShiftOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Record Shift
          </Button>
        )}
      </div>

      {(isOwner || userFuelBranches.length > 1) && (
        <Card className="p-4 mb-6 bg-muted/50 border-border">
          <div className="flex items-center gap-4">
            <Label className="font-semibold text-foreground min-w-fit">Select Branch:</Label>
            {isOwner ? (
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
              8%
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
          <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(totalSales)}</h3>
          <p className="text-xs text-muted-foreground mt-2">Today only</p>
        </Card>

        <Card className="p-6 bg-green-100 dark:bg-green-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-600/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Exp-Total Sales</p>
          <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(expTotalSales)}</h3>
          <p className="text-xs text-muted-foreground mt-2">Today Sales - Today Expenses</p>
        </Card>

        <Card className="p-6 bg-orange-100 dark:bg-orange-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-orange-600/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Shifts Recorded</p>
          <h3 className="text-3xl font-bold text-foreground">{todaySalesMetricShifts.length}</h3>
          <p className="text-xs text-muted-foreground mt-2">Today entries</p>
        </Card>
      </div>

      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Shift Reconciliation</h3>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center text-muted-foreground">Loading shifts...</div>
        ) : shifts.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-muted-foreground">No shift records yet</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={[currentMonth]} className="w-full">
            {monthGroups.map(([monthKey, monthShifts]) => {
              const date = new Date(monthKey + '-01')
              const monthName = date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
              const monthTotal = monthShifts.reduce((sum, s) => sum + s.sales_amount, 0)

              return (
                <AccordionItem key={monthKey} value={monthKey} className="border-b">
                  <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-semibold">{monthName}</span>
                      <span className="text-sm text-muted-foreground">
                        {monthShifts.length} shifts • N{monthTotal.toLocaleString()}
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
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Shift</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Pump</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Assigned Staff</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Start Reading</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">End Reading</th>
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Sales Amount</th>
                            {(canEditReconciliation || canDeleteReconciliation) && (
                              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {monthShifts.map((shift) => (
                            (() => {
                              const createdByUserId = String(shift.created_by_user_id ?? '').trim()
                              const isOwnShiftById = Boolean(currentUserId && createdByUserId && currentUserId === createdByUserId)
                              const canEditThisShift =
                                user?.role === 'sales_staff'
                                  ? isOwnShiftById
                                  : canEditReconciliation
                              const canDeleteThisShift = canDeleteReconciliation
                              return (
                            <tr key={shift.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4 text-foreground">{formatDate(shift.created_at)}</td>
                              <td className="px-6 py-4 font-medium text-foreground">
                                {shift.branch_name ?? branches.find((b) => b.id === shift.branch_id)?.name ?? 'Unknown Branch'}
                              </td>
                              <td className="px-6 py-4 font-medium text-foreground">Shift {shift.shift_number}</td>
                              <td className="px-6 py-4 text-foreground">
                                {formatPumpLabel(
                                  shift.pump_number ?? pumpNumberById.get(shift.pump_id),
                                  shift.pump_id,
                                )}
                              </td>
                              <td className="px-6 py-4 text-foreground">{shift.sales_staff_name}</td>
                              <td className="px-6 py-4 text-foreground">{shift.start_reading}</td>
                              <td className="px-6 py-4 text-foreground">{shift.end_reading}</td>
                              <td className="px-6 py-4 font-semibold text-foreground">N{shift.sales_amount.toLocaleString()}</td>
                              {(canEditThisShift || canDeleteThisShift) && (
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    {canEditThisShift && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditShift(shift)}
                                      >
                                        <Pencil className="w-4 h-4 mr-1" />
                                        Edit
                                      </Button>
                                    )}
                                    {canDeleteThisShift && (
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        disabled={deletingId === shift.id}
                                        onClick={() => handleDeleteShift(shift)}
                                      >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        {deletingId === shift.id ? 'Deleting...' : 'Delete'}
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                              )
                            })()
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
        open={isRecordShiftOpen}
        onOpenChange={(open) => {
          setIsRecordShiftOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Fuel Shift</DialogTitle>
            <DialogDescription>Enter shift reconciliation details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveShift} className="space-y-4">
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
              <Label htmlFor="pump_id">Pump</Label>
              <Select
                value={formData.pump_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, pump_id: value }))}
              >
                <SelectTrigger id="pump_id" className="border-2 border-border focus:border-primary">
                  <SelectValue placeholder={fuelPumps.length ? 'Select pump' : 'No pumps available'} />
                </SelectTrigger>
                <SelectContent>
                  {fuelPumps.map((pump) => (
                    <SelectItem key={pump.id} value={pump.id}>
                      {formatPumpLabel(pump.pump_number, pump.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fuelPumps.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {user?.role === 'sales_staff'
                    ? 'No pumps found for this branch. Contact your manager to add a pump.'
                    : 'No pumps found for this branch. Type a pump number below to add it and continue.'}
                </p>
              )}
              {canCreatePumpInline && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="new_pump_number">Pump Number</Label>
                  <Input
                    id="new_pump_number"
                    value={newPumpNumber}
                    onChange={(e) => setNewPumpNumber(e.target.value)}
                    placeholder="e.g. 1 or PUMP-1"
                    className="border-2 border-border focus-visible:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    If this pump is not listed, enter it here to use or create it.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales_staff_name">Assigned Sales Staff</Label>
              <Input
                id="sales_staff_name"
                value={formData.sales_staff_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, sales_staff_name: e.target.value }))}
                placeholder={user?.role === 'sales_staff' ? (user?.name || 'Sales Staff') : 'e.g. John Doe'}
                disabled={user?.role === 'sales_staff'}
                className="border-2 border-border focus-visible:border-primary"
              />
            </div>

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
              <Label htmlFor="price_per_litre">Price Per Litre</Label>
              <Input
                id="price_per_litre"
                type="number"
                min="1"
                value={formData.price_per_litre}
                onChange={(e) => setFormData((prev) => ({ ...prev, price_per_litre: e.target.value }))}
                className="border-2 border-border focus-visible:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Litres Sold</Label>
                <Input
                  value={Number.isFinite(litresSold) ? litresSold.toFixed(2) : '0.00'}
                  readOnly
                  className="border-2 border-border bg-muted/40"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Sales (Calculated)</Label>
                <Input
                  value={Number.isFinite(computedSalesAmount) ? `N${computedSalesAmount.toLocaleString()}` : 'N0'}
                  readOnly
                  className="border-2 border-border bg-muted/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift-date">Date</Label>
                <Input
                  id="shift-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className="border-2 border-border focus-visible:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-time">Time</Label>
                <Input
                  id="shift-time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                  className="border-2 border-border focus-visible:border-primary"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRecordShiftOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (fuelPumps.length === 0 && (!canCreatePumpInline || !newPumpNumber.trim()))}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? 'Saving...' : 'Save Shift'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditShiftOpen}
        onOpenChange={(open) => {
          setIsEditShiftOpen(open)
          if (!open) setEditingShift(null)
        }}
      >
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Shift Reconciliation</DialogTitle>
            <DialogDescription>Update selected shift details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateShift} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_shift_number">Shift Number</Label>
              <Input
                id="edit_shift_number"
                type="number"
                min="1"
                value={editFormData.shift_number}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, shift_number: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_start_reading">Start Reading</Label>
                <Input
                  id="edit_start_reading"
                  type="number"
                  min="0"
                  value={editFormData.start_reading}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, start_reading: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_end_reading">End Reading</Label>
                <Input
                  id="edit_end_reading"
                  type="number"
                  min="0"
                  value={editFormData.end_reading}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, end_reading: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_sales_amount">Sales Amount</Label>
              <Input
                id="edit_sales_amount"
                type="number"
                min="1"
                value={editFormData.sales_amount}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, sales_amount: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditShiftOpen(false)} disabled={isUpdating}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
