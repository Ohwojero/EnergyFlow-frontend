'use client'

import { useAuth } from '@/context/auth-context'
import { apiService } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { Building2, Wind, Fuel, Users, Package, ShoppingCart, DollarSign, ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export default function DashboardPage() {
  const { user, selectedBranchId, selectedBranchType } = useAuth()
  const router = useRouter()
  const showBusinessDashboard =
    !!user && user.role !== 'super_admin' && user.role !== 'sales_staff'
  const isOwner = user?.role === 'org_owner'
  const isPersonalOwner = isOwner && user?.subscription_plan === 'personal'
  const showOperationsPanels = isOwner && !isPersonalOwner
  const hideDashboardHeaderForFuelSalesStaff =
    user?.role === 'sales_staff' && selectedBranchType === 'fuel'

  useEffect(() => {
    if (user?.role === 'super_admin') {
      router.push('/admin/dashboard')
      return
    }
    if (user?.role === 'sales_staff') {
      router.push('/sales')
    }
  }, [user, router])

  const [branches, setBranches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [gasSales, setGasSales] = useState(0)
  const [fuelSales, setFuelSales] = useState(0)
  const [salesCount, setSalesCount] = useState(0)
  const [gasInventoryValue, setGasInventoryValue] = useState(0)
  const [fuelInventoryValue, setFuelInventoryValue] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [gasExpenses, setGasExpenses] = useState(0)
  const [fuelExpenses, setFuelExpenses] = useState(0)

  const [gasBranchRevenueMap, setGasBranchRevenueMap] = useState<Record<string, number>>({})
  const [fuelBranchRevenueMap, setFuelBranchRevenueMap] = useState<Record<string, number>>({})

  useEffect(() => {
    const load = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const allBranches = await apiService.getBranches()
        const branchList = Array.isArray(allBranches) ? allBranches : []

        const shouldScopeToAssigned = user.role === 'gas_manager' || user.role === 'fuel_manager'
        const assignedSet = new Set(user.assigned_branches ?? [])
        const scopedBranchList =
          shouldScopeToAssigned
            ? assignedSet.size > 0
              ? branchList.filter((b: any) => assignedSet.has(b.id))
              : selectedBranchId
                ? branchList.filter((b: any) => b.id === selectedBranchId)
                : []
            : branchList

        setBranches(scopedBranchList)

        const gasBranches = scopedBranchList.filter((b: any) => b.type === 'gas')
        const fuelBranches = scopedBranchList.filter((b: any) => b.type === 'fuel')

        const [gasSalesLists, gasCylLists, gasExpenseLists, fuelRecLists, fuelProductLists, fuelExpenseLists] = await Promise.all([
          Promise.all(gasBranches.map((b: any) => apiService.getGasSales(b.id).catch(() => []))),
          Promise.all(gasBranches.map((b: any) => apiService.getGasCylinders(b.id).catch(() => []))),
          Promise.all(gasBranches.map((b: any) => apiService.getGasExpenses(b.id).catch(() => []))),
          Promise.all(fuelBranches.map((b: any) => apiService.getShiftReconciliations(b.id).catch(() => []))),
          Promise.all(fuelBranches.map((b: any) => apiService.getFuelProducts(b.id).catch(() => []))),
          Promise.all(fuelBranches.map((b: any) => apiService.getFuelExpenses(b.id).catch(() => []))),
        ])

        const gasRevenueMap: Record<string, number> = {}
        gasBranches.forEach((branch: any, index: number) => {
          const list = Array.isArray(gasSalesLists[index]) ? gasSalesLists[index] : []
          gasRevenueMap[branch.id] = list.reduce((sum: number, tx: any) => sum + Number(tx.amount ?? 0), 0)
        })
        setGasBranchRevenueMap(gasRevenueMap)

        const fuelRevenueMap: Record<string, number> = {}
        fuelBranches.forEach((branch: any, index: number) => {
          const list = Array.isArray(fuelRecLists[index]) ? fuelRecLists[index] : []
          fuelRevenueMap[branch.id] = list.reduce((sum: number, tx: any) => sum + Number(tx.sales_amount ?? 0), 0)
        })
        setFuelBranchRevenueMap(fuelRevenueMap)

        const totalGasSales = Object.values(gasRevenueMap).reduce((sum, v) => sum + v, 0)
        const totalFuelSales = Object.values(fuelRevenueMap).reduce((sum, v) => sum + v, 0)
        const totalSalesCount =
          gasSalesLists.reduce((sum, list: any) => sum + (Array.isArray(list) ? list.length : 0), 0) +
          fuelRecLists.reduce((sum, list: any) => sum + (Array.isArray(list) ? list.length : 0), 0)

        const totalGasInventory = gasCylLists.flat().reduce(
          (sum: number, cyl: any) => sum + Number(cyl.quantity ?? 0) * Number(cyl.selling_price ?? 0),
          0
        )
        const totalFuelInventory = fuelProductLists.flat().reduce(
          (sum: number, p: any) => sum + Number(p.total_value ?? 0),
          0
        )
        const gasExpensesTotal = gasExpenseLists.flat().reduce(
          (sum: number, e: any) => sum + Number(e.amount ?? 0),
          0
        )
        const fuelExpensesTotal = fuelExpenseLists.flat().reduce(
          (sum: number, e: any) => sum + Number(e.amount ?? 0),
          0
        )

        setGasSales(totalGasSales)
        setFuelSales(totalFuelSales)
        setSalesCount(totalSalesCount)
        setGasInventoryValue(totalGasInventory)
        setFuelInventoryValue(totalFuelInventory)
        setTotalExpenses(gasExpensesTotal + fuelExpensesTotal)
        setGasExpenses(gasExpensesTotal)
        setFuelExpenses(fuelExpensesTotal)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [user, selectedBranchId])

  const gasBranches = useMemo(() => branches.filter((b) => b.type === 'gas'), [branches])
  const fuelBranches = useMemo(() => branches.filter((b) => b.type === 'fuel'), [branches])
  const totalBranches = branches.length
  const totalSales = gasSales + fuelSales
  const totalInventory = gasInventoryValue + fuelInventoryValue
  const netFuelSalesAfterExpenses = fuelSales - fuelExpenses
  const netSalesAfterExpenses =
    selectedBranchType === 'fuel' ? netFuelSalesAfterExpenses : totalSales - totalExpenses
  const totalRevenue = totalSales
  const averageSale = salesCount > 0 ? totalSales / salesCount : 0
  const monthlyGrowth = 18.5
  const formatMoneyShort = (amount: number) => {
    if (amount >= 1000000) return `N${(amount / 1000000).toFixed(2)}M`
    if (amount >= 1000) return `N${(amount / 1000).toFixed(1)}K`
    return `N${amount.toLocaleString()}`
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      {!hideDashboardHeaderForFuelSalesStaff && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your business performance at a glance.
          </p>
        </div>
      )}

      {isLoading ? (
        <Card className="p-4 mb-6 shadow-card">
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </Card>
      ) : null}

      {showBusinessDashboard && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-6 bg-blue-100 dark:bg-blue-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-600/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-semibold">
                  <ArrowUpRight className="w-4 h-4" />
                  {monthlyGrowth}%
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{isOwner && !isPersonalOwner ? 'Total Revenue' : 'Total Sales'}</p>
              <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(isOwner && !isPersonalOwner ? totalRevenue : totalSales)}</h3>
              <p className="text-xs text-muted-foreground mt-2">This month</p>
            </Card>

            <Card className="p-6 bg-green-100 dark:bg-green-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-green-600/20 rounded-lg">
                  <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-semibold">
                  <ArrowUpRight className="w-4 h-4" />
                  5.2%
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Inventory Value</p>
              <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(totalInventory)}</h3>
              <p className="text-xs text-muted-foreground mt-2">Current stock</p>
            </Card>

            <Card className="p-6 bg-purple-100 dark:bg-purple-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-purple-600/20 rounded-lg">
                  <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              {isOwner && !isPersonalOwner ? (
                <>
                  <p className="text-sm text-muted-foreground mb-1">Total Branches</p>
                  <h3 className="text-3xl font-bold text-foreground">{totalBranches}</h3>
                  <p className="text-xs text-muted-foreground mt-2">{gasBranches.length} Gas, {fuelBranches.length} Fuel</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
                  <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(totalExpenses)}</h3>
                  <p className="text-xs text-muted-foreground mt-2">This month</p>
                </>
              )}
            </Card>

            <Card className="p-6 bg-orange-100 dark:bg-orange-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-orange-600/20 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-semibold">
                  <ArrowUpRight className="w-4 h-4" />
                  12.3%
                </div>
              </div>
              {isOwner && !isPersonalOwner ? (
                <>
                  <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
                  <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(totalSales)}</h3>
                  <p className="text-xs text-muted-foreground mt-2">This month</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-1">Average Sale</p>
                  <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(averageSale)}</h3>
                  <p className="text-xs text-muted-foreground mt-2">This month</p>
                </>
              )}
            </Card>
          </div>

          {isPersonalOwner && <RecentTransactions />}
          {!isOwner && <RecentTransactions />}

          {showOperationsPanels && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-all">
                <div className="p-5 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Wind className="w-5 h-5 text-secondary" />
                      <h3 className="text-base font-semibold text-foreground">Gas Operations</h3>
                    </div>
                    <button
                      onClick={() => router.push('/gas/branches')}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Sales</p>
                      <p className="text-base font-bold text-foreground">₦{(gasSales / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Inventory</p>
                      <p className="text-base font-bold text-foreground">₦{(gasInventoryValue / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Profit</p>
                      <p className="text-base font-bold text-green-600">₦{((gasSales * 0.3) / 1000).toFixed(0)}K</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="space-y-2">
                    {gasBranches.map((branch) => (
                      <div key={branch.id} className="flex items-center justify-between p-2.5 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer group">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{branch.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{branch.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">₦{((gasBranchRevenueMap[branch.id] ?? 0) / 1000).toFixed(0)}K</span>
                          <button
                            onClick={() => router.push('/gas/inventory')}
                            className="opacity-0 group-hover:opacity-100 text-xs text-primary transition-opacity"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-all">
                <div className="p-5 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Fuel className="w-5 h-5 text-orange-500" />
                      <h3 className="text-base font-semibold text-foreground">Fuel Operations</h3>
                    </div>
                    <button
                      onClick={() => router.push('/fuel/branches')}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Sales</p>
                      <p className="text-base font-bold text-foreground">₦{(fuelSales / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Inventory</p>
                      <p className="text-base font-bold text-foreground">₦{(fuelInventoryValue / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Profit</p>
                      <p className="text-base font-bold text-green-600">₦{((fuelSales * 0.25) / 1000).toFixed(0)}K</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="space-y-2">
                    {fuelBranches.map((branch) => (
                      <div key={branch.id} className="flex items-center justify-between p-2.5 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer group">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{branch.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{branch.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">₦{((fuelBranchRevenueMap[branch.id] ?? 0) / 1000).toFixed(0)}K</span>
                          <button
                            onClick={() => router.push('/fuel/inventory')}
                            className="opacity-0 group-hover:opacity-100 text-xs text-primary transition-opacity"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {user?.role === 'sales_staff' && (
        <Card className="p-8 text-center border-0 shadow-card">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Sales Operations</h3>
          <p className="text-muted-foreground mb-6">
            Navigate to the Sales section to record transactions and view your performance metrics.
          </p>
        </Card>
      )}
    </div>
  )
}


