'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthContextType, BranchType } from '@/types'
import { apiService } from '@/lib/api'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [selectedBranchType, setSelectedBranchType] = useState<BranchType | null>(null)

  // Hydrate from localStorage on mount to prevent hydration mismatch
  useEffect(() => {
    const refreshProfile = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      try {
        const profile = await apiService.getProfile()
        const latestUser = profile?.user
        if (latestUser) {
          setUser(latestUser)
          localStorage.setItem('energyflow_user', JSON.stringify(latestUser))
          await hydrateBranchSelection(latestUser)
        }
      } catch {
        // ignore profile refresh errors on boot
      }
    }

    try {
      const storedUser = localStorage.getItem('energyflow_user')
      const storedBranchId = localStorage.getItem('energyflow_branch_id')
      const storedBranchType = localStorage.getItem('energyflow_branch_type')

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        if (!parsedUser?.id && parsedUser?.user_id) {
          parsedUser.id = parsedUser.user_id
        }
        setUser(parsedUser)
        if (storedBranchId) setSelectedBranchId(storedBranchId)
        if (storedBranchType) setSelectedBranchType(storedBranchType as BranchType)
      }
    } catch (error) {
      console.error('Failed to hydrate auth state:', error)
      localStorage.removeItem('energyflow_user')
      localStorage.removeItem('energyflow_branch_id')
      localStorage.removeItem('energyflow_branch_type')
    }
    refreshProfile()
    setMounted(true)
  }, [])

  const hydrateBranchSelection = async (currentUser: User) => {
    try {
      const branches = await apiService.getBranches()
      const branchList = Array.isArray(branches) ? branches : []
      if (branchList.length === 0) return

      const storedBranchId = localStorage.getItem('energyflow_branch_id')
      const assignedSet = new Set(currentUser.assigned_branches ?? [])

      const canUseStored = storedBranchId
        ? branchList.some(
            (b: any) =>
              b.id === storedBranchId &&
              (currentUser.role === 'org_owner' || assignedSet.size === 0 || assignedSet.has(b.id)),
          )
        : false

      const preferredBranch = canUseStored
        ? branchList.find((b: any) => b.id === storedBranchId)
        : assignedSet.size > 0
          ? branchList.find((b: any) => assignedSet.has(b.id))
          : branchList[0]

      if (!preferredBranch) return

      setSelectedBranchId(preferredBranch.id)
      setSelectedBranchType(preferredBranch.type)
      localStorage.setItem('energyflow_branch_id', preferredBranch.id)
      localStorage.setItem('energyflow_branch_type', preferredBranch.type)
    } catch {
      // ignore hydrate errors
    }
  }

  const login = async (email: string, password: string) => {
    const result = await apiService.login(email, password)
    const token = result?.access_token
    const currentUser = result?.user as User | undefined
    if (token) {
      localStorage.setItem('token', token)
    }
    if (currentUser) {
      setUser(currentUser)
      localStorage.setItem('energyflow_user', JSON.stringify(currentUser))
      await hydrateBranchSelection(currentUser)
    }
  }

  const register = async (data: {
    name: string
    email: string
    password: string
    businessName: string
    plan: 'personal' | 'organisation'
  }) => {
    const result = await apiService.register({
      name: data.name,
      email: data.email,
      password: data.password,
      business_name: data.businessName,
      plan: data.plan,
    })
    const token = result?.access_token
    const currentUser = result?.user as User | undefined
    if (token) {
      localStorage.setItem('token', token)
    }
    if (currentUser) {
      setUser(currentUser)
      localStorage.setItem('energyflow_user', JSON.stringify(currentUser))
      await hydrateBranchSelection(currentUser)
    }
  }

  const logout = () => {
    setUser(null)
    setSelectedBranchId(null)
    setSelectedBranchType(null)
    localStorage.removeItem('energyflow_user')
    localStorage.removeItem('energyflow_branch_id')
    localStorage.removeItem('energyflow_branch_type')
    localStorage.removeItem('token')
    apiService.logout().catch(() => null)
  }

  const selectBranch = (branchId: string, branchType: BranchType) => {
    setSelectedBranchId(branchId)
    setSelectedBranchType(branchType)
    localStorage.setItem('energyflow_branch_id', branchId)
    localStorage.setItem('energyflow_branch_type', branchType)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    selectedBranchId,
    selectedBranchType,
    login,
    register,
    logout,
    selectBranch,
  }

  // Only render children after mounting to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
