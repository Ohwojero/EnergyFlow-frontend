'use client'

import { MetricCard } from './metric-card'
import { useAuth } from '@/context/auth-context'
import {
  mockBranches,
  mockGasCylinders,
  mockGasTransactions,
  mockFuelProducts,
  mockShiftReconciliation,
} from '@/lib/mock-data'
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Wallet,
} from 'lucide-react'

export function QuickStats() {
  const { user, selectedBranchId, selectedBranchType } = useAuth()
  const isOrgOwner = user?.role === 'org_owner' || user?.role === 'super_admin'

  const gasBranchIds = new Set(
    mockBranches.filter(b => b.type === 'gas').map(b => b.id)
  )
  const fuelBranchIds = new Set(
    mockBranches.filter(b => b.type === 'fuel').map(b => b.id)
  )

  const sumGasSales = (branchIds: Set<string>) =>
    mockGasTransactions
      .filter(t => t.type === 'sale' && branchIds.has(t.branch_id))
      .reduce((sum, t) => sum + t.amount, 0)

  const sumGasExpenses = (branchIds: Set<string>) =>
    mockGasTransactions
      .filter(t => t.type === 'purchase' && branchIds.has(t.branch_id))
      .reduce((sum, t) => sum + t.amount, 0)

  const sumGasInventory = (branchIds: Set<string>) =>
    mockGasCylinders
      .filter(c => branchIds.has(c.branch_id))
      .reduce((sum, c) => sum + c.quantity * c.selling_price, 0)

  const sumFuelSales = (branchIds: Set<string>) =>
    mockShiftReconciliation
      .filter(s => branchIds.has(s.branch_id))
      .reduce((sum, s) => sum + s.sales_amount, 0)

  const sumFuelInventory = (branchIds: Set<string>) =>
    mockFuelProducts
      .filter(p => branchIds.has(p.branch_id))
      .reduce((sum, p) => sum + p.total_value, 0)

  const formatMoney = (value: number) => `₦${(value / 1000000).toFixed(2)}M`

  const gasTotals = {
    sales: sumGasSales(gasBranchIds),
    expenses: sumGasExpenses(gasBranchIds),
    inventory: sumGasInventory(gasBranchIds),
  }
  const fuelTotals = {
    sales: sumFuelSales(fuelBranchIds),
    expenses: 0,
    inventory: sumFuelInventory(fuelBranchIds),
  }

  const branchTotals = (() => {
    if (selectedBranchId && selectedBranchType === 'gas') {
      const ids = new Set([selectedBranchId])
      const sales = sumGasSales(ids)
      const expenses = sumGasExpenses(ids)
      const inventory = sumGasInventory(ids)
      return {
        sales,
        expenses,
        inventory,
        profit: sales - expenses,
      }
    }

    if (selectedBranchId && selectedBranchType === 'fuel') {
      const ids = new Set([selectedBranchId])
      const sales = sumFuelSales(ids)
      const expenses = 0
      const inventory = sumFuelInventory(ids)
      return {
        sales,
        expenses,
        inventory,
        profit: sales - expenses,
      }
    }

    return null
  })()

  if (isOrgOwner) {
    const gasProfit = gasTotals.sales - gasTotals.expenses
    const fuelProfit = fuelTotals.sales - fuelTotals.expenses

    return (
      <div className="space-y-8 mb-8">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Gas Operations (All Branches)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Sales"
              value={formatMoney(gasTotals.sales)}
              icon={ShoppingCart}
              trend={{ value: 12, isPositive: true }}
              variant="primary"
            />
            <MetricCard
              label="Inventory Value"
              value={formatMoney(gasTotals.inventory)}
              icon={Package}
              trend={{ value: 5, isPositive: true }}
              variant="secondary"
            />
            <MetricCard
              label="Total Expenses"
              value={formatMoney(gasTotals.expenses)}
              icon={TrendingUp}
              trend={{ value: 2, isPositive: false }}
              variant="accent"
            />
            <MetricCard
              label="Profit/Month"
              value={formatMoney(gasProfit)}
              icon={Wallet}
              trend={{ value: 15, isPositive: true }}
              variant="default"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Fuel Operations (All Branches)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Sales"
              value={formatMoney(fuelTotals.sales)}
              icon={ShoppingCart}
              trend={{ value: 9, isPositive: true }}
              variant="primary"
            />
            <MetricCard
              label="Inventory Value"
              value={formatMoney(fuelTotals.inventory)}
              icon={Package}
              trend={{ value: 4, isPositive: true }}
              variant="secondary"
            />
            <MetricCard
              label="Total Expenses"
              value={formatMoney(fuelTotals.expenses)}
              icon={TrendingUp}
              trend={{ value: 1, isPositive: false }}
              variant="accent"
            />
            <MetricCard
              label="Profit/Month"
              value={formatMoney(fuelProfit)}
              icon={Wallet}
              trend={{ value: 11, isPositive: true }}
              variant="default"
            />
          </div>
        </div>
      </div>
    )
  }

  if (!branchTotals) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <MetricCard
        label="Total Sales"
        value={formatMoney(branchTotals.sales)}
        icon={ShoppingCart}
        trend={{ value: 12, isPositive: true }}
        variant="primary"
      />
      <MetricCard
        label="Inventory Value"
        value={formatMoney(branchTotals.inventory)}
        icon={Package}
        trend={{ value: 5, isPositive: true }}
        variant="secondary"
      />
      <MetricCard
        label="Total Expenses"
        value={formatMoney(branchTotals.expenses)}
        icon={TrendingUp}
        trend={{ value: 2, isPositive: false }}
        variant="accent"
      />
      <MetricCard
        label="Profit/Month"
        value={formatMoney(branchTotals.profit)}
        icon={Wallet}
        trend={{ value: 15, isPositive: true }}
        variant="default"
      />
    </div>
  )
}
