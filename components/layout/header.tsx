'use client'

import { useAuth } from '@/context/auth-context'
import { Bell, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { apiService } from '@/lib/api'
import {
  getNotifications,
  markAllRead,
  NotificationItem,
  saveNotifications,
} from '@/lib/notification-store'
import { toLagosDateKey } from '@/lib/lagos-time'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface HeaderProps {
  onMenuToggle?: () => void
  showMenuButton?: boolean
}

export function Header({ onMenuToggle, showMenuButton = true }: HeaderProps) {
  const { user } = useAuth()
  const isSalesStaff = user?.role === 'sales_staff'
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !user) {
      if (mounted) setNotifications(getNotifications())
      return
    }

    let isActive = true

    const formatMoney = (amount: number) => `N${Math.round(amount).toLocaleString()}`
    const todayKey = toLagosDateKey()

    const createNotification = (
      id: string,
      title: string,
      message: string,
      existingMap: Map<string, NotificationItem>,
    ): NotificationItem => ({
      id,
      title,
      message,
      created_at: existingMap.get(id)?.created_at ?? new Date().toISOString(),
      read: existingMap.get(id)?.read ?? false,
    })

    const loadNotifications = async () => {
      const existing = getNotifications()
      const existingMap = new Map(existing.map((item) => [item.id, item]))
      const generated: NotificationItem[] = []

      try {
        const branchData = await apiService.getBranches().catch(() => [])
        const branches = Array.isArray(branchData) ? branchData : []
        const gasBranches = branches.filter((branch: any) => branch.type === 'gas')
        const fuelBranches = branches.filter((branch: any) => branch.type === 'fuel')

        if (gasBranches.length > 0) {
          const [gasSalesLists, gasExpenseLists, gasInventoryLists] = await Promise.all([
            Promise.all(gasBranches.map((branch: any) => apiService.getGasSales(branch.id).catch(() => []))),
            Promise.all(gasBranches.map((branch: any) => apiService.getGasExpenses(branch.id).catch(() => []))),
            Promise.all(gasBranches.map((branch: any) => apiService.getGasCylinders(branch.id).catch(() => []))),
          ])

          const gasSalesToday = gasSalesLists.flatMap((list: any) => (Array.isArray(list) ? list : [])).filter((item: any) => {
            const notes = String(item.notes ?? '').toLowerCase()
            return !notes.includes('type:payment_record') && toLagosDateKey(item.created_at ?? new Date().toISOString()) === todayKey
          })
          const gasSalesTotal = gasSalesToday.reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0)
          if (gasSalesToday.length > 0) {
            generated.push(
              createNotification(
                `${user.id}-gas-sales-${todayKey}`,
                'Gas sales update',
                `${gasSalesToday.length} gas sale${gasSalesToday.length > 1 ? 's were' : ' was'} recorded today worth ${formatMoney(gasSalesTotal)}.`,
                existingMap,
              ),
            )
          }

          const gasExpensesToday = gasExpenseLists.flatMap((list: any) => (Array.isArray(list) ? list : [])).filter(
            (item: any) => toLagosDateKey(item.created_at ?? new Date().toISOString()) === todayKey,
          )
          const gasExpensesTotal = gasExpensesToday.reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0)
          if (gasExpensesToday.length > 0) {
            generated.push(
              createNotification(
                `${user.id}-gas-expenses-${todayKey}`,
                'Gas expense update',
                `${gasExpensesToday.length} gas expense${gasExpensesToday.length > 1 ? 's were' : ' was'} recorded today totaling ${formatMoney(gasExpensesTotal)}.`,
                existingMap,
              ),
            )
          }

          const lowGasStock = gasInventoryLists
            .flatMap((list: any) => (Array.isArray(list) ? list : []))
            .filter((item: any) => Number(item.quantity ?? 0) <= 5)
          if (lowGasStock.length > 0) {
            generated.push(
              createNotification(
                `${user.id}-gas-low-stock-${todayKey}`,
                'Gas inventory alert',
                `${lowGasStock.length} gas inventory item${lowGasStock.length > 1 ? 's are' : ' is'} low on stock and may need attention.`,
                existingMap,
              ),
            )
          }
        }

        if (fuelBranches.length > 0) {
          const [fuelShiftLists, fuelExpenseLists, fuelProductLists] = await Promise.all([
            Promise.all(fuelBranches.map((branch: any) => apiService.getShiftReconciliations(branch.id).catch(() => []))),
            Promise.all(fuelBranches.map((branch: any) => apiService.getFuelExpenses(branch.id).catch(() => []))),
            Promise.all(fuelBranches.map((branch: any) => apiService.getFuelProducts(branch.id).catch(() => []))),
          ])

          const fuelShiftsToday = fuelShiftLists.flatMap((list: any) => (Array.isArray(list) ? list : [])).filter(
            (item: any) => toLagosDateKey(item.created_at ?? new Date().toISOString()) === todayKey,
          )
          const fuelSalesTotal = fuelShiftsToday.reduce((sum: number, item: any) => sum + Number(item.sales_amount ?? 0), 0)
          if (fuelShiftsToday.length > 0) {
            generated.push(
              createNotification(
                `${user.id}-fuel-sales-${todayKey}`,
                'Fuel sales update',
                `${fuelShiftsToday.length} fuel shift${fuelShiftsToday.length > 1 ? 's were' : ' was'} recorded today worth ${formatMoney(fuelSalesTotal)}.`,
                existingMap,
              ),
            )
          }

          const fuelExpensesToday = fuelExpenseLists.flatMap((list: any) => (Array.isArray(list) ? list : [])).filter(
            (item: any) => toLagosDateKey(item.created_at ?? new Date().toISOString()) === todayKey,
          )
          const fuelExpensesTotal = fuelExpensesToday.reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0)
          if (fuelExpensesToday.length > 0) {
            generated.push(
              createNotification(
                `${user.id}-fuel-expenses-${todayKey}`,
                'Fuel expense update',
                `${fuelExpensesToday.length} fuel expense${fuelExpensesToday.length > 1 ? 's were' : ' was'} recorded today totaling ${formatMoney(fuelExpensesTotal)}.`,
                existingMap,
              ),
            )
          }

          const lowFuelStock = fuelProductLists
            .flatMap((list: any) => (Array.isArray(list) ? list : []))
            .filter((item: any) => Number(item.quantity ?? 0) <= 500)
          if (lowFuelStock.length > 0) {
            generated.push(
              createNotification(
                `${user.id}-fuel-low-stock-${todayKey}`,
                'Fuel inventory alert',
                `${lowFuelStock.length} fuel product${lowFuelStock.length > 1 ? 's are' : ' is'} running low and should be reviewed.`,
                existingMap,
              ),
            )
          }
        }
      } catch {
        if (!isActive) return
        setNotifications(existing)
        return
      }

      const nextNotifications = generated.slice(0, 20)
      saveNotifications(nextNotifications)

      if (!isActive) return

      const existingIds = new Set(existing.map((item) => item.id))
      const unreadNewItems = nextNotifications.filter((item) => !existingIds.has(item.id))
      setNotifications(nextNotifications)

      unreadNewItems.forEach((item) => {
        toast({
          title: item.title,
          description: item.message,
        })
      })
    }

    loadNotifications()

    return () => {
      isActive = false
    }
  }, [mounted, user])

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isSalesStaff ? 'Sales Dashboard' : `Welcome back, ${user?.name?.split(' ')[0]}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isSalesStaff ? 'Record sales and review your transactions.' : 'Manage your branches efficiently'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          className="p-2 hover:bg-muted rounded-lg transition-colors relative"
          onClick={() => {
            setIsNotificationsOpen(true)
            if (notifications.some((n) => !n.read)) {
              const updated = markAllRead()
              setNotifications(updated)
            }
          }}
        >
          <Bell className="w-5 h-5" />
          {notifications.some((n) => !n.read) && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          )}
        </button>
      </div>

      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>
              Latest alerts and updates from your branches.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                No new notifications right now.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border/60 p-4 bg-background"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                    </div>
                    {!item.read && (
                      <span className="mt-1 h-2 w-2 rounded-full bg-destructive" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
