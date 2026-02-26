'use client'

import { mockGasTransactions } from '@/lib/mock-data'
import type { GasTransaction } from '@/types'

const STORAGE_KEY = 'energyflow_custom_gas_sales'
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

export function getStoredGasSales(): GasTransaction[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(getStorageKey()) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GasTransaction[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredGasSales(sales: GasTransaction[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(getStorageKey(), JSON.stringify(sales))
}

export function getAllGasSales(): GasTransaction[] {
  const stored = getStoredGasSales()
  const existingIds = new Set(stored.map((sale) => sale.id))
  const merged = [...stored]

  mockGasTransactions
    .filter((transaction) => transaction.type === 'sale')
    .forEach((transaction) => {
      if (!existingIds.has(transaction.id)) {
        merged.push(transaction)
      }
    })

  return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function addGasSale(sale: GasTransaction) {
  const stored = getStoredGasSales()
  saveStoredGasSales([sale, ...stored])
}
