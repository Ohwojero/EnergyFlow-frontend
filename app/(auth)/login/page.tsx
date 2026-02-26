'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { mockBranches } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Zap, Mail, Lock, ChevronRight } from 'lucide-react'
import type { UserRole, BranchType } from '@/types'

type AuthStep = 'login' | 'role-select' | 'branch-select'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  
  const [step, setStep] = useState<AuthStep>('login')
  const [email, setEmail] = useState('admin@energyflow.com')
  const [password, setPassword] = useState('password')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const roles: { value: UserRole; label: string; description: string }[] = [
    { value: 'super_admin', label: 'Super Admin', description: 'View all tenants and system operations' },
    { value: 'org_owner', label: 'Organization Owner', description: 'Manage all branches and users' },
    { value: 'gas_manager', label: 'Gas Manager', description: 'Manage gas branch operations' },
    { value: 'fuel_manager', label: 'Fuel Manager', description: 'Manage fuel station operations' },
    { value: 'sales_staff', label: 'Sales Staff', description: 'Record sales and transactions' },
  ]

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    setStep('role-select')
  }

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    
    if (role === 'super_admin' || role === 'org_owner') {
      handleComplete(role)
    } else {
      setStep('branch-select')
    }
  }

  const handleBranchSelect = (branchId: string) => {
    setSelectedBranch(branchId)
    if (selectedRole) {
      handleComplete(selectedRole, branchId)
    }
  }

  const handleComplete = async (role: UserRole, branchId?: string) => {
    setIsLoading(true)

    try {
      const branch = branchId ? mockBranches.find(b => b.id === branchId) : null
      login(email, password, role, branchId, branch?.type as BranchType)
      
      setTimeout(() => {
        if (role === 'sales_staff') {
          router.push('/sales')
          return
        }
        router.push('/dashboard')
      }, 500)
    } catch (err) {
      setError('Login failed. Please try again.')
      setIsLoading(false)
    }
  }

  // Login Step
  if (step === 'login') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">EnergyFlow</h1>
              <p className="text-sm text-muted-foreground">Gas & Fuel Management</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@energyflow.com"
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Don't have an account?
            </p>
            <Button
              variant="outline"
              className="w-full hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700"
              onClick={() => router.push('/')}
            >
              Create Account
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Role Select Step
  if (step === 'role-select') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <h2 className="text-2xl font-bold text-foreground mb-2">Select Your Role</h2>
          <p className="text-muted-foreground mb-6">
            Choose your role to continue
          </p>

          <div className="space-y-3 mb-6">
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => handleRoleSelect(role.value)}
                className="w-full text-left p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{role.label}</p>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full hover:bg-green-100 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700"
            onClick={() => setStep('login')}
          >
            Back to Login
          </Button>
        </Card>
      </div>
    )
  }

  // Branch Select Step
  if (step === 'branch-select') {
    const userBranches = mockBranches
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <h2 className="text-2xl font-bold text-foreground mb-2">Select Your Branch</h2>
          <p className="text-muted-foreground mb-6">
            Choose the branch or location you want to manage
          </p>

          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
            {userBranches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => handleBranchSelect(branch.id)}
                disabled={isLoading}
                className="w-full text-left p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{branch.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {branch.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">{branch.location}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setStep('role-select')}
            disabled={isLoading}
          >
            Back
          </Button>
        </Card>
      </div>
    )
  }

  return null
}
