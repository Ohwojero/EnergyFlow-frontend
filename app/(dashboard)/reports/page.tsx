'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/metric-card'
import { useAuth } from '@/context/auth-context'
import { BarChart3, TrendingUp, Download } from 'lucide-react'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { apiService } from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { GasTransaction, ShiftReconciliation } from '@/types'

type FuelExpenseRecord = {
  id: string
  branch_id: string
  amount: number
  created_at: string
}

export default function ReportsPage() {
  const { user, selectedBranchId, selectedBranchType } = useAuth()
  const isPersonalOwner = user?.role === 'org_owner' && user?.subscription_plan === 'personal'
  const isOwner = user?.role === 'org_owner'
  const [gasSalesRecords, setGasSalesRecords] = useState<GasTransaction[]>([])
  const [fuelShiftRecords, setFuelShiftRecords] = useState<ShiftReconciliation[]>([])
  const [fuelExpenseRecords, setFuelExpenseRecords] = useState<FuelExpenseRecord[]>([])
  const [gasExpenseRecords, setGasExpenseRecords] = useState<FuelExpenseRecord[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [businessTypeFilter, setBusinessTypeFilter] = useState<'all' | 'gas' | 'fuel'>('all')
  const [lastCheckedDate, setLastCheckedDate] = useState(() => {
    // Try to get from localStorage, fallback to today
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('energyflow_last_checked_date')
      return stored || toDateKey(new Date())
    }
    return toDateKey(new Date())
  })
  const [isResettingForNewDay, setIsResettingForNewDay] = useState(false)

  const reloadRecords = useCallback(() => {
    const load = async () => {
      const allBranches = await apiService.getBranches().catch(() => [])
      const branchList = Array.isArray(allBranches) ? allBranches : []
      setBranches(branchList)

      const gasBranches = branchList.filter((branch: any) => branch.type === 'gas')
      const fuelBranches = branchList.filter((branch: any) => branch.type === 'fuel')
      
      // Debug: Log branch information
      console.log('All branches:', branchList.length)
      console.log('Gas branches:', gasBranches.length)
      console.log('Fuel branches:', fuelBranches.length)
      console.log('User role:', user?.role)
      console.log('Selected branch ID:', selectedBranchId)
      
      // Debug: Test fuel reconciliation access for the first fuel branch
      if (fuelBranches.length > 0 && user?.role !== 'org_owner') {
        try {
          const debugResult = await apiService.debugMyFuelReconciliations(fuelBranches[0].id)
          console.log('Debug fuel reconciliations result:', debugResult)
        } catch (error) {
          console.error('Debug fuel reconciliations error:', error)
        }
      }

      const [gasSalesByBranch, fuelShiftsByBranch, fuelExpensesByBranch, gasExpensesByBranch] = await Promise.all([
        Promise.all(
          gasBranches.map(async (branch: any) => ({
            branchId: String(branch.id),
            payload: await apiService.getGasSales(branch.id).catch(() => []),
          }))
        ),
        Promise.all(
          fuelBranches.map(async (branch: any) => {
            // For ALL users, always use getShiftReconciliations to get all shifts
            // Then filter to only sales_staff records for consistent behavior
            console.log(`Using getShiftReconciliations for branch ${branch.id} (${branch.name})`)
            
            const payload = await apiService.getShiftReconciliations(branch.id).catch((error) => {
              console.error(`Error fetching fuel shifts for branch ${branch.id}:`, error)
              return []
            })
            
            // Filter to only sales_staff records for ALL users
            // This ensures consistent behavior across all user roles
            const filteredPayload = toRecordList(payload).filter((item: any) => {
              const role = String(item.created_by_role ?? '').trim().toLowerCase()
              const isSalesStaff = role === 'sales_staff' || role === 'salesstaff'
              if (!isSalesStaff) {
                console.log(`Filtering out non-sales_staff record: role=${role}, id=${item.id}`)
              }
              return isSalesStaff
            })
            
            console.log(`Original payload count: ${toRecordList(payload).length}, Filtered count: ${filteredPayload.length}`)
            console.log(`Fuel shifts for branch ${branch.id} (${branch.name}):`, filteredPayload)
            return {
              branchId: String(branch.id),
              payload: filteredPayload
            }
          })
        ),
        Promise.all(
          fuelBranches.map(async (branch: any) => ({
            branchId: String(branch.id),
            payload: await apiService.getFuelExpenses(branch.id).catch(() => []),
          }))
        ),
        Promise.all(
          gasBranches.map(async (branch: any) => ({
            branchId: String(branch.id),
            payload: await apiService.getGasExpenses(branch.id).catch(() => []),
          }))
        ),
      ])

      const gasSales = gasSalesByBranch.flatMap(({ branchId, payload }) =>
        toRecordList(payload).map((item: any) => ({
          id: item.id,
          branch_id: String(item.branch_id ?? item.branchId ?? item.branch?.id ?? branchId ?? ''),
          type: item.type ?? 'sale',
          cylinder_size: item.cylinder_size ?? item.cylinderSize ?? '',
          quantity: Number(item.quantity ?? 0),
          amount: Number(item.amount ?? 0),
          notes: item.notes ?? '',
          created_at: item.created_at ?? item.createdAt ?? new Date().toISOString(),
        }))
      )

      const fuelShifts = fuelShiftsByBranch.flatMap(({ branchId, payload }) =>
        toRecordList(payload).map((item: any) => ({
        id: item.id,
        branch_id: String(item.branch_id ?? item.branchId ?? item.branch?.id ?? branchId ?? ''),
        shift_number: Number(item.shift_number ?? 0),
        pump_id: String(item.pump_id ?? item.pump?.id ?? ''),
        start_reading: Number(item.start_reading ?? item.startReading ?? 0),
        end_reading: Number(item.end_reading ?? item.endReading ?? 0),
        sales_amount: Number(item.sales_amount ?? item.salesAmount ?? 0),
        variance: Number(item.variance ?? 0),
        created_at: item.created_at ?? item.createdAt ?? new Date().toISOString(),
        created_by_role: String(item.created_by_role ?? '').trim().toLowerCase(),
      }))
      )

      const fuelExpenses = fuelExpensesByBranch.flatMap(({ branchId, payload }) =>
        toRecordList(payload).map((item: any) => ({
          id: String(item.id),
          branch_id: String(item.branch_id ?? item.branchId ?? item.branch?.id ?? branchId ?? ''),
          amount: Number(item.amount ?? 0),
          created_at: item.created_at ?? item.createdAt ?? new Date().toISOString(),
        }))
      )

      const gasExpenses = gasExpensesByBranch.flatMap(({ branchId, payload }) =>
        toRecordList(payload).map((item: any) => ({
          id: String(item.id),
          branch_id: String(item.branch_id ?? item.branchId ?? item.branch?.id ?? branchId ?? ''),
          amount: Number(item.amount ?? 0),
          created_at: item.created_at ?? item.createdAt ?? new Date().toISOString(),
        }))
      )

      setGasSalesRecords(gasSales as GasTransaction[])
      setFuelShiftRecords(fuelShifts as ShiftReconciliation[])
      setFuelExpenseRecords(fuelExpenses)
      setGasExpenseRecords(gasExpenses)
    }
    load()
  }, [user])

  useEffect(() => {
    reloadRecords()
    
    // Set up automatic daily reset
    const checkForNewDay = () => {
      const currentDate = toDateKey(new Date())
      if (currentDate !== lastCheckedDate) {
        console.log('=== NEW DAY DETECTED ===')
        console.log('Previous date:', lastCheckedDate)
        console.log('Current date:', currentDate)
        
        setIsResettingForNewDay(true)
        
        // Reset to current date and reload data
        setSelectedDate(currentDate)
        setLastCheckedDate(currentDate)
        
        // Persist to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('energyflow_last_checked_date', currentDate)
        }
        
        // Clear existing data to show reset
        setGasSalesRecords([])
        setFuelShiftRecords([])
        setFuelExpenseRecords([])
        setGasExpenseRecords([])
        
        // Reload fresh data
        setTimeout(async () => {
          await reloadRecords()
          setIsResettingForNewDay(false)
        }, 100)
        
        console.log('Data reset for new day:', currentDate)
      }
    }
    
    // Check for new day every minute
    const dailyResetInterval = setInterval(checkForNewDay, 60000)
    
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForNewDay() // Check for new day when page becomes visible
        reloadRecords()
      }
    }
    
    const handleFocus = () => {
      checkForNewDay() // Check for new day when window gets focus
      reloadRecords()
    }
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', reloadRecords)
    document.addEventListener('visibilitychange', handleVisibility)
    
    return () => {
      clearInterval(dailyResetInterval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', reloadRecords)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [reloadRecords, lastCheckedDate])

  const isOrgOwner = user?.role === 'org_owner'
  const showGas = isOrgOwner
    ? businessTypeFilter === 'all' || businessTypeFilter === 'gas'
    : selectedBranchType
      ? selectedBranchType === 'gas'
      : user?.role === 'gas_manager'
  const showFuel = (isOrgOwner
    ? businessTypeFilter === 'all' || businessTypeFilter === 'fuel'
    : selectedBranchType
      ? selectedBranchType === 'fuel'
      : user?.role === 'fuel_manager') && !isPersonalOwner

  const allowedBranchIds = useMemo(() => {
    if (!user) return new Set<string>()
    if (selectedBranchId) return new Set([selectedBranchId])
    if (isOrgOwner) {
      // For org_owner, include ALL branches (both gas and fuel)
      return new Set(branches.map((branch: any) => String(branch.id)))
    }
    const firstAssignedBranchId = user.assigned_branches?.[0]
    return firstAssignedBranchId ? new Set([String(firstAssignedBranchId)]) : new Set<string>()
  }, [user, isOrgOwner, branches, selectedBranchId])

  const allowedGasBranchIds = useMemo(() => {
    if (!user) return new Set<string>()
    if (isOrgOwner) {
      // For org_owner, include ALL gas branches
      return new Set(branches.filter((branch: any) => String(branch.type) === 'gas').map((branch: any) => String(branch.id)))
    }
    if (selectedBranchId) {
      const selected = branches.find((branch: any) => String(branch.id) === String(selectedBranchId))
      if (selected && String(selected.type) === 'gas') return new Set([String(selectedBranchId)])
    }
    const firstAssignedGasBranchId = (user.assigned_branches ?? []).find((id) =>
      branches.some((branch: any) => String(branch.id) === String(id) && String(branch.type) === 'gas'),
    )
    return firstAssignedGasBranchId ? new Set([String(firstAssignedGasBranchId)]) : new Set<string>()
  }, [branches, isOrgOwner, selectedBranchId, user])

  const allowedFuelBranchIds = useMemo(() => {
    if (!user) return new Set<string>()
    if (isOrgOwner) {
      // For org_owner, include ALL fuel branches
      return new Set(branches.filter((branch: any) => String(branch.type) === 'fuel').map((branch: any) => String(branch.id)))
    }
    
    // For non-org_owner users, check assigned branches and selected branch
    const fuelBranches = branches.filter((branch: any) => String(branch.type) === 'fuel')
    
    if (selectedBranchId) {
      const selected = branches.find((branch: any) => String(branch.id) === String(selectedBranchId))
      if (selected && String(selected.type) === 'fuel') {
        return new Set([String(selectedBranchId)])
      }
    }
    
    // Check assigned branches
    const assignedBranches = user.assigned_branches ?? []
    if (assignedBranches.length > 0) {
      const assignedFuelBranches = fuelBranches.filter((branch: any) => 
        assignedBranches.includes(String(branch.id))
      )
      if (assignedFuelBranches.length > 0) {
        return new Set(assignedFuelBranches.map((branch: any) => String(branch.id)))
      }
    }
    
    // If no assigned branches or no fuel branches assigned, but user is fuel_manager, include all fuel branches
    if (user?.role === 'fuel_manager') {
      return new Set(fuelBranches.map((branch: any) => String(branch.id)))
    }
    
    return new Set<string>()
  }, [branches, isOrgOwner, selectedBranchId, user])

  const scopedGasSales = useMemo(
    () => gasSalesRecords.filter((transaction) => allowedGasBranchIds.has(String(transaction.branch_id))),
    [gasSalesRecords, allowedGasBranchIds]
  )
  const scopedGasExpenses = useMemo(
    () => gasExpenseRecords.filter((expense) => allowedGasBranchIds.has(String(expense.branch_id))),
    [gasExpenseRecords, allowedGasBranchIds]
  )
  const scopedFuelShifts = useMemo(
    () => fuelShiftRecords.filter((shift) => allowedFuelBranchIds.has(String(shift.branch_id))),
    [fuelShiftRecords, allowedFuelBranchIds]
  )
  const scopedFuelExpenses = useMemo(
    () => fuelExpenseRecords.filter((expense) => allowedFuelBranchIds.has(String(expense.branch_id))),
    [fuelExpenseRecords, allowedFuelBranchIds]
  )

  const gasForDate = useMemo(
    () => scopedGasSales.filter((transaction) => {
      if (toDateKey(new Date(transaction.created_at)) !== selectedDate) return false
      // Exclude payment records from sales calculations
      const notes = String(transaction.notes ?? '').toLowerCase()
      if (notes.includes('type:payment_record')) return false
      // Filter only sales_staff sales
      const salespersonMatch = String(transaction.notes ?? '').match(/salesperson:([^|]+)/)
      const salesperson = salespersonMatch ? salespersonMatch[1].trim().toLowerCase() : ''
      return salesperson === 'sales_staff' || (!salesperson.includes('manager') && salesperson !== 'manager')
    }),
    [scopedGasSales, selectedDate]
  )
  const gasExpensesForDate = useMemo(
    () => scopedGasExpenses.filter((expense) => toDateKey(new Date(expense.created_at)) === selectedDate),
    [scopedGasExpenses, selectedDate]
  )
  const fuelForDate = useMemo(
    () => scopedFuelShifts.filter((shift) => {
      if (toDateKey(new Date(shift.created_at)) !== selectedDate) return false
      // Filter only sales_staff shifts (case-insensitive)
      const role = String(shift.created_by_role ?? '').trim().toLowerCase()
      return role === 'sales_staff' || role === 'salesstaff'
    }),
    [scopedFuelShifts, selectedDate]
  )
  const fuelExpensesForDate = useMemo(
    () => scopedFuelExpenses.filter((expense) => toDateKey(new Date(expense.created_at)) === selectedDate),
    [scopedFuelExpenses, selectedDate]
  )

  const gasDailySales = gasForDate.reduce((sum, transaction) => sum + transaction.amount, 0)
  const gasDailyKg = gasForDate.reduce((sum, transaction) => sum + transaction.quantity, 0)
  const gasDailyExpenses = gasExpensesForDate.reduce((sum, expense) => sum + expense.amount, 0)
  const gasSalesMinusExpense = gasDailySales - gasDailyExpenses
  
  // Debug logging for gas data
  console.log('=== GAS REPORTS DEBUG ===')
  console.log('Gas branches:', branches.filter(b => b.type === 'gas').length)
  console.log('Gas sales records:', gasSalesRecords.length)
  console.log('Scoped gas sales:', scopedGasSales.length)
  console.log('Gas for date:', gasForDate.length)
  console.log('Gas daily sales:', gasDailySales)
  console.log('Selected date:', selectedDate)
  
  const fuelDailySales = fuelForDate.reduce((sum, shift) => sum + shift.sales_amount, 0)
  const fuelDailyExpenses = fuelExpensesForDate.reduce((sum, expense) => sum + expense.amount, 0)
  const totalSalesMinusExpense = fuelDailySales - fuelDailyExpenses
  const fuelDailyVolume = fuelForDate.reduce(
    (sum, shift) => sum + Math.max(0, shift.end_reading - shift.start_reading),
    0
  )
  
  // Debug logging for fuel data
  console.log('=== FUEL REPORTS DEBUG ===')
  console.log('User:', user?.name, 'Role:', user?.role)
  console.log('Selected date:', selectedDate)
  console.log('Last checked date:', lastCheckedDate)
  console.log('Is resetting for new day:', isResettingForNewDay)
  console.log('Selected branch ID:', selectedBranchId)
  console.log('User assigned branches:', user?.assigned_branches)
  console.log('All branches:', branches.length)
  console.log('Fuel branches:', branches.filter(b => b.type === 'fuel').length)
  console.log('Fuel shift records:', fuelShiftRecords.length)
  console.log('Scoped fuel shifts:', scopedFuelShifts.length)
  console.log('Fuel for date:', fuelForDate.length)
  console.log('Fuel daily sales:', fuelDailySales)
  console.log('Allowed fuel branch IDs:', Array.from(allowedFuelBranchIds))
  console.log('Sample fuel shift:', fuelShiftRecords[0])
  console.log('Sample scoped fuel shift:', scopedFuelShifts[0])
  if (fuelForDate.length > 0) {
    console.log('Sample fuel for date:', fuelForDate[0])
  }

  const gasChartData = useMemo(() => {
    const endDate = new Date(`${selectedDate}T00:00:00`)
    const series: Array<{ date: string; sales: number }> = []
    for (let offset = 6; offset >= 0; offset -= 1) {
      const current = new Date(endDate)
      current.setDate(endDate.getDate() - offset)
      const dateKey = toDateKey(current)
      const dayRecords = scopedGasSales.filter((record) => {
        if (toDateKey(new Date(record.created_at)) !== dateKey) return false
        // Exclude payment records from chart data
        const notes = String(record.notes ?? '').toLowerCase()
        if (notes.includes('type:payment_record')) return false
        // Filter only sales_staff sales
        const salespersonMatch = String(record.notes ?? '').match(/salesperson:([^|]+)/)
        const salesperson = salespersonMatch ? salespersonMatch[1].trim().toLowerCase() : ''
        return salesperson === 'sales_staff' || (!salesperson.includes('manager') && salesperson !== 'manager')
      })
      const totalSales = dayRecords.reduce((sum, record) => sum + record.amount, 0)
      series.push({
        date: `${current.getDate()}/${current.getMonth() + 1}`,
        sales: totalSales,
      })
    }
    return series
  }, [scopedGasSales, selectedDate])
  const fuelChartData = useMemo(() => {
    const endDate = new Date(`${selectedDate}T00:00:00`)
    const series: Array<{ date: string; sales: number }> = []
    for (let offset = 6; offset >= 0; offset -= 1) {
      const current = new Date(endDate)
      current.setDate(endDate.getDate() - offset)
      const dateKey = toDateKey(current)
      const dayRecords = scopedFuelShifts.filter((record) => {
        if (toDateKey(new Date(record.created_at)) !== dateKey) return false
        // Filter only sales_staff shifts (case-insensitive)
        const role = String(record.created_by_role ?? '').trim().toLowerCase()
        return role === 'sales_staff' || role === 'salesstaff'
      })
      const totalSales = dayRecords.reduce((sum, record) => sum + record.sales_amount, 0)
      series.push({
        date: `${current.getDate()}/${current.getMonth() + 1}`,
        sales: totalSales,
      })
    }
    return series
  }, [scopedFuelShifts, selectedDate])

  const chartConfig = {
    sales: { label: 'Total Sales from all Pump', color: '#2563eb' },
  }

  const handleExportReport = () => {
    const dateLabel = formatSelectedDate(selectedDate)
    const gasLines = gasForDate.map((transaction) => {
      const branch = branches.find((item) => String(item.id) === String(transaction.branch_id))
      return ['Gas', branch?.name ?? transaction.branch_id, transaction.quantity, transaction.amount, transaction.created_at]
    })
    const fuelLines = fuelForDate.map((shift) => {
      const branch = branches.find((item) => String(item.id) === String(shift.branch_id))
      const volume = Math.max(0, shift.end_reading - shift.start_reading)
      return ['Fuel', branch?.name ?? shift.branch_id, volume, shift.sales_amount, shift.created_at]
    })

    const csv = [
      ['Date', dateLabel],
      [],
      ['Type', 'Branch', 'Volume', 'Sales Amount', 'Recorded At'],
      ...gasLines,
      ...fuelLines,
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-report-${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">Check daily sales by date for gas and fuel.</p>
        </div>
        <div className="flex items-center gap-4">
          {isOwner && !isPersonalOwner && (
            <div className="flex items-center gap-2">
              <Label className="font-semibold text-foreground text-sm min-w-fit">Filter by:</Label>
              <Select value={businessTypeFilter} onValueChange={(value: 'all' | 'gas' | 'fuel') => setBusinessTypeFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Business</SelectItem>
                  <SelectItem value="gas">Gas Only</SelectItem>
                  <SelectItem value="fuel">Fuel Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={handleExportReport} className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      <Card className="p-4 md:p-6 mb-8 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Reporting Date</h3>
            <p className="text-lg font-bold text-foreground">{formatSelectedDate(selectedDate)}</p>
            {isResettingForNewDay && (
              <p className="text-sm text-blue-600 mt-1 animate-pulse">🔄 Resetting data for new day...</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-2 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
            >
              Previous
            </button>
            <input
              type="date"
              className="px-2 py-2 text-xs border border-border rounded-lg bg-background min-w-0 flex-shrink"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button
              className="px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              onClick={() => {
                const today = toDateKey(new Date())
                setSelectedDate(today)
                setLastCheckedDate(today)
                
                // Persist to localStorage
                if (typeof window !== 'undefined') {
                  localStorage.setItem('energyflow_last_checked_date', today)
                }
                
                // Clear and reload data for today
                setGasSalesRecords([])
                setFuelShiftRecords([])
                setFuelExpenseRecords([])
                setGasExpenseRecords([])
                setTimeout(() => reloadRecords(), 100)
              }}
            >
              Today
            </button>
            <button
              className="px-3 py-2 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      {showGas ? (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-secondary rounded-full" />
              Gas Operations Report
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Sales from all Pump"
                value={formatMoneyShort(gasDailySales)}
                icon={TrendingUp}
                variant="secondary"
              />
              <MetricCard
                label="Total Turn"
                value={`${gasDailyKg.toLocaleString()} kg`}
                variant="accent"
              />
              <MetricCard
                label="Transactions"
                value={gasForDate.length}
                variant="primary"
              />
              <MetricCard
                label="Total Sales from all Pump-Expense"
                value={formatMoney(gasSalesMinusExpense)}
                variant="default"
              />
            </div>
          </div>

          <Card className="p-6 mb-8 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Gas Sales (Last 7 Days)</h3>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={gasChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="sales" fill="var(--color-sales)" radius={8} />
              </BarChart>
            </ChartContainer>
          </Card>
        </>
      ) : null}

      {showFuel ? (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-orange-500 rounded-full" />
              Fuel Operations Report
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Sales from all Pump"
                value={formatMoneyShort(fuelDailySales)}
                icon={TrendingUp}
                variant="accent"
              />
              <MetricCard
                label="Total Volume Sold"
                value={`${fuelDailyVolume.toLocaleString()} L`}
                variant="primary"
              />
              <MetricCard
                label="Shifts Recorded"
                value={fuelForDate.length}
                variant="secondary"
              />
              <MetricCard
                label="Total Sales from all Pump-Expense"
                value={formatMoney(totalSalesMinusExpense)}
                variant="default"
              />
            </div>
          </div>

          <Card className="p-6 mb-8 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Total Sales from all Pump (Last 7 Days)</h3>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={fuelChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="sales" fill="var(--color-sales)" radius={8} />
              </BarChart>
            </ChartContainer>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftDate(dateKey: string, amount: number): string {
  const next = new Date(`${dateKey}T00:00:00`)
  next.setDate(next.getDate() + amount)
  return toDateKey(next)
}

function formatSelectedDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-NG', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMoney(amount: number): string {
  return `₦${Math.round(amount).toLocaleString()}`
}

function formatMoneyShort(amount: number): string {
  if (Math.abs(amount) >= 1000000) {
    return `₦${(amount / 1000000).toFixed(2).replace('.', ',')}M`
  }
  if (Math.abs(amount) >= 1000) {
    return `₦${(amount / 1000).toFixed(2).replace('.', ',')}K`
  }
  return formatMoney(amount)
}

function toRecordList(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

function buildDailySeries<T extends { created_at: string }>(
  records: T[],
  getAmount: (record: T) => number,
  selectedDate: string
) {
  const endDate = new Date(`${selectedDate}T00:00:00`)
  const series: Array<{ date: string; sales: number }> = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const current = new Date(endDate)
    current.setDate(endDate.getDate() - offset)
    const dateKey = toDateKey(current)
    const dayRecords = records.filter((record) => toDateKey(new Date(record.created_at)) === dateKey)
    const totalSales = dayRecords.reduce((sum, record) => sum + getAmount(record), 0)
    series.push({
      date: `${current.getDate()}/${current.getMonth() + 1}`,
      sales: totalSales,
    })
  }
  return series
}


