'use client'

import { Card } from '@/components/ui/card'
import { mockGasTransactions, mockBranches } from '@/lib/mock-data'
import { getAllGasSales } from '@/lib/gas-sales-store'
import { ShoppingCart, Package, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useEffect, useState } from 'react'

export function RecentTransactions() {
  const router = useRouter()
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    const gasSales = getAllGasSales()
    let filteredSales = gasSales
    
    // Filter by branch for non-owners
    if (user?.role !== 'org_owner') {
      const userBranchId = user?.assigned_branches[0]
      filteredSales = gasSales.filter(sale => sale.branch_id === userBranchId)
    }
    
    setTransactions(filteredSales.slice(0, 5))
  }, [user])

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className="w-4 h-4" />
      case 'purchase':
        return <Package className="w-4 h-4" />
      case 'refill':
        return <TrendingDown className="w-4 h-4" />
      default:
        return null
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'sale':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'purchase':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'refill':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Card className="shadow-card">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
      </div>
      
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
            {transactions.map((transaction) => {
              const colorClass = getTransactionColor(transaction.type)
              return (
                <tr key={transaction.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${colorClass}`}>
                      {getTransactionIcon(transaction.type)}
                      <span className="text-sm font-medium capitalize">{transaction.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    <div>
                      <p className="font-medium">{transaction.quantity} kg Gas</p>
                      <p className="text-xs text-muted-foreground">{transaction.notes || 'Gas sale'}</p>
                    </div>
                  </td>
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

      <div className="p-6 border-t border-border">
        <button 
          onClick={() => router.push('/gas/sales')}
          className="text-sm font-medium text-primary hover:underline"
        >
          View All Transactions →
        </button>
      </div>
    </Card>
  )
}
