'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/context/auth-context'
import { apiService } from '@/lib/api'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { Building2, DollarSign, Package, ShoppingCart, ArrowUpRight } from 'lucide-react'
import { isSameLagosDay } from '@/lib/lagos-time'

interface DashboardStats {
  totalSales: number
  managerSales: number
  totalInventory: number
  totalBranches: number
}

export default function PersonalOwnerDashboard() {
  const { user, selectedBranchId, selectedBranchType } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    managerSales: 0,
    totalInventory: 0,
    totalBranches: 0,
  })
  const [loading, setLoading] = useState(true)

  const businessType = (user as any)?.business_type

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return
      setLoading(true)
      try {
        const branches = await apiService.getBranches().catch(() => [])
        const branchList = Array.isArray(branches) ? branches : []
        const preferredType = selectedBranchType ?? businessType
        const selectedBranch = selectedBranchId
          ? branchList.find((b: any) => b.id === selectedBranchId)
          : preferredType
            ? branchList.find((b: any) => String(b.type) === String(preferredType))
            : branchList[0]

        if (!selectedBranch) {
          setStats({ totalSales: 0, managerSales: 0, totalInventory: 0, totalBranches: branchList.length })
          return
        }

        if (selectedBranch.type === 'gas') {
          const [sales, cylinders] = await Promise.all([
            apiService.getGasSales(selectedBranch.id).catch(() => []),
            apiService.getGasCylinders(selectedBranch.id).catch(() => []),
          ])
          const salesList = Array.isArray(sales) ? sales : []
          const parseSalesperson = (notes: string) => {
            const match = String(notes ?? '').match(/salesperson:([^|]+)/)
            return match ? match[1].trim().toLowerCase() : ''
          }
          const totalSales = salesList
            .filter((tx: any) => {
              const notes = String(tx?.notes ?? '').toLowerCase()
              const salesperson = parseSalesperson(tx.notes)
              return (
                !notes.includes('type:payment_record') &&
                isSameLagosDay(tx.created_at) &&
                (salesperson === 'sales_staff' || (!salesperson.includes('manager') && salesperson !== 'manager'))
              )
            })
            .reduce((sum: number, tx: any) => sum + Number(tx.amount ?? 0), 0)
          const managerSales = salesList
            .filter((tx: any) => {
              const notes = String(tx?.notes ?? '').toLowerCase()
              const salesperson = parseSalesperson(tx.notes)
              return (
                !notes.includes('type:payment_record') &&
                isSameLagosDay(tx.created_at) &&
                (salesperson.includes('manager') || salesperson === 'manager')
              )
            })
            .reduce((sum: number, tx: any) => sum + Number(tx.amount ?? 0), 0)
          const totalInventory = (Array.isArray(cylinders) ? cylinders : []).reduce(
            (sum: number, cyl: any) => sum + Number(cyl.quantity ?? 0) * Number(cyl.selling_price ?? 0),
            0,
          )
          setStats({
            totalSales,
            managerSales,
            totalInventory,
            totalBranches: branchList.length,
          })
          return
        }

        const [reconciliations, products] = await Promise.all([
          apiService.getShiftReconciliations(selectedBranch.id).catch(() => []),
          apiService.getFuelProducts(selectedBranch.id).catch(() => []),
        ])
        const recList = Array.isArray(reconciliations) ? reconciliations : []
        const totalSales = recList
          .filter((rec: any) => {
            const role = String(rec?.created_by_role ?? '').trim().toLowerCase()
            return isSameLagosDay(rec.created_at) && role === 'sales_staff'
          })
          .reduce((sum: number, rec: any) => sum + Number(rec.sales_amount ?? 0), 0)
        const managerSales = recList
          .filter((rec: any) => {
            const role = String(rec?.created_by_role ?? '').trim().toLowerCase()
            return (
              isSameLagosDay(rec.created_at) &&
              (role === 'fuel_manager' || role === 'gas_manager' || role === 'org_owner')
            )
          })
          .reduce((sum: number, rec: any) => sum + Number(rec.sales_amount ?? 0), 0)
        const totalInventory = (Array.isArray(products) ? products : []).reduce(
          (sum: number, p: any) => sum + Number(p.total_value ?? 0),
          0,
        )
        setStats({
          totalSales,
          managerSales,
          totalInventory,
          totalBranches: branchList.length,
        })
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        setStats({ totalSales: 0, managerSales: 0, totalInventory: 0, totalBranches: 0 })
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [user, selectedBranchId, selectedBranchType, businessType])

  const formatMoneyShort = (amount: number) => {
    if (amount >= 1000000) return `N${(amount / 1000000).toFixed(2).replace('.', ',')}M`
    if (amount >= 1000) return `N${(amount / 1000).toFixed(1).replace('.', ',')}K`
    return `N${amount.toLocaleString()}`
  }

  const totalRevenue = stats.totalSales
  const monthlyGrowth = 18.5

  if (loading) {
    return (
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="p-4 mb-6 shadow-card">
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-primary" />
          {user?.tenant_name || 'My Business'}
        </h1>
        <p className="text-muted-foreground">Dashboard Overview</p>
      </div>

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
          <p className="text-sm text-muted-foreground mb-1">Total Sales from all Pump</p>
          <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(totalRevenue)}</h3>
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
          <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(stats.totalInventory)}</h3>
          <p className="text-xs text-muted-foreground mt-2">Current stock</p>
        </Card>

        <Card className="p-6 bg-purple-100 dark:bg-purple-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Branches</p>
          <h3 className="text-3xl font-bold text-foreground">{stats.totalBranches}</h3>
          <p className="text-xs text-muted-foreground mt-2">Personal plan</p>
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
          <p className="text-sm text-muted-foreground mb-1">Total Pump from Manager</p>
          <h3 className="text-3xl font-bold text-foreground">{formatMoneyShort(stats.managerSales)}</h3>
          <p className="text-xs text-muted-foreground mt-2">Today</p>
        </Card>
      </div>

      <RecentTransactions />
    </div>
  )
}
