'use client'

// Shared helpers for persisting expense records in localStorage per tenant and type

const STORAGE_PREFIX = 'energyflow_expenses'

function getTenantId(): string {
  if (typeof window === 'undefined') return 'global'
  try {
    const raw = localStorage.getItem('energyflow_user')
    if (!raw) return 'global'
    const parsed = JSON.parse(raw) as { tenant_id?: string }
    return parsed.tenant_id || 'global'
  } catch {
    return 'global'
  }
}

function storageKey(type: string) {
  return `${STORAGE_PREFIX}_${type}_${getTenantId()}`
}

export function getStoredExpenses<T>(type: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(type))
    if (!raw) return []
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredExpenses<T>(type: string, items: T[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(type), JSON.stringify(items))
}

export function getAllExpenses<T>(type: string, mockData: T[]): T[] {
  const stored = getStoredExpenses<T>(type)
  const existingIds = new Set((stored as any[]).map((i) => (i as any).id))
  const merged = [...stored]
  mockData.forEach((m) => {
    if (!(existingIds.has((m as any).id))) {
      merged.push(m)
    }
  })
  return merged
}

export function addExpense<T>(type: string, expense: T) {
  const stored = getStoredExpenses<T>(type)
  saveStoredExpenses(type, [expense, ...stored])
}
