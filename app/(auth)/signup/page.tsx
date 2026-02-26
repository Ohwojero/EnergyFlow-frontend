'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'
import { addBranch } from '@/lib/branch-store'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  
  const plan = (searchParams?.get('plan') || 'personal') as 'personal' | 'organisation'
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate form
      if (!formData.name || !formData.email || !formData.password || !formData.businessName) {
        setError('All fields are required')
        setLoading(false)
        return
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      // For demo, we'll use a mock login
      // In production, this would call your signup API
      if (plan === 'personal') {
        const now = Date.now()
        const tenantId = `tenant-personal-${now}`
        const userId = `user-personal-${now}`
        const branchId = `branch-personal-${now}`

        localStorage.setItem(
          'energyflow_user',
          JSON.stringify({
            id: userId,
            email: formData.email,
            name: formData.name,
            role: 'gas_manager',
            tenant_id: tenantId,
            assigned_branches: [branchId],
            assigned_branch_types: ['gas'],
            created_at: new Date().toISOString(),
          })
        )
        localStorage.setItem('energyflow_branch_id', branchId)
        localStorage.setItem('energyflow_branch_type', 'gas')
        localStorage.setItem('energyflow_plan', 'personal')

        addBranch({
          id: branchId,
          tenant_id: tenantId,
          name: `${formData.businessName} Main Branch`,
          type: 'gas',
          location: 'Not set',
          status: 'active',
          manager_id: userId,
          created_at: new Date().toISOString(),
        })

        window.location.href = '/dashboard'
        return
      } else {
        localStorage.setItem('energyflow_plan', 'organisation')
        login(formData.email, formData.password, 'org_owner')
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <Card className={`p-4 ${
          plan === 'personal' 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
        }`}>
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-xl font-bold text-foreground mb-2">Create Account</h1>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              plan === 'personal'
                ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300'
                : 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300'
            }`}>
              {plan === 'personal' ? 'Personal - ₦50K/mo' : 'Organisation - ₦100K/mo'}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Business Name</label>
              <Input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Your Business Name"
                disabled={loading}
                className="bg-white dark:bg-gray-800 text-sm h-9"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Full Name</label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                disabled={loading}
                className="bg-white dark:bg-gray-800 text-sm h-9"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Email</label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                disabled={loading}
                className="bg-white dark:bg-gray-800 text-sm h-9"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Password</label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                disabled={loading}
                className="bg-white dark:bg-gray-800 text-sm h-9"
              />
            </div>

            {error && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded text-xs border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className={`w-full font-semibold mt-4 h-9 text-sm ${
                plan === 'personal'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </Button>

            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                Have an account?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-primary hover:underline font-medium"
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>

          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              30-day free trial • No credit card required
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-primary rounded-full" />
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
