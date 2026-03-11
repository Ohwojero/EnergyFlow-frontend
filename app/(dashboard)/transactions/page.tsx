'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { apiService } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { ArrowUpRight, DollarSign, Fuel, Wind } from 'lucide-react'
import type { Branch } from '@/types'

type CombinedSale = {
  id: string
  created_at: string
  branch: string
  type: 'Gas' | 'Fuel'
  details: string
  amount: number
}

export default function TransactionsPage() {
  const { user, selectedBranchId, selectedBranchType } = useAuth()
  const isSalesStaff = user?.role === 'sales_staff'
  const [branches, setBranches] = useState<Branch[]>([])
  const [gasSales, setGasSales] = useState<any[]>([])
  const [fuelSales, setFuelSales] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const toList = (payload: any) => {
          if (Array.isArray(payload)) return payload
          if (Array.isArray(payload?.data)) return payload.data
          if (Array.isArray(payload?.items)) return payload.items
          return []
        }
        const allBranches = await apiService.getBranches()
        let branchList = toList(allBranches)
        if (isSalesStaff && branchList.length === 0) {
          const [gasBranches, fuelBranches] = await Promise.all([
            apiService.getGasBranches().catch(() => []),
            apiService.getFuelBranches().catch(() => []),
          ])
          branchList = [...toList(gasBranches), ...toList(fuelBranches)]
        }
        setBranches(branchList)

        const scopedBranches = (() => {
          if (user.role === 'org_owner') return branchList
          const assigned = new Set(user.assigned_branches ?? [])
          if (assigned.size > 0) {
            return branchList.filter((b: any) => assigned.has(b.id))
          }
          if (selectedBranchId) {
            const selected = branchList.find((b: any) => b.id === selectedBranchId)
            return selected ? [selected] : branchList
          }
          if (selectedBranchType) {
            const typed = branchList.filter((b: any) => b.type === selectedBranchType)
            return typed.length > 0 ? typed : branchList
          }
          return branchList
        })()

        const gasBranches = scopedBranches.filter((b: any) => b.type === 'gas')
        const fuelBranches = scopedBranches.filter((b: any) => b.type === 'fuel')

        const [gasLists, fuelLists] = await Promise.all([
          Promise.all(gasBranches.map((b: any) => 
            isSalesStaff ? apiService.getMyGasSales(b.id).catch(() => []) : apiService.getGasSales(b.id).catch(() => [])
          )),
          Promise.all(fuelBranches.map((b: any) => 
            isSalesStaff ? apiService.getMyShiftReconciliations(b.id).catch(() => []) : apiService.getShiftReconciliations(b.id).catch(() => [])
          )),
        ])

        const mappedGas = gasLists.flat().map((tx: any) => ({
          ...tx,
          branch_id: tx.branch_id ?? tx.branch?.id ?? '',
        }))
        const mappedFuel = fuelLists.flat().map((tx: any) => ({
          ...tx,
          branch_id: tx.branch_id ?? tx.branch?.id ?? '',
        }))
        
        setGasSales(mappedGas)
        setFuelSales(mappedFuel)

        if (mappedGas.length === 0 && mappedFuel.length === 0 && user.assigned_branches?.length) {
          const fallbackIds = user.assigned_branches
          const [fallbackGas, fallbackFuel] = await Promise.all([
            Promise.all(fallbackIds.map((id) => 
              isSalesStaff ? apiService.getMyGasSales(id).catch(() => []) : apiService.getGasSales(id).catch(() => [])
            )),
            Promise.all(fallbackIds.map((id) => 
              isSalesStaff ? apiService.getMyShiftReconciliations(id).catch(() => []) : apiService.getShiftReconciliations(id).catch(() => [])
            )),
          ])
          const fallbackMappedGas = fallbackGas.flat().map((tx: any) => ({
            ...tx,
            branch_id: tx.branch_id ?? tx.branch?.id ?? '',
          }))
          const fallbackMappedFuel = fallbackFuel.flat().map((tx: any) => ({
            ...tx,
            branch_id: tx.branch_id ?? tx.branch?.id ?? '',
          }))
          
          setGasSales(fallbackMappedGas)
          setFuelSales(fallbackMappedFuel)
        }

        if (user.role !== 'org_owner' && selectedBranchType) {
          if (selectedBranchType === 'gas') {
            setFuelSales([])
          } else if (selectedBranchType === 'fuel') {
            setGasSales([])
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [user, selectedBranchId, selectedBranchType, isSalesStaff])

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount)

  const combinedSales = useMemo<CombinedSale[]>(() => {
    const branchNameById = new Map(branches.map((b) => [b.id, b.name]))
    const fallbackBranchName =
      branches.find((b) => b.id === selectedBranchId)?.name ||
      branches.find((b) => (user?.assigned_branches ?? []).includes(b.id))?.name ||
      ''
    const gas = gasSales.map((t: any) => ({
      id: String(t.id),
      created_at: String(t.created_at ?? new Date().toISOString()),
      branch: String((t.branch?.name ?? branchNameById.get(String(t.branch_id ?? '')) ?? fallbackBranchName) || 'Unknown Branch'),
      type: 'Gas' as const,
      details: `${Number(t.quantity ?? 0)}kg`,
      amount: Number(t.amount ?? 0),
    }))
    const fuel = fuelSales.map((s: any) => ({
      id: String(s.id),
      created_at: String(s.created_at ?? new Date().toISOString()),
      branch: String((s.branch?.name ?? branchNameById.get(String(s.branch_id ?? '')) ?? fallbackBranchName) || 'Unknown Branch'),
      type: 'Fuel' as const,
      details: `Shift ${Number(s.shift_number ?? 0)} (${(() => {
        const pumpNumber = String(s.pump_number ?? s.pump?.pump_number ?? '').trim()
        if (pumpNumber) return /^pump\b/i.test(pumpNumber) ? pumpNumber : `Pump ${pumpNumber}`
        return 'N/A'
      })()})`,
      amount: Number(s.sales_amount ?? 0),
    }))
    return [...gas, ...fuel].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [branches, fuelSales, gasSales, selectedBranchId, user?.assigned_branches])

  const totalGas = gasSales.reduce((sum, row: any) => sum + Number(row.amount ?? 0), 0)
  const totalFuel = fuelSales.reduce((sum, row: any) => sum + Number(row.sales_amount ?? 0), 0)
  const totalSales = totalGas + totalFuel

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          {user?.role === 'org_owner' ? 'All Branch Sales' : 'My Transactions'}
        </h1>
        <p className="text-muted-foreground">
          {user?.role === 'org_owner'
            ? 'View sales made across all branches.'
            : 'Sales recorded for your current branch.'}
        </p>
      </div>

      {!isSalesStaff && (
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
            <p className="text-xs text-muted-foreground mt-2">All records</p>
          </Card>
          <Card className="p-6 bg-green-100 dark:bg-green-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-600/20 rounded-lg">
                <Wind className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Gas Sales</p>
            <h3 className="text-3xl font-bold text-foreground">{formatMoney(totalGas)}</h3>
          </Card>
          <Card className="p-6 bg-orange-100 dark:bg-orange-900/20 border-0 shadow-card hover:shadow-card-hover transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-orange-600/20 rounded-lg">
                <Fuel className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Fuel Sales</p>
            <h3 className="text-3xl font-bold text-foreground">{formatMoney(totalFuel)}</h3>
          </Card>
        </div>
      )}

      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Recent Sales</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date & Time</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Branch</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Type</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Details</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <p className="text-muted-foreground">Loading transactions...</p>
                  </td>
                </tr>
              ) : combinedSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <p className="text-muted-foreground">No transactions recorded yet</p>
                  </td>
                </tr>
              ) : (
                combinedSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-foreground">{formatDate(sale.created_at)}</td>
                    <td className="px-6 py-4 text-foreground">{sale.branch}</td>
                    <td className="px-6 py-4 text-foreground">{sale.type}</td>
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
