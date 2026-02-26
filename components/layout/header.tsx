'use client'

import { useAuth } from '@/context/auth-context'
import { Bell, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import {
  addNotification,
  getNotifications,
  markAllRead,
  NotificationItem,
} from '@/lib/notification-store'
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
    setNotifications(getNotifications())

    const hasSeeded = sessionStorage.getItem('energyflow_notif_seeded')
    if (!hasSeeded) {
      sessionStorage.setItem('energyflow_notif_seeded', 'true')
      const timeout = setTimeout(() => {
        const newItem = addNotification({
          title: 'Sales Update',
          message: 'New sales summary is available for today.',
        })
        setNotifications((prev) => [newItem, ...prev])
        toast({
          title: newItem.title,
          description: newItem.message,
        })
      }, 900)

      return () => clearTimeout(timeout)
    }
  }, [])

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
