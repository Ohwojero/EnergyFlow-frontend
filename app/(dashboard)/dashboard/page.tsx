'use client'

import { useAuth } from '@/context/auth-context'
import { mockBranches, mockGasCylinders, mockGasTransactions, mockFuelProducts } from '@/lib/mock-data'
import { getAllBranches } from '@/lib/branch-store'
import { getAllFuelShifts } from '@/lib/fuel-shift-store'
import { getAllGasSales } from '@/lib/gas-sales-store'
import { QuickStats } from '@/components/dashboard/quick-stats'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { Card } from '@/components/ui/card'
import { Building2, Wind, Fuel, Users, TrendingUp, Package, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const { user, selectedBranchType } = useAuth()
  const router = useRouter()
  const hideDashboardHeaderForFuelSalesStaff =
    user?.role === 'sales_staff' && selectedBranchType === 'fuel'

  // Redirect super admin to their dashboard
  useEffect(() => {
    if (user?.role === 'super_admin') {
      router.push('/admin/dashboard')
      return
    }
    if (user?.role === 'sales_staff') {
      router.push('/sales')
    }
  }, [user, router])

  const [branches, setBranches] = useState(mockBranches)
  const [gasSales, setGasSales] = useState(0)
  const [fuelSales, setFuelSales] = useState(0)

  useEffect(() => {
    setBranches(getAllBranches())
    const gasTransactions = getAllGasSales()
    setGasSales(gasTransactions.reduce((sum, transaction) => sum + transaction.amount, 0))
    const shifts = getAllFuelShifts()
    setFuelSales(shifts.reduce((sum, shift) => sum + shift.sales_amount, 0))
  }, [])

  // Count branches by type
  const gasBranches = branches.filter(b => b.type === 'gas')
  const fuelBranches = branches.filter(b => b.type === 'fuel')
  const totalBranches = branches.length

  // Calculate gas metrics
  const gasInventoryValue = mockGasCylinders.reduce((sum, cyl) => 
    sum + (cyl.quantity * cyl.selling_price), 0
  )
  // Calculate fuel metrics
  const fuelInventoryValue = mockFuelProducts.reduce((sum, p) => 
    sum + p.total_value, 0
  )
  // Combined metrics
  const totalSales = gasSales + fuelSales
  const totalInventory = gasInventoryValue + fuelInventoryValue
  const totalRevenue = totalSales
  const monthlyGrowth = 18.5

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      {!hideDashboardHeaderForFuelSalesStaff && (
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Dashboard Overview</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Welcome back! Here's your business performance at a glance.
          </p>
        </div>
      )}

      {/* Branch Overview Cards (for Org Owner) */}
      {user?.role === 'org_owner' && (
        <>
          {/* Key Metrics */}
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
              <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
              <h3 className="text-3xl font-bold text-foreground">₦{(totalRevenue / 1000000).toFixed(2)}M</h3>
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
              <h3 className="text-3xl font-bold text-foreground">₦{(totalInventory / 1000000).toFixed(2)}M</h3>
              <p className="text-xs text-muted-foreground mt-2">Current stock</p>
            </Card>

            <Card className="p-6 bg-purple-100 dark:bg-purple-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-purple-600/20 rounded-lg">
                  <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total Branches</p>
              <h3 className="text-3xl font-bold text-foreground">{totalBranches}</h3>
              <p className="text-xs text-muted-foreground mt-2">{gasBranches.length} Gas, {fuelBranches.length} Fuel</p>
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
              <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
              <h3 className="text-3xl font-bold text-foreground">₦{(totalSales / 1000000).toFixed(2)}M</h3>
              <p className="text-xs text-muted-foreground mt-2">This month</p>
            </Card>
          </div>

          {/* Branch Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Gas Operations */}
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
                        <span className="text-xs font-semibold text-foreground">₦500K</span>
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

            {/* Fuel Operations */}
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
                        <span className="text-xs font-semibold text-foreground">
                          ₦{fuelBranches.length > 0 ? (fuelSales / fuelBranches.length / 1000).toFixed(0) : '0'}K
                        </span>
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
        </>
      )}

      {/* Quick Stats */}
      <QuickStats />

      {/* Recent Transactions */}
      <div className="mb-8">
        <RecentTransactions />
      </div>

      {/* Additional Info for different roles */}
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
