'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { Card } from '@/components/ui/card'
import { mockBranches, mockGasTransactions, mockShiftReconciliation } from '@/lib/mock-data'
import { ArrowUpRight, DollarSign, Fuel, Wind } from 'lucide-react'
import type { GasTransaction, ShiftReconciliation } from '@/types'
import { getAllFuelShifts } from '@/lib/fuel-shift-store'
import { getAllGasSales } from '@/lib/gas-sales-store'

export default function TransactionsPage() {
  const { user, selectedBranchId, selectedBranchType } = useAuth()
  const [gasSalesTransactions, setGasSalesTransactions] = useState<GasTransaction[]>(
    mockGasTransactions.filter((t) => t.type === 'sale')
  )
  const [fuelShifts, setFuelShifts] = useState<ShiftReconciliation[]>(mockShiftReconciliation)

  useEffect(() => {
    setGasSalesTransactions(getAllGasSales())
    setFuelShifts(getAllFuelShifts())
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount)

  if (user?.role === 'org_owner') {
    const allowedBranchIds = new Set(user.assigned_branches)

    const gasSales = gasSalesTransactions
      .filter((t) => allowedBranchIds.has(t.branch_id))
      .map((t) => {
        const branch = mockBranches.find((b) => b.id === t.branch_id)
        return {
          id: t.id,
          created_at: t.created_at,
          branch: branch?.name ?? t.branch_id,
          type: 'Gas',
          source: 'Sales/Manager',
          details: `${t.cylinder_size} x ${t.quantity}`,
          amount: t.amount,
        }
      })

    const fuelSales = fuelShifts
      .filter((s) => allowedBranchIds.has(s.branch_id))
      .map((s) => {
        const branch = mockBranches.find((b) => b.id === s.branch_id)
        return {
          id: s.id,
          created_at: s.created_at,
          branch: branch?.name ?? s.branch_id,
          type: 'Fuel',
          source: 'Sales/Manager',
          details: `Shift ${s.shift_number} (${s.pump_id})`,
          amount: s.sales_amount,
        }
      })

    const allSales = [...gasSales, ...fuelSales].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const totalGas = gasSales.reduce((sum, sale) => sum + sale.amount, 0)
    const totalFuel = fuelSales.reduce((sum, sale) => sum + sale.amount, 0)
    const totalSales = totalGas + totalFuel

    return (
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">All Branch Sales</h1>
          <p className="text-muted-foreground">
            View sales made across your branches by sales staff and managers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6 bg-blue-100 dark:bg-blue-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-600/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-semibold">
                <ArrowUpRight className="w-4 h-4" />
                10%
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
            <h3 className="text-3xl font-bold text-foreground">{formatMoney(totalSales)}</h3>
            <p className="text-xs text-muted-foreground mt-2">All branches</p>
          </Card>
          <Card className="p-6 bg-green-100 dark:bg-green-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-600/20 rounded-lg">
                <Wind className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Gas Sales</p>
            <h3 className="text-3xl font-bold text-foreground">{formatMoney(totalGas)}</h3>
            <p className="text-xs text-muted-foreground mt-2">Gas branches</p>
          </Card>
          <Card className="p-6 bg-orange-100 dark:bg-orange-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-orange-600/20 rounded-lg">
                <Fuel className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Fuel Sales</p>
            <h3 className="text-3xl font-bold text-foreground">{formatMoney(totalFuel)}</h3>
            <p className="text-xs text-muted-foreground mt-2">Fuel branches</p>
          </Card>
        </div>

        <Card className="shadow-card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Recent Sales Across Branches</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date & Time</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Branch</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Type</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Recorded By</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Details</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {allSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <p className="text-muted-foreground">No sales recorded yet</p>
                    </td>
                  </tr>
                ) : (
                  allSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-foreground">{formatDate(sale.created_at)}</td>
                      <td className="px-6 py-4 text-foreground">{sale.branch}</td>
                      <td className="px-6 py-4 text-foreground">{sale.type}</td>
                      <td className="px-6 py-4 text-foreground">{sale.source}</td>
                      <td className="px-6 py-4 text-foreground">{sale.details}</td>
                      <td className="px-6 py-4 font-semibold text-foreground">{formatMoney(sale.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  if (!selectedBranchType) {
    return (
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No branch selected.</p>
        </Card>
      </div>
    )
  }

  if (selectedBranchType === 'gas') {
    const transactions = gasSalesTransactions.filter(
      (t) => !selectedBranchId || t.branch_id === selectedBranchId
    )

    return (
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">My Transactions</h1>
          <p className="text-muted-foreground">Gas sales recorded for your branch</p>
        </div>

        <Card className="shadow-card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Recent Gas Sales</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date & Time</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Cylinder Size</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Quantity</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                  <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <p className="text-muted-foreground">No transactions recorded yet</p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-foreground">{formatDate(transaction.created_at)}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{transaction.cylinder_size}</td>
                      <td className="px-6 py-4 text-foreground">{transaction.quantity} units</td>
                      <td className="px-6 py-4 font-semibold text-foreground">{formatMoney(transaction.amount)}</td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">{transaction.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  const shifts = fuelShifts.filter(
    (s) => !selectedBranchId || s.branch_id === selectedBranchId
  )

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">My Transactions</h1>
        <p className="text-muted-foreground">Fuel shift sales recorded for your branch</p>
      </div>

      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Recent Fuel Shifts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Shift</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Pump</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Sales Amount</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <p className="text-muted-foreground">No transactions recorded yet</p>
                  </td>
                </tr>
              ) : (
                shifts.map((shift) => (
                  <tr key={shift.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-foreground">{formatDate(shift.created_at)}</td>
                    <td className="px-6 py-4 font-medium text-foreground">Shift {shift.shift_number}</td>
                    <td className="px-6 py-4 text-foreground">{shift.pump_id}</td>
                    <td className="px-6 py-4 font-semibold text-foreground">{formatMoney(shift.sales_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
