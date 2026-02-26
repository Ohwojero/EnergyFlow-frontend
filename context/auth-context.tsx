'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthContextType, BranchType, UserRole } from '@/types'
import { mockUsers, mockBranches } from '@/lib/mock-data'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [selectedBranchType, setSelectedBranchType] = useState<BranchType | null>(null)

  // Hydrate from localStorage on mount to prevent hydration mismatch
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('energyflow_user')
      const storedBranchId = localStorage.getItem('energyflow_branch_id')
      const storedBranchType = localStorage.getItem('energyflow_branch_type')

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
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
    setMounted(true)
  }, [])

  const login = (
    email: string,
    _password: string,
    role: UserRole,
    branchId?: string,
    branchType?: BranchType
  ) => {
    // Mock authentication - in production, this would call your backend API
    const mockUser = Object.values(mockUsers).find(u => u.role === role)
    
    if (mockUser) {
      const updatedUser = {
        ...mockUser,
        email,
      }
      
      setUser(updatedUser)
      localStorage.setItem('energyflow_user', JSON.stringify(updatedUser))
      
      if (branchId && branchType) {
        setSelectedBranchId(branchId)
        setSelectedBranchType(branchType)
        localStorage.setItem('energyflow_branch_id', branchId)
        localStorage.setItem('energyflow_branch_type', branchType)
      } else if (role !== 'org_owner' && role !== 'super_admin' && mockUser.assigned_branches.length > 0) {
        // Auto-select first branch if not specified
        const branch = mockBranches.find(b => b.id === mockUser.assigned_branches[0])
        if (branch) {
          setSelectedBranchId(branch.id)
          setSelectedBranchType(branch.type)
          localStorage.setItem('energyflow_branch_id', branch.id)
          localStorage.setItem('energyflow_branch_type', branch.type)
        }
      }
    }
  }

  const logout = () => {
    setUser(null)
    setSelectedBranchId(null)
    setSelectedBranchType(null)
    localStorage.removeItem('energyflow_user')
    localStorage.removeItem('energyflow_branch_id')
    localStorage.removeItem('energyflow_branch_type')
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
