'use client'

import { useAuth } from '@/context/auth-context'
import { apiService } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { Building2, Wind, Fuel, Users, Package, ShoppingCart, DollarSign, ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { isSameLagosDay, toLagosDateKey } from '@/lib/lagos-time'

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
    if (user?.role === 'org_owner' && user?.subscription_plan === 'personal') {
      router.push('/owner-dashboard')
      return
    }
    if (user?.role === 'sales_staff') {
      router.push('/sales')
    }
  }, [user, router])

  const [branches, setBranches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [businessTypeFilter, setBusinessTypeFilter] = useState<'all' | 'gas' | 'fuel'>('all')

  const [gasSales, setGasSales] = useState(0)
  const [gasManagerSales, setGasManagerSales] = useState(0)
  const [fuelSales, setFuelSales] = useState(0)
  const [fuelManagerSales, setFuelManagerSales] = useState(0)
  const [salesCount, setSalesCount] = useState(0)
  const [gasInventoryValue, setGasInventoryValue] = useState(0)
  const [fuelInventoryValue, setFuelInventoryValue] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [gasExpenses, setGasExpenses] = useState(0)
  const [fuelExpenses, setFuelExpenses] = useState(0)

  const [gasBranchRevenueMap, setGasBranchRevenueMap] = useState<Record<string, number>>({})
  const [fuelBranchRevenueMap, setFuelBranchRevenueMap] = useState<Record<string, number>>({})
  const [todayKey, setTodayKey] = useState(() => toLagosDateKey())

  useEffect(() => {
    const timer = setInterval(() => {
      const next = toLagosDateKey()
      setTodayKey((prev) => (prev === next ? prev : next))
    }, 60_000)
    return () => clearInterval(timer)
  }, [])

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
        let totalGasManagerSales = 0
        const todayKeySnapshot = todayKey
        
        gasBranches.forEach((branch: any, index: number) => {
          const list = Array.isArray(gasSalesLists[index]) ? gasSalesLists[index] : []
          
          // Parse notes to get salesperson
          const parseSalesperson = (notes: string) => {
            const match = String(notes ?? '').match(/salesperson:([^|]+)/)
            return match ? match[1].trim().toLowerCase() : ''
          }
          
          // Sales staff sales only (today's data)
          const salesStaffTotal = list
            .filter((tx: any) => {
              const salesperson = parseSalesperson(tx.notes)
              const notes = String(tx.notes ?? '').toLowerCase()
              // Exclude payment records and filter for today only
              return !notes.includes('type:payment_record') && 
                     isSameLagosDay(tx.created_at, todayKeySnapshot) &&
                     (salesperson === 'sales_staff' || (!salesperson.includes('manager') && salesperson !== 'manager'))
            })
            .reduce((sum: number, tx: any) => sum + Number(tx.amount ?? 0), 0)
          gasRevenueMap[branch.id] = salesStaffTotal
          
          // Manager sales only (today's data)
          const managerTotal = list
            .filter((tx: any) => {
              const salesperson = parseSalesperson(tx.notes)
              const notes = String(tx.notes ?? '').toLowerCase()
              // Exclude payment records and filter for today only
              return !notes.includes('type:payment_record') && 
                     isSameLagosDay(tx.created_at, todayKeySnapshot) &&
                     (salesperson.includes('manager') || salesperson === 'manager')
            })
            .reduce((sum: number, tx: any) => sum + Number(tx.amount ?? 0), 0)
          totalGasManagerSales += managerTotal
        })
        setGasBranchRevenueMap(gasRevenueMap)

        const fuelRevenueMap: Record<string, number> = {}
        let totalFuelManagerSales = 0
        fuelBranches.forEach((branch: any, index: number) => {
          const list = Array.isArray(fuelRecLists[index]) ? fuelRecLists[index] : []
          console.log(`Branch ${branch.name} total shifts:`, list.length)
          
          // Sales staff shifts only
          const salesStaffTotal = list
            .filter((rec: any) => {
              const role = String(rec?.created_by_role ?? '').trim().toLowerCase()
              if (!isSameLagosDay(rec.created_at, todayKeySnapshot)) return false
              console.log(`  Shift role: ${role}, amount: ${rec.sales_amount}`)
              return role === 'sales_staff'
            })
            .reduce((sum: number, tx: any) => sum + Number(tx.sales_amount ?? 0), 0)
          console.log(`Branch ${branch.name} sales staff total:`, salesStaffTotal)
          fuelRevenueMap[branch.id] = salesStaffTotal
          
          // Manager shifts only
          const managerTotal = list
            .filter((rec: any) => {
              const role = String(rec?.created_by_role ?? '').trim().toLowerCase()
              return isSameLagosDay(rec.created_at, todayKeySnapshot) && (role === 'fuel_manager' || role === 'org_owner')
            })
            .reduce((sum: number, tx: any) => sum + Number(tx.sales_amount ?? 0), 0)
          console.log(`Branch ${branch.name} manager total:`, managerTotal)
          totalFuelManagerSales += managerTotal
        })
        setFuelBranchRevenueMap(fuelRevenueMap)

        const totalGasSales = Object.values(gasRevenueMap).reduce((sum, v) => sum + v, 0)
        const totalFuelSales = Object.values(fuelRevenueMap).reduce((sum, v) => sum + v, 0)
        const totalManagerSales = totalGasManagerSales + totalFuelManagerSales
        console.log('=== DASHBOARD TOTALS ===')
        console.log('Total Fuel Sales (sales staff only):', totalFuelSales)
        console.log('Total Fuel Manager Sales:', totalFuelManagerSales)
        console.log('Total Gas Sales (sales staff only):', totalGasSales)
        console.log('Total Gas Manager Sales:', totalGasManagerSales)
        console.log('Total Manager Sales (fuel + gas):', totalManagerSales)
        console.log('Combined Total Sales:', totalGasSales + totalFuelSales)
        const totalSalesCount =
          gasSalesLists.reduce(
            (sum, list: any) =>
              sum + (Array.isArray(list) ? list.filter((tx: any) => isSameLagosDay(tx.created_at, todayKeySnapshot)).length : 0),
            0,
          ) +
          fuelRecLists.reduce(
            (sum, list: any) =>
              sum + (Array.isArray(list) ? list.filter((rec: any) => isSameLagosDay(rec.created_at, todayKeySnapshot)).length : 0),
            0,
          )

        const totalGasInventory = gasCylLists.flat().reduce(
          (sum: number, cyl: any) => sum + Number(cyl.quantity ?? 0) * Number(cyl.selling_price ?? 0),
          0
        )
        const totalFuelInventory = fuelProductLists.flat().reduce(
          (sum: number, p: any) => sum + Number(p.total_value ?? 0),
          0
        )
        const gasExpensesTotal = gasExpenseLists.flat().reduce((sum: number, e: any) => {
          if (!isSameLagosDay(e.created_at, todayKeySnapshot)) return sum
          return sum + Number(e.amount ?? 0)
        }, 0)
        const fuelExpensesTotal = fuelExpenseLists.flat().reduce((sum: number, e: any) => {
          if (!isSameLagosDay(e.created_at, todayKeySnapshot)) return sum
          return sum + Number(e.amount ?? 0)
        }, 0)

        setGasSales(totalGasSales)
        setGasManagerSales(totalGasManagerSales)
        setFuelSales(totalFuelSales)
        setFuelManagerSales(totalFuelManagerSales)
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
  }, [user, selectedBranchId, todayKey])

  const gasBranches = useMemo(() => branches.filter((b) => b.type === 'gas'), [branches])
  const fuelBranches = useMemo(() => branches.filter((b) => b.type === 'fuel'), [branches])
  const totalBranches = branches.length
  
  // Apply business type filter
  const filteredTotalSales = useMemo(() => {
    if (businessTypeFilter === 'gas') return gasSales
    if (businessTypeFilter === 'fuel') return fuelSales
    return gasSales + fuelSales
  }, [businessTypeFilter, gasSales, fuelSales])
  
  const filteredInventory = useMemo(() => {
    if (businessTypeFilter === 'gas') return gasInventoryValue
    if (businessTypeFilter === 'fuel') return fuelInventoryValue
    return gasInventoryValue + fuelInventoryValue
  }, [businessTypeFilter, gasInventoryValue, fuelInventoryValue])
  
  const filteredExpenses = useMemo(() => {
    if (businessTypeFilter === 'gas') return gasExpenses
    if (businessTypeFilter === 'fuel') return fuelExpenses
    return gasExpenses + fuelExpenses
  }, [businessTypeFilter, gasExpenses, fuelExpenses])
  const gasProfit = gasSales - gasExpenses
  const fuelProfit = fuelSales - fuelExpenses
  const totalSales = gasSales + fuelSales
  const totalInventory = gasInventoryValue + fuelInventoryValue
  const totalRevenue = totalSales
  const monthlyGrowth = 18.5
  const formatMoneyShort = (amount: number) => {
    if (amount >= 1000000) return `N${(amount / 1000000).toFixed(2).replace('.', ',')}M`
    if (amount >= 1000) return `N${(amount / 1000).toFixed(1).replace('.', ',')}K`
    return `N${amount.toLocaleString()}`
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      {!hideDashboardHeaderForFuelSalesStaff && (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h1>
              <p className="text-muted-foreground">
                Welcome back! Here's your business performance at a glance.
              </p>
            </div>
            {isOwner && !isPersonalOwner && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <Label className="font-semibold text-foreground text-sm sm:min-w-fit">Filter by:</Label>
                <Select value={businessTypeFilter} onValueChange={(value: 'all' | 'gas' | 'fuel') => setBusinessTypeFilter(value)}>
                  <SelectTrigger className={`w-full sm:w-40 ${businessTypeFilter === 'all' ? 'border-2 border-primary' : ''}`}>
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
          </div>
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
              <p className="text-sm text-muted-foreground mb-1">{isOwner && !isPersonalOwner ? 'Total Revenue' : 'Total Sales from all Pump'}</p>
              <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(isOwner && !isPersonalOwner ? filteredTotalSales : totalSales)}</h3>
              <p className="text-xs text-muted-foreground mt-2">Today</p>
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
              <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(isOwner && !isPersonalOwner ? filteredInventory : totalInventory)}</h3>
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
                  <p className="text-xs text-muted-foreground mt-2">Today</p>
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
                  <p className="text-sm text-muted-foreground mb-1">Total Sales from all Pump</p>
                  <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(isOwner && !isPersonalOwner ? filteredTotalSales : totalSales)}</h3>
                  <p className="text-xs text-muted-foreground mt-2">Today</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-1">Total Pump from Manager</p>
                  <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(fuelManagerSales + gasManagerSales)}</h3>
                  <p className="text-xs text-muted-foreground mt-2">Manager collection</p>
                </>
              )}
            </Card>
          </div>

          {isPersonalOwner && <RecentTransactions />}
          {!isOwner && <RecentTransactions />}

          {showOperationsPanels && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-all border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="p-5 border-b border-border bg-blue-100/30 dark:bg-blue-900/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Wind className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground">Gas Operations</h3>
                    </div>
                    <button
                      onClick={() => router.push('/gas/branches')}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1 font-semibold">Sales</p>
                      <p className="text-base font-bold text-foreground">₦{(gasSales / 1000).toFixed(0).replace('.', ',')}K</p>
                    </div>
                    <div className="p-3 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1 font-semibold">Inventory</p>
                      <p className="text-base font-bold text-foreground">₦{(gasInventoryValue / 1000).toFixed(0).replace('.', ',')}K</p>
                    </div>
                    <div className="p-3 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1 font-semibold">Profit</p>
                      <p className="text-base font-bold text-green-600">{formatMoneyShort(gasProfit)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="space-y-2">
                    {gasBranches.map((branch) => (
                      <div key={branch.id} className="flex items-center justify-between p-2.5 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer group">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{branch.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{branch.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">₦{((gasBranchRevenueMap[branch.id] ?? 0) / 1000).toFixed(0).replace('.', ',')}K</span>
                          <button
                            onClick={() => router.push('/gas/inventory')}
                            className="opacity-0 group-hover:opacity-100 text-xs text-blue-600 transition-opacity"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-all border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20">
                <div className="p-5 border-b border-border bg-orange-100/30 dark:bg-orange-900/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <Fuel className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground">Fuel Operations</h3>
                    </div>
                    <button
                      onClick={() => router.push('/fuel/branches')}
                      className="text-xs text-orange-600 hover:text-orange-700 hover:underline font-medium transition-colors"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg border border-orange-200/50 dark:border-orange-800/50">
                      <p className="text-[10px] text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-1 font-semibold">Sales</p>
                      <p className="text-base font-bold text-foreground">₦{(fuelSales / 1000).toFixed(0).replace('.', ',')}K</p>
                    </div>
                    <div className="p-3 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg border border-orange-200/50 dark:border-orange-800/50">
                      <p className="text-[10px] text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-1 font-semibold">Inventory</p>
                      <p className="text-base font-bold text-foreground">₦{(fuelInventoryValue / 1000).toFixed(0).replace('.', ',')}K</p>
                    </div>
                    <div className="p-3 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg border border-orange-200/50 dark:border-orange-800/50">
                      <p className="text-[10px] text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-1 font-semibold">Profit</p>
                      <p className="text-base font-bold text-green-600">{formatMoneyShort(fuelProfit)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="space-y-2">
                    {fuelBranches.map((branch) => (
                      <div key={branch.id} className="flex items-center justify-between p-2.5 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer group">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{branch.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{branch.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">₦{((fuelBranchRevenueMap[branch.id] ?? 0) / 1000).toFixed(0).replace('.', ',')}K</span>
                          <button
                            onClick={() => router.push('/fuel/inventory')}
                            className="opacity-0 group-hover:opacity-100 text-xs text-orange-600 transition-opacity"
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


