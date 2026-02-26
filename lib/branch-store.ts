'use client'

import { mockBranches } from '@/lib/mock-data'
import type { Branch } from '@/types'

const STORAGE_KEY = 'energyflow_custom_branches'
const REMOVED_KEY = 'energyflow_removed_branches'
const LEGACY_STORAGE_KEY = STORAGE_KEY
const LEGACY_REMOVED_KEY = REMOVED_KEY

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

function getRemovedKey() {
  return `${REMOVED_KEY}_${getTenantId()}`
}

export function getStoredBranches(): Branch[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(getStorageKey()) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Branch[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredBranches(branches: Branch[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(getStorageKey(), JSON.stringify(branches))
}

function getRemovedIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(getRemovedKey()) ?? localStorage.getItem(LEGACY_REMOVED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRemovedIds(ids: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(getRemovedKey(), JSON.stringify(ids))
}

export function getAllBranches(): Branch[] {
  const stored = getStoredBranches()
  const removed = new Set(getRemovedIds())
  const existingIds = new Set(stored.map((b) => b.id))
  const merged = stored.filter((branch) => !removed.has(branch.id))
  mockBranches.forEach((branch) => {
    if (!existingIds.has(branch.id) && !removed.has(branch.id)) {
      merged.push(branch)
    }
  })
  return merged
}

export function addBranch(branch: Branch) {
  const stored = getStoredBranches()
  saveStoredBranches([branch, ...stored])
}

export function updateBranch(updated: Branch) {
  const stored = getStoredBranches()
  const existingIds = new Set(stored.map((b) => b.id))
  if (existingIds.has(updated.id)) {
    const next = stored.map((b) => (b.id === updated.id ? updated : b))
    saveStoredBranches(next)
    return
  }
  saveStoredBranches([updated, ...stored])
}

export function removeBranch(branchId: string) {
  const stored = getStoredBranches()
  const nextStored = stored.filter((b) => b.id !== branchId)
  saveStoredBranches(nextStored)

  const removed = new Set(getRemovedIds())
  removed.add(branchId)
  saveRemovedIds([...removed])
}
