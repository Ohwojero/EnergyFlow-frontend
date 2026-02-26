'use client'

import { mockShiftReconciliation } from '@/lib/mock-data'
import type { ShiftReconciliation } from '@/types'

const STORAGE_KEY = 'energyflow_custom_fuel_shifts'
const LEGACY_STORAGE_KEY = STORAGE_KEY

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

function getStorageKey() {
  return `${STORAGE_KEY}_${getTenantId()}`
}

export function getStoredFuelShifts(): ShiftReconciliation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(getStorageKey()) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ShiftReconciliation[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredFuelShifts(shifts: ShiftReconciliation[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(getStorageKey(), JSON.stringify(shifts))
}

export function getAllFuelShifts(): ShiftReconciliation[] {
  const stored = getStoredFuelShifts()
  const existingIds = new Set(stored.map((shift) => shift.id))
  const merged = [...stored]

  mockShiftReconciliation.forEach((shift) => {
    if (!existingIds.has(shift.id)) {
      merged.push(shift)
    }
  })

  return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function addFuelShift(shift: ShiftReconciliation) {
  const stored = getStoredFuelShifts()
  saveStoredFuelShifts([shift, ...stored])
}
