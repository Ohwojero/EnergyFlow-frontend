'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/metric-card'
import { useAuth } from '@/context/auth-context'
import { BarChart3, TrendingUp, Download } from 'lucide-react'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { mockBranches, mockGasTransactions, mockShiftReconciliation } from '@/lib/mock-data'
import type { GasTransaction, ShiftReconciliation } from '@/types'
import { getAllGasSales } from '@/lib/gas-sales-store'
import { getAllFuelShifts } from '@/lib/fuel-shift-store'

export default function ReportsPage() {
  const { user, selectedBranchId, selectedBranchType } = useAuth()
  const [gasSalesRecords, setGasSalesRecords] = useState<GasTransaction[]>(
    mockGasTransactions.filter((transaction) => transaction.type === 'sale')
  )
  const [fuelShiftRecords, setFuelShiftRecords] = useState<ShiftReconciliation[]>(mockShiftReconciliation)
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [hasInitializedDate, setHasInitializedDate] = useState(false)

  const reloadRecords = useCallback(() => {
    setGasSalesRecords(getAllGasSales())
    setFuelShiftRecords(getAllFuelShifts())
  }, [])

  useEffect(() => {
    reloadRecords()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        reloadRecords()
      }
    }
    window.addEventListener('focus', reloadRecords)
    window.addEventListener('storage', reloadRecords)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', reloadRecords)
      window.removeEventListener('storage', reloadRecords)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [reloadRecords])

  const isOrgOwner = user?.role === 'org_owner'
  const showGas = isOrgOwner || selectedBranchType === 'gas' || user?.role === 'gas_manager'
  const showFuel = isOrgOwner || selectedBranchType === 'fuel' || user?.role === 'fuel_manager'

  const allowedBranchIds = useMemo(() => {
    if (!user) return new Set<string>()
    if (isOrgOwner) return new Set(user.assigned_branches)
    if (selectedBranchId) return new Set([selectedBranchId])
    return new Set(user.assigned_branches)
  }, [user, isOrgOwner, selectedBranchId])

  const scopedGasSales = useMemo(
    () => gasSalesRecords.filter((transaction) => allowedBranchIds.has(transaction.branch_id)),
    [gasSalesRecords, allowedBranchIds]
  )
  const scopedFuelShifts = useMemo(
    () => fuelShiftRecords.filter((shift) => allowedBranchIds.has(shift.branch_id)),
    [fuelShiftRecords, allowedBranchIds]
  )

  const gasForDate = useMemo(
    () => scopedGasSales.filter((transaction) => toDateKey(new Date(transaction.created_at)) === selectedDate),
    [scopedGasSales, selectedDate]
  )
  const fuelForDate = useMemo(
    () => scopedFuelShifts.filter((shift) => toDateKey(new Date(shift.created_at)) === selectedDate),
    [scopedFuelShifts, selectedDate]
  )

  const latestAvailableDate = useMemo(() => {
    const dates = [
      ...scopedGasSales.map((transaction) => toDateKey(new Date(transaction.created_at))),
      ...scopedFuelShifts.map((shift) => toDateKey(new Date(shift.created_at))),
    ]
    if (dates.length === 0) return null
    return dates.sort((a, b) => (a < b ? 1 : -1))[0]
  }, [scopedGasSales, scopedFuelShifts])

  useEffect(() => {
    if (!hasInitializedDate && latestAvailableDate) {
      setSelectedDate(latestAvailableDate)
      setHasInitializedDate(true)
    }
  }, [hasInitializedDate, latestAvailableDate])

  const gasDailySales = gasForDate.reduce((sum, transaction) => sum + transaction.amount, 0)
  const gasDailyKg = gasForDate.reduce((sum, transaction) => sum + transaction.quantity, 0)
  const fuelDailySales = fuelForDate.reduce((sum, shift) => sum + shift.sales_amount, 0)
  const fuelDailyVolume = fuelForDate.reduce(
    (sum, shift) => sum + Math.max(0, shift.end_reading - shift.start_reading),
    0
  )

  const gasChartData = useMemo(
    () => buildDailySeries(scopedGasSales, (record) => record.amount, selectedDate),
    [scopedGasSales, selectedDate]
  )
  const fuelChartData = useMemo(
    () => buildDailySeries(scopedFuelShifts, (record) => record.sales_amount, selectedDate),
    [scopedFuelShifts, selectedDate]
  )

  const chartConfig = {
    sales: { label: 'Sales', color: '#2563eb' },
  }

  const handleExportReport = () => {
    const dateLabel = formatSelectedDate(selectedDate)
    const gasLines = gasForDate.map((transaction) => {
      const branch = mockBranches.find((item) => item.id === transaction.branch_id)
      return ['Gas', branch?.name ?? transaction.branch_id, transaction.quantity, transaction.amount, transaction.created_at]
    })
    const fuelLines = fuelForDate.map((shift) => {
      const branch = mockBranches.find((item) => item.id === shift.branch_id)
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
        <Button onClick={handleExportReport} className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      <Card className="p-4 md:p-6 mb-8 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Reporting Date</h3>
            <p className="text-lg font-bold text-foreground">{formatSelectedDate(selectedDate)}</p>
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
              onClick={() => setSelectedDate(toDateKey(new Date()))}
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
                label="Total Sales"
                value={`₦${(gasDailySales / 1000000).toFixed(2)}M`}
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
                label="Average Sale"
                value={`₦${(gasForDate.length ? gasDailySales / gasForDate.length : 0).toLocaleString()}`}
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
                label="Total Sales"
                value={`₦${(fuelDailySales / 1000000).toFixed(2)}M`}
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
                label="Average Shift Sale"
                value={`₦${(fuelForDate.length ? fuelDailySales / fuelForDate.length : 0).toLocaleString()}`}
                variant="default"
              />
            </div>
          </div>

          <Card className="p-6 mb-8 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Fuel Sales (Last 7 Days)</h3>
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
    const sales = records
      .filter((record) => toDateKey(new Date(record.created_at)) === dateKey)
      .reduce((sum, record) => sum + getAmount(record), 0)
    series.push({
      date: `${current.getDate()}/${current.getMonth() + 1}`,
      sales,
    })
  }
  return series
}
