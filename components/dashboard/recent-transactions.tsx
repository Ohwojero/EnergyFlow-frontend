'use client'

import { Card } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ShoppingCart, Fuel } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useMemo, useState } from 'react'
import { apiService } from '@/lib/api'

type TxItem = {
  id: string
  source: 'gas' | 'fuel'
  type: string
  details: string
  amount: number
  created_at: string
}

export function RecentTransactions() {
  const router = useRouter()
  const { user, selectedBranchId } = useAuth()
  const isPersonalOwner = user?.role === 'org_owner' && user?.subscription_plan === 'personal'
  const [transactions, setTransactions] = useState<TxItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const allBranches = await apiService.getBranches().catch(() => [])
        let branchList = Array.isArray(allBranches) ? allBranches : []
        if (isPersonalOwner && branchList.length === 0) {
          const gasBranches = await apiService.getGasBranches().catch(() => [])
          branchList = Array.isArray(gasBranches) ? gasBranches : []
        }

        const shouldScopeToAssigned = user.role === 'gas_manager' || user.role === 'fuel_manager'
        const assignedSet = new Set(user.assigned_branches ?? [])
        const scopedBranches =
          shouldScopeToAssigned && assignedSet.size > 0
            ? branchList.filter((b: any) => assignedSet.has(b.id))
            : branchList

        const selectedScoped = selectedBranchId
          ? scopedBranches.filter((b: any) => b.id === selectedBranchId)
          : scopedBranches

        const gasBranches = selectedScoped.filter((b: any) => b.type === 'gas')
        const fuelBranches = selectedScoped.filter((b: any) => b.type === 'fuel')

        const [gasLists, fuelLists] = await Promise.all([
          Promise.all(gasBranches.map((b: any) => apiService.getGasSales(b.id).catch(() => []))),
          Promise.all(fuelBranches.map((b: any) => apiService.getShiftReconciliations(b.id).catch(() => []))),
        ])

        const gasTx: TxItem[] = gasLists.flat().map((tx: any) => ({
          id: `gas-${tx.id}`,
          source: 'gas',
          type: 'sale',
          details: `${tx.quantity ?? 0}kg`,
          amount: Number(tx.amount ?? 0),
          created_at: String(tx.created_at ?? new Date().toISOString()),
        }))

        const fuelTx: TxItem[] = fuelLists.flat().map((tx: any) => ({
          id: `fuel-${tx.id}`,
          source: 'fuel',
          type: 'sale',
          details: `Shift ${tx.shift_number ?? '-'}${tx.pump?.pump_number ? ` • Pump ${tx.pump.pump_number}` : ''}`,
          amount: Number(tx.sales_amount ?? 0),
          created_at: String(tx.created_at ?? new Date().toISOString()),
        }))

        const merged = [...gasTx, ...fuelTx]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 20)

        setTransactions(merged)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [isPersonalOwner, user, selectedBranchId])

  const getTransactionIcon = (source: TxItem['source']) => {
    return source === 'gas' ? <ShoppingCart className="w-4 h-4" /> : <Fuel className="w-4 h-4" />
  }

  const getTransactionColor = (source: TxItem['source']) => {
    return source === 'gas'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const monthGroups = useMemo(() => {
    const groups: Record<string, TxItem[]> = {}
    transactions.forEach((t) => {
      const date = new Date(t.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions])

  const currentMonth = new Date().toISOString().slice(0, 7)

  return (
    <Card className="shadow-card mb-8">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
      </div>

      {isLoading ? (
        <div className="px-6 py-8 text-center">
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-muted-foreground">No transactions yet</p>
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={[currentMonth]} className="w-full">
          {monthGroups.map(([monthKey, monthTransactions]) => {
            const date = new Date(monthKey + '-01')
            const monthName = date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
            const monthTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0)

            return (
              <AccordionItem key={monthKey} value={monthKey} className="border-b">
                <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-semibold">{monthName}</span>
                    <span className="text-sm text-muted-foreground">
                      {monthTransactions.length} transactions • ₦{monthTotal.toLocaleString()}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Type</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Details</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Amount</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthTransactions.map((transaction) => {
                          const colorClass = getTransactionColor(transaction.source)
                          return (
                            <tr key={transaction.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4">
                                <Badge className={`inline-flex items-center gap-2 ${colorClass}`}>
                                  {getTransactionIcon(transaction.source)}
                                  <span className="text-sm font-medium capitalize">
                                    {transaction.source} {transaction.type}
                                  </span>
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground">{transaction.details}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-foreground">
                                ₦{transaction.amount.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">
                                {formatDate(transaction.created_at)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}

      <div className="p-6 border-t border-border">
        <button
          onClick={() => router.push('/transactions')}
          className="text-sm font-medium text-primary hover:underline"
        >
          View All Transactions →
        </button>
      </div>
    </Card>
  )
}
