'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth-context'
import { getGasDailyActivities } from '@/lib/mock-data'
import { Calendar, TrendingUp, BarChart3, Activity, Target } from 'lucide-react'

export default function GasYearlyDashboard() {
  const { user, selectedBranchId } = useAuth()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())

  const yearData = useMemo(() => {
    const startDate = `${selectedYear}-01-01`
    const endDate = `${selectedYear}-12-31`
    
    // For owners, get all activities across all branches, for managers get branch-specific
    const branchId = user?.role === 'org_owner' ? undefined : (selectedBranchId || user?.assigned_branches[0])
    const activities = getGasDailyActivities(
      branchId,
      startDate,
      endDate
    )

    const totalKg = activities.reduce((sum, a) => sum + a.total_kg, 0)
    const avgMonthly = totalKg / 12
    const activeDays = activities.length

    // Monthly breakdown
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const monthActivities = activities.filter(a => {
        const activityMonth = new Date(a.date).getMonth() + 1
        return activityMonth === month
      })
      
      return {
        month: new Date(2024, i).toLocaleDateString('en', { month: 'short' }),
        kg: monthActivities.reduce((sum, a) => sum + a.total_kg, 0),
        days: monthActivities.length
      }
    })

    return { activities, totalKg, avgMonthly, activeDays, monthlyData }
  }, [selectedYear, user, selectedBranchId])

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Target className="w-8 h-8 text-secondary" />
          Yearly Gas Dashboard
        </h1>
        <p className="text-muted-foreground">Annual performance overview and trends</p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <Label htmlFor="year" className="text-sm font-medium">Year:</Label>
          <Input
            id="year"
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-32"
            min="2020"
            max="2030"
          />
        </div>
      </Card>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Gas Dispensed</p>
              <p className="text-2xl font-bold text-blue-600">{yearData.totalKg.toFixed(2)} kg</p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Days</p>
              <p className="text-2xl font-bold text-green-600">{yearData.activeDays}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Average</p>
              <p className="text-2xl font-bold text-purple-600">{yearData.avgMonthly.toFixed(2)} kg</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Days</p>
              <p className="text-2xl font-bold text-orange-600">{yearData.activeDays}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Breakdown</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {yearData.monthlyData.map((month) => (
            <div key={month.month} className="p-4 border border-border rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20">
              <h4 className="font-medium mb-2">{month.month}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gas:</span>
                  <span className="font-semibold">{month.kg.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days:</span>
                  <span className="font-semibold">{month.days}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}