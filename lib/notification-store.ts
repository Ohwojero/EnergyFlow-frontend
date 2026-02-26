'use client'

export type NotificationItem = {
  id: string
  title: string
  message: string
  created_at: string
  read: boolean
}

const STORAGE_KEY = 'energyflow_notifications'

export function getNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as NotificationItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveNotifications(items: NotificationItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function addNotification(item: Omit<NotificationItem, 'id' | 'created_at' | 'read'>) {
  const existing = getNotifications()
  const newItem: NotificationItem = {
    id: `notif-${Date.now()}`,
    title: item.title,
    message: item.message,
    created_at: new Date().toISOString(),
    read: false,
  }
  const updated = [newItem, ...existing].slice(0, 20)
  saveNotifications(updated)
  return newItem
}

export function markAllRead() {
  const existing = getNotifications()
  const updated = existing.map((n) => ({ ...n, read: true }))
  saveNotifications(updated)
  return updated
}
