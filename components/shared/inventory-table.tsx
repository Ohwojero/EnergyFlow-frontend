'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, TrendingUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface InventoryItem {
  id: string
  name: string
  size?: string
  quantity: number
  unit_price: number
  total_value: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  last_updated?: string
}

interface InventoryTableProps {
  title: string
  items: InventoryItem[]
  onAddNew?: () => void
  onDeleteItem?: (id: string) => void
  quantityLabel?: string
  unitPriceLabel?: string
  totalValueLabel?: string
  showDateTime?: boolean
}

export function InventoryTable({
  title,
  items,
  onAddNew,
  onDeleteItem,
  quantityLabel = 'Quantity',
  unitPriceLabel = 'Unit Price',
  totalValueLabel = 'Total Value',
  showDateTime = false,
}: InventoryTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'low_stock':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'out_of_stock':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
    }
  }

  const formatValue = (value: number) => `₦${value.toLocaleString()}`

  const formatDateTime = (value?: string) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card className="shadow-card">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {title}
        </h3>
        {onAddNew && (
          <Button onClick={onAddNew} className="bg-primary hover:bg-primary/90">
            + Add New
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Item</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">{quantityLabel}</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">{unitPriceLabel}</th>
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">{totalValueLabel}</th>
              {showDateTime && <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date & Time</th>}
              <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-right font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={showDateTime ? 7 : 6} className="px-6 py-8 text-center">
                  <p className="text-muted-foreground">No inventory items found</p>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      {item.size && <p className="text-xs text-muted-foreground">{item.size}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">{item.quantity}</td>
                  <td className="px-6 py-4 text-foreground">{formatValue(item.unit_price)}</td>
                  <td className="px-6 py-4 font-semibold text-foreground">{formatValue(item.total_value)}</td>
                  {showDateTime && <td className="px-6 py-4 text-foreground">{formatDateTime(item.last_updated)}</td>}
                  <td className="px-6 py-4">
                    <Badge className={`capitalize ${getStatusColor(item.status)}`}>{item.status.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors inline-block"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={!onDeleteItem}
                          onSelect={(e) => {
                            e.preventDefault()
                            onDeleteItem?.(item.id)
                          }}
                        >
                          Delete item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
