'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register } = useAuth()
  
  const plan = (searchParams?.get('plan') || 'personal') as 'personal' | 'organisation'
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    businessType: '' as '' | 'gas' | 'fuel',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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

      if (plan === 'personal' && !formData.businessType) {
        setError('Please select Gas or Fuel for personal plan.')
        setLoading(false)
        return
      }

      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        businessName: formData.businessName,
        plan,
        businessType: plan === 'personal' ? (formData.businessType as 'gas' | 'fuel') : undefined,
      })

      // Redirect to dashboard
      // Redirect based on plan type
      if (plan === 'personal') {
        router.push('/owner-dashboard')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred. Please try again.'
      if (message.toLowerCase().includes('email already')) {
        setError('Email already in use. Please use another email.')
      } else {
        setError(message)
      }
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

            {/* Business Type Selection for Personal Plans */}
            {plan === 'personal' && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Business Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, businessType: 'gas' }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      formData.businessType === 'gas'
                        ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
                    }`}
                    disabled={loading}
                  >
                    🔥 Gas Operations
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, businessType: 'fuel' }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      formData.businessType === 'fuel'
                        ? 'bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-600 dark:text-orange-300'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
                    }`}
                    disabled={loading}
                  >
                    ⛽ Fuel Operations
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose your primary business operation type
                </p>
              </div>
            )}

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
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                  className="bg-white dark:bg-gray-800 text-sm h-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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

